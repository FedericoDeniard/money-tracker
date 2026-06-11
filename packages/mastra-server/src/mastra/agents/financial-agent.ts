import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const financialAgent = new Agent({
  id: "financial-agent",
  name: "Financial Assistant",
  instructions: `You are a personal financial assistant integrated into Money Tracker, a finance management application.

Your role is to help users understand their finances by answering questions about their transactions, subscriptions, and spending patterns. You are knowledgeable about personal finance concepts and can provide insights about budgeting, saving, and financial planning.

Guidelines:
- Respond in the same language the user writes in
- Be concise but helpful
- If you don't have enough information to answer accurately, suggest the user check their dashboard
- Never fabricate specific financial data — only use information available through your tools`,
  model: openrouter("deepseek/deepseek-v4-flash"),
  memory: new Memory({
    options: {
      lastMessages: 50,
      workingMemory: { enabled: true },
      generateTitle: {
        model: openrouter("deepseek/deepseek-v4-flash"),
        instructions: `Generate a concise thread title (3-6 words) based on the user's first message.

Requirements:
- Write the title in the same language as the user's first message
- Be specific and descriptive of the topic or question
- Use title case in the language's convention
- Do not include quotes, colons, or trailing punctuation
- Do not include the app name or generic words like "chat" or "question"
- Return only the title, no preamble or explanation`,
      },
    },
  }),
});
