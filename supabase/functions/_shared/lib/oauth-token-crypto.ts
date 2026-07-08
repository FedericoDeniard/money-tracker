// OAuth token encryption helpers.
//
// Tokens are stored encrypted at the application layer (in addition to
// Supabase at-rest disk encryption). The encryption key lives only in
// Supabase Vault and is read by SECURITY DEFINER RPCs (`encrypt_secret` /
// `decrypt_secret`) on each call. The key is never exposed to the edge
// function runtime.
//
// PostgREST returns BYTEA columns as base64-encoded strings in JSON; the
// same encoding is accepted back as a `bytea` RPC argument, so we can
// round-trip the value without any extra encoding/decoding in TS.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function encryptSecret(
  supabase: SupabaseClient,
  plaintext: string
): Promise<string> {
  const { data, error } = await supabase.rpc("encrypt_secret", {
    p_plaintext: plaintext,
  });
  if (error) {
    throw new Error(
      `[oauth-token-crypto] encrypt_secret failed: ${error.message}`
    );
  }
  if (typeof data !== "string") {
    throw new Error(
      "[oauth-token-crypto] encrypt_secret returned non-string (expected base64 bytea)"
    );
  }
  return data;
}

export async function decryptSecret(
  supabase: SupabaseClient,
  encryptedB64: string
): Promise<string> {
  const { data, error } = await supabase.rpc("decrypt_secret", {
    p_encrypted: encryptedB64,
  });
  if (error) {
    throw new Error(
      `[oauth-token-crypto] decrypt_secret failed: ${error.message}`
    );
  }
  if (typeof data !== "string") {
    throw new Error(
      "[oauth-token-crypto] decrypt_secret returned non-string (expected decrypted plaintext)"
    );
  }
  return data;
}

// Convenience: populates access_token / refresh_token (plaintext) on the
// given row by decrypting the *_encrypted columns. Mutates the row in place
// so existing downstream consumers (which read tokenData.access_token) keep
// working unchanged.
export async function decryptTokenRow<
  T extends {
    access_token_encrypted?: string | null;
    refresh_token_encrypted?: string | null;
    access_token?: string | null;
    refresh_token?: string | null;
  },
>(supabase: SupabaseClient, row: T): Promise<T> {
  const tasks: Promise<void>[] = [];
  if (row.access_token_encrypted) {
    tasks.push(
      decryptSecret(supabase, row.access_token_encrypted).then((p) => {
        row.access_token = p;
      })
    );
  }
  if (row.refresh_token_encrypted) {
    tasks.push(
      decryptSecret(supabase, row.refresh_token_encrypted).then((p) => {
        row.refresh_token = p;
      })
    );
  }
  await Promise.all(tasks);
  return row;
}
