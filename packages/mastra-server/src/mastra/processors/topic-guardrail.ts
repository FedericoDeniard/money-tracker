import type { Processor, ProcessInputArgs } from "@mastra/core/processors";
import type { MastraDBMessage } from "@mastra/core/memory";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const BLOCK_THRESHOLD = 0.85;

const SYSTEM_PROMPT = `You are a strict topic classifier for "Money Tracker", a personal finance assistant.

DOMAIN (the assistant only answers these):
- Personal finance: transactions, purchases, expenses, income, subscriptions, recurring charges, bills, budgets, saving, financial planning
- Usage of the Money Tracker app itself (how to do X in the app)
- General small-talk about money or the user's finances

OFF-TOPIC (must be blocked):
- Code/programming requests (any language: JavaScript, Python, etc.)
- General knowledge (history, politics, geography, science, sports, entertainment)
- Anything unrelated to personal finance or Money Tracker

INPUT FORMAT:
You receive "Recent conversation" (up to 4 most recent user/assistant messages) followed by "User's latest message".
The user's latest message may be in Spanish or English. Use the recent conversation to resolve follow-up references.

FOLLOW-UP RESOLUTION (important):
Short follow-up messages must be interpreted in the context of the conversation:
- "Por que?" / "Why?" / "Y?" / "And?" / "Como?" / "How?" → almost always ON-TOPIC if there's prior financial context. They are continuations, not new topics.
- "gracias" / "thanks" / "ok" / "dale" → ON-TOPIC.
- "que podes hacer?" / "what can you do?" → ON-TOPIC (asking about app capabilities).

CONFIDENCE:
- High confidence (>0.85): the latest message is unambiguously off-topic on its own, regardless of context.
- Low confidence (<0.85): ambiguous, follow-up, or could plausibly be on-topic. When in doubt, lean permissive (isOffTopic=false).

Respond ONLY with a JSON object:
{
  "isOffTopic": boolean,
  "confidence": number between 0 and 1,
  "reason": string (brief explanation in English)
}`;

function getTextFromMessage(msg: MastraDBMessage): string {
  const parts = msg.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter(p => p?.type === "text")
    .map(p => (p as { text?: string }).text ?? "")
    .join("\n")
    .trim();
}

export class TopicGuardrailProcessor implements Processor {
  readonly id = "topic-guardrail";
  private model;

  constructor() {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY ?? "",
    });
    const modelName =
      process.env.OPENROUTER_GUARDRAIL_MODEL ?? "openai/gpt-5-nano";
    this.model = openrouter(modelName);
  }

  async processInput({
    messages,
    abort,
  }: ProcessInputArgs): Promise<MastraDBMessage[]> {
    let shouldAbort = false;
    let abortReason = "";
    const latestUserMsg = messages.filter(m => m.role === "user").at(-1);

    try {
      if (!latestUserMsg) {
        return messages;
      }

      const userText = getTextFromMessage(latestUserMsg);
      if (!userText.trim()) {
        return messages;
      }

      const recentContext = messages
        .filter(m => m.role === "user" || m.role === "assistant")
        .slice(-4)
        .map(m => `${m.role.toUpperCase()}: ${getTextFromMessage(m)}`)
        .join("\n");

      const prompt = recentContext
        ? `Recent conversation:\n${recentContext}\n\nUser's latest message: ${userText}`
        : `User's latest message: ${userText}`;

      const { text: responseText } = await generateText({
        model: this.model,
        system: SYSTEM_PROMPT,
        prompt,
        temperature: 0,
      });

      let parsed: {
        isOffTopic?: boolean;
        confidence?: number;
        reason?: string;
      };
      try {
        parsed = JSON.parse(responseText);
      } catch {
        return messages;
      }

      const isOffTopic = parsed.isOffTopic === true;
      const confidence =
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0;

      if (isOffTopic && confidence >= BLOCK_THRESHOLD) {
        shouldAbort = true;
        abortReason = parsed.reason ?? "";
      }
    } catch {
      // Fail-open: if anything goes wrong, let the main agent handle it.
    }

    if (shouldAbort) {
      // The abort() throws a TripWire error that ends processing. The reason is
      // emitted as a `tripwire` chunk in the stream, which the @mastra/ai-sdk
      // adapter converts to a `data-tripwire` part on the client.
      abort(
        "Solo puedo ayudarte con tus finanzas y transacciones en Money Tracker.",
        {
          metadata: {
            reason: abortReason,
            processorId: "topic-guardrail",
          },
        }
      );
    }

    return messages;
  }
}
