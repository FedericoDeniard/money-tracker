const DEFAULT_ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000";
const DEFAULT_ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-file-name";
const DEFAULT_ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

type CorsHeaders = Record<string, string>;

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function getAllowedOrigins(): string[] {
  const configured = Deno.env.get("CORS_ALLOWED_ORIGINS")?.trim();
  return parseCsv(configured || DEFAULT_ALLOWED_ORIGINS);
}

function shouldAllowCredentials(): boolean {
  return Deno.env.get("CORS_ALLOW_CREDENTIALS")?.toLowerCase() === "true";
}

function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.includes("*") || allowedOrigins.includes(origin);
}

export function getCorsHeaders(
  req: Request,
  overrides: CorsHeaders = {}
): CorsHeaders {
  const allowedOrigins = getAllowedOrigins();
  const allowCredentials = shouldAllowCredentials();
  const requestOrigin = req.headers.get("origin");
  const hasWildcardOrigin = allowedOrigins.includes("*");

  const headers: CorsHeaders = {
    "Access-Control-Allow-Headers": DEFAULT_ALLOW_HEADERS,
    "Access-Control-Allow-Methods": DEFAULT_ALLOW_METHODS,
    ...overrides,
  };

  if (allowCredentials && !hasWildcardOrigin) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  if (requestOrigin) {
    if (isOriginAllowed(requestOrigin, allowedOrigins)) {
      if (hasWildcardOrigin && !allowCredentials) {
        headers["Access-Control-Allow-Origin"] = "*";
      } else {
        headers["Access-Control-Allow-Origin"] = requestOrigin;
        headers["Vary"] = "Origin";
      }
    }
  } else if (hasWildcardOrigin && !allowCredentials) {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

export function handleCorsPreflightRequest(
  req: Request,
  overrides: CorsHeaders = {}
): Response | null {
  if (req.method !== "OPTIONS") {
    return null;
  }

  const requestOrigin = req.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();

  if (requestOrigin && !isOriginAllowed(requestOrigin, allowedOrigins)) {
    return new Response("CORS origin not allowed", { status: 403 });
  }

  return new Response("ok", { headers: getCorsHeaders(req, overrides) });
}
