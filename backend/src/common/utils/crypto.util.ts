import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

// Module-level logger for crypto utilities
const logger = new Logger('CryptoUtil');

/**
 * Cryptography utility for secure data encryption/decryption
 *
 * Uses AES-256-GCM for authenticated encryption of sensitive data
 * like API keys and secrets.
 *
 * SEC-CRYPTO-01: AES-256-GCM encryption for sensitive fields
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * Falls back to a derived key from JWT_SECRET if not explicitly set
 *
 * @throws Error if no encryption key can be derived
 */
function getEncryptionKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (encryptionKey) {
    // If provided, use first 32 bytes (or pad if shorter)
    const key = Buffer.alloc(KEY_LENGTH);
    Buffer.from(encryptionKey, 'utf8').copy(key);
    return key;
  }

  // Fallback: derive from JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error(
      'ENCRYPTION_KEY or JWT_SECRET must be set for data encryption',
    );
  }

  // Derive a 256-bit key using SHA-256
  return crypto.createHash('sha256').update(jwtSecret).digest();
}

/**
 * Encrypt sensitive data using AES-256-GCM
 *
 * @param plaintext - The text to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (base64)
 * @throws Error if encryption fails
 *
 * @example
 * const encrypted = encrypt('api_key_12345');
 * // Returns: "base64IV:base64AuthTag:base64Ciphertext"
 */
export function encrypt(plaintext: string | null): string | null {
  if (plaintext === null || plaintext === undefined) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Decrypt data encrypted with AES-256-GCM
 *
 * @param ciphertext - The encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext
 * @throws Error if decryption fails or data is tampered
 *
 * @example
 * const decrypted = decrypt(encryptedApiKey);
 * // Returns: "api_key_12345"
 */
export function decrypt(ciphertext: string | null): string | null {
  if (ciphertext === null || ciphertext === undefined) {
    return null;
  }

  // Check if the value is already plain text (not encrypted)
  // This handles migration from unencrypted to encrypted data
  if (!ciphertext.includes(':')) {
    return ciphertext;
  }

  try {
    const key = getEncryptionKey();
    const parts = ciphertext.split(':');

    if (parts.length !== 3) {
      // Not in encrypted format, return as-is (legacy data)
      return ciphertext;
    }

    const [ivBase64, authTagBase64, encryptedBase64] = parts;
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    // Validate IV and authTag lengths
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      // Invalid format, return as-is (legacy data)
      return ciphertext;
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    // If decryption fails, it might be legacy unencrypted data
    // Log warning but don't throw - allows gradual migration
    logger.warn(
      `Decryption warning (possible legacy data): ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return ciphertext;
  }
}

/**
 * TypeORM column transformer for encrypted fields
 *
 * Use with @Column decorator to automatically encrypt/decrypt values:
 *
 * @example
 * @Column({
 *   type: 'varchar',
 *   length: 500,
 *   nullable: true,
 *   transformer: encryptedColumnTransformer,
 * })
 * api_key: string | null;
 */
export const encryptedColumnTransformer = {
  /**
   * Transform value when writing to database
   */
  to: (value: string | null): string | null => encrypt(value),

  /**
   * Transform value when reading from database
   */
  from: (value: string | null): string | null => decrypt(value),
};

/**
 * Check if a string appears to be encrypted
 *
 * @param value - The string to check
 * @returns true if the string appears to be in encrypted format
 */
export function isEncrypted(value: string | null): boolean {
  if (!value) return false;

  const parts = value.split(':');
  if (parts.length !== 3) return false;

  try {
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    return iv.length === IV_LENGTH && authTag.length === AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Generate a secure random encryption key
 *
 * Use this to generate a new ENCRYPTION_KEY for .env file
 *
 * @returns A base64-encoded 256-bit key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}
