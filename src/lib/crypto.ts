import CryptoJS from 'crypto-js';

const rawKey = process.env.ENCRYPTION_KEY;

if (!rawKey || rawKey === 'your-secret-key-here' || rawKey === 'change-me-in-production') {
  throw new Error(
    'ENCRYPTION_KEY environment variable must be set to a strong, unique secret. ' +
    'Do not use default placeholder values.'
  );
}

const ENCRYPTION_KEY: string = rawKey;

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
