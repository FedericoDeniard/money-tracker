import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  FINANCIAL_AGENT_INSTRUCTIONS,
  THREAD_TITLE_INSTRUCTIONS,
} from "./prompts";
import { listTransactionsTool } from "../tools/list-transactions";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const financialAgent = new Agent({
  id: "financial-agent",
  name: "Financial Assistant",
  instructions: FINANCIAL_AGENT_INSTRUCTIONS,
  model: openrouter("google/gemma-4-31b-it"),
  memory: new Memory({
    options: {
      lastMessages: 50,
      workingMemory: { enabled: true },
      generateTitle: {
        model: openrouter("google/gemini-2.5-flash-lite"),
        instructions: THREAD_TITLE_INSTRUCTIONS,
      },
    },
  }),
  tools: {
    listTransactionsTool,
  },
});
