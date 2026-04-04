import { Langfuse } from "npm:langfuse";

let client: Langfuse | null = null;
let envLogged = false;

function logLangfuseEnvOnce() {
  if (envLogged) return;
  envLogged = true;

  try {
    const hasSecret = Boolean(Deno.env.get("LANGFUSE_SECRET_KEY"));
    const hasPublic = Boolean(Deno.env.get("LANGFUSE_PUBLIC_KEY"));
    const baseUrl = Deno.env.get("LANGFUSE_BASE_URL") ?? "missing";

    console.log("[Langfuse]", {
      secretKey: hasSecret ? "✓" : "✗",
      publicKey: hasPublic ? "✓" : "✗",
      baseUrl,
    });
  } catch (error) {
    console.error("[Langfuse] Unable to read environment variables", error);
  }
}

function getClient(): Langfuse {
  if (!client) {
    client = new Langfuse({
      publicKey: Deno.env.get("LANGFUSE_PUBLIC_KEY") ?? "",
      secretKey: Deno.env.get("LANGFUSE_SECRET_KEY") ?? "",
      baseUrl:
        Deno.env.get("LANGFUSE_BASE_URL") ?? "https://cloud.langfuse.com",
      flushAt: 1, // Critical for serverless - flush immediately
    });
    logLangfuseEnvOnce();
  }
  return client;
}

// Enhanced trace wrapper with generation tracking for token/cost
export async function traceOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  input?: any
): Promise<T> {
  const langfuse = getClient();
  const operationStartTime = new Date();

  // For trace-level input, omit the messages array to keep it concise (just metadata).
  const traceInput = input
    ? (() => {
        const { messages: _messages, ...meta } = input as any;
        const hasMeta = Object.keys(meta).length > 0;
        return hasMeta
          ? JSON.stringify(meta)
          : typeof input === "object"
            ? JSON.stringify(input)
            : String(input);
      })()
    : undefined;

  const trace = langfuse.trace({
    name: operationName,
    input: traceInput,
  });

  try {
    const result = await operation();
    const operationEndTime = new Date();
    const serializedOutput =
      typeof result === "object" ? JSON.stringify(result) : String(result);

    // Always persist output, even when usage is missing/null.
    trace.update({
      output: serializedOutput,
    });

    // If input has a messages array, pass it directly so Langfuse renders the
    // chat view with system/user roles. Otherwise fall back to a plain string.
    const generationInput = (input as any)?.messages
      ? (input as any).messages
      : input
        ? typeof input === "object"
          ? JSON.stringify(input)
          : String(input)
        : undefined;

    // Check if result contains AI usage information (from AI SDK)
    const usage =
      result && typeof result === "object" && "usage" in result
        ? (result as any).usage
        : null;

    const usagePayload =
      usage && typeof usage === "object"
        ? {
            input: usage.inputTokens || 0,
            output: usage.outputTokens || 0,
            total:
              usage.totalTokens ||
              (usage.inputTokens || 0) + (usage.outputTokens || 0),
          }
        : undefined;

    trace.generation({
      name: "ai-completion",
      model: "grok-4-1-fast-non-reasoning",
      input: generationInput,
      output: serializedOutput,
      startTime: operationStartTime,
      endTime: operationEndTime,
      ...(usagePayload ? { usage: usagePayload } : {}),
    });

    if (usagePayload) {
      console.log("[Langfuse] Generation with usage tracked", {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
      });
    }

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
        console.log("[Langfuse] Flush scheduled with EdgeRuntime.waitUntil");
      } else {
        // Fallback for local development
        await client.shutdownAsync();
        console.log("[Langfuse] Flush completed (fallback)");
      }
    } catch (error) {
      console.error("[Langfuse] Flush error", error);
    }
  }
}
