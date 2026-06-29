// create-subscription edge function.
//
// provider-agnostic: takes `{ provider, payer_email, reason, transaction_amount, ... }`
// in the body and dispatches to the registered PaymentProvider. today only
// 'mercadopago' is registered; unknown providers return 400.
//
// auth: requires the internal functions secret (bearer). this is a
// privileged call that hits the provider's api with real credentials, so it
// is not exposed to the frontend. in the future a user-auth variant can be
// added without breaking the contract.
//
// flow:
//   1. if body has a `plan_id`, fetch that plan and return its init_point.
//      (recommended path - works in MP test mode where standalone
//      preapproval creation is rejected.)
//   2. if no plan_id, fall back to MP_DEFAULT_PLAN_ID from env.
//   3. if no plan_id and no env default, create a fresh preapproval using
//      the auto_recurring fields from the body. this is the standalone
//      preapproval flow documented as "Suscripciones sin plan asociado".

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCorsPreflightRequest, getCorsHeaders } from "../_shared/cors.ts";
import { requireInternalAuth } from "../_shared/auth.ts";
import { getProvider, isKnownProvider } from "../_shared/lib/payments/index.ts";
import type { CreateSubscriptionInput } from "../_shared/lib/payments/types.ts";

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

  const provider = getProvider(providerField);
  if (!provider) {
    return jsonResponse(
      { error: `Unknown provider: ${providerField}` },
      400,
      corsHeaders
    );
  }

  // plan-based fast path
  const requestedPlanId =
    stringField(body, "plan_id") ?? Deno.env.get("MP_DEFAULT_PLAN_ID");
  if (requestedPlanId) {
    try {
      const plan = await provider.getPlan(requestedPlanId);
      if (!plan) {
        return jsonResponse(
          { error: `Plan not found: ${requestedPlanId}` },
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
        },
        200,
        corsHeaders
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[create-subscription] getPlan failed", {
        provider: providerField,
        message,
      });
      return jsonResponse({ error: message }, 502, corsHeaders);
    }
  }

  // standalone preapproval flow (no plan)
  const input = parseInput(body);
  if ("error" in input) {
    return jsonResponse({ error: input.error }, 400, corsHeaders);
  }

  try {
    const result = await provider.createSubscription(input.value);
    return jsonResponse({ ...result, mode: "standalone" }, 200, corsHeaders);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[create-subscription] provider error", {
      provider: providerField,
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

type ParseResult = { value: CreateSubscriptionInput } | { error: string };

function parseInput(body: Record<string, unknown>): ParseResult {
  const payerEmail = stringField(body, "payer_email");
  const reason = stringField(body, "reason");
  const transactionAmount = numberField(body, "transaction_amount");
  const frequency = numberField(body, "frequency") ?? 1;
  const frequencyTypeRaw = stringField(body, "frequency_type") ?? "months";
  const currencyId = stringField(body, "currency_id") ?? "ARS";
  const externalReference = stringField(body, "external_reference");

  if (!payerEmail) return { error: "Missing required field: payer_email" };
  if (!reason) return { error: "Missing required field: reason" };
  if (transactionAmount === null || transactionAmount <= 0) {
    return { error: "Missing or invalid field: transaction_amount" };
  }
  if (frequencyTypeRaw !== "months" && frequencyTypeRaw !== "days") {
    return {
      error: "Invalid field: frequency_type must be 'months' or 'days'",
    };
  }

  return {
    value: {
      payerEmail,
      reason,
      frequency,
      frequencyType: frequencyTypeRaw,
      transactionAmount,
      currencyId,
      externalReference: externalReference ?? undefined,
    },
  };
}

function stringField(
  body: Record<string, unknown>,
  key: string
): string | null {
  const v = body[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function numberField(
  body: Record<string, unknown>,
  key: string
): number | null {
  const v = body[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
