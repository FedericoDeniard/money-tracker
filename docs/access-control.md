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

const roleCheck = requireMinRole(auth, "gmailConnect", corsHeaders);
if (roleCheck instanceof Response) return roleCheck;

const cap = await requireCapability(auth, "gmail_sync", corsHeaders);
if (cap instanceof Response) return cap;
```

`requireMinRole(auth, "<featureKey>", ...)` receives the feature key
(not the role literal) and looks up the required role from
`supabase/functions/_shared/features.ts#FEATURES`. That lookup is the
contract that keeps the backend in sync with the frontend: the
backend has its own copy of the `FEATURES` map (mirrored from
`packages/frontend/src/lib/features.ts`), and the helper compares
`auth.role` (read from the JWT) against the looked-up value. The
helper is synchronous — no DB hit.

`requireCapability` is async and re-queries
`payments.subscriptions` + `payments.plan_capabilities` so it reflects
subscription state changes immediately, without waiting for a JWT
refresh.

The 403 error messages are the contract that the frontend classifier
matches against:

- `requireMinRole` → `"Requires role '<required>'"` (where `<required>`
  is the value the helper looked up from `FEATURES`, not the key).
- `requireCapability` → `"Requires capability: <key>"`.

### Role bypass for capabilities

`requireCapability` short-circuits when the caller's role is
`admin` or `tester` (the same `ROLE_BYPASS` set lives in both
`supabase/functions/_shared/capabilities.ts` and
`packages/mastra-server/src/lib/capabilities.ts`). The bypass:

- Skips the DB roundtrip entirely.
- Logs an info-level entry so observers can distinguish
  subscription-granted access from staff-bypassed access:
  `[requireCapability] role bypass for <capability> by <role> (user <uuid>)`.
- Returns `allowed: true` for both `requireCapability` and
  `getUserCapabilities`. `getUserCapabilities` for a staff user
  returns the full `CAPABILITIES` enum (every capability), so a tool
  that branches on `hasCapability("advanced_reports")` keeps
  working even without a subscription row.

The hierarchy `user(0) < tester(1) < admin(2)` already makes staff
roles pass any `requireMinRole` minimum — the bypass is the
capability-side equivalent of the same "staff can do anything"
intent. Today both layers honor it; the only difference is that
the role middleware is synchronous (JWT-only) and the capability
bypass is also synchronous (constant-time set lookup).

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

1. Edit `FEATURES.<key>` in **both** `packages/frontend/src/lib/features.ts`
   and `supabase/functions/_shared/features.ts`. The two copies must
   stay in sync — there is no compiler-enforced link between them.
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

The capability grant has three layers. Each is a separate source
that contributes to the final set; the union is what `requireCapability`
sees and what `custom_access_token_hook` writes into the
`user_capabilities` JWT claim.

1. **Default grants** (`payments.default_capabilities`) — every
   authenticated user. The table starts empty; rows are inserted
   manually (e.g. `INSERT INTO payments.default_capabilities VALUES
   ('ai_assistant')`) to give a capability to all users without a
   subscription. Used for the free-tier surface.
2. **Plan grants** (`payments.plan_capabilities`) — each row ties a
   `plan_id` to a capability. Granted per plan in the seed
   (`supabase/seeds/006_payments_demo.sql` section 4) or via the
   bruno collection.
3. **Role bypass** (`ROLE_BYPASS = {admin, tester}`) — staff and
   developers get every capability regardless of subscription. See
   the "Role bypass for capabilities" subsection above.

The two data sources are combined by `payments.user_capabilities_v`
(a SQL `UNION` view). `null` `user_id` rows from the default branch
match every user; the active-subscription branch contributes
per-user grants. The view deduplicates. `requireCapability` queries
the view with `.or(user_id.eq.<uuid>, user_id.is.null)` so a single
roundtrip returns the union.

`payments.capability` enum is the vocabulary. The five values today:

| Capability | Gated by | Default (free)? | Paid plans (lite_monthly)? |
| --- | --- | --- | --- |
| `gmail_sync` | `gmail-disconnect` | — | ✓ |
| `ai_assistant` | (mastra-server chat handler) | — | ✓ |
| `push_notifications` | (none yet — backend hook to be added) | — | ✓ |
| `advanced_reports` | (none yet — `/metrics` route guard to be added) | — | ✓ |
| `process_documents` | `process-document` | — | ✓ |

The "Default" column is empty by default. To grant a capability to
all free users, insert it into `payments.default_capabilities`:

```sql
INSERT INTO payments.default_capabilities VALUES ('ai_assistant');
```

That single statement makes every authenticated user (with or
without a subscription) get `ai_assistant` in their JWT claim, and
the `process-document` / `gmail-disconnect` / chat endpoints stop
rejecting them on that capability. No code change needed.

## Adding a new capability

1. Add the value to the enum in
   `supabase/migrations/20260705031212_add_plan_capabilities.sql`.
2. Add it to `CAPABILITIES` in **all three** copies:
   `packages/frontend/src/lib/capabilities.ts`,
   `supabase/functions/_shared/capabilities.ts`, and
   `packages/mastra-server/src/lib/capabilities.ts`.
3. Call `requireCapability(auth, "<key>", corsHeaders)` in the
   relevant edge function (or `requireCapability({userId,
   supabaseToken, role}, "<key>")` in mastra-server routes).
4. Add the grant for the demo `lite_monthly` plan in the seed section
   4 of `006_payments_demo.sql`.

## Modifying the role bypass

The bypass set lives as `ROLE_BYPASS` in both
`supabase/functions/_shared/capabilities.ts` and
`packages/mastra-server/src/lib/capabilities.ts`. To add or remove
roles:

1. Edit the `ROLE_BYPASS` set in both files (keep them in sync — the
   mastra-server can't import from the supabase one because they run
   in different runtimes).
2. Update `docs/access-control.md` to reflect the new policy.

The bypass applies to **all** capabilities uniformly; if you need
per-capability bypass (e.g. only admin bypasses `process_documents`
but tester doesn't), promote the check from a constant set to a
per-capability decision table and document it in
`docs/access-control.md`.

## Adding a new role-gated feature

1. Add the entry to `FEATURES` in **both**
   `packages/frontend/src/lib/features.ts` and
   `supabase/functions/_shared/features.ts` with value `"user"`.
2. Call `requireMinRole(auth, "<newKey>", corsHeaders)` in the
   relevant edge function (pass the feature key, not the role
   literal).
3. (Phase 2) Wire `useFeatureAccess("<newKey>")` in the consuming
   component for inline banners.

## Related references

- `supabase/functions/_shared/auth.ts` — `requireMinRole`,
  `hasMinRole`, `UserRole`.
- `supabase/functions/_shared/features.ts` — backend mirror of the
  `FEATURES` map + `FeatureKey` type.
- `supabase/functions/_shared/capabilities.ts` — `requireCapability`,
  `CAPABILITIES`, `Capability`.
- `packages/frontend/src/lib/features.ts` — frontend `FEATURES`,
  `FeatureKey`, `canAccess`.
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