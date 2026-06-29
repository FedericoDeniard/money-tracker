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

1. `bun docker:up` (supabase + edge functions)
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

## end-to-end flow

1. `2-create-subscription.bru` → copy `initPoint` from the response
2. open `initPoint` in a browser logged in as the test_comprador
3. pay with the approved test card
4. wait ~5-10s for the webhook to land, then query:

   ```sql
   select provider, provider_subscription_id, status, mp_payer_email,
          transaction_amount, currency_id
     from subscriptions
    order by updated_at desc
    limit 1;

   select provider, topic, action, signature_valid, processing_status,
          received_at
     from subscription_events
    order by received_at desc
    limit 5;
   ```

5. `11-cancel-preapproval.bru` to trigger another webhook with
   action=preapproval.updated, status=cancelled.

## adding a new provider

- create `_shared/lib/payments/<provider>/{client,webhook,types,config}.ts`
  implementing the `PaymentProvider` interface.
- register it in `_shared/lib/payments/index.ts`.
- extend the enum:
  ```sql
  alter type public.provider_name add value 'stripe';
  ```
- point the new provider's webhook url at
  `${baseUrl}/functions/v1/payments-webhook/<provider>`.
- mirror the bruno requests under a sibling folder.
