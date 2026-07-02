**Producto:** Subscriptions (API)

**Tema:** No podemos crear preapprovals vía POST /preapproval en sandbox — necesitamos saber el flujo de pruebas correcto para Suscripciones

**Descripción:**

**Objetivo:** Queremos crear suscripciones vía API seteando `external_reference` con el ID de usuario de nuestra app, para poder vincular los pagos entrantes vía webhook con nuestros usuarios. Creamos un plan, y desde el frontend generamos un card_token_id vía Checkout Bricks.

**Qué probamos ya:**

- Plan-based con card_token_id (status=authorized) → 404 / 500
- Plan-based sin card_token (status=pending) → 400 (card_token_id required)
- Standalone auto_recurring (status=pending) → 500
- Standalone + card_token (status=authorized) → 500
- Con ambas credenciales: APP_USR y TEST
- Con card_token real del Brick y con dummy

**Lo que sí funciona:** GET /preapproval_plan, GET /preapproval/search, PUT /preapproval/{id} (cancel)

**Aclaración importante:** Ya estamos usando exactamente el flujo que sugiere la documentación:

- Credenciales de **producción (APP_USR)** del seller test user
- **Dos usuarios de prueba**: seller (dueño del plan) y buyer (destinatario de la suscripción)
- `payer_email` = email del buyer test user

**Pero sigue sin funcionar.** El error persiste incluso con credenciales de producción + test cards.

**Consulta concreta:** ¿Para Suscripciones, el card_token debe generarse con una tarjeta **real** aunque estemos en entorno de pruebas? Porque las tarjetas de prueba (5031 7557 3453 0604, etc.) devuelven `404 Card token service not found` incluso usando credenciales APP_USR de producción.
