// mercado pago webhook signature verification.
//
// reference:
//   https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
//
// algorithm:
//   header x-signature  = "ts=<epoch_seconds>,v1=<hex_sha256_hmac>"
//   header x-request-id = "<uuid>"
//   manifest            = "id:<data_id>;request-id:<request_id>;ts:<ts>;"
//   expected            = hex(hmac_sha256(secret, manifest))
//   compare             = constant_time(expected, x-signature v1)
//
// data_id resolution order:
//   1. ?data.id= query string (legacy ipn path)
//   2. body.data.id  (modern webhook path)

import type { WebhookVerification } from "../types.ts";
import { getMPConfig } from "./config.ts";

const MAX_AGE_SECONDS = 300; // 5 minutes — replay protection window

export async function verifyMPWebhookSignature(
  req: Request,
  rawBody: string
): Promise<WebhookVerification> {
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!xSignature) {
    return { valid: false, reason: "missing_signature" };
  }

  const parsed = parseXSignature(xSignature);
  if (!parsed) {
    return { valid: false, reason: "malformed" };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - parsed.ts) > MAX_AGE_SECONDS) {
    return { valid: false, reason: "ts_out_of_range" };
  }

  const dataId = extractDataId(req, rawBody);
  if (!dataId) {
    // some mp webhook flows may not include data.id; treat as malformed
    return { valid: false, reason: "malformed" };
  }

  const manifest = `id:${dataId};request-id:${xRequestId ?? ""};ts:${parsed.ts};`;
  const secret = getMPConfig().webhookSecret;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(manifest)
  );
  const expectedHex = toHex(new Uint8Array(signatureBytes));

  const ok = constantTimeEqual(expectedHex, parsed.v1);
  if (!ok) {
    return { valid: false, reason: "hash_mismatch" };
  }

  return { valid: true, ts: parsed.ts, requestId: xRequestId };
}

function parseXSignature(header: string): { ts: number; v1: string } | null {
  // example: "ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839"
  const parts = header.split(",").map(p => p.trim());
  let ts: number | null = null;
  let v1: string | null = null;
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === "ts") ts = Number(v);
    else if (k === "v1") v1 = v;
  }
  if (ts === null || !Number.isFinite(ts) || !v1) return null;
  return { ts, v1 };
}

function extractDataId(req: Request, rawBody: string): string | null {
  // 1. query string (?data.id=... or ?data_id=...)
  const url = new URL(req.url);
  const fromQuery =
    url.searchParams.get("data.id") ?? url.searchParams.get("data_id");
  if (fromQuery) return fromQuery;

  // 2. body.data.id
  try {
    const body = JSON.parse(rawBody) as { data?: { id?: unknown } } | null;
    const id = body?.data?.id;
    if (id !== undefined && id !== null) return String(id);
  } catch {
    return null;
  }
  return null;
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
