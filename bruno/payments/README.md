# bruno/payments

provider-agnostic billing webhooks. the only provider registered today is
`mercadopago`; the collection covers the contract that any new provider
(e.g. `stripe`) must satisfy to slot in:

- `payments-webhook/<provider>` accepts POST webhooks with a
  provider-specific signature header. the router dispatches to the
  provider implementation, persists the raw event in
  `subscription_events`, and upserts normalized state in `subscriptions`.
- `create-subscription` is a privileged internal endpoint (auth via
  `INTERNAL_FUNCTIONS_SECRET`) that creates a subscription through the
  provider and returns an `init_point` for the buyer to complete checkout.

## running locally

1. `supabase start` (supabase + edge functions)
2. fill in `bruno/payments/environments/local.bru`:
   - `mpAccessToken`: your APP_USR- test token from
     https://www.mercadopago.com.ar/developers/panel/app
   - `webhookSecret`: the secret from
     Tus Integraciones → Webhooks → Configurar notificaciones
3. start a cloudflare tunnel:
   `cloudflared tunnel --url http://127.0.0.1:54321`
4. in bruno select the `tunnel` environment and update its `baseUrl` to
   the tunnel address printed by cloudflared.
5. set the same tunnel address as the webhook url in the MP dashboard
   (suffixed with `/functions/v1/payments-webhook/mercadopago`).

## test cards (MLA)

- approved: 4509 9535 6623 3704, cvv 123, exp 12/30, doc 12345678
- rejected: 5031 7557 3253 2671

## structure

requests are organised by billing domain into three folders. every
action verb is paired with an explicit destination so the name alone
is unambiguous: "in MP" means it hits mercado pago's api directly,
"in DB" means it hits our `payments.subscription_plans` table.

| folder           | request                | what it does                                                                                                                                         |
| ---------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plans/`         | `create plan in MP`    | creates a plan in mp via api. saves `{{mpPlanId}}` to the env.                                                                                       |
| `plans/`         | `list plans in MP`     | lists the plans in your mp account.                                                                                                                  |
| `plans/`         | `get plan in MP`       | reads a single plan from mp by id.                                                                                                                   |
| `plans/`         | `update plan in MP`    | partial update of a plan in mp. body may include `reason`, `back_url`, and any subset of `auto_recurring` (frequency, amount, currency, free_trial). |
| `plans/`         | `create plan in DB`    | registers a plan in our local db (`payments.subscription_plans`).                                                                                    |
| `plans/`         | `list plans in DB`     | lists plans in our db.                                                                                                                               |
| `plans/`         | `get plan in DB`       | reads a single plan from our db.                                                                                                                     |
| `subscriptions/` | `health`               | sanity check that supabase is up.                                                                                                                    |
| `subscriptions/` | `create checkout`      | returns the plan's `initPoint` (the link the user opens to pay).                                                                                     |
| `subscriptions/` | `get subscription`     | reads a single subscription from mp.                                                                                                                 |
| `subscriptions/` | `list subscriptions`   | lists subscriptions in mp.                                                                                                                           |
| `subscriptions/` | `cancel subscription`  | cancels a subscription in mp.                                                                                                                        |
| `webhooks/`      | `subscription created` | mock: fires the "subscription created" event mp would send.                                                                                          |
| `webhooks/`      | `subscription updated` | mock: fires the "subscription updated" event.                                                                                                        |
| `webhooks/`      | `subscription payment` | mock: fires the "payment processed" event.                                                                                                           |
| `webhooks/`      | `invalid signature`    | mock: webhook with a tampered hmac.                                                                                                                  |
| `webhooks/`      | `missing signature`    | mock: webhook with no hmac header.                                                                                                                   |
| `webhooks/`      | `unknown provider`     | sanity check that the router rejects unregistered providers.                                                                                         |

## end-to-end flow

the canonical happy path uses 4 requests from the `plans/` and
`subscriptions/` folders. run them in order:

1. `plans/create plan in MP` → creates a plan in mp, saves `{{mpPlanId}}`
   in the environment via the post-response script.
2. `plans/create plan in DB` → registers the mp plan in
   `payments.subscription_plans` so the app knows about it. replace
   `provider_plan_id` in the body with the real id from mp (copy from
   the response of step 1).
3. `subscriptions/create checkout` → returns the plan's `initPoint`.
   copy it.
4. open `initPoint` in a browser logged in as the test_comprador, pay
   with the approved test card. ~5-10s later, the webhook lands and
   `payments.subscriptions` is upserted with `status = 'authorized'`.
5. `subscriptions/cancel subscription` (optional) → cancels a
   subscription; mp dispatches another webhook with
   `action=preapproval.updated, status=cancelled`.

verify the result in the db:

```sql
select provider, provider_subscription_id, status, reason, mp_payer_email,
       transaction_amount, currency_id, updated_at
  from payments.subscriptions
 order by updated_at desc
 limit 1;

select provider, topic, action, signature_valid, processing_status,
       received_at
  from payments.subscription_events
 order by received_at desc
 limit 5;
```

## adding a new provider

- create `_shared/lib/payments/<provider>/{client,webhook,types,config}.ts`
  implementing the `PaymentProvider` interface.
- register it in `_shared/lib/payments/index.ts`.
- extend the enum:
  ```sql
  alter type payments.provider_name add value 'stripe';
  ```
- point the new provider's webhook url at
  `${baseUrl}/functions/v1/payments-webhook/<provider>`.
- mirror the bruno requests under a sibling folder.
