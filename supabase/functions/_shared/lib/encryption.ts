const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Derive encryption key from environment variable using PBKDF2
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable not set');
  }

  const encoder = new TextEncoder();
  const secretData = encoder.encode(secret);
  const salt = encoder.encode('salt');

  // Import the secret as a key for PBKDF2
  const baseKey = await crypto.subtle.importKey(
    'raw',
    secretData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive the actual encryption key
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 10000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string using AES-256-GCM
 */
export async function encryptToken(token: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoder = new TextEncoder();
    const data = encoder.encode(token);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      data
    );

    // Combine IV + encrypted data
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), iv.length);

    // Encode to base64
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt a string using AES-256-GCM
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedToken).split('').map((c) => c.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Fallback to base64 if encryption fails (for development)
 */
export async function encryptTokenFallback(token: string): Promise<string> {
  try {
    return await encryptToken(token);
  } catch {
    console.warn('Using base64 fallback for encryption');
    return btoa(token);
  }
}

/**
 * Fallback from base64 if decryption fails (for development)
 */
export async function decryptTokenFallback(encryptedToken: string): Promise<string> {
  try {
    return await decryptToken(encryptedToken);
  } catch {
    console.warn('Using base64 fallback for decryption');
    return atob(encryptedToken);
  }
}
