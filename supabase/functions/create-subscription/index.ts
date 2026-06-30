// create-subscription edge function.
//
// provider-agnostic. body must include a `plan_id` (the canonical id
// from payments.plans) and a `provider` (e.g. 'mercadopago'). the
// function looks up the active price for that plan on the requested
// provider in payments.plan_provider_variants, and calls the provider
// with the variant's provider_plan_id to get the init_point back.
//
// auth: requires the internal functions secret (bearer). this is a
// privileged call that hits the provider's api with real credentials, so
// it is not exposed to the frontend. the user-auth variant
// (cancel-subscription) is the public-facing counterpart.
//
// flow:
//   1. validate provider.
//   2. look up the active variant for (plan_id, provider) in our db.
//   3. call provider.getPlan(variant.provider_plan_id) to get the
//      init_point from the provider (mp in our case). this is the
//      recommended path — works on test mode where standalone
//      preapproval creation is rejected.
//   4. if no variant exists for (plan_id, provider), 404 with a clear
//      message so the caller can offer a different provider to the user.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCorsPreflightRequest, getCorsHeaders } from "../_shared/cors.ts";
import { requireInternalAuth } from "../_shared/auth.ts";
import { getProvider, isKnownProvider } from "../_shared/lib/payments/index.ts";

Deno.serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const auth = requireInternalAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const providerField = typeof body.provider === "string" ? body.provider : "";
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

  // lookup the active price for (plan_id, provider) in our db. the
  // presence of this row means the plan is enabled on the provider; the
  // amount and currency live in the variant, but those are the
  // provider's responsibility to surface to the user during checkout.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { db: { schema: "payments" } }
  );

  const { data: variant, error: variantError } = await supabase
    .from("plan_provider_variants")
    .select("provider_plan_id, is_active, plan_id")
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

  try {
    const plan = await provider.getPlan(variant.provider_plan_id);
    if (!plan) {
      return jsonResponse(
        {
          error: `Plan not found in provider: ${variant.provider_plan_id}`,
          hint: "the variant references a provider plan id that no longer exists",
        },
        404,
        corsHeaders
      );
    }
    return jsonResponse(
      {
        providerSubscriptionId: plan.id,
        initPoint: plan.initPoint,
        sandboxInitPoint: null,
        status: "pending",
        mode: "plan",
        planId,
        providerPlanId: variant.provider_plan_id,
      },
      200,
      corsHeaders
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[create-subscription] getPlan failed", {
      provider: providerField,
      planId,
      message,
    });
    return jsonResponse({ error: message }, 502, corsHeaders);
  }
});

// ─── helpers ─────────────────────────────────────────────────────────────────

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
