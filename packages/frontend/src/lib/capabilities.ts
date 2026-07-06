/**
 * Capability vocabulary. The set of strings here is the single source of
 * truth for what features the codebase can gate. Adding a new capability
 * is a deliberate product decision and ships with a migration that
 * updates the `payments.plan_capabilities_capability_check` constraint
 * in supabase/migrations/20260705031212_add_plan_capabilities.sql.
 *
 * This file is the frontend copy. Two siblings mirror it:
 *   - supabase/functions/_shared/capabilities.ts (edge functions)
 *   - packages/mastra-server/src/lib/capabilities.ts (mastra tools, if needed)
 *
 * The duplication matches the existing pattern with `UserRole` in
 * packages/frontend/src/lib/features.ts and
 * supabase/functions/_shared/auth.ts. The DB CHECK constraint is the
 * authoritative guard against drift; lint and CI should keep these three
 * files in sync.
 *
 * Capability vs feature_keys (payments.plans.feature_keys):
 *   - capabilities: code-level permissions, used to gate edge functions
 *     and route guards.
 *   - feature_keys: ordered list of i18n keys rendered on the pricing card.
 *   They share names intentionally (gmail_sync ↔ gmailSync) so product
 *   and engineering stay aligned, but they are separate concerns.
 */
const CAPABILITIES = {
  gmail_sync: "gmail_sync",
  ai_assistant: "ai_assistant",
  push_notifications: "push_notifications",
  advanced_reports: "advanced_reports",
  process_documents: "process_documents",
  report_pdf_export: "report_pdf_export",
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

/**
 * Type guard for runtime values (e.g. from JWT claims, query params).
 * Returns true when `x` is one of the declared capability identifiers.
 */
export function isCapability(x: unknown): x is Capability {
  return typeof x === "string" && x in CAPABILITIES;
}
