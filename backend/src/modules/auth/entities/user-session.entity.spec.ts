import { UserSession } from './user-session.entity';

describe('UserSession Entity', () => {
  describe('isExpired getter', () => {
    it('should return false when expires_at is null', () => {
      const session = new UserSession();
      session.expires_at = null;

      expect(session.isExpired).toBe(false);
    });

    it('should return false when expires_at is in the future', () => {
      const session = new UserSession();
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      session.expires_at = futureDate;

      expect(session.isExpired).toBe(false);
    });

    it('should return true when expires_at is in the past', () => {
      const session = new UserSession();
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);
      session.expires_at = pastDate;

      expect(session.isExpired).toBe(true);
    });

    it('should return true when expires_at is exactly now', () => {
      const session = new UserSession();
      session.expires_at = new Date(Date.now() - 1);

      expect(session.isExpired).toBe(true);
    });
  });

  describe('isValid getter', () => {
    it('should return true when active, not expired, and not revoked', () => {
      const session = new UserSession();
      session.is_active = true;
      session.expires_at = new Date(Date.now() + 3600000); // 1 hour in future
      session.revoked_at = null;

      expect(session.isValid).toBe(true);
    });

    it('should return false when not active', () => {
      const session = new UserSession();
      session.is_active = false;
      session.expires_at = new Date(Date.now() + 3600000);
      session.revoked_at = null;

      expect(session.isValid).toBe(false);
    });

    it('should return false when expired', () => {
      const session = new UserSession();
      session.is_active = true;
      session.expires_at = new Date(Date.now() - 3600000); // 1 hour in past
      session.revoked_at = null;

      expect(session.isValid).toBe(false);
    });

    it('should return false when revoked', () => {
      const session = new UserSession();
      session.is_active = true;
      session.expires_at = new Date(Date.now() + 3600000);
      session.revoked_at = new Date();

      expect(session.isValid).toBe(false);
    });

    it('should return true when expires_at is null (no expiration)', () => {
      const session = new UserSession();
      session.is_active = true;
      session.expires_at = null;
      session.revoked_at = null;

      expect(session.isValid).toBe(true);
    });
  });

  describe('ageInSeconds getter', () => {
    it('should return 0 when created_at is not set', () => {
      const session = new UserSession();
      (session as any).created_at = undefined;

      expect(session.ageInSeconds).toBe(0);
    });

    it('should return correct age in seconds', () => {
      const session = new UserSession();
      const now = Date.now();
      (session as any).created_at = new Date(now - 60000); // 60 seconds ago

      const age = session.ageInSeconds;
      expect(age).toBeGreaterThanOrEqual(59);
      expect(age).toBeLessThanOrEqual(61);
    });

    it('should return 0 for newly created session', () => {
      const session = new UserSession();
      (session as any).created_at = new Date();

      const age = session.ageInSeconds;
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThanOrEqual(1);
    });
  });

  describe('timeSinceLastUse getter', () => {
    it('should return ageInSeconds when last_used_at is null', () => {
      const session = new UserSession();
      const now = Date.now();
      (session as any).created_at = new Date(now - 120000); // 2 minutes ago
      session.last_used_at = null;

      const timeSince = session.timeSinceLastUse;
      expect(timeSince).toBeGreaterThanOrEqual(119);
      expect(timeSince).toBeLessThanOrEqual(121);
    });

    it('should return correct time since last use', () => {
      const session = new UserSession();
      const now = Date.now();
      (session as any).created_at = new Date(now - 120000); // 2 minutes ago
      session.last_used_at = new Date(now - 30000); // 30 seconds ago

      const timeSince = session.timeSinceLastUse;
      expect(timeSince).toBeGreaterThanOrEqual(29);
      expect(timeSince).toBeLessThanOrEqual(31);
    });

    it('should return 0 when just used', () => {
      const session = new UserSession();
      (session as any).created_at = new Date();
      session.last_used_at = new Date();

      const timeSince = session.timeSinceLastUse;
      expect(timeSince).toBeGreaterThanOrEqual(0);
      expect(timeSince).toBeLessThanOrEqual(1);
    });
  });

  describe('entity properties', () => {
    it('should accept all basic properties', () => {
      const session = new UserSession();
      session.user_id = 'user-uuid';
      session.refresh_token_hash = 'hashed_token';
      session.is_active = true;

      expect(session.user_id).toBe('user-uuid');
      expect(session.refresh_token_hash).toBe('hashed_token');
      expect(session.is_active).toBe(true);
    });

    it('should accept device information', () => {
      const session = new UserSession();
      session.ip_address = '192.168.1.100';
      session.user_agent = 'Mozilla/5.0';
      session.device_type = 'desktop';
      session.device_name = 'Chrome on Windows';
      session.os = 'Windows';
      session.browser = 'Chrome';

      expect(session.ip_address).toBe('192.168.1.100');
      expect(session.user_agent).toBe('Mozilla/5.0');
      expect(session.device_type).toBe('desktop');
      expect(session.device_name).toBe('Chrome on Windows');
      expect(session.os).toBe('Windows');
      expect(session.browser).toBe('Chrome');
    });

    it('should accept session timestamps', () => {
      const session = new UserSession();
      const lastUsed = new Date('2025-01-15T10:00:00Z');
      const expires = new Date('2025-01-22T10:00:00Z');
      const revoked = new Date('2025-01-16T15:00:00Z');

      session.last_used_at = lastUsed;
      session.expires_at = expires;
      session.revoked_at = revoked;
      session.revoked_reason = 'logout';

      expect(session.last_used_at).toEqual(lastUsed);
      expect(session.expires_at).toEqual(expires);
      expect(session.revoked_at).toEqual(revoked);
      expect(session.revoked_reason).toBe('logout');
    });

    it('should accept metadata', () => {
      const session = new UserSession();
      session.metadata = {
        login_method: 'password',
        geo_location: { country: 'UZ', city: 'Tashkent' },
      };

      expect(session.metadata).toEqual({
        login_method: 'password',
        geo_location: { country: 'UZ', city: 'Tashkent' },
      });
    });

    it('should handle nullable fields', () => {
      const session = new UserSession();
      session.user_id = 'user-uuid';
      session.refresh_token_hash = 'hash';
      session.ip_address = null;
      session.user_agent = null;
      session.device_type = null;
      session.device_name = null;
      session.os = null;
      session.browser = null;
      session.last_used_at = null;
      session.expires_at = null;
      session.revoked_at = null;
      session.revoked_reason = null;

      expect(session.ip_address).toBeNull();
      expect(session.user_agent).toBeNull();
      expect(session.device_type).toBeNull();
      expect(session.device_name).toBeNull();
      expect(session.os).toBeNull();
      expect(session.browser).toBeNull();
      expect(session.last_used_at).toBeNull();
      expect(session.expires_at).toBeNull();
      expect(session.revoked_at).toBeNull();
      expect(session.revoked_reason).toBeNull();
    });
  });
});
