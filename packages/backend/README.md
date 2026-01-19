# backend

## Instalación

Para instalar dependencias:

```bash
bun install
```

## Variables de Entorno

Este proyecto requiere las siguientes variables de entorno:

- `XAI_API_KEY`: API key para xAI Grok (modelo principal - **REQUERIDO**)
- `DEEPSEEK_API_KEY`: API key para DeepSeek (fallback/testing)
- `LANGSMITH_API_KEY`: API key para LangSmith (observabilidad)
- `SUPABASE_URL`: URL del proyecto de Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key de Supabase

Crea un archivo `.env` en la raíz del backend con estas variables.

## Modelo de IA en Producción

🚀 **Actualmente usando: Grok Non-Reasoning (`grok-4-1-fast-non-reasoning`)**

### ¿Por qué Grok?
Basado en pruebas exhaustivas comparando DeepSeek vs Grok:
- ✅ **100% de precisión** en detección de transacciones (vs 84.6% de DeepSeek)
- ⚡ **4x más rápido** (~1s por email vs ~4s)
- 🎯 **0 falsos positivos** (crítico para evitar datos incorrectos)
- 💰 Más económico (sin overhead de razonamiento)

Ver `/tests/test-model-comparison.ts` para resultados detallados.

## Ejecución

Para ejecutar en modo desarrollo:

```bash
bun run dev
```

Para ejecutar en producción:

```bash
bun run start
```

## Tests

Para ejecutar los tests:

```bash
# Test de detección de transacciones
bun run tests/test-transaction-detection.ts

# Test comparativo entre modelos (DeepSeek vs Grok)
bun run tests/test-model-comparison.ts
```

## Acerca del proyecto

Este proyecto fue creado usando `bun init` en bun v1.2.20. [Bun](https://bun.com) es un runtime de JavaScript rápido y todo en uno.
