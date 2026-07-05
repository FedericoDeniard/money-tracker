# Access control matrix

This document is the source of truth for what blocks what in the
app. Two orthogonal systems cooperate to gate features:

1. **Roles** (`public.app_role` enum: `user`, `tester`, `admin`) — staff /
   internal access. Lives in the JWT as the `user_role` claim (set by
   `public.custom_access_token_hook`).
2. **Capabilities** (`payments.capability` enum: `gmail_sync`,
   `ai_assistant`, `push_notifications`, `advanced_reports`,
   `process_documents`) — product features by subscription tier. Lives
   in `payments.plan_capabilities` and is mirrored into the JWT as the
   `user_capabilities` claim.

A user can be `admin` with no paid plan (staff) or a paid user with
`role: "user"` (product). Both gates can run in series on the same
request.

## How gating works

### Server (edge functions)

Every user-facing edge function calls both helpers right after
`requireUserAuth`:

```ts
const auth = await requireUserAuth(req, corsHeaders);
if (auth instanceof Response) return auth;

const roleCheck = requireMinRole(auth, "user", corsHeaders);
if (roleCheck instanceof Response) return roleCheck;

const cap = await requireCapability(auth, "gmail_sync", corsHeaders);
if (cap instanceof Response) return cap;
```

`requireMinRole` is synchronous (no DB hit — reads the role from the
JWT). `requireCapability` is async and re-queries
`payments.subscriptions` + `payments.plan_capabilities` so it reflects
subscription state changes immediately, without waiting for a JWT
refresh.

The 403 error messages are the contract that the frontend classifier
matches against:

- `requireMinRole` → `"Requires role '<key>'"`
- `requireCapability` → `"Requires capability: <key>"`

### Frontend

The hook `useFeatureAccess(key)` reads from
`packages/frontend/src/lib/features.ts#FEATURES` (the role map). The
hook `useCapability(key)` reads the JWT claim directly. Both expose an
`allowed: boolean` for UI to branch on — currently no component
consumes them (Phase 2 will add per-feature banners).

When an edge function rejects with one of the two 403 messages above,
`packages/frontend/src/utils/edge-function-errors.ts#getEdgeFunctionErrorMessage`
substitutes the localized `"This is a premium feature"` toast instead
of the raw error. See `packages/frontend/src/i18n/locales/{en,es}.json#errors.premiumFeature`.

## Roles matrix

`FEATURES` source of truth:
`packages/frontend/src/lib/features.ts#FEATURES`.

| `FEATURES` key | Current value | Connected edge function | Frontend page/action | Purpose |
| --- | --- | --- | --- | --- |
| `seed` | `user` | `seed-emails` | Settings → "Import emails" modal | Bulk-import historical emails from Gmail. Likely candidate to flip to `tester` (dev tool). |
| `chat` | `user` | (none — chat runs in mastra-server) | `/assistant` route | AI assistant chat surface. |
| `metrics` | `user` | (none — direct supabase reads) | `/metrics` route, sidebar link | Spending analytics and reports. |
| `transactions` | `user` | (none — direct supabase reads) | `/transactions` route, sidebar link | Transaction list and CRUD. |
| `subscriptions` | `user` | `create-subscription`, `cancel-subscription` | `/account/billing`, `/subscriptions` | Subscription management. |
| `settings` | `user` | (none — direct supabase reads) | `/settings` route, sidebar link | Account and integrations settings. |
| `processDocument` | `user` | `process-document` | "Upload receipt" modal | Receipt/image OCR → transaction. |
| `gmailConnect` | `user` | `gmail-disconnect` | Settings → "Connect Gmail" / disconnect | Gmail OAuth lifecycle. |

All values are `user` today, which means the middleware accepts every
caller. The wiring is in place so flipping any value to `tester` or
`admin` activates the gate end-to-end without further code changes.

### How to flip a value

1. Edit `FEATURES.<key>` in `lib/features.ts`.
2. Done. The next deploy picks it up.

### How the gate surfaces to the user

Phase 1 (this PR):

- User triggers a gated edge function.
- Server returns 403 with `"Requires role 'X'"` or
  `"Requires capability: X"`.
- Frontend classifier substitutes the `"This is a premium feature"`
  toast.

Phase 2 (follow-up):

- Add `useFeatureAccess(key)` / `useCapability(key)` consumption in
  the relevant components.
- Render an inline banner above each gated surface with feature-specific
  upsell copy.

## Capabilities matrix

`payments.capability` enum is the vocabulary. Each plan has zero or
more capabilities in `payments.plan_capabilities`. The seed grants are
in `supabase/seeds/006_payments_demo.sql` section 4.

| Capability | Gated by | Today |
| --- | --- | --- |
| `gmail_sync` | `gmail-disconnect` | Granted to `lite_monthly` in seed. |
| `ai_assistant` | (route guard on `/assistant`) | Granted to `lite_monthly` in seed. |
| `push_notifications` | (none yet — backend hook to be added) | Granted to `lite_monthly` in seed. |
| `advanced_reports` | (none yet — `/metrics` route guard to be added) | Granted to `lite_monthly` in seed. |
| `process_documents` | `process-document` | Granted to `lite_monthly` in seed. |

## Adding a new capability

1. Add the value to the enum in
   `supabase/migrations/20260705031212_add_plan_capabilities.sql`.
2. Add it to `CAPABILITIES` in both
   `packages/frontend/src/lib/capabilities.ts` and
   `supabase/functions/_shared/capabilities.ts`.
3. Call `requireCapability(auth, "<key>", corsHeaders)` in the
   relevant edge function.
4. Add the grant for the demo `lite_monthly` plan in the seed section
   4 of `006_payments_demo.sql`.

## Adding a new role-gated feature

1. Add the entry to `FEATURES` in `packages/frontend/src/lib/features.ts`
   with value `"user"`.
2. Call `requireMinRole(auth, "user", corsHeaders)` in the relevant
   edge function.
3. (Phase 2) Wire `useFeatureAccess("<key>")` in the consuming
   component for inline banners.

## Related references

- `supabase/functions/_shared/auth.ts` — `requireMinRole`,
  `hasMinRole`, `UserRole`.
- `supabase/functions/_shared/capabilities.ts` — `requireCapability`,
  `CAPABILITIES`, `Capability`.
- `packages/frontend/src/lib/features.ts` — `FEATURES`, `FeatureKey`,
  `canAccess`.
- `packages/frontend/src/lib/capabilities.ts` — `CAPABILITIES`,
  `Capability`.
- `packages/frontend/src/utils/edge-function-errors.ts` — classifier
  + premium-feature substitution.
- `supabase/migrations/20260625125528_add_user_roles_and_access_token_hook.sql`
  — `app_role` enum + JWT hook for `user_role`.
- `supabase/migrations/20260705031212_add_plan_capabilities.sql` —
  `payments.capability` enum + table.
- `supabase/migrations/20260705031217_add_user_capabilities_to_jwt.sql`
  — JWT hook extension for `user_capabilities`.