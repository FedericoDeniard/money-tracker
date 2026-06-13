import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
import { chatRoute } from "@mastra/ai-sdk";
import { MastraAuthSupabase } from "@mastra/auth-supabase";
import { getAuthenticatedUser } from "@mastra/server/auth";
import { RequestContext } from "@mastra/core/request-context";
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
    auth: new MastraAuthSupabase({
      url: process.env.SUPABASE_URL!,
      anonKey: process.env.SUPABASE_ANON_KEY!,
      authorizeUser: async () => true,
      mapUserToResourceId: user => user.id,
      protected: ["/chat/*"],
      public: [["/api/*", "GET"]],
    }),
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
        version: "v6",
      }),
    ],
    middleware: [
      async (context, next) => {
        // server.middleware runs BEFORE the per-route auth check, so the user
        // is not yet in requestContext. Resolve it here via the configured
        // auth provider. The per-route check that follows re-validates and
        // also populates requestContext (and MASTRA_RESOURCE_ID_KEY via
        // mapUserToResourceId), so this is purely additive.
        const authHeader = context.req.header("authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "");

        if (token) {
          const user = await getAuthenticatedUser<{ id: string }>({
            mastra: context.get("mastra"),
            token,
            request: context.req.raw,
          });

          const requestContext = context.get(
            "requestContext"
          ) as RequestContext;
          if (user?.id) {
            requestContext.set("userId", user.id);
          }
          requestContext.set("supabaseToken", token);
        }

        await next();
      },
    ],
  },
});
