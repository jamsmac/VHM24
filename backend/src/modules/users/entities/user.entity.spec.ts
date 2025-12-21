import { User, UserRole, UserStatus } from './user.entity';

describe('User Entity', () => {
  describe('isLocked getter', () => {
    it('should return false when account_locked_until is null', () => {
      const user = new User();
      user.account_locked_until = null;

      expect(user.isLocked).toBe(false);
    });

    it('should return false when account_locked_until is undefined', () => {
      const user = new User();

      expect(user.isLocked).toBe(false);
    });

    it('should return true when account_locked_until is in the future', () => {
      const user = new User();
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1); // 1 hour in future
      user.account_locked_until = futureDate;

      expect(user.isLocked).toBe(true);
    });

    it('should return false when account_locked_until is in the past', () => {
      const user = new User();
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // 1 hour in past
      user.account_locked_until = pastDate;

      expect(user.isLocked).toBe(false);
    });

    it('should return false when account_locked_until is exactly now', () => {
      const user = new User();
      const now = new Date();
      user.account_locked_until = now;

      // The lock should be released when we reach the time
      expect(user.isLocked).toBe(false);
    });

    it('should return true when locked for 1 day in future', () => {
      const user = new User();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // 1 day in future
      user.account_locked_until = futureDate;

      expect(user.isLocked).toBe(true);
    });
  });

  describe('entity properties', () => {
    it('should have default values', () => {
      const user = new User();

      expect(user.full_name).toBeUndefined();
      expect(user.email).toBeUndefined();
      expect(user.role).toBeUndefined();
      expect(user.status).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const user = new User();
      user.full_name = 'John Doe';
      user.email = 'john@example.com';
      user.username = 'johndoe';
      user.phone = '+998901234567';
      user.password_hash = 'hashed_password';
      user.role = UserRole.OPERATOR;
      user.status = UserStatus.ACTIVE;

      expect(user.full_name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.username).toBe('johndoe');
      expect(user.phone).toBe('+998901234567');
      expect(user.password_hash).toBe('hashed_password');
      expect(user.role).toBe(UserRole.OPERATOR);
      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('should accept all security properties', () => {
      const user = new User();
      user.is_2fa_enabled = true;
      user.two_fa_secret = 'secret';
      user.failed_login_attempts = 3;
      user.last_failed_login_at = new Date('2025-01-15T10:00:00Z');
      user.account_locked_until = new Date('2025-01-15T11:00:00Z');

      expect(user.is_2fa_enabled).toBe(true);
      expect(user.two_fa_secret).toBe('secret');
      expect(user.failed_login_attempts).toBe(3);
      expect(user.last_failed_login_at).toEqual(new Date('2025-01-15T10:00:00Z'));
      expect(user.account_locked_until).toEqual(new Date('2025-01-15T11:00:00Z'));
    });

    it('should accept approval workflow properties', () => {
      const user = new User();
      user.approved_by_id = 'approver-uuid';
      user.approved_at = new Date('2025-01-15');
      user.rejected_by_id = null;
      user.rejected_at = null;
      user.rejection_reason = null;

      expect(user.approved_by_id).toBe('approver-uuid');
      expect(user.approved_at).toEqual(new Date('2025-01-15'));
      expect(user.rejected_by_id).toBeNull();
      expect(user.rejected_at).toBeNull();
      expect(user.rejection_reason).toBeNull();
    });

    it('should accept Telegram properties', () => {
      const user = new User();
      user.telegram_user_id = '123456789';
      user.telegram_username = 'johndoe_tg';

      expect(user.telegram_user_id).toBe('123456789');
      expect(user.telegram_username).toBe('johndoe_tg');
    });

    it('should accept IP whitelist properties', () => {
      const user = new User();
      user.ip_whitelist_enabled = true;
      user.allowed_ips = ['192.168.1.1', '10.0.0.1'];

      expect(user.ip_whitelist_enabled).toBe(true);
      expect(user.allowed_ips).toEqual(['192.168.1.1', '10.0.0.1']);
    });

    it('should accept login tracking properties', () => {
      const user = new User();
      user.last_login_at = new Date('2025-01-15T10:00:00Z');
      user.last_login_ip = '192.168.1.100';
      user.refresh_token = 'refresh_token_value';

      expect(user.last_login_at).toEqual(new Date('2025-01-15T10:00:00Z'));
      expect(user.last_login_ip).toBe('192.168.1.100');
      expect(user.refresh_token).toBe('refresh_token_value');
    });

    it('should accept settings as jsonb', () => {
      const user = new User();
      user.settings = {
        theme: 'dark',
        language: 'ru',
        notifications: { email: true, push: false },
      };

      expect(user.settings).toEqual({
        theme: 'dark',
        language: 'ru',
        notifications: { email: true, push: false },
      });
    });

    it('should handle password change flags', () => {
      const user = new User();
      user.password_changed_by_user = false;
      user.requires_password_change = true;

      expect(user.password_changed_by_user).toBe(false);
      expect(user.requires_password_change).toBe(true);
    });
  });

  describe('UserRole enum', () => {
    it('should have all expected roles', () => {
      expect(UserRole.OWNER).toBe('Owner');
      expect(UserRole.ADMIN).toBe('Admin');
      expect(UserRole.MANAGER).toBe('Manager');
      expect(UserRole.OPERATOR).toBe('Operator');
      expect(UserRole.COLLECTOR).toBe('Collector');
      expect(UserRole.TECHNICIAN).toBe('Technician');
      expect(UserRole.VIEWER).toBe('Viewer');
    });
  });

  describe('UserStatus enum', () => {
    it('should have all expected statuses', () => {
      expect(UserStatus.PENDING).toBe('pending');
      expect(UserStatus.ACTIVE).toBe('active');
      expect(UserStatus.PASSWORD_CHANGE_REQUIRED).toBe('password_change_required');
      expect(UserStatus.INACTIVE).toBe('inactive');
      expect(UserStatus.SUSPENDED).toBe('suspended');
      expect(UserStatus.REJECTED).toBe('rejected');
    });
  });
});
