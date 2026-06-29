# environments

each `<name>.bru` file in this directory is one environment. bruno
auto-syncs the directory; any file added here becomes a selectable
environment in the top-right dropdown.

## official format

`local.bru` and `tunnel.bru` follow the exact format from the docs:

```bash
vars {
  key: value
}
```

no meta block, no comments. the `#` syntax is not valid in bru files
(unlike .http or curl scripts).

## variables

| name                  | source                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `baseUrl`             | supabase local API. functions reached at `${baseUrl}/functions/v1/<name>`.                                 |
| `mpApiUrl`            | mercado pago public api (universal, same for all countries).                                               |
| `mpAccessToken`       | access token de pruebas de tu app de MP. `tus integraciones` -> tu app -> `credenciales` -> tab `pruebas`. |
| `internalSecret`      | `INTERNAL_FUNCTIONS_SECRET` de `supabase/functions/.env`.                                                  |
| `webhookSecret`       | secret que MP mostro al guardar la config del webhook.                                                     |
| `testPayerEmail`      | email del test buyer. formato `<nickname>@testuser.com`.                                                   |
| `preapprovalId`       | placeholder; actualizar despues de crear una suscripcion real.                                             |
| `authorizedPaymentId` | placeholder; actualizar despues de un cobro real.                                                          |
| `mpPlanId`            | se llena en runtime por el post-response script de `1. create-plan (mp)`.                                  |

## usage

select `local` for testing against supabase running locally. select
`tunnel` for testing against the cloudflare quick tunnel (so MP can
deliver real webhooks).

if the dropdown shows "no environment", close and reopen bruno so it
re-reads the filesystem.
