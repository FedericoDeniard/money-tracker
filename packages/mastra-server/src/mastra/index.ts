import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
import { MastraAuthSupabase } from "@mastra/auth-supabase";
import { getAuthenticatedUser } from "@mastra/server/auth";
import { RequestContext } from "@mastra/core/request-context";
import { financialAgent } from "./agents/financial-agent";
import { resilientChatRoute } from "./routes/resilient-chat-route";

const storage = new PostgresStore({
  id: "mastra-storage",
  connectionString: process.env.SUPABASE_DB_URL!,
});

const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://0.0.0.0:3000",
];

/**
 * Apply GRANTs + RLS + per-user policies to the tables that Mastra's
 * PostgresStore creates at runtime (mastra_threads, mastra_messages,
 * mastra_resources). Supabase's breaking change (changelog #45329, 2026-04-28,
 * full rollout 2026-10-30) made new tables in `public` opt-in via explicit
 * GRANTs; without this hook the frontend gets `permission denied for table
 * mastra_*` (HTTP 42501) on every history query after a fresh `db:reset` or
 * a brand-new project.
 *
 * Runs once at server startup, AFTER `storage.init()` so the tables are
 * guaranteed to exist. Idempotent: DROP POLICY IF EXISTS + CREATE POLICY,
 * GRANTs are no-ops on re-run.
 *
 * Failures are logged but never crash the server — Mastra's chat still works
 * server-side even if the frontend can't read history; the user just sees
 * empty history until the next restart retries the setup.
 */
async function ensureMastraTablesExposed(store: PostgresStore): Promise<void> {
  try {
    await store.init();

    const statements: string[] = [
      // --- Grants: authenticated can read/write; service_role has full access by default
      "GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastra_threads TO authenticated",
      "GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastra_messages TO authenticated",
      "GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastra_resources TO authenticated",

      // --- Enable RLS on the three user-scoped tables
      "ALTER TABLE public.mastra_threads ENABLE ROW LEVEL SECURITY",
      "ALTER TABLE public.mastra_messages ENABLE ROW LEVEL SECURITY",
      "ALTER TABLE public.mastra_resources ENABLE ROW LEVEL SECURITY",

      // --- mastra_threads: scoped by resourceId == auth.uid()
      `DROP POLICY IF EXISTS "Users can read their own threads" ON public.mastra_threads`,
      `CREATE POLICY "Users can read their own threads"
         ON public.mastra_threads FOR SELECT TO authenticated
         USING ("resourceId" = auth.uid()::text)`,
      `DROP POLICY IF EXISTS "Users can create their own threads" ON public.mastra_threads`,
      `CREATE POLICY "Users can create their own threads"
         ON public.mastra_threads FOR INSERT TO authenticated
         WITH CHECK ("resourceId" = auth.uid()::text)`,
      `DROP POLICY IF EXISTS "Users can update their own threads" ON public.mastra_threads`,
      `CREATE POLICY "Users can update their own threads"
         ON public.mastra_threads FOR UPDATE TO authenticated
         USING ("resourceId" = auth.uid()::text)
         WITH CHECK ("resourceId" = auth.uid()::text)`,
      `DROP POLICY IF EXISTS "Users can delete their own threads" ON public.mastra_threads`,
      `CREATE POLICY "Users can delete their own threads"
         ON public.mastra_threads FOR DELETE TO authenticated
         USING ("resourceId" = auth.uid()::text)`,

      // --- mastra_messages: scoped via the parent thread's resourceId
      `DROP POLICY IF EXISTS "Users can read messages from their own threads" ON public.mastra_messages`,
      `CREATE POLICY "Users can read messages from their own threads"
         ON public.mastra_messages FOR SELECT TO authenticated
         USING (
           thread_id IN (
             SELECT id FROM public.mastra_threads WHERE "resourceId" = auth.uid()::text
           )
         )`,
      `DROP POLICY IF EXISTS "Users can insert messages into their own threads" ON public.mastra_messages`,
      `CREATE POLICY "Users can insert messages into their own threads"
         ON public.mastra_messages FOR INSERT TO authenticated
         WITH CHECK (
           thread_id IN (
             SELECT id FROM public.mastra_threads WHERE "resourceId" = auth.uid()::text
           )
         )`,
      `DROP POLICY IF EXISTS "Users can update messages in their own threads" ON public.mastra_messages`,
      `CREATE POLICY "Users can update messages in their own threads"
         ON public.mastra_messages FOR UPDATE TO authenticated
         USING (
           thread_id IN (
             SELECT id FROM public.mastra_threads WHERE "resourceId" = auth.uid()::text
           )
         )`,
      `DROP POLICY IF EXISTS "Users can delete messages in their own threads" ON public.mastra_messages`,
      `CREATE POLICY "Users can delete messages in their own threads"
         ON public.mastra_messages FOR DELETE TO authenticated
         USING (
           thread_id IN (
             SELECT id FROM public.mastra_threads WHERE "resourceId" = auth.uid()::text
           )
         )`,

      // --- mastra_resources: id == auth.uid()
      `DROP POLICY IF EXISTS "Users can read their own working memory" ON public.mastra_resources`,
      `CREATE POLICY "Users can read their own working memory"
         ON public.mastra_resources FOR SELECT TO authenticated
         USING (id = auth.uid()::text)`,
      `DROP POLICY IF EXISTS "Users can write their own working memory" ON public.mastra_resources`,
      `CREATE POLICY "Users can write their own working memory"
         ON public.mastra_resources FOR INSERT TO authenticated
         WITH CHECK (id = auth.uid()::text)`,
      `DROP POLICY IF EXISTS "Users can update their own working memory" ON public.mastra_resources`,
      `CREATE POLICY "Users can update their own working memory"
         ON public.mastra_resources FOR UPDATE TO authenticated
         USING (id = auth.uid()::text)
         WITH CHECK (id = auth.uid()::text)`,
      `DROP POLICY IF EXISTS "Users can delete their own working memory" ON public.mastra_resources`,
      `CREATE POLICY "Users can delete their own working memory"
         ON public.mastra_resources FOR DELETE TO authenticated
         USING (id = auth.uid()::text)`,
    ];

    for (const sql of statements) {
      await store.db.none(sql);
    }
    console.log(
      "[mastra] GRANTs + RLS policies applied to mastra_* tables (idempotent)"
    );
  } catch (err) {
    console.error(
      "[mastra] failed to apply GRANTs/RLS to mastra_* tables. " +
        "Frontend history queries will return 42501 until this is fixed. " +
        "Original error:",
      err
    );
  }
}

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
    apiRoutes: [resilientChatRoute()],
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

// Apply GRANTs + RLS to Mastra's runtime-created tables. See
// ensureMastraTablesExposed() for the rationale. Runs once at server startup;
// PostgresStore.init() is called inside it to create the tables if missing.
await ensureMastraTablesExposed(storage);
