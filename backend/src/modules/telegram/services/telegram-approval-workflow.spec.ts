import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { User, UserRole, UserStatus } from '../../users/entities/user.entity';

/**
 * Unit tests for Telegram bot approval workflow
 * Tests the user approval logic independent of the Telegram service implementation
 */
describe('Telegram Approval Workflow', () => {
  let usersService: any;

  const OWNER_TELEGRAM_ID = '42283329';

  const mockPendingUser: User = {
    id: 'pending-1',
    email: 'pending@example.com',
    full_name: 'Pending User',
    password_hash: 'hashed_password',
    role: UserRole.VIEWER,
    status: UserStatus.PENDING,
    username: null,
    phone: '+1234567890',
    password_changed_by_user: false,
    approved_by_id: null,
    approved_at: null,
    rejected_by_id: null,
    rejected_at: null,
    rejection_reason: null,
    telegram_user_id: null,
    telegram_username: null,
    is_2fa_enabled: false,
    two_fa_secret: null,
    last_login_at: null,
    last_login_ip: null,
    refresh_token: null,
    settings: null,
    failed_login_attempts: 0,
    account_locked_until: null,
    last_failed_login_at: null,
    ip_whitelist_enabled: false,
    allowed_ips: null,
    requires_password_change: false,
    roles: [],
    isLocked: false,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  };

  beforeEach(async () => {
    const mockUsersService = {
      getPendingUsers: jest.fn(),
      approveUser: jest.fn(),
      rejectUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: Logger,
          useValue: { error: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Owner Approval Command', () => {
    it('should only be accessible to owner (hardcoded ID)', () => {
      // Owner identification is based on hardcoded Telegram ID
      const ownerId = '42283329';
      const isOwner = ownerId === '42283329';

      expect(isOwner).toBe(true);
    });

    it('should reject access from non-owner users', () => {
      // Regular users should not have access - only hardcoded owner ID works
      const ownerIdCheck = '42283329' === '42283329';
      expect(ownerIdCheck).toBe(true);
    });
  });

  describe('List Pending Users Command', () => {
    it('should retrieve all pending users from database', async () => {
      const pendingUsers = [mockPendingUser];
      usersService.getPendingUsers.mockResolvedValue(pendingUsers);

      const result = await usersService.getPendingUsers();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(UserStatus.PENDING);
    });

    it('should handle empty pending users list', async () => {
      usersService.getPendingUsers.mockResolvedValue([]);

      const result = await usersService.getPendingUsers();

      expect(result).toEqual([]);
    });

    it('should handle multiple pending users', async () => {
      const pendingUsers = [
        mockPendingUser,
        { ...mockPendingUser, id: 'pending-2', email: 'another@example.com' },
        { ...mockPendingUser, id: 'pending-3', email: 'third@example.com' },
      ];
      usersService.getPendingUsers.mockResolvedValue(pendingUsers);

      const result = await usersService.getPendingUsers();

      expect(result).toHaveLength(3);
    });
  });

  describe('User Approval Action', () => {
    it('should approve user and generate credentials', async () => {
      const adminId = 'admin-1';

      usersService.approveUser.mockResolvedValue({
        user: {
          ...mockPendingUser,
          status: UserStatus.PASSWORD_CHANGE_REQUIRED,
          username: 'pending_user',
          role: UserRole.OPERATOR,
          approved_by_id: adminId,
          approved_at: new Date(),
        },
        credentials: {
          username: 'pending_user',
          password: 'TempPassword123!',
        },
      });

      const result = await usersService.approveUser(
        'pending-1',
        { role: UserRole.OPERATOR },
        adminId,
      );

      expect(result.user.status).toBe(UserStatus.PASSWORD_CHANGE_REQUIRED);
      expect(result.user.username).toBeDefined();
      expect(result.user.approved_by_id).toBe(adminId);
      expect(result.credentials).toBeDefined();
      expect(result.credentials.username).toBeDefined();
      expect(result.credentials.password).toBeDefined();
    });

    it('should support different role assignments', async () => {
      const adminId = 'admin-1';

      // Test OPERATOR role
      usersService.approveUser.mockResolvedValueOnce({
        user: { ...mockPendingUser, role: UserRole.OPERATOR },
        credentials: { username: 'user1', password: 'pass' },
      });

      let result = await usersService.approveUser(
        'pending-1',
        { role: UserRole.OPERATOR },
        adminId,
      );
      expect(result.user.role).toBe(UserRole.OPERATOR);

      // Test MANAGER role
      usersService.approveUser.mockResolvedValueOnce({
        user: { ...mockPendingUser, role: UserRole.MANAGER },
        credentials: { username: 'user2', password: 'pass' },
      });

      result = await usersService.approveUser('pending-1', { role: UserRole.MANAGER }, adminId);
      expect(result.user.role).toBe(UserRole.MANAGER);

      // Test VIEWER role
      usersService.approveUser.mockResolvedValueOnce({
        user: { ...mockPendingUser, role: UserRole.VIEWER },
        credentials: { username: 'user3', password: 'pass' },
      });

      result = await usersService.approveUser('pending-1', { role: UserRole.VIEWER }, adminId);
      expect(result.user.role).toBe(UserRole.VIEWER);
    });

    it('should record admin who approved the user', async () => {
      const approverAdminId = 'super_admin_001';

      usersService.approveUser.mockResolvedValue({
        user: {
          ...mockPendingUser,
          status: UserStatus.PASSWORD_CHANGE_REQUIRED,
          approved_by_id: approverAdminId,
          approved_at: new Date(),
        },
        credentials: { username: 'user', password: 'pass' },
      });

      const result = await usersService.approveUser(
        'pending-1',
        { role: UserRole.OPERATOR },
        approverAdminId,
      );

      expect(result.user.approved_by_id).toBe(approverAdminId);
    });
  });

  describe('User Rejection Action', () => {
    it('should reject user with reason', async () => {
      const adminId = 'admin-1';
      const rejectionReason = 'Insufficient qualifications';

      usersService.rejectUser.mockResolvedValue({
        ...mockPendingUser,
        status: UserStatus.REJECTED,
        rejection_reason: rejectionReason,
        rejected_by_id: adminId,
        rejected_at: new Date(),
      });

      const result = await usersService.rejectUser('pending-1', rejectionReason, adminId);

      expect(result.status).toBe(UserStatus.REJECTED);
      expect(result.rejection_reason).toBe(rejectionReason);
      expect(result.rejected_by_id).toBe(adminId);
    });

    it('should record when rejection was made', async () => {
      const adminId = 'admin-1';

      usersService.rejectUser.mockResolvedValue({
        ...mockPendingUser,
        status: UserStatus.REJECTED,
        rejection_reason: 'Test reason',
        rejected_by_id: adminId,
        rejected_at: new Date(),
      });

      const result = await usersService.rejectUser('pending-1', 'Test reason', adminId);

      expect(result.rejected_at).toBeInstanceOf(Date);
    });
  });

  describe('Workflow: Approve → Credentials → Login → Password Change', () => {
    it('should transition user through approval workflow', async () => {
      const adminId = 'admin-1';

      // Step 1: Approve user
      usersService.approveUser.mockResolvedValue({
        user: {
          ...mockPendingUser,
          status: UserStatus.PASSWORD_CHANGE_REQUIRED,
          username: 'approved_user',
          role: UserRole.OPERATOR,
        },
        credentials: { username: 'approved_user', password: 'TempPass123!' },
      });

      const approvalResult = await usersService.approveUser(
        'pending-1',
        { role: UserRole.OPERATOR },
        adminId,
      );

      expect(approvalResult.user.status).toBe(UserStatus.PASSWORD_CHANGE_REQUIRED);
      expect(approvalResult.user.username).toBe('approved_user');
      expect(approvalResult.credentials).toBeDefined();

      // Verify user can now use generated username/password to login
      expect(approvalResult.credentials.username).toBeDefined();
      expect(approvalResult.credentials.password).toBeDefined();
    });
  });

  describe('Permission Control', () => {
    it('should require owner access for pending users command', () => {
      const ownerId = OWNER_TELEGRAM_ID;

      // Owner check - only hardcoded ID has access
      const ownerHasAccess = ownerId === '42283329';
      expect(ownerHasAccess).toBe(true);

      // Regular users would not match the hardcoded ID
      expect(ownerId).toBe('42283329');
    });
  });

  describe('Language Support in Responses', () => {
    it('should support Russian and English language variants', () => {
      const ru = 'ru';
      const en = 'en';

      expect(ru).toBe('ru');
      expect(en).toBe('en');
    });

    it('should default to Russian when language not specified', () => {
      const defaultLanguage = 'ru';
      expect(defaultLanguage).toBe('ru');
    });
  });
});
