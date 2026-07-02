// create-subscription edge function.
//
// provider-agnostic. body must include a `plan_id` (the canonical id
// from payments.plans) and a `provider` (e.g. 'mercadopago'). the
// function looks up the active variant for (plan_id, provider) in
// payments.plan_provider_variants.
//
// auth: requireUserAuth. the frontend sends the calling user's JWT
// after they pick a plan in /account/billing.
//
// two flows:
//
//   A) client passed a `card_token_id` (Checkout Bricks, tokenized
//      in the browser). we POST /preapproval with
//      preapproval_plan_id + external_reference (the user.id) +
//      payer_email + card_token_id + status: authorized. mp charges
//      the card immediately and dispatches the
//      subscription_preapproval webhook with the external_reference.
//      the webhook handler reads it and stamps user_id on
//      payments.subscriptions. end-to-end link.
//
//   B) no card_token_id (sandbox / fallback). we return the plan's
//      init_point via getPlan (read-only) so the user can pay
//      directly on mp. mp creates the preapproval user-side and the
//      webhook arrives without external_reference — the resulting
//      row in payments.subscriptions has user_id=null.
//
// flow A is the documented way to link auth.users.id to a
// preapproval. flow B is only for environments where the seller
// forces card_token_id for every POST /preapproval AND the client
// doesn't have a tokenized card yet.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCorsPreflightRequest, getCorsHeaders } from "../_shared/cors.ts";
import { requireUserAuth } from "../_shared/auth.ts";
import { getProvider, isKnownProvider } from "../_shared/lib/payments/index.ts";

const DEBUG_SESSION_ID = "debug-flow-correct-body-c18121";
const DEBUG_LOG_URL = "http://172.21.0.1:8787/log";

async function pushDebugLog(
  msg: string,
  data: Record<string, unknown>,
  hypothesisId: string | null = null
): Promise<void> {
  try {
    await fetch(DEBUG_LOG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: DEBUG_SESSION_ID,
        msg,
        data,
        hypothesisId,
      }),
    });
  } catch {
    // debug server down — never let logging fail the request
  }
}

Deno.serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const auth = await requireUserAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const { user } = auth;

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

  // external_reference is the app's user id. the webhook uses it to
  // stamp user_id on the resulting payments.subscriptions row.
  const externalReference = user.id;

  // card_token_id is the briks-tokenized card from the client. when
  // present, we create the preapproval in `authorized` state with mp
  // charging the card immediately and the user is already subscribed
  // when the request returns.
  const cardTokenId =
    typeof body.card_token_id === "string" && body.card_token_id.length > 0
      ? body.card_token_id
      : null;

  console.info("[create-subscription] request received", {
    userId: user.id,
    userEmail: user.email,
    provider: providerField,
    planId,
    hasCardTokenId: Boolean(cardTokenId),
  });
  await pushDebugLog("create-subscription request received", {
    userId: user.id,
    userEmail: user.email,
    provider: providerField,
    planId,
    hasCardTokenId: Boolean(cardTokenId),
  });

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

  // flow A: client tokenized the card via bricks. create the
  // preapproval in `authorized` state. mp charges the card
  // immediately and dispatches the webhook.
  if (cardTokenId) {
    try {
      const result = await provider.createSubscription({
        payerEmail: user.email ?? "",
        reason: `Plan ${planId.slice(0, 6)}`,
        frequency: 1,
        frequencyType: "months",
        transactionAmount: Number(variant.amount),
        currencyId: variant.currency,
        externalReference,
        preapprovalPlanId: variant.provider_plan_id,
        cardTokenId,
      });
      console.info("[create-subscription] preapproval authorized", {
        providerSubscriptionId: result.providerSubscriptionId,
        status: result.status,
        externalReference,
      });
      await pushDebugLog("preapproval authorized", {
        providerSubscriptionId: result.providerSubscriptionId,
        status: result.status,
        externalReference,
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
          externalReference,
        },
        200,
        corsHeaders
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        "[create-subscription] createSubscription (authorized) failed",
        {
          provider: providerField,
          planId,
          externalReference,
          hasCardTokenId: true,
          errorMessage: message,
          errorStack: err instanceof Error ? err.stack : null,
        }
      );
      await pushDebugLog(
        "createSubscription (authorized) failed",
        {
          provider: providerField,
          planId,
          externalReference,
          errorMessage: message,
        },
        "FAIL"
      );
      return jsonResponse({ error: message }, 502, corsHeaders);
    }
  }

  // flow B: no card_token_id. return the plan's init_point so the
  // user can pay directly on mp. webhook will arrive without
  // external_reference.
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
    console.info("[create-subscription] returned plan init_point (fallback)", {
      providerSubscriptionId: plan.id,
    });
    await pushDebugLog("returned plan init_point (fallback)", {
      providerSubscriptionId: plan.id,
    });
    return jsonResponse(
      {
        providerSubscriptionId: plan.id,
        initPoint: plan.initPoint,
        sandboxInitPoint: null,
        status: "pending",
        mode: "plan",
        planId,
        providerPlanId: variant.provider_plan_id,
        externalReference: null,
      },
      200,
      corsHeaders
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[create-subscription] getPlan failed", {
      provider: providerField,
      planId,
      errorMessage: message,
    });
    await pushDebugLog(
      "getPlan failed",
      { provider: providerField, planId, errorMessage: message },
      "FAIL"
    );
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
