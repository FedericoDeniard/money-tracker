// create-subscription edge function.
//
// flow: the client picks a plan in /account/billing and posts
// { plan_id, provider }. we look up the active variant for
// (plan_id, provider) in payments.plan_provider_variants, then call
// provider.createSubscription (POST /preapproval) server-side with
// `external_reference = user.id` and `preapproval_plan_id`. mp
// returns the new preapproval id and an `init_point`; we hand the
// init_point back to the client which redirects.
//
// the webhook (payments-webhook) later resolves user_id by uuid
// match on external_reference. mp's hosted-checkout reads the url
// but discards extra params when it calls /preapproval on its side,
// so this server-side flow is the only way to link.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCorsPreflightRequest, getCorsHeaders } from "../_shared/cors.ts";
import { requireUserAuth } from "../_shared/auth.ts";
import { getProvider, isKnownProvider } from "../_shared/lib/payments/index.ts";

Deno.serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  console.info("[create-subscription] incoming", {
    method: req.method,
    url: req.url,
    origin: req.headers.get("origin"),
    referer: req.headers.get("referer"),
    contentType: req.headers.get("content-type"),
    hasAuth: Boolean(req.headers.get("authorization")),
    corsAllowOrigin: corsHeaders["Access-Control-Allow-Origin"],
  });

  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const auth = await requireUserAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const providerField = stringField(body, "provider");
  if (!providerField) {
    return jsonResponse(
      { error: "Missing required field: provider" },
      400,
      corsHeaders
    );
  }
  if (!isKnownProvider(providerField)) {
    return jsonResponse(
      { error: `Unknown provider: ${providerField}` },
      400,
      corsHeaders
    );
  }

  const planId = stringField(body, "plan_id");
  if (!planId) {
    return jsonResponse(
      { error: "Missing required field: plan_id" },
      400,
      corsHeaders
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { db: { schema: "payments" } }
  );

  const { data: variant, error: variantError } = await supabase
    .from("plan_provider_variants")
    .select("provider_plan_id, is_active, plan_id, amount, currency")
    .eq("plan_id", planId)
    .eq("provider", providerField)
    .eq("is_active", true)
    .maybeSingle();

  if (variantError) {
    return jsonResponse(
      { error: "variant lookup failed", details: variantError.message },
      500,
      corsHeaders
    );
  }

  if (!variant) {
    return jsonResponse(
      {
        error: `Plan '${planId}' is not enabled on provider '${providerField}'`,
        hint: "register the plan on this provider via payments.plan_provider_variants",
      },
      404,
      corsHeaders
    );
  }

  const provider = getProvider(providerField);
  if (!provider) {
    return jsonResponse(
      { error: `Unknown provider: ${providerField}` },
      500,
      corsHeaders
    );
  }

  // server-side POST /preapproval with `external_reference = user.id` so
  // the subscription_preapproval webhook carries it back and we can
  // resolve user_id at parse time. mp's hosted checkout ignores the
  // query string when creating the preapproval server-side, so this is
  // the only path that links the subscription to our auth user.
  try {
    const result = await provider.createSubscription({
      reason: `Plan ${planId.slice(0, 6)}`,
      externalReference: auth.user.id,
      payerEmail: auth.user.email ?? "",
      frequency: 1,
      frequencyType: "months",
      transactionAmount: Number(variant.amount ?? 0),
      currencyId: variant.currency ?? "ARS",
      preapprovalPlanId: variant.provider_plan_id,
    });
    console.info("[create-subscription] preapproval created", {
      providerSubscriptionId: result.providerSubscriptionId,
      status: result.status,
      externalReference: auth.user.id,
    });
    return jsonResponse(
      {
        providerSubscriptionId: result.providerSubscriptionId,
        initPoint: result.initPoint,
        sandboxInitPoint: result.sandboxInitPoint,
        status: result.status,
        mode: "preapproval",
        planId,
        providerPlanId: variant.provider_plan_id,
        externalReference: auth.user.id,
      },
      200,
      corsHeaders
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[create-subscription] POST /preapproval failed", {
      provider: providerField,
      planId,
      externalReference: auth.user.id,
      errorMessage: message,
    });
    return jsonResponse({ error: message }, 502, corsHeaders);
  }
});

function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stringField(
  body: Record<string, unknown>,
  key: string
): string | null {
  const v = body[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}
