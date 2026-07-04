// Global auth middleware. Extracts the Supabase JWT from the Authorization
// header, validates it, and populates the Hono request context with userId
// and the raw token. Routes that need an authenticated user read c.get("userId")
// or c.get("supabaseToken"); routes that don't can ignore these.
//
// This replaces the equivalent middleware that used to live inside
// `mastra/index.ts`. We now resolve the user via Supabase's own getUser()
// instead of getAuthenticatedUser (which expects a Mastra request context
// that may not be available in every adapter setup).
import { createClient } from "@supabase/supabase-js";
import type { MiddlewareHandler } from "hono";

declare module "hono" {
  interface ContextVariableMap {
    userId?: string;
    supabaseToken?: string;
    userTimezone?: string;
  }
}

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }
  return supabaseClient;
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (token) {
    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (user?.id) {
      c.set("userId", user.id);
    }
    c.set("supabaseToken", token);

    const timezone = c.req.header("x-user-timezone");
    if (timezone) {
      c.set("userTimezone", timezone);
    }
  }

  await next();
};
