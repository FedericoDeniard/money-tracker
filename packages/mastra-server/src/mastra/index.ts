import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
import { chatRoute } from "@mastra/ai-sdk";
import { financialAgent } from "./agents/financial-agent";

const storage = new PostgresStore({
  id: "mastra-storage",
  connectionString: process.env.SUPABASE_DB_URL!,
});

const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://0.0.0.0:3000",
];

const corsOrigins =
  process.env.MASTRA_CORS_ORIGIN?.split(",")
    .map(s => s.trim())
    .filter(Boolean) ?? defaultOrigins;

export const mastra = new Mastra({
  agents: { financialAgent },
  storage,
  server: {
    port: Number(process.env.MASTRA_PORT) || 4111,
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
        version: "v6",
      }),
    ],
  },
});
