import { PasswordResetToken } from './password-reset-token.entity';

describe('PasswordResetToken Entity', () => {
  describe('generateToken hook', () => {
    it('should generate a UUID token if not provided', () => {
      const token = new PasswordResetToken();
      token.user_id = 'user-uuid';

      token.generateToken();

      expect(token.token).toBeDefined();
      expect(token.token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should not overwrite existing token', () => {
      const token = new PasswordResetToken();
      token.user_id = 'user-uuid';
      token.token = 'existing-token-uuid';

      token.generateToken();

      expect(token.token).toBe('existing-token-uuid');
    });

    it('should set expires_at to 1 hour from now if not provided', () => {
      const token = new PasswordResetToken();
      token.user_id = 'user-uuid';

      const beforeGenerate = Date.now();
      token.generateToken();
      const afterGenerate = Date.now();

      expect(token.expires_at).toBeDefined();

      // Should be approximately 1 hour from now
      const expectedMin = beforeGenerate + 60 * 60 * 1000;
      const expectedMax = afterGenerate + 60 * 60 * 1000;

      expect(token.expires_at.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(token.expires_at.getTime()).toBeLessThanOrEqual(expectedMax);
    });

    it('should not overwrite existing expires_at', () => {
      const token = new PasswordResetToken();
      token.user_id = 'user-uuid';
      const customExpiry = new Date('2030-01-01');
      token.expires_at = customExpiry;

      token.generateToken();

      expect(token.expires_at).toEqual(customExpiry);
    });
  });

  describe('isExpired method', () => {
    it('should return false when expires_at is in the future', () => {
      const token = new PasswordResetToken();
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      token.expires_at = futureDate;

      expect(token.isExpired()).toBe(false);
    });

    it('should return true when expires_at is in the past', () => {
      const token = new PasswordResetToken();
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);
      token.expires_at = pastDate;

      expect(token.isExpired()).toBe(true);
    });

    it('should return true when expires_at is exactly now', () => {
      const token = new PasswordResetToken();
      // Use a time slightly in the past to ensure consistent behavior
      token.expires_at = new Date(Date.now() - 1);

      expect(token.isExpired()).toBe(true);
    });
  });

  describe('isUsed method', () => {
    it('should return false when used_at is null', () => {
      const token = new PasswordResetToken();
      token.used_at = null;

      expect(token.isUsed()).toBe(false);
    });

    it('should return true when used_at is set', () => {
      const token = new PasswordResetToken();
      token.used_at = new Date();

      expect(token.isUsed()).toBe(true);
    });
  });

  describe('isValid method', () => {
    it('should return true when not expired and not used', () => {
      const token = new PasswordResetToken();
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      token.expires_at = futureDate;
      token.used_at = null;

      expect(token.isValid()).toBe(true);
    });

    it('should return false when expired', () => {
      const token = new PasswordResetToken();
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);
      token.expires_at = pastDate;
      token.used_at = null;

      expect(token.isValid()).toBe(false);
    });

    it('should return false when used', () => {
      const token = new PasswordResetToken();
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      token.expires_at = futureDate;
      token.used_at = new Date();

      expect(token.isValid()).toBe(false);
    });

    it('should return false when both expired and used', () => {
      const token = new PasswordResetToken();
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);
      token.expires_at = pastDate;
      token.used_at = new Date();

      expect(token.isValid()).toBe(false);
    });
  });

  describe('entity properties', () => {
    it('should accept all properties', () => {
      const token = new PasswordResetToken();
      token.token = 'test-token-uuid';
      token.user_id = 'user-uuid';
      token.expires_at = new Date('2025-12-31');
      token.used_at = null;
      token.request_ip = '192.168.1.100';
      token.request_user_agent = 'Mozilla/5.0';

      expect(token.token).toBe('test-token-uuid');
      expect(token.user_id).toBe('user-uuid');
      expect(token.expires_at).toEqual(new Date('2025-12-31'));
      expect(token.used_at).toBeNull();
      expect(token.request_ip).toBe('192.168.1.100');
      expect(token.request_user_agent).toBe('Mozilla/5.0');
    });

    it('should handle nullable fields', () => {
      const token = new PasswordResetToken();
      token.token = 'test-token-uuid';
      token.user_id = 'user-uuid';
      token.expires_at = new Date();
      token.used_at = null;
      token.request_ip = null;
      token.request_user_agent = null;

      expect(token.used_at).toBeNull();
      expect(token.request_ip).toBeNull();
      expect(token.request_user_agent).toBeNull();
    });
  });
});
