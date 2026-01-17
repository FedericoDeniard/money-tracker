# Sistema Multi-Usuario para Notificaciones de Gmail

## Descripción General

Este sistema permite que múltiples usuarios registrados configuren sus cuentas de Gmail para recibir notificaciones automáticas cuando lleguen nuevos correos a su bandeja de entrada. Los tokens OAuth se almacenan de forma segura en la base de datos, permitiendo que cada usuario tenga su propia configuración independiente.

## Arquitectura de la Base de Datos

### Tablas Principales

1. **`users`**: Extiende `auth.users` de Supabase con información adicional
2. **`user_oauth_tokens`**: Almacena tokens de OAuth2 de Gmail por usuario
3. **`gmail_watches`**: Registra los "watches" activos de Gmail API
4. **`pubsub_subscriptions`**: Gestiona las suscripciones de Pub/Sub

### Esquema de Tokens

```sql
user_oauth_tokens:
- id: UUID (PK)
- user_id: UUID (FK -> users.id)
- access_token: TEXT (token de acceso)
- refresh_token: TEXT (token de refresco)
- token_type: VARCHAR(50)
- expires_at: TIMESTAMP
- scope: TEXT
- gmail_email: VARCHAR(255)
- UNIQUE(user_id, gmail_email)
```

## Flujo de Autenticación OAuth

### 1. Usuario Inicia la Configuración

El usuario navega a `/settings` y hace clic en "Conectar Gmail":

```typescript
// Frontend: Settings.tsx
const handleConnectEmail = () => {
  const backendUrl = 'http://localhost:3001';
  window.location.href = `${backendUrl}/auth?userId=${user.id}`;
};
```

### 2. Backend Redirige a Google OAuth

```typescript
// Backend: index.ts
app.get("/auth", (req, res) => {
  const { userId } = req.query;
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    state: userId, // Pasamos el userId en el state
    prompt: "consent", // Forzamos consent para obtener refresh_token
  });
  res.redirect(authUrl);
});
```

### 3. Google Redirige al Callback

Después de que el usuario autoriza, Google redirige a `/auth/callback`:

```typescript
app.get("/auth/callback", async (req, res) => {
  const { code, state } = req.query;
  const userId = state; // Recuperamos el userId del state
  
  // 1. Intercambiamos el código por tokens
  const { tokens } = await oAuth2Client.getToken(code);
  
  // 2. Obtenemos el email de Gmail del usuario
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  const profile = await gmail.users.getProfile({ userId: "me" });
  const gmailEmail = profile.data.emailAddress;
  
  // 3. Guardamos los tokens en la base de datos
  await supabase.from("user_oauth_tokens").upsert({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    gmail_email: gmailEmail,
    expires_at: new Date(tokens.expiry_date).toISOString(),
    // ... otros campos
  });
  
  // 4. Configuramos el Gmail Watch
  const watchResponse = await gmail.users.watch({
    userId: "me",
    requestBody: {
      labelIds: ["INBOX"],
      topicName: `projects/${projectId}/topics/gmail-notifications`,
    },
  });
  
  // 5. Guardamos la información del watch
  await supabase.from("gmail_watches").upsert({
    user_id: userId,
    gmail_email: gmailEmail,
    watch_id: watchResponse.data.historyId,
    // ... otros campos
  });
  
  // 6. Redirigimos al frontend con éxito
  res.redirect(`http://localhost:5173/settings?success=true`);
});
```

## Procesamiento de Webhooks Multi-Usuario

Cuando llega una notificación de Gmail vía Pub/Sub:

```typescript
app.post("/webhook", async (req, res) => {
  // 1. Decodificamos la notificación
  const data = decodeNotification(req.body.message.data);
  const gmailEmail = data.emailAddress;
  
  // 2. Buscamos los tokens del usuario en la DB
  const { data: tokenData } = await supabase
    .from("user_oauth_tokens")
    .select("*")
    .eq("gmail_email", gmailEmail)
    .single();
  
  // 3. Verificamos si el token necesita refrescarse
  if (tokenNeedsRefresh(tokenData)) {
    const { credentials } = await oAuth2Client.refreshAccessToken();
    // Actualizamos los tokens en la DB
    await supabase.from("user_oauth_tokens").update({
      access_token: credentials.access_token,
      expires_at: new Date(credentials.expiry_date).toISOString(),
    });
  }
  
  // 4. Procesamos el email con los tokens del usuario
  oAuth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  });
  
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  // ... procesar el email
});
```

## Configuración del Entorno

### Backend (`.env`)

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_PROJECT_ID=your_project_id
OAUTH_REDIRECT_URI=http://localhost:3001/auth/callback

# Pub/Sub
PUBSUB_TOPIC=gmail-notifications

# Supabase
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Frontend URL para redirects
FRONTEND_URL=http://localhost:3000
```

### Frontend (`.env`)

```bash
# Supabase
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your_anon_key

# Backend API
BACKEND_URL=http://localhost:3001
```

## Migraciones de Base de Datos

Ejecuta la migración para crear las tablas:

```bash
cd supabase
supabase db push
```

O aplica manualmente:

```bash
psql -h localhost -p 54322 -U postgres -d postgres -f migrations/20260117123342_create_multi_user_gmail_schema.sql
```

## Uso en Producción

### Consideraciones de Seguridad

1. **Tokens Encriptados**: Los tokens se almacenan en texto plano en la DB. Para producción, considera encriptarlos usando `pgcrypto`:

```sql
-- Ejemplo de encriptación
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Al guardar
INSERT INTO user_oauth_tokens (access_token) 
VALUES (pgp_sym_encrypt('token_value', 'encryption_key'));

-- Al leer
SELECT pgp_sym_decrypt(access_token::bytea, 'encryption_key') 
FROM user_oauth_tokens;
```

2. **Row Level Security (RLS)**: Habilita RLS en las tablas para que los usuarios solo puedan acceder a sus propios tokens:

```sql
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own tokens"
ON user_oauth_tokens
FOR ALL
USING (auth.uid() = user_id);
```

3. **HTTPS**: En producción, asegúrate de usar HTTPS para todas las comunicaciones.

### Renovación Automática de Watches

Los Gmail watches expiran después de 7 días. Implementa un cron job para renovarlos:

```typescript
// Ejemplo de renovación automática
async function renewExpiredWatches() {
  const { data: watches } = await supabase
    .from("gmail_watches")
    .select("*")
    .lt("expiration", new Date().toISOString())
    .eq("is_active", true);
  
  for (const watch of watches) {
    // Renovar cada watch...
  }
}
```

## Testing

Para probar el flujo completo:

1. Inicia Supabase local: `supabase start`
2. Aplica las migraciones
3. Inicia el backend: `cd packages/backend && bun dev`
4. Inicia el frontend: `cd packages/frontend && bun dev`
5. Regístrate como usuario
6. Ve a `/settings` y haz clic en "Conectar Gmail"
7. Autoriza la aplicación en Google
8. Envía un email de prueba a la cuenta conectada
9. Verifica que el webhook reciba la notificación

## Troubleshooting

### Error: "Missing userId parameter"
- Asegúrate de que el usuario esté autenticado antes de intentar conectar Gmail
- Verifica que `user.id` esté disponible en el frontend

### Error: "No se encontraron tokens para: email@gmail.com"
- El usuario no ha completado el flujo OAuth
- Verifica que los tokens se guardaron correctamente en la DB

### Tokens expirados
- El sistema debería refrescar automáticamente los tokens usando el `refresh_token`
- Si no hay `refresh_token`, el usuario debe volver a autorizar

### Watch expirado
- Los watches de Gmail expiran después de 7 días
- Implementa un sistema de renovación automática
