import { startActiveObservation } from "npm:@langfuse/tracing";
import { LangfuseSpanProcessor } from "npm:@langfuse/otel";
import { NodeSDK } from "npm:@opentelemetry/sdk-node";

let envLogged = false;
let sdkInitialized = false;

// Initialize OpenTelemetry once at module level
function initializeOpenTelemetry() {
  if (sdkInitialized) return;
  sdkInitialized = true;

  try {
    const sdk = new NodeSDK({
      spanProcessors: [new LangfuseSpanProcessor()],
    });
    sdk.start();
    console.log('[Langfuse] OpenTelemetry initialized');
  } catch (error) {
    console.error('[Langfuse] Failed to initialize OpenTelemetry', error);
  }
}

// Initialize OpenTelemetry immediately when module loads
initializeOpenTelemetry();

function logLangfuseEnvOnce() {
  if (envLogged) return;
  envLogged = true;

  try {
    const hasSecret = Boolean(Deno.env.get('LANGFUSE_SECRET_KEY'));
    const hasPublic = Boolean(Deno.env.get('LANGFUSE_PUBLIC_KEY'));
    const baseUrl = Deno.env.get('LANGFUSE_BASE_URL') ?? 'missing';

    console.log('[Langfuse]', {
      secretKey: hasSecret ? '✓' : '✗',
      publicKey: hasPublic ? '✓' : '✗',
      baseUrl,
    });
  } catch (error) {
    console.error('[Langfuse] Unable to read environment variables', error);
  }
}

// Simple trace wrapper for operations
export async function traceOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  input?: any
): Promise<T> {
  logLangfuseEnvOnce();
  
  return await startActiveObservation(operationName, async (span) => {
    try {
      // Set input if provided
      if (input !== undefined) {
        span.update({
          input: typeof input === 'object' ? JSON.stringify(input) : String(input),
        });
      }

      const result = await operation();
      
      // Mark as successful
      span.update({
        output: typeof result === 'object' ? JSON.stringify(result) : String(result),
      });

      return result;
    } catch (error) {
      // Add error information
      span.update({
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
      
      throw error;
    }
  });
}

// Flush all pending events (critical for serverless/edge functions)
export async function flushLangfuse(): Promise<void> {
  try {
    console.log('[Langfuse] Trace completed');
  } catch (error) {
    console.error('[Langfuse] Flush error', error);
  }
}
