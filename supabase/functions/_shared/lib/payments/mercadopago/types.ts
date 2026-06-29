// zod schemas and ts types for mercado pago subscription payloads.
// these are provider-specific; do not import from the generic _shared/lib/payments/types.ts.

import { z } from "npm:zod@3.23.8";

// ─── webhook payloads ─────────────────────────────────────────────────────────

// preapproval events arrive on the subscription_preapproval topic. MP sends
// `data.id` as the preapproval id (i.e. the subscription id).
export const preapprovalWebhookSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  type: z.literal("subscription_preapproval"),
  action: z.string(),
  date_created: z.string().optional(),
  user_id: z.union([z.string(), z.number()]).optional(),
  api_version: z.string().optional(),
  live_mode: z.boolean().optional(),
  data: z.object({
    id: z.union([z.string(), z.number()]),
  }),
});

export type PreapprovalWebhookPayload = z.infer<
  typeof preapprovalWebhookSchema
>;

// authorized_payment events arrive on the subscription_authorized_payment topic.
// `data.id` is the authorized_payment id (not the preapproval id). resolving
// the underlying subscription requires a follow-up GET to /authorized_payments/{id}.
export const authorizedPaymentWebhookSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  type: z.literal("subscription_authorized_payment"),
  action: z.string(),
  date_created: z.string().optional(),
  user_id: z.union([z.string(), z.number()]).optional(),
  api_version: z.string().optional(),
  live_mode: z.boolean().optional(),
  data: z.object({
    id: z.union([z.string(), z.number()]),
  }),
});

export type AuthorizedPaymentWebhookPayload = z.infer<
  typeof authorizedPaymentWebhookSchema
>;

// ─── /preapproval api response ───────────────────────────────────────────────

export const preapprovalResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  reason: z.string().optional().nullable(),
  payer_email: z.string().optional().nullable(),
  auto_recurring: z
    .object({
      frequency: z.number().optional(),
      frequency_type: z.string().optional(),
      transaction_amount: z.number().optional().nullable(),
      currency_id: z.string().optional(),
    })
    .optional()
    .nullable(),
  external_reference: z.string().optional().nullable(),
  back_url: z.string().optional().nullable(),
  date_created: z.string().optional(),
  last_modified: z.string().optional(),
});

export type PreapprovalResponse = z.infer<typeof preapprovalResponseSchema>;

// ─── create preapproval response ─────────────────────────────────────────────

export const createPreapprovalResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  init_point: z.string().optional(),
  sandbox_init_point: z.string().optional().nullable(),
});

export type CreatePreapprovalResponse = z.infer<
  typeof createPreapprovalResponseSchema
>;

// ─── /authorized_payments/{id} response ──────────────────────────────────────

export const authorizedPaymentResponseSchema = z.object({
  id: z.number(),
  status: z.string(),
  preapproval_id: z.string().optional().nullable(),
  payment_id: z.number().optional().nullable(),
});

export type AuthorizedPaymentResponse = z.infer<
  typeof authorizedPaymentResponseSchema
>;
