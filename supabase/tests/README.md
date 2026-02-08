# Supabase Edge Functions Testing Suite

Este suite de testing local valida todas las Edge Functions de Supabase con datos mock antes del deployment.

## 🚀 **Ejecución Rápida**

```bash
# Iniciar Supabase local
supabase start

# Ejecutar todos los tests
deno test --allow-all

# Ejecutar tests específicos
deno test --allow-all tests/auth-start.test.ts
deno test --allow-all tests/seed-emails.test.ts
deno test --allow-all tests/gmail-webhook.test.ts
deno test --allow-all tests/shared/
```

## 📁 **Estructura de Tests**

```
tests/
├── package.json                 # Configuración de Deno
├── README.md                    # Este archivo
├── helpers/
│   ├── mock-data.ts            # Datos de prueba realistas
│   ├── test-utils.ts           # Utilidades de testing
│   └── supabase-mock.ts        # Mock de Supabase client
├── auth-start.test.ts          # Tests de OAuth initiation
├── seed-emails.test.ts         # Tests de procesamiento histórico
├── gmail-webhook.test.ts       # Tests de webhook real-time
└── shared/
    ├── ai.test.ts              # Tests de extracción con IA
    └── encryption.test.ts      # Tests de encriptación
```

## 🧪 **Casos de Test Cubiertos**

### **OAuth Flow**
- ✅ Token válido → URL OAuth generada
- ✅ Token inválido → Error 401
- ✅ CORS preflight
- ✅ Parámetros OAuth correctos

### **Procesamiento de Emails**
- ✅ Creación de seed jobs
- ✅ Validación de ownership
- ✅ Prevención de duplicados
- ✅ Integración Gmail API
- ✅ Manejo de errores

### **Webhook Real-time**
- ✅ Mensajes Pub/Sub válidos
- ✅ Deduplicación de mensajes
- ✅ Procesamiento con IA
- ✅ Refresh de tokens
- ✅ Procesamiento de adjuntos

### **Componentes Compartidos**
- ✅ Extracción con IA (Grok)
- ✅ Encriptación AES-256-GCM
- ✅ Fallback a base64
- ✅ Manejo de errores

## 📊 **Mock Data**

### **Usuarios y Tokens**
```typescript
mockUsers.valid        // Usuario con nombre completo
mockUsers.noName       // Usuario sin nombre
mockTokens.valid       // JWT válido
mockTokens.expired     // JWT expirado
```

### **Emails de Gmail**
```typescript
mockGmailMessages.transactionEmail    // Email con transacción
mockGmailMessages.nonTransactionEmail  // Email sin transacción
mockGmailMessages.emailWithPDF        // Email con PDF adjunto
mockGmailMessages.emailWithImage       // Email con imagen adjunta
```

### **Respuestas IA**
```typescript
mockAIResponses.transaction      // IA detecta transacción
mockAIResponses.noTransaction     // IA no detecta transacción
mockAIResponses.error             // Error en servicio IA
```

## 🔧 **Configuración de Tests**

### **Variables de Entorno Mock**
```typescript
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=mock-anon-key
GOOGLE_CLIENT_ID=mock-google-client-id
GOOGLE_CLIENT_SECRET=mock-google-client-secret
XAI_API_KEY=mock-xai-key
ENCRYPTION_SECRET=mock-encryption-secret-32-chars-long
```

### **APIs Mock**
- **Gmail API**: Respuestas simuladas de messages, attachments, history
- **OAuth2**: Token exchange y refresh
- **Grok AI**: Extracción de transacciones
- **Supabase**: Operaciones de base de datos

## 📋 **Escenarios de Error Testeados**

### **Autenticación**
- Token faltante o inválido
- Token expirado
- Headers incorrectos

### **Procesamiento**
- Gmail API errors
- Tokens no encontrados
- Emails sin contenido
- Adjuntos muy grandes

### **IA**
- Service unavailable
- Respuestas inválidas
- Timeout en procesamiento

### **Base de Datos**
- Conexiones fallidas
- Duplicados
- Permisos denegados

## 🎯 **Validaciones Clave**

### **Funcionales**
- ✅ OAuth flow completo
- ✅ Extracción de transacciones precisa
- ✅ Procesamiento de adjuntos
- ✅ Encriptación segura
- ✅ Manejo de errores robusto

### **Integración**
- ✅ Conexión a Supabase local
- ✅ Mock APIs responden correctamente
- ✅ Pipeline completo funciona
- ✅ Idempotencia en webhook

### **Seguridad**
- ✅ Tokens inválidos rechazados
- ✅ Validación de ownership
- ✅ Encriptación de datos sensibles

## 🚨 **Errores Comunes**

### **TypeScript Errors**
Los errores de TypeScript son normales en el entorno Deno de Supabase. Las funciones globales (`Deno`, `Response`, `console`) están disponibles en runtime.

### **Import Errors**
Asegúrate de que las Edge Functions exporten correctamente:
```typescript
// En functions/auth-start/index.ts
Deno.serve(async (req: Request) => { ... })
```

### **Mock Failures**
Si los mocks no funcionan, verifica que `setupMocks()` se llame antes de cada test.

## 📈 **Métricas de Testing**

```bash
# Ejecutar con coverage
deno test --allow-all --coverage tests/

# Ver reporte de coverage
open coverage/index.html
```

### **Coverage Objetivo**
- **Edge Functions**: 95%+ coverage
- **Shared Components**: 90%+ coverage
- **Error Cases**: 100% coverage

## 🔍 **Debugging**

### **Logs de Tests**
Los tests usan logging con prefijo `[TEST]`:
```typescript
console.log('[TEST]', 'Mock data loaded')
```

### **Inspect Responses**
```typescript
const response = await authStart(request)
const result = await parseResponse(response)
console.log('Response:', result)
```

### **Mock Overrides**
```typescript
// Override mocks específicos para un test
globalThis.fetch = async (input, init) => {
  // Custom mock logic
}
```

## 📝 **Agregar Nuevos Tests**

1. **Crear mock data** en `helpers/mock-data.ts`
2. **Agregar test case** en el archivo apropiado
3. **Usar utilidades** de `helpers/test-utils.ts`
4. **Verificar coverage** con `deno test --coverage`

### **Template de Test**
```typescript
Deno.test('test-name', async () => {
  setupMocks()
  
  try {
    // Test logic here
    assertEquals(actual, expected)
  } finally {
    cleanupMocks()
  }
})
```

## ✅ **Próximos Pasos**

1. **Ejecutar tests localmente** para validar implementación
2. **Corregir failures** si existen
3. **Verificar coverage** > 90%
4. **Deploy a Supabase** con confianza

Este suite asegura que las Edge Functions funcionen idénticamente al backend original antes del deployment.
