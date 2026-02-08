import { Langfuse } from "npm:langfuse";

let client: Langfuse | null = null;
let envLogged = false;

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

function getClient(): Langfuse {
  if (!client) {
    client = new Langfuse({
      publicKey: Deno.env.get('LANGFUSE_PUBLIC_KEY') ?? '',
      secretKey: Deno.env.get('LANGFUSE_SECRET_KEY') ?? '',
      baseUrl: Deno.env.get('LANGFUSE_BASE_URL') ?? 'https://cloud.langfuse.com',
      flushAt: 1, // Critical for serverless - flush immediately
    });
    logLangfuseEnvOnce();
  }
  return client;
}

// Simple trace wrapper for operations using native SDK
export async function traceOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  input?: any
): Promise<T> {
  const langfuse = getClient();
  
  const trace = langfuse.trace({
    name: operationName,
    input: input ? (typeof input === 'object' ? JSON.stringify(input) : String(input)) : undefined,
  });

  try {
    const result = await operation();
    
    trace.update({
      output: typeof result === 'object' ? JSON.stringify(result) : String(result),
    });
    
    return result;
  } catch (error) {
    trace.update({
      output: `Error: ${error instanceof Error ? error.message : String(error)}`,
    });
    throw error;
  }
}

// Optimized flush for serverless using EdgeRuntime.waitUntil
export async function flushLangfuse(): Promise<void> {
  if (client) {
    try {
      // Use EdgeRuntime.waitUntil for non-blocking async sending
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(client.shutdownAsync());
        console.log('[Langfuse] Flush scheduled with EdgeRuntime.waitUntil');
      } else {
        // Fallback for local development
        await client.shutdownAsync();
        console.log('[Langfuse] Flush completed (fallback)');
      }
    } catch (error) {
      console.error('[Langfuse] Flush error', error);
    }
  }
}
