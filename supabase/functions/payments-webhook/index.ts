// provider-agnostic billing webhook router.
//
// url shape:  /functions/v1/payments-webhook/<provider>
// the provider segment is the only thing the router needs to know; all
// signature verification, event parsing and upsert logic is delegated to
// the registered PaymentProvider implementation.
//
// add a new provider:
//   1. register it in _shared/lib/payments/index.ts.
//   2. add an entry in the provider_name enum (migration).
//   3. configure the provider's webhook url pointing at this function with
//      /<provider> as the suffix.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCorsPreflightRequest, getCorsHeaders } from "../_shared/cors.ts";
import { getProvider } from "../_shared/lib/payments/index.ts";
import type {
  NormalizedWebhookEvent,
  WebhookVerification,
} from "../_shared/lib/payments/types.ts";

Deno.serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  // cors preflight (mp does not send one, but we leave the door open)
  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  // resolve provider from path. url pattern: /functions/v1/payments-webhook/<provider>
  const providerName = extractProviderName(req.url);
  if (!providerName) {
    return jsonResponse(
      { error: "Missing provider in path" },
      400,
      corsHeaders
    );
  }

  const provider = getProvider(providerName);
  if (!provider) {
    return jsonResponse(
      { error: `Unknown provider: ${providerName}` },
      404,
      corsHeaders
    );
  }

  // capture raw body before any parsing - signature verification needs the
  // exact bytes the provider sent.
  const rawBody = await req.text();
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  // verify signature
  const verification = await provider.verifyWebhookSignature(req, rawBody);

  // in production we reject invalid signatures. in test we accept them and
  // mark the event as 'rejected_signature' for debugging bruno mocks.
  const isProduction = isProductionEnv();
  if (!verification.valid) {
    console.warn("[payments-webhook] signature invalid", {
      provider: providerName,
      reason: verification.reason,
    });
    if (isProduction) {
      return jsonResponse({ error: "Invalid signature" }, 401, corsHeaders);
    }
  }

  // normalize the event via the provider
  const event = provider.parseWebhookEvent(rawBody);

  // persist raw event first (always - audit log)
  // the supabase client is pinned to the `payments` schema so all
  // .from("...") calls below resolve to payments.<table> automatically.
  // this keeps the rest of the handler identical to the previous
  // public-schema version while routing queries to the new schema.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { db: { schema: "payments" } }
  );

  const eventRow = await insertEvent(supabase, {
    provider: providerName,
    event,
    body,
    verification,
  });

  // dispatch by normalized topic
  try {
    await processEvent(supabase, providerName, event, eventRow.id);
    await supabase
      .from("subscription_events")
      .update({ processing_status: "processed" })
      .eq("id", eventRow.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[payments-webhook] processing error", {
      provider: providerName,
      message,
    });
    await supabase
      .from("subscription_events")
      .update({ processing_status: "error", processing_error: message })
      .eq("id", eventRow.id);
  }

  console.info("[payments-webhook] processed", {
    provider: providerName,
    topic: event.topic,
    action: event.action,
    signatureValid: verification.valid,
  });

  return jsonResponse({ received: true }, 200, corsHeaders);
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function extractProviderName(url: string): string | null {
  // strip query string and split by '/', pick the last non-empty segment.
  const path = new URL(url).pathname.replace(/\/+$/, "");
  const segments = path.split("/");
  const last = segments[segments.length - 1];
  if (!last || last === "payments-webhook") return null;
  return last;
}

function isProductionEnv(): boolean {
  return (Deno.env.get("MP_ENVIRONMENT") ?? "test") === "production";
}

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

interface EventInsertInput {
  provider: string;
  event: NormalizedWebhookEvent;
  body: unknown;
  verification: WebhookVerification;
}

async function insertEvent(
  supabase: ReturnType<typeof createClient>,
  input: EventInsertInput
): Promise<{ id: number }> {
  const processingStatus = input.verification.valid
    ? "received"
    : "rejected_signature";

  // signature timing: pull ts/hash off the verification if valid.
  const ts = input.verification.valid ? input.verification.ts : null;

  const { data, error } = await supabase
    .from("subscription_events")
    .insert({
      provider: input.provider,
      provider_subscription_id: input.event.providerSubscriptionId ?? null,
      provider_event_id: input.event.providerEventId ?? null,
      topic: input.event.topic,
      action: input.event.action || null,
      payment_id: input.event.providerPaymentId
        ? Number(input.event.providerPaymentId)
        : null,
      x_request_id: input.verification.valid
        ? input.verification.requestId
        : null,
      x_signature_ts: ts,
      signature_valid: input.verification.valid,
      body: input.body as Record<string, unknown>,
      processing_status: processingStatus,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to insert subscription_event: ${error?.message ?? "no data"}`
    );
  }
  return { id: data.id as number };
}

async function processEvent(
  supabase: ReturnType<typeof createClient>,
  providerName: string,
  event: NormalizedWebhookEvent,
  eventId: number
): Promise<void> {
  const provider = getProvider(providerName);
  if (!provider) throw new Error(`Provider disappeared: ${providerName}`);

  switch (event.topic) {
    case "subscription.created":
    case "subscription.updated": {
      if (!event.providerSubscriptionId) {
        throw new Error("subscription event without providerSubscriptionId");
      }
      const details = await provider.getSubscription(
        event.providerSubscriptionId
      );
      if (!details) {
        throw new Error(
          `MP /preapproval/${event.providerSubscriptionId} returned 404`
        );
      }
      await upsertSubscription(
        supabase,
        providerName,
        event.providerSubscriptionId,
        details
      );
      return;
    }

    case "subscription.payment": {
      // resolve the underlying preapproval id from the authorized_payment id,
      // then enrich the event row. we do not touch `subscriptions` here because
      // alpha does not track per-payment state on the subscription row.
      if (!event.providerPaymentId) {
        throw new Error("payment event without providerPaymentId");
      }
      // getAuthorizedPayment is mercadopago-specific for now. keep the dispatch
      // generic by feature-detecting the method.
      const maybeClient = provider as unknown as {
        getAuthorizedPayment?: (id: string | number) => Promise<{
          preapproval_id: string | null;
          payment_id: number | null;
        } | null>;
      };
      if (typeof maybeClient.getAuthorizedPayment !== "function") {
        console.info(
          "[payments-webhook] provider has no getAuthorizedPayment; skipping resolve"
        );
        return;
      }
      const authPayment = await maybeClient.getAuthorizedPayment(
        event.providerPaymentId
      );
      if (authPayment?.preapproval_id) {
        await supabase
          .from("subscription_events")
          .update({ provider_subscription_id: authPayment.preapproval_id })
          .eq("id", eventId);
      }
      return;
    }

    case "unknown":
      // already persisted with processing_status='received' (signature valid)
      // or 'rejected_signature'. nothing else to do.
      return;
  }
}

interface SubscriptionUpsertInput {
  providerSubscriptionId: string;
  status: string;
  reason: string | null;
  payerEmail: string | null;
  frequency: number | null;
  frequencyType: string | null;
  transactionAmount: number | null;
  currencyId: string | null;
  externalReference: string | null;
  autoRecurring: unknown;
  raw: unknown;
}

async function upsertSubscription(
  supabase: ReturnType<typeof createClient>,
  providerName: string,
  providerSubscriptionId: string,
  details: SubscriptionUpsertInput
): Promise<void> {
  const { error } = await supabase.from("subscriptions").upsert(
    {
      provider: providerName,
      provider_subscription_id: providerSubscriptionId,
      status: details.status,
      reason: details.reason,
      mp_payer_email: details.payerEmail,
      frequency: details.frequency,
      frequency_type: details.frequencyType,
      transaction_amount: details.transactionAmount,
      currency_id: details.currencyId,
      external_reference: details.externalReference,
      auto_recurring: details.autoRecurring as Record<string, unknown> | null,
      raw: details.raw as Record<string, unknown>,
    },
    { onConflict: "provider,provider_subscription_id" }
  );

  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`);
  }
}
