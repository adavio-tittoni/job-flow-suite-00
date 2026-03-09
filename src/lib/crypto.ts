/**
 * Crypto utilities for secure data handling
 * 
 * SECURITY: These utilities help protect sensitive data in transit and at rest.
 * Uses Web Crypto API for browser-native encryption.
 */

/**
 * Generate a random encryption key
 */
export const generateKey = async (): Promise<CryptoKey> => {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Convert a string to ArrayBuffer
 */
const stringToArrayBuffer = (str: string): ArrayBuffer => {
  const encoder = new TextEncoder();
  return encoder.encode(str);
};

/**
 * Convert ArrayBuffer to string
 */
const arrayBufferToString = (buffer: ArrayBuffer): string => {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
};

/**
 * Convert ArrayBuffer to base64 string
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
};

/**
 * Convert base64 string to ArrayBuffer
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Encrypt data using AES-GCM
 * Returns base64-encoded encrypted data with IV prepended
 */
export const encryptData = async (data: string, key: CryptoKey): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = stringToArrayBuffer(data);
  
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedData
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  return arrayBufferToBase64(combined.buffer);
};

/**
 * Decrypt data using AES-GCM
 */
export const decryptData = async (encryptedBase64: string, key: CryptoKey): Promise<string> => {
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64));
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);
  
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encryptedData
  );
  
  return arrayBufferToString(decryptedData);
};

/**
 * Hash sensitive data using SHA-256
 * Use for non-reversible hashing (e.g., for comparisons)
 */
export const hashData = async (data: string): Promise<string> => {
  const encodedData = stringToArrayBuffer(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
  return arrayBufferToBase64(hashBuffer);
};

/**
 * Encrypt a JSON payload for secure transmission
 */
export const encryptPayload = async (payload: object): Promise<{ encrypted: string; keyBase64: string }> => {
  const key = await generateKey();
  const jsonString = JSON.stringify(payload);
  const encrypted = await encryptData(jsonString, key);
  
  // Export key for transmission (should be sent via secure channel)
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  const keyBase64 = arrayBufferToBase64(exportedKey);
  
  return { encrypted, keyBase64 };
};

/**
 * Decrypt a JSON payload
 */
export const decryptPayload = async (encrypted: string, keyBase64: string): Promise<object> => {
  const keyBuffer = base64ToArrayBuffer(keyBase64);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  const decrypted = await decryptData(encrypted, key);
  return JSON.parse(decrypted);
};

/**
 * Generate a secure random token (for CSRF, session IDs, etc.)
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Derive a key from a password using PBKDF2
 * Use for password-based encryption
 */
export const deriveKeyFromPassword = async (
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> => {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export default {
  generateKey,
  encryptData,
  decryptData,
  hashData,
  encryptPayload,
  decryptPayload,
  generateSecureToken,
  deriveKeyFromPassword,
};
