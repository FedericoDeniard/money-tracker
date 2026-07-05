**Subject:** POST /preapproval returns 500/404 — need help enabling subscription creation on our sandbox app

Hola,

Estamos intentando integrar Suscripciones via API en sandbox (MLA) pero **todas las variantes de POST /preapproval fallan**. Necesitamos entender qué falta en nuestra configuración.

**Contexto**

Tenemos una app con un plan activo creado via `POST /preapproval_plan`. Las operaciones de lectura (`GET /preapproval_plan/{id}`, `GET /preapproval/search`) funcionan correctamente. El bloqueo está en la creación.

**Problemas**

1. **Plan + card_token_id (status=authorized):** `404 Card token service not found` con token real del Brick; `500` con token dummy.
2. **Plan solo (sin card_token, status=pending):** `400 card_token_id is required` — pero no tenemos la tarjeta del usuario al crear la suscripción.
3. **Standalone auto_recurring (sin plan, status=pending):** `500 Internal server error` — endpoint documentado como válido, pero no funciona.

**Lo que pedimos**

- Revisar si nuestra app/producto necesita alguna configuración adicional para habilitar `POST /preapproval`.
- Confirmar si el error `Card token service not found` requiere habilitar un servicio específico.
- Indicar si existe alguna forma de crear una suscripción plan-based en estado pending (sin card_token_id).

Tenemos X-Request-IDs de cada request por si los necesitan para investigar. Estamos disponibles para lo que haga falta.

Saludos,
Federico
