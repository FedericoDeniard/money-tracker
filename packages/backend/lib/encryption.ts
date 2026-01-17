import { supabase } from './supabase';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

export async function encryptToken(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('encrypt_text', {
    text_to_encrypt: token,
    encryption_key: ENCRYPTION_KEY,
  });

  if (error) {
    console.error('Error encrypting token:', error);
    throw new Error('Failed to encrypt token');
  }

  return data;
}

export async function decryptToken(encryptedToken: string): Promise<string> {
  const { data, error } = await supabase.rpc('decrypt_text', {
    encrypted_data: encryptedToken,
    encryption_key: ENCRYPTION_KEY,
  });

  if (error) {
    console.error('Error decrypting token:', error);
    throw new Error('Failed to decrypt token');
  }

  return data;
}
