import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { PromptInjectionDetector } from "@mastra/core/processors";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  FINANCIAL_AGENT_INSTRUCTIONS,
  THREAD_TITLE_INSTRUCTIONS,
} from "./prompts";
import { TopicGuardrailProcessor } from "../processors/topic-guardrail";
import { listTransactionsTool } from "../tools/list-transactions";
import { listSubscriptionsTool } from "../tools/list-subscriptions";
import { calculateTool } from "../tools/calculate";
import { createTransactionTool } from "../tools/create-transaction";
import { getSpendingSummaryTool } from "../tools/get-spending-summary";
import { updateTransactionTool } from "../tools/update-transaction";
import { deleteTransactionTool } from "../tools/delete-transaction";
import { getCurrentDateTool } from "../tools/get-current-date";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const FINANCIAL_AGENT_MODEL =
  process.env.OPENROUTER_FINANCIAL_AGENT_MODEL ?? "google/gemma-4-31b-it";
const THREAD_TITLE_MODEL =
  process.env.OPENROUTER_THREAD_TITLE_MODEL ?? "google/gemini-2.5-flash-lite";
const GUARDRAIL_MODEL =
  process.env.OPENROUTER_GUARDRAIL_MODEL ?? "openai/gpt-5-nano";

export const financialAgent = new Agent({
  id: "financial-agent",
  name: "Financial Assistant",
  instructions: FINANCIAL_AGENT_INSTRUCTIONS,
  model: openrouter(FINANCIAL_AGENT_MODEL),
  memory: new Memory({
    options: {
      lastMessages: 50,
      workingMemory: { enabled: true },
      generateTitle: {
        model: openrouter(THREAD_TITLE_MODEL),
        instructions: THREAD_TITLE_INSTRUCTIONS,
      },
    },
  }),
  tools: {
    listTransactionsTool,
    listSubscriptionsTool,
    calculateTool,
    createTransactionTool,
    getSpendingSummaryTool,
    updateTransactionTool,
    deleteTransactionTool,
    getCurrentDateTool,
  },
  inputProcessors: [
    new PromptInjectionDetector({
      model: openrouter(GUARDRAIL_MODEL),
      threshold: 0.8,
      strategy: "block",
      // Exclude data-exfiltration and tool-exfiltration: this is a financial
      // agent whose entire job is to access the user's transactions, so the
      // model legitimately handles sensitive data and uses tools. Those
      // categories only catch legitimate use cases as false positives.
      // Keep injection, jailbreak, system-override, and role-manipulation
      // to defend against real prompt-injection attacks.
      detectionTypes: [
        "injection",
        "jailbreak",
        "system-override",
        "role-manipulation",
      ],
    }),
    new TopicGuardrailProcessor(),
  ],
});
