import { createClient, type User } from "jsr:@supabase/supabase-js@2";

type JsonHeaders = Record<string, string>;

export type AuthContext =
  | { mode: "user"; user: User; token: string; role: UserRole }
  | { mode: "internal"; token: string };

/**
 * Application role for a user. Mirrors the `public.app_role` enum
 * defined in supabase/migrations/20260625125528_add_user_roles_and_access_token_hook.sql.
 *
 * Hierarchy: user(0) < tester(1) < admin(2). `hasMinRole(actual, required)`
 * returns true when `actual >= required`, so a `tester` minimum also admits
 * `admin`. To promote a user you must write to `public.user_roles` via a
 * service-role-backed context (the user cannot change their own role).
 */
export type UserRole = "user" | "tester" | "admin";

const ROLE_LEVEL: Readonly<Record<UserRole, number>> = Object.freeze({
  user: 0,
  tester: 1,
  admin: 2,
});

export function roleLevel(role: UserRole): number {
  return ROLE_LEVEL[role];
}

export function hasMinRole(actual: UserRole, required: UserRole): boolean {
  return roleLevel(actual) >= roleLevel(required);
}

const VALID_ROLES: ReadonlySet<string> = new Set<UserRole>([
  "user",
  "tester",
  "admin",
]);

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

function unauthorized(corsHeaders: JsonHeaders, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function forbidden(corsHeaders: JsonHeaders, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUserFromToken(token: string): Promise<User | null> {
  const supabase = createClient(
    // Use process.env (Node/Bun compat) instead of Deno.env so the same
    // shared module works in Supabase Edge Functions (Deno) and the
    // mastr-server (Bun). Deno supports process.env via Node compat.
    process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_ANON_KEY ?? ""
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Decode the payload of a Supabase access token.
 *
 * The token was already validated upstream (e.g. by `getUser`), so we only
 * need the base64-decoded payload to read custom claims such as `user_role`
 * that the custom_access_token_auth_hook injected. We do not verify the
 * signature here — and must not, because we do not have the signing key.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = parts[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Read the user's role from the JWT. The custom access token hook always
 * sets `user_role` to one of the enum values; if the claim is missing or
 * malformed (e.g. an older token issued before the hook was deployed) we
 * fall back to `user` so the caller always has a valid role to branch on.
 */
export function getRoleFromToken(token: string): UserRole {
  const payload = decodeJwtPayload(token);
  const claim = payload?.user_role;
  if (typeof claim === "string" && VALID_ROLES.has(claim)) {
    return claim as UserRole;
  }
  return "user";
}

export async function requireUserToken(
  token: string,
  corsHeaders: JsonHeaders
): Promise<{ user: User; role: UserRole } | Response> {
  if (!token) {
    return unauthorized(corsHeaders, "Missing authentication token");
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return unauthorized(corsHeaders, "Invalid or expired token");
  }

  return { user, role: getRoleFromToken(token) };
}

export async function requireUserAuth(
  req: Request,
  corsHeaders: JsonHeaders
): Promise<{ user: User; token: string; role: UserRole } | Response> {
  const token = getBearerToken(req);
  if (!token) {
    return unauthorized(corsHeaders, "Missing or invalid authorization header");
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return unauthorized(corsHeaders, "Invalid or expired token");
  }

  return { user, token, role: getRoleFromToken(token) };
}

/**
 * Convenience helper: run after `requireUserAuth` (or `requireUserToken`)
 * when the call requires a minimum role. Returns a 403 Response if the
 * user does not meet the threshold, or the resolved context otherwise.
 *
 * For now no function blocks, but this is the single place future
 * restrictions live. Admin and tester are intended to bypass anything a
 * regular `user` would be denied.
 */
export function requireMinRole<T extends { role: UserRole }>(
  ctx: T,
  required: UserRole,
  corsHeaders: JsonHeaders
): T | Response {
  if (hasMinRole(ctx.role, required)) {
    return ctx;
  }
  return forbidden(corsHeaders, `Requires role '${required}' or higher`);
}

export function requireInternalAuth(
  req: Request,
  corsHeaders: JsonHeaders
): { token: string } | Response {
  const token = getBearerToken(req);
  if (!token) {
    return unauthorized(corsHeaders, "Missing or invalid authorization header");
  }

  const internalSecret = process.env.INTERNAL_FUNCTIONS_SECRET;
  if (!internalSecret || token !== internalSecret) {
    return unauthorized(corsHeaders, "Invalid internal authorization token");
  }

  return { token };
}

export async function resolveAuthContext(
  req: Request,
  corsHeaders: JsonHeaders
): Promise<AuthContext | Response> {
  const token = getBearerToken(req);
  if (!token) {
    return unauthorized(corsHeaders, "Missing or invalid authorization header");
  }

  const internalSecret = process.env.INTERNAL_FUNCTIONS_SECRET;
  if (internalSecret && token === internalSecret) {
    return { mode: "internal", token };
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return unauthorized(corsHeaders, "Invalid or expired token");
  }

  return { mode: "user", user, token, role: getRoleFromToken(token) };
}
