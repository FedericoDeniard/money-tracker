# Debug: MercadoPago Subscription — Vincular `user_id` vía `external_reference`

## Contexto

Necesitamos que cuando un usuario de nuestra app se suscribe a un plan de MercadoPago, el `user_id` (UUID de `auth.users`) quede vinculado al subscription en `payments.subscriptions` para que el webhook pueda identificar a quién pertenece el pago.

El mecanismo standard de MP es `external_reference`: un string que nosotros seteamos en el `POST /preapproval` y que MP devuelve en el webhook. **No podemos crear preapprovals exitosamente en este entorno.**

---

## Arquitectura

### Apps de MP involucradas

| App                          | ID    | Credenciales  | Rol                                                                                                                                            |
| ---------------------------- | ----- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Seller test (dueño del plan) | `***` | `APP_USR-***` | Crea planes, recibe pagos en sandbox. El webhook está configurado en el panel de MP para esta app                                              |
| money-tracker (app del MCP)  | `***` | `TEST-***`    | Creada vía MCP `create_application`. Su webhook se configuró vía `mercadopago_save_webhook`. NO tiene visibilidad de recursos de la app seller |

**Conclusión**: Son dos apps completamente aisladas. Los recursos (planes, preapprovals) creados con una no son visibles por la otra.

### Plan activo

```
provider_plan_id: ***
plan_id (nuestra DB): 9f9cc57c-ac3e-4719-833a-f8341329c711
amount: 10000 ARS
status: active
```

### Webhook configurado

- URL: `***` (tunnel cloudflare)
- Secret: `***`
- Eventos checkeados: Pagos, Planes y suscripciones, Vinculación de aplicaciones, Reclamos, Perfil de pago
- Configurado MANUALMENTE en el panel de MP por el usuario en la app del seller test

### Credenciales en uso (`.env` y Bruno)

```
MP_ACCESS_TOKEN = APP_USR-***
MP_PUBLIC_KEY   = APP_USR-***
MP_WEBHOOK_SECRET = ***
MP_ENVIRONMENT  = test
MP_BACK_URL     = ***
MP_SITE_ID      = MLA
MP_NOTIFICATION_URL = ***
```

---

## Flujos implementados en el código

### Flow A — Card token presente (plan-based, authorized)

La idea original: frontend tokeniza la tarjeta vía Checkout Bricks, envía `card_token_id` al edge function, y este crea el preapproval con `status=authorized` para cobrar inmediato.

```
POST /preapproval
Headers:
  Authorization: Bearer APP_USR-***
  Content-Type: application/json
  X-Idempotency-Key: <random-uuid>
Body:
{
  "reason": "Plan 9f9cc5",
  "external_reference": "<user-uuid>",
  "payer_email": "***",
  "back_url": "***",
  "notification_url": "***",
  "status": "pending",
  "preapproval_plan_id": "***",
  "card_token_id": "<real-token-from-brick>",
  "status": "authorized"  // sobreescrito
}
```

**Error real desde el frontend (con token real del Brick):** `404 {"message":"Card token service not found","status":404}`

### Flow B — Sin card token (plan-based, solo getPlan, read-only)

Fallback actual cuando el frontend no envía `card_token_id`. No crea ningún preapproval. Solo devuelve el `init_point` del plan.

```
GET /preapproval_plan/***
Response:
{
  "id": "***",
  "init_point": "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=***"
}
```

- El usuario completa el pago en el sitio de MP
- MP crea el preapproval de SU lado (sin `external_reference`)
- El webhook llega con `external_reference=null`
- `user_id` queda `null` en `payments.subscriptions`

### Fallback implementado (pero no funciona en este entorno)

Cuando Flow A falla, intentamos crear un preapproval standalone (sin plan, con `auto_recurring`, `status=pending`):

```
POST /preapproval
Body:
{
  "reason": "Plan 9f9cc5",
  "external_reference": "<user-uuid>",
  "payer_email": "***",
  "back_url": "***",
  "notification_url": "***",
  "status": "pending",
  "auto_recurring": {"frequency":1, "frequency_type":"months", "transaction_amount":10000, "currency_id":"ARS"}
}
```

**Error:** `500 Internal server error`

---

## Tests directos contra MP API (curl -v)

### Test 1: GET /preapproval_plan/{id} (leer plan)

| Credential    | Status  | Response                                                                                      |
| ------------- | ------- | --------------------------------------------------------------------------------------------- |
| `APP_USR-***` | **200** | Plan encontrado: `status=active`, `auto_recurring={frequency:1, transaction_amount:10000.00}` |
| `TEST-***`    | **404** | `{"message":"The template with id ... does not exist","status":404}`                          |

**Conclusión:** Plan solo visible por la credencial APP_USR que lo creó.

### Test 2: POST /preapproval (plan-based, CON card_token_id, status=authorized)

Request body:

```json
{
  "reason": "Test flow A card token sub",
  "external_reference": "<user-uuid>",
  "payer_email": "***",
  "back_url": "***",
  "notification_url": "***",
  "status": "authorized",
  "preapproval_plan_id": "***",
  "card_token_id": "dummy-card-token"
}
```

| Credential    | Status  | Response Body                                                                            |
| ------------- | ------- | ---------------------------------------------------------------------------------------- |
| `APP_USR-***` | **500** | `{"timestamp":"...","status":500,"error":"Internal Server Error","path":"/preapproval"}` |
| `TEST-***`    | **404** | `{"message":"The template with id ... does not exist","status":404}` (plan no visible)   |

**Nota:** El 500 de APP_USR es esperado porque `dummy-card-token` no es un token real. Con un token real del Brick, el error era `404 Card token service not found`.

### Test 3: POST /preapproval (plan-based, SIN card_token_id, status=pending)

Request body:

```json
{
  "reason": "Test plan no card token",
  "external_reference": "<user-uuid>",
  "payer_email": "***",
  "back_url": "***",
  "notification_url": "***",
  "status": "pending",
  "preapproval_plan_id": "***"
}
```

| Credential    | Status  | Response Body                                          |
| ------------- | ------- | ------------------------------------------------------ |
| `APP_USR-***` | **400** | `{"message":"card_token_id is required","status":400}` |
| `TEST-***`    | **404** | Plan no existe en este scope                           |

**Conclusión:** MP valida explícitamente que `card_token_id` es **requerido** cuando se usa `preapproval_plan_id`. No se puede crear un preapproval plan-based sin card_token_id.

### Test 4: POST /preapproval (standalone, auto_recurring, sin plan, sin card_token, status=pending)

Request body:

```json
{
  "reason": "Test standalone sub test",
  "external_reference": "<user-uuid>",
  "payer_email": "***",
  "back_url": "***",
  "notification_url": "***",
  "status": "pending",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "transaction_amount": 500,
    "currency_id": "ARS"
  }
}
```

| Credential    | Status  | Response Body                                      |
| ------------- | ------- | -------------------------------------------------- |
| `APP_USR-***` | **500** | `{"message":"Internal server error","status":500}` |
| `TEST-***`    | **500** | `{"message":"Internal server error","status":500}` |

**Conclusión:** Ambas credenciales devuelven 500. La cuenta/app no permite crear preapprovals standalone.

### Test 5: POST /preapproval (standalone CON card_token_id, status=authorized)

Request body:

```json
{
  "reason": "Test standalone card token",
  "external_reference": "<user-uuid>",
  "payer_email": "***",
  "back_url": "***",
  "notification_url": "***",
  "status": "authorized",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "transaction_amount": 500,
    "currency_id": "ARS"
  },
  "card_token_id": "dummy-card-token"
}
```

| Credential    | Status  | Response Body                                                      |
| ------------- | ------- | ------------------------------------------------------------------ |
| `APP_USR-***` | **500** | `{"timestamp":"...","status":500,"error":"Internal Server Error"}` |
| `TEST-***`    | **500** | Ídem                                                               |

**Conclusión:** Dummy token causa 500. Con token real, posiblemente `404 Card token service not found`.

### Test 6: GET /preapproval/search (buscar preapprovals por plan)

```
GET /preapproval/search?preapproplan_id=***&limit=5
```

| Credential    | Status  | Response Body                                                                                 |
| ------------- | ------- | --------------------------------------------------------------------------------------------- |
| `APP_USR-***` | **200** | `{"paging":{"total":4},"results":[...4 preapprovals...]}` — 4 preapprovals, todos `cancelled` |
| `TEST-***`    | **200** | `{"paging":{"total":0},"results":[]}`                                                         |

**Conclusión:** GET /preapproval/search SÍ funciona con APP_USR y devuelve preapprovals existentes (creados probablemente vía Flow B / init_point). Esto confirma que la app PUEDE recibir preapprovals (creados desde el checkout de MP), pero NO puede CREARLOS vía API.

---

## Links a documentación de MP

| Tópico                                                                    | URL                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suscripciones — overview                                                  | [https://www.mercadopago.com/developers/es/docs/subscriptions/landing](https://www.mercadopago.com/developers/es/docs/subscriptions/landing)                                                                                                                                             |
| Suscripciones con plan asociado (plan-based)                              | [https://www.mercadopago.com/developers/es/docs/subscriptions/integration-configuration/subscription-associated-plan](https://www.mercadopago.com/developers/es/docs/subscriptions/integration-configuration/subscription-associated-plan)                                               |
| Suscripciones sin plan asociado — pago pendiente (standalone pending)     | [https://www.mercadopago.com/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments](https://www.mercadopago.com/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments)       |
| Suscripciones sin plan asociado — pago autorizado (standalone authorized) | [https://www.mercadopago.com/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments](https://www.mercadopago.com/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments) |
| POST /preapproval — reference                                             | [https://www.mercadopago.com/developers/es/reference/online-payments/subscriptions/create-preapproval/post](https://www.mercadopago.com/developers/es/reference/online-payments/subscriptions/create-preapproval/post)                                                                   |
| GET /preapproval/search — reference                                       | [https://www.mercadopago.com/developers/es/reference/online-payments/subscriptions/search-preapproval/get](https://www.mercadopago.com/developers/es/reference/online-payments/subscriptions/search-preapproval/get)                                                                     |
| Webhooks                                                                  | [https://www.mercadopago.com/developers/es/docs/your-integrations/notifications/webhooks](https://www.mercadopago.com/developers/es/docs/your-integrations/notifications/webhooks)                                                                                                       |
| Gestión de suscripciones (cancel/pause/reactivate)                        | [https://www.mercadopago.com/developers/es/docs/subscriptions/subscription-management](https://www.mercadopago.com/developers/es/docs/subscriptions/subscription-management)                                                                                                             |

## Resumen de errores

| Endpoint                                        | APP_USR-\*\*\*     | TEST-\*\*\*        |
| ----------------------------------------------- | ------------------ | ------------------ |
| `GET /preapproval_plan/{id}`                    | ✅ 200             | ❌ 404 (scope)     |
| `POST /preapproval` (plan + card_token)         | ❌ 500/404         | ❌ 404 (scope)     |
| `POST /preapproval` (plan, no card_token)       | ❌ 400             | ❌ 404 (scope)     |
| `POST /preapproval` (standalone, no card_token) | ❌ 500             | ❌ 500             |
| `POST /preapproval` (standalone + card_token)   | ❌ 500             | ❌ 500             |
| `GET /preapproval/search`                       | ✅ 200             | ✅ 200 (0 results) |
| `GET /preapproval/{id}`                         | ✅ 200 (si existe) | ❌ scope           |
| `PUT /preapproval/{id}` (cancel)                | ✅ 200 (si existe) | ❌ scope           |

**Ningún `POST /preapproval` funciona** en ninguna de las apps para este entorno.

---

## Código relevante (cambios realizados)

### `client.ts` — `createSubscription()` refactorizado

- Método principal: si hay `cardTokenId` + `preapprovalPlanId` → `#createWithCardTokenFallback()`, sino → `#createPending()`
- `#createWithCardTokenFallback()`: intenta authorized, si falla (cualquier error), fallback a standalone pending (`#buildStandalonePendingBody()`)
- `#createPending()`: envía plan-based (si hay `preapprovalPlanId`) o standalone (`auto_recurring`) con `status=pending`
- `#buildBody()`: construye el body base con `reason`, `external_reference`, `payer_email`, `back_url`, `notification_url`, `preapproval_plan_id` o `auto_recurring`
- `#authHeaders()`: `Authorization: Bearer <token>`, `Content-Type: application/json`, `X-Idempotency-Key: <random-uuid>`

### `payments-webhook/index.ts` — `resolveUserId()` ampliado

Ahora resuelve `user_id` por dos vías:

1. `external_reference` (Flow A — UUID de auth.users)
2. `payer_email` (Flow B — lookup en auth.users por email)

### `create-subscription/index.ts` — Fix de `reason`

`reason` se truncó a `Plan ${planId.slice(0, 6)}` para respetar el límite de 40 caracteres de MP.

---

## Preguntas para soporte de MercadoPago

1. **¿Por qué `POST /preapproval` devuelve `500 Internal Server Error` para el standalone flow (`auto_recurring`, `status=pending`, sin `card_token_id`)?** ¿Qué falta en el request?

2. **¿Por qué `POST /preapproval` devuelve `404 Card token service not found` cuando enviamos un `card_token_id` real generado por Checkout Bricks?** ¿Qué servicio hay que habilitar?

3. **¿Qué producto/configuración necesita la app para poder crear preapprovals vía API?** Actualmente podemos crear planes (`POST /preapproval_plan`) y leerlos, pero no podemos crear preapprovals.

4. **¿Hay alguna forma de crear un preapproval pending (sin card_token_id) asociado a un plan?** MP dice "A subscription with an associated plan must always be created with your card_token_id and with the status Authorized." — ¿es esto un hard requirement o hay excepciones?

5. **¿El `notification_url` en el body de `POST /preapproval` puede causar que MP rechace la creación si la URL no responde correctamente?** Pregunta porque el 500 podría ser un timeout de MP intentando llamar al webhook.

6. **Para el flow donde el usuario paga vía init_point del plan (sin que nosotros creemos el preapproval), ¿cómo podemos vincular nuestro `user_id`?** MP no incluye `external_reference` en preapprovals creados desde el checkout del plan. ¿Hay algún mecanismo (e.g., `back_url` con query params, `notification_url` en el plan)?

---

## Datos de prueba

- Test plan ID en MP: `***`
- Test plan name: `money-tracker Lite`
- App user ID: `***`
- App user email: `***`
- Test buyer email (MP): `***`
- X-Request-IDs de requests fallidos:
  - 500 (APP_USR standalone): `***`
  - 500 (APP_USR plan+card_token dummy): `***`
  - 400 (APP_USR plan sin card_token): `***`
  - 500 (APP_USR standalone+card_token dummy): `***`

---
