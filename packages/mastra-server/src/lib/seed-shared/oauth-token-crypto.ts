// OAuth token encryption helpers (mastra-server / Node runtime mirror).
//
// See supabase/functions/_shared/lib/oauth-token-crypto.ts for the rationale.
// This file is intentionally kept in sync with that one; any change to one
// should be reflected in the other.

import type { SupabaseClient } from "@supabase/supabase-js";

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
