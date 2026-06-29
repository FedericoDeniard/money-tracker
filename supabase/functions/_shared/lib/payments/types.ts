// payment provider contract.
//
// to add a new provider (e.g. stripe):
//   1. create _shared/lib/payments/<provider>/{client,webhook,types,config}.ts
//      implementing the PaymentProvider interface below.
//   2. register the provider in _shared/lib/payments/index.ts.
//   3. add a migration extending the public.provider_name enum:
//        alter type public.provider_name add value 'stripe';
//
// this file is provider-agnostic. do not import any third-party SDK here.

export type ProviderName = "mercadopago";

export interface CreateSubscriptionInput {
  payerEmail: string;
  reason: string;
  frequency: number;
  frequencyType: "months" | "days";
  transactionAmount: number;
  currencyId: string;
  externalReference?: string;
}

export interface CreateSubscriptionResult {
  providerSubscriptionId: string;
  initPoint: string;
  sandboxInitPoint: string | null;
  status: string;
}

export interface SubscriptionDetails {
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

export type WebhookVerification =
  | { valid: true; ts: number; requestId: string | null }
  | {
      valid: false;
      reason:
        | "missing_signature"
        | "malformed"
        | "ts_out_of_range"
        | "hash_mismatch";
    };

// normalized webhook topics. each provider maps its own raw events to one of these.
// adding a new normalized topic here is a contract change that affects:
//   - the audit columns / event processing logic in payments-webhook
//   - downstream consumers that react to specific topics
export type NormalizedWebhookTopic =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.payment"
  | "unknown";

export interface NormalizedWebhookEvent {
  provider: ProviderName;
  // providerEventId = the id of the individual delivery (e.g. payment id for
  // subscription.payment, or a unique delivery id for preapproval events).
  providerEventId?: string;
  // providerSubscriptionId = the id of the underlying subscription.
  // may be missing for subscription.payment events; in that case the webhook
  // router resolves it via provider.getAuthorizedPayment(...).
  providerSubscriptionId?: string;
  providerPaymentId?: string;
  topic: NormalizedWebhookTopic;
  action: string;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: ProviderName;
  createSubscription(
    input: CreateSubscriptionInput
  ): Promise<CreateSubscriptionResult>;
  getSubscription(
    providerSubscriptionId: string
  ): Promise<SubscriptionDetails | null>;
  // plan lookup. used in plan-based flow where the seller pre-creates
  // plans and create-subscription hands back the plan's checkout url
  // instead of creating a brand-new preapproval each time.
  getPlan(planId: string): Promise<{ id: string; initPoint: string } | null>;
  verifyWebhookSignature(
    req: Request,
    rawBody: string
  ): Promise<WebhookVerification>;
  parseWebhookEvent(rawBody: string): NormalizedWebhookEvent;
}
