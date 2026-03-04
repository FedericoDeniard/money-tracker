import { createClient, type User } from 'jsr:@supabase/supabase-js@2'

type JsonHeaders = Record<string, string>

export type AuthContext =
  | { mode: 'user'; user: User; token: string }
  | { mode: 'internal'; token: string }

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null

  const [scheme, token] = authHeader.split(' ')
  if (scheme !== 'Bearer' || !token) return null

  return token
}

function unauthorized(corsHeaders: JsonHeaders, error: string): Response {
  return new Response(
    JSON.stringify({ error }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

async function getUserFromToken(token: string): Promise<User | null> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return null
  }

  return user
}

export async function requireUserToken(token: string, corsHeaders: JsonHeaders): Promise<User | Response> {
  if (!token) {
    return unauthorized(corsHeaders, 'Missing authentication token')
  }

  const user = await getUserFromToken(token)
  if (!user) {
    return unauthorized(corsHeaders, 'Invalid or expired token')
  }

  return user
}

export async function requireUserAuth(req: Request, corsHeaders: JsonHeaders): Promise<{ user: User; token: string } | Response> {
  const token = getBearerToken(req)
  if (!token) {
    return unauthorized(corsHeaders, 'Missing or invalid authorization header')
  }

  const user = await getUserFromToken(token)
  if (!user) {
    return unauthorized(corsHeaders, 'Invalid or expired token')
  }

  return { user, token }
}

export function requireInternalAuth(req: Request, corsHeaders: JsonHeaders): { token: string } | Response {
  const token = getBearerToken(req)
  if (!token) {
    return unauthorized(corsHeaders, 'Missing or invalid authorization header')
  }

  const internalSecret = Deno.env.get('INTERNAL_FUNCTIONS_SECRET')
  if (!internalSecret || token !== internalSecret) {
    return unauthorized(corsHeaders, 'Invalid internal authorization token')
  }

  return { token }
}

export async function resolveAuthContext(req: Request, corsHeaders: JsonHeaders): Promise<AuthContext | Response> {
  const token = getBearerToken(req)
  if (!token) {
    return unauthorized(corsHeaders, 'Missing or invalid authorization header')
  }

  const internalSecret = Deno.env.get('INTERNAL_FUNCTIONS_SECRET')
  if (internalSecret && token === internalSecret) {
    return { mode: 'internal', token }
  }

  const user = await getUserFromToken(token)
  if (!user) {
    return unauthorized(corsHeaders, 'Invalid or expired token')
  }

  return { mode: 'user', user, token }
}
