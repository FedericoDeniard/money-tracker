import type { Context } from "hono";
import { handleChatStream } from "@mastra/ai-sdk";
import { RequestContext } from "@mastra/core/request-context";
import { mastra } from "../index";

/**
 * Replacement for the default `chatRoute` from `@mastra/ai-sdk` that
 * does NOT propagate the Hono request's abort signal to the agent.
 *
 * The default route does:
 *
 *   params: { ...params, abortSignal: c.req.raw.signal }
 *
 * which reaches the LLM call as `fetch(..., { signal })`. When the
 * client closes the tab the signal fires, the in-flight fetch to
 * OpenRouter is aborted, and the agent throws before persisting the
 * assistant message — so the user sees their prompt in the DB but
 * the AI's reply is gone.
 *
 * Our variant: run the agent end-to-end so the assistant message
 * gets saved to `mastra_messages` regardless of client state. The
 * response stream is still wired to the HTTP response so a live
 * client keeps getting chunks in real time; a disconnected client
 * just stops receiving them while the LLM keeps working in the
 * background. When the user reopens the thread the response is
 * already in the DB.
 *
 * We can't reuse `createUIMessageStreamResponse` from `@mastra/ai-sdk`
 * because it's not exported, so we replicate its transform pipeline
 * (JSON chunk -> SSE `data: ...\n\n` + terminal `data: [DONE]\n\n`)
 * inline below.
 */
class JsonToSseTransformStream extends TransformStream<unknown, string> {
  constructor() {
    super({
      transform(part, controller) {
        controller.enqueue(`data: ${JSON.stringify(part)}\n\n`);
      },
      flush(controller) {
        controller.enqueue(`data: [DONE]\n\n`);
      },
    });
  }
}

const UI_MESSAGE_STREAM_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache, no-transform",
  "x-accel-buffering": "no",
} as const;

export const chatHandler = async (c: Context) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const params = await c.req.json();

  // Build the Mastra RequestContext from the Hono variables populated
  // by `authMiddleware`. Tools declare their expected keys via
  // `requestContextSchema` and read them via `ctx.requestContext.get(...)`
  // or `ctx.requestContext!.all.<key>`. Today the keys we propagate are:
  //   - userId / supabaseToken (consumed by every data tool)
  //   - userTimezone (consumed by get-current-date)
  //   - userRole (consumed by tools that branch on tier / staff status)
  // A client-supplied `requestContext` in the body is merged on top so
  // callers can still override individual keys when they need to (used
  // by tests; production paths leave it empty).
  const serverRequestContext = new RequestContext();
  const supabaseToken = c.get("supabaseToken");
  const userTimezone = c.get("userTimezone");
  const userRole = c.get("userRole");
  if (supabaseToken) serverRequestContext.set("supabaseToken", supabaseToken);
  if (userTimezone) serverRequestContext.set("userTimezone", userTimezone);
  if (userRole) serverRequestContext.set("userRole", userRole);
  serverRequestContext.set("userId", userId);

  const clientRequestContext =
    (params.requestContext as Record<string, unknown> | undefined) ?? undefined;
  if (clientRequestContext) {
    for (const [key, value] of Object.entries(clientRequestContext)) {
      serverRequestContext.set(key, value);
    }
  }

  const agentId = c.req.param("agentId");
  if (!agentId) {
    return c.json({ error: "Agent ID is required" }, 400);
  }

  const queryVersionId = c.req.query("versionId");
  const rawStatus = c.req.query("status");
  if (queryVersionId && rawStatus) {
    return c.json(
      {
        error:
          'Query parameters "versionId" and "status" are mutually exclusive',
      },
      400
    );
  }
  if (rawStatus && rawStatus !== "draft" && rawStatus !== "published") {
    return c.json(
      { error: 'Query parameter "status" must be "draft" or "published"' },
      400
    );
  }

  const effectiveAgentVersion = queryVersionId
    ? { versionId: queryVersionId }
    : rawStatus
      ? { status: rawStatus as "draft" | "published" }
      : undefined;

  const uiMessageStream = await handleChatStream({
    mastra,
    agentId,
    agentVersion: effectiveAgentVersion,
    params: {
      ...params,
      requestContext: serverRequestContext,
    },
    version: "v6",
    sendStart: true,
    sendFinish: true,
    sendReasoning: false,
    sendSources: false,
  });

  const sseStream = (uiMessageStream as ReadableStream<unknown>).pipeThrough(
    new JsonToSseTransformStream()
  );

  return new Response(sseStream.pipeThrough(new TextEncoderStream()), {
    headers: { ...UI_MESSAGE_STREAM_HEADERS },
  });
};
