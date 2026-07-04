// Standalone Hono server for the mastra-server package.
//
// Architecture:
//   - This file is the entrypoint (`bun src/server.ts`).
//   - Hono handles all HTTP, middleware, and routing.
//   - Mastra is mounted via @mastra/hono adapter and only owns AI
//     agent routes (`/api/agents/*`).
//   - Our own API routes (seed-emails, etc.) live on the same Hono
//     app, registered explicitly. They don't go through Mastra's
//     server middleware.
//
// IMPORTANT: the .env file is loaded explicitly below. Bun auto-loads
// .env when invoked directly (`bun src/server.ts`), but pnpm strips
// the env before spawning Bun, so without this loader the API keys
// arrive as undefined and OpenRouter/xAI reject the requests with
// 401. Keep this at the top of the file, before any import that
// reads process.env at module init time.
import { Hono } from "hono";
import { MastraServer } from "@mastra/hono";
import { corsMiddleware } from "./middleware/cors";
import { authMiddleware } from "./middleware/auth";
import { seedEmailsHandler } from "./mastra/routes/seed-emails-route";
import { chatHandler } from "./mastra/routes/resilient-chat-route";
import { mastra } from "./mastra";

// Load .env from the current working directory. Don't override vars
// already set by the shell (so prod envs can still inject secrets).
const envFile = Bun.file(".env");
if (await envFile.exists()) {
  const text = await envFile.text();
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const app = new Hono();

app.use("*", corsMiddleware);
app.use("*", authMiddleware);

app.get("/health", c => c.json({ status: "ok" }));

app.post("/api/seed-emails", seedEmailsHandler);
app.post("/chat/:agentId", chatHandler);

const server = new MastraServer({ app, mastra });
await server.init();

const port = Number(process.env.MASTRA_PORT) || 4111;
console.log(`[server] Listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
