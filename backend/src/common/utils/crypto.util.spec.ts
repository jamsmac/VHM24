import {
  encrypt,
  decrypt,
  encryptedColumnTransformer,
  isEncrypted,
  generateEncryptionKey,
} from './crypto.util';

describe('CryptoUtil', () => {
  // Set up test environment
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-jwt-secret-for-encryption-key-derivation',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('encrypt', () => {
    it('should encrypt a plaintext string', () => {
      const plaintext = 'api_key_12345';
      const encrypted = encrypt(plaintext);

      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted!.split(':')).toHaveLength(3);
    });

    it('should return null for null input', () => {
      expect(encrypt(null)).toBeNull();
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const plaintext = 'same_secret';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted string', () => {
      const plaintext = 'api_key_12345';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should return null for null input', () => {
      expect(decrypt(null)).toBeNull();
    });

    it('should return plain text if not in encrypted format (migration support)', () => {
      const legacyPlainText = 'unencrypted_api_key';
      const result = decrypt(legacyPlainText);

      expect(result).toBe(legacyPlainText);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'API密钥_🔐_ключ';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptedColumnTransformer', () => {
    it('should encrypt value when writing to database', () => {
      const plaintext = 'secret_value';
      const transformed = encryptedColumnTransformer.to(plaintext);

      expect(transformed).not.toBe(plaintext);
      expect(isEncrypted(transformed)).toBe(true);
    });

    it('should decrypt value when reading from database', () => {
      const plaintext = 'secret_value';
      const encrypted = encrypt(plaintext);
      const transformed = encryptedColumnTransformer.from(encrypted);

      expect(transformed).toBe(plaintext);
    });

    it('should handle null values in both directions', () => {
      expect(encryptedColumnTransformer.to(null)).toBeNull();
      expect(encryptedColumnTransformer.from(null)).toBeNull();
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted strings', () => {
      const encrypted = encrypt('test');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(isEncrypted('plain_text')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isEncrypted(null)).toBe(false);
    });

    it('should return false for malformed encrypted format', () => {
      expect(isEncrypted('invalid:format')).toBe(false);
      expect(isEncrypted('a:b:c:d')).toBe(false);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 256-bit key in base64', () => {
      const key = generateEncryptionKey();

      expect(key).toBeTruthy();
      // Base64 of 32 bytes = 44 characters (with padding)
      expect(key.length).toBeGreaterThanOrEqual(43);

      // Should be valid base64
      const decoded = Buffer.from(key, 'base64');
      expect(decoded.length).toBe(32);
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('key derivation', () => {
    it('should use ENCRYPTION_KEY if provided', () => {
      process.env.ENCRYPTION_KEY = 'custom-encryption-key-32-bytes!!';

      const plaintext = 'test_secret';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should fall back to JWT_SECRET for key derivation', () => {
      delete process.env.ENCRYPTION_KEY;
      process.env.JWT_SECRET = 'jwt-secret-for-key-derivation';

      const plaintext = 'test_secret';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });
});
