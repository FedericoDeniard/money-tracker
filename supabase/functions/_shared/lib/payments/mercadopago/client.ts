// mercado pago provider implementation of the PaymentProvider contract.
//
// all network IO is contained here. callers depend only on the PaymentProvider
// interface (../types.ts) so swapping providers is a one-line change in
// ../index.ts.

import type {
  CreateSubscriptionInput,
  CreateSubscriptionResult,
  NormalizedWebhookEvent,
  PaymentProvider,
  PlanDetails,
  SubscriptionDetails,
  UpdatePlanInput,
  WebhookVerification,
} from "../types.ts";
import { getMPConfig } from "./config.ts";
import {
  authorizedPaymentResponseSchema,
  createPreapprovalResponseSchema,
  preapprovalResponseSchema,
  preapprovalWebhookSchema,
  authorizedPaymentWebhookSchema,
  updatePreapprovalPlanResponseSchema,
  type AuthorizedPaymentResponse,
} from "./types.ts";
import { verifyMPWebhookSignature } from "./webhook.ts";

const MP_API_BASE = "https://api.mercadopago.com";

export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "mercadopago" as const;

  async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<CreateSubscriptionResult> {
    const config = getMPConfig();
    return input.cardTokenId && input.preapprovalPlanId
      ? this.#createWithCardTokenFallback(input, config)
      : this.#createPending(input, config);
  }

  // plan-based + card_token_id → try authorized, fall back to
  // standalone pending (auto_recurring, no plan) when the account
  // does not support card_token_id for subscriptions.
  async #createWithCardTokenFallback(
    input: CreateSubscriptionInput,
    config: ReturnType<typeof getMPConfig>
  ): Promise<CreateSubscriptionResult> {
    const { body: authorizedBody } = this.#buildBody(input);

    authorizedBody.card_token_id = input.cardTokenId;
    authorizedBody.status = "authorized";

    await this.#logOutboundBody(authorizedBody);

    const response = await fetch(`${MP_API_BASE}/preapproval`, {
      method: "POST",
      headers: this.#authHeaders(config),
      body: JSON.stringify(authorizedBody),
    });

    if (response.ok) {
      const json = await response.json();
      const parsed = createPreapprovalResponseSchema.parse(json);
      return {
        providerSubscriptionId: parsed.id,
        initPoint: parsed.init_point ?? parsed.sandbox_init_point ?? "",
        sandboxInitPoint: parsed.sandbox_init_point ?? null,
        status: parsed.status,
      };
    }

    // authorized failed — fall back to standalone pending (auto_recurring,
    // no plan, no card_token_id). the user completes payment on mp's site.
    const { pendingBody, pendingUrl } = this.#buildStandalonePendingBody(
      input,
      config
    );

    await this.#logOutboundBody(pendingBody);

    const retry = await fetch(pendingUrl, {
      method: "POST",
      headers: this.#authHeaders(config),
      body: JSON.stringify(pendingBody),
    });

    if (retry.ok) {
      const json = await retry.json();
      const parsed = createPreapprovalResponseSchema.parse(json);
      return {
        providerSubscriptionId: parsed.id,
        initPoint: parsed.init_point ?? parsed.sandbox_init_point ?? "",
        sandboxInitPoint: parsed.sandbox_init_point ?? null,
        status: parsed.status,
      };
    }

    const authorizedText = await response.text();
    const retryText = await retry.text();
    throw new Error(
      `MP createSubscription failed (authorized=${response.status}, standalone pending=${retry.status}): authorized=${authorizedText}; standalone=${retryText}`
    );
  }

  #buildStandalonePendingBody(
    input: CreateSubscriptionInput,
    config: ReturnType<typeof getMPConfig>
  ): { pendingBody: Record<string, unknown>; pendingUrl: string } {
    return {
      pendingBody: {
        reason: input.reason,
        external_reference: input.externalReference,
        payer_email: input.payerEmail,
        back_url: config.backUrl,
        notification_url: config.notificationUrl,
        status: "pending",
        auto_recurring: {
          frequency: input.frequency,
          frequency_type: input.frequencyType,
          transaction_amount: input.transactionAmount,
          currency_id: input.currencyId,
        },
      },
      pendingUrl: `${MP_API_BASE}/preapproval`,
    };
  }

  // pending preapproval — either plan-based (via preapproval_plan_id)
  // or standalone (via auto_recurring). used both as the primary flow
  // when no card_token_id and as the fallback when authorized fails.
  async #createPending(
    input: CreateSubscriptionInput,
    config: ReturnType<typeof getMPConfig>
  ): Promise<CreateSubscriptionResult> {
    const { body } = this.#buildBody(input);
    body.status = "pending";

    await this.#logOutboundBody(body);

    const response = await fetch(`${MP_API_BASE}/preapproval`, {
      method: "POST",
      headers: this.#authHeaders(config),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `MP createSubscription failed (${response.status}): ${text}`
      );
    }

    const json = await response.json();
    const parsed = createPreapprovalResponseSchema.parse(json);

    return {
      providerSubscriptionId: parsed.id,
      initPoint: parsed.init_point ?? parsed.sandbox_init_point ?? "",
      sandboxInitPoint: parsed.sandbox_init_point ?? null,
      status: parsed.status,
    };
  }

  #buildBody(input: CreateSubscriptionInput): {
    body: Record<string, unknown>;
    autoRecurring: Record<string, unknown> | undefined;
  } {
    const body: Record<string, unknown> = {
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      back_url: getMPConfig().backUrl,
      notification_url: getMPConfig().notificationUrl,
      status: "pending",
    };
    if (input.preapprovalPlanId) {
      body.preapproval_plan_id = input.preapprovalPlanId;
    } else {
      const ar: Record<string, unknown> = {
        frequency: input.frequency,
        frequency_type: input.frequencyType,
        transaction_amount: input.transactionAmount,
        currency_id: input.currencyId,
      };
      body.auto_recurring = ar;
    }
    return { body, autoRecurring: undefined };
  }

  #authHeaders(config: ReturnType<typeof getMPConfig>): Record<string, string> {
    return {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    };
  }

  async #logOutboundBody(body: Record<string, unknown>): Promise<void> {
    try {
      await fetch("http://172.21.0.1:8787/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-flow-correct-body-c18121",
          msg: "mp client outbound body",
          data: {
            url: `${MP_API_BASE}/preapproval`,
            method: "POST",
            bodyJson: JSON.stringify(body),
            bodyHasCardTokenId: "card_token_id" in body,
            bodyKeys: Object.keys(body),
            bodyStatus: body.status,
            bodyHasPreapprovalPlanId: "preapproval_plan_id" in body,
          },
        }),
      });
    } catch {
      // never let logging fail the request
    }
  }

  async getSubscription(
    providerSubscriptionId: string
  ): Promise<SubscriptionDetails | null> {
    const config = getMPConfig();
    const response = await fetch(
      `${MP_API_BASE}/preapproval/${encodeURIComponent(providerSubscriptionId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${config.accessToken}` },
      }
    );

    if (response.status === 404) return null;
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `MP getSubscription failed (${response.status}): ${text}`
      );
    }

    const json = await response.json();
    const parsed = preapprovalResponseSchema.parse(json);

    return {
      providerSubscriptionId: parsed.id,
      status: parsed.status,
      reason: parsed.reason ?? null,
      payerEmail: parsed.payer_email ?? null,
      frequency: parsed.auto_recurring?.frequency ?? null,
      frequencyType: parsed.auto_recurring?.frequency_type ?? null,
      transactionAmount: parsed.auto_recurring?.transaction_amount ?? null,
      currencyId: parsed.auto_recurring?.currency_id ?? null,
      externalReference: parsed.external_reference ?? null,
      autoRecurring: parsed.auto_recurring ?? null,
      preapprovalPlanId: parsed.preapproval_plan_id ?? null,
      raw: json,
    };
  }

  // returns the init_point of an existing preapproval plan. used by
  // create-subscription in plan-based mode: the seller pre-creates a plan
  // (e.g. "Pro $100/mes") and create-subscription hands back its checkout url.
  async getPlan(
    planId: string
  ): Promise<{ id: string; initPoint: string } | null> {
    const config = getMPConfig();
    const response = await fetch(
      `${MP_API_BASE}/preapproval_plan/${encodeURIComponent(planId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${config.accessToken}` },
      }
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`MP getPlan failed (${response.status}): ${text}`);
    }
    const json = (await response.json()) as { id: string; init_point?: string };
    if (!json.init_point) return null;
    return { id: json.id, initPoint: json.init_point };
  }

  // partial update of a preapproval plan. every input field is optional;
  // omitted fields are left untouched by the provider. throws on empty
  // input (no fields to update) and on any non-2xx response other than 404.
  //
  // the caller is responsible for keeping any local mirror in sync
  // (e.g. payments.plans) after a successful call. MP does
  // NOT fire a webhook for plan updates, so the only way to refresh
  // a cached plan is to call getPlan() after this.
  async updatePlan(
    planId: string,
    input: UpdatePlanInput
  ): Promise<PlanDetails | null> {
    const config = getMPConfig();

    // build the request body. only include fields that the caller set;
    // a missing key signals 'do not change' to MP.
    const body: Record<string, unknown> = {};
    if (input.reason !== undefined) body.reason = input.reason;
    if (input.backUrl !== undefined) body.back_url = input.backUrl;

    const hasAutoRecurringField =
      input.transactionAmount !== undefined ||
      input.currencyId !== undefined ||
      input.frequency !== undefined ||
      input.frequencyType !== undefined ||
      input.trialDays !== undefined;
    if (hasAutoRecurringField) {
      const ar: Record<string, unknown> = {};
      if (input.frequency !== undefined) ar.frequency = input.frequency;
      if (input.frequencyType !== undefined) {
        ar.frequency_type = input.frequencyType;
      }
      if (input.transactionAmount !== undefined) {
        ar.transaction_amount = input.transactionAmount;
      }
      if (input.currencyId !== undefined) ar.currency_id = input.currencyId;
      // map trialDays to mp's free_trial block. only meaningful if > 0.
      if (input.trialDays !== undefined && input.trialDays > 0) {
        ar.free_trial = {
          frequency: input.trialDays,
          frequency_type: "days",
        };
      }
      body.auto_recurring = ar;
    }

    if (Object.keys(body).length === 0) {
      throw new Error(
        "updatePlan called with no fields to update (all input fields are undefined)"
      );
    }

    const response = await fetch(
      `${MP_API_BASE}/preapproval_plan/${encodeURIComponent(planId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (response.status === 404) return null;
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`MP updatePlan failed (${response.status}): ${text}`);
    }

    const json = await response.json();
    const parsed = updatePreapprovalPlanResponseSchema.parse(json);

    return {
      id: parsed.id,
      status: parsed.status,
      reason: parsed.reason ?? null,
      autoRecurring: parsed.auto_recurring ?? null,
      backUrl: parsed.back_url ?? null,
      initPoint: parsed.init_point ?? null,
      dateCreated: parsed.date_created ?? null,
      lastModified: parsed.last_modified ?? null,
      raw: json,
    };
  }

  // not part of the PaymentProvider contract yet. used by the webhook router
  // to resolve the underlying preapproval id from an authorized_payment event.
  // promote to the interface when a second provider needs the same lookup.
  async getAuthorizedPayment(
    authorizedPaymentId: string | number
  ): Promise<AuthorizedPaymentResponse | null> {
    const config = getMPConfig();
    const response = await fetch(
      `${MP_API_BASE}/authorized_payments/${encodeURIComponent(String(authorizedPaymentId))}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${config.accessToken}` },
      }
    );

    if (response.status === 404) return null;
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `MP getAuthorizedPayment failed (${response.status}): ${text}`
      );
    }

    const json = await response.json();
    return authorizedPaymentResponseSchema.parse(json);
  }

  async verifyWebhookSignature(
    req: Request,
    rawBody: string
  ): Promise<WebhookVerification> {
    return verifyMPWebhookSignature(req, rawBody);
  }

  // cancels or pauses a subscription. MP accepts 'cancelled' and 'paused'
  // as the only valid `status` values for this endpoint; we let the caller
  // decide. on 404 (idempotency: subscription already gone) we return
  // silently so the caller can replay the call safely.
  async cancelSubscription(
    providerSubscriptionId: string,
    options?: { status?: "cancelled" | "paused" }
  ): Promise<void> {
    const config = getMPConfig();
    const status = options?.status ?? "cancelled";

    const response = await fetch(
      `${MP_API_BASE}/preapproval/${encodeURIComponent(providerSubscriptionId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      }
    );

    if (response.status === 404) return; // idempotency: already gone
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `MP cancelSubscription failed (${response.status}): ${text}`
      );
    }
    // 200 → the actual state change is delivered by the subsequent
    // subscription_preapproval.updated webhook, which the payments-webhook
    // handler persists. we intentionally do not parse the response body
    // here; the contract returns void and the webhook is the source of truth.
  }

  parseWebhookEvent(rawBody: string): NormalizedWebhookEvent {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return {
        provider: "mercadopago",
        topic: "unknown",
        action: "",
        raw: rawBody,
      };
    }

    // try preapproval first
    const preapproval = preapprovalWebhookSchema.safeParse(parsed);
    if (preapproval.success) {
      const isCreated = preapproval.data.action.includes("created");
      return {
        provider: "mercadopago",
        providerEventId: String(
          preapproval.data.id ?? preapproval.data.data.id
        ),
        providerSubscriptionId: String(preapproval.data.data.id),
        topic: isCreated ? "subscription.created" : "subscription.updated",
        action: preapproval.data.action,
        raw: parsed,
      };
    }

    // fall back to authorized_payment
    const authPayment = authorizedPaymentWebhookSchema.safeParse(parsed);
    if (authPayment.success) {
      return {
        provider: "mercadopago",
        providerEventId: String(authPayment.data.data.id),
        providerPaymentId: String(authPayment.data.data.id),
        topic: "subscription.payment",
        action: authPayment.data.action,
        raw: parsed,
      };
    }

    return {
      provider: "mercadopago",
      topic: "unknown",
      action: "",
      raw: parsed,
    };
  }
}
