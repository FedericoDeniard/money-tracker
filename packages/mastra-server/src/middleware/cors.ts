import { cors } from "hono/cors";
import type { MiddlewareHandler } from "hono";

const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://0.0.0.0:3000",
];

export const corsMiddleware: MiddlewareHandler = cors({
  origin:
    process.env.MASTRA_CORS_ORIGIN?.split(",")
      .map(s => s.trim())
      .filter(Boolean) ?? defaultOrigins,
  credentials: true,
  allowHeaders: [
    "authorization",
    "content-type",
    "x-client-info",
    "apikey",
    "x-user-timezone",
  ],
  exposeHeaders: ["content-type"],
  maxAge: 600,
});
