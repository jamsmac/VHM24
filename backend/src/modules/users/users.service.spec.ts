import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateIpWhitelistDto } from './dto/update-ip-whitelist.dto';
import { ApproveUserDto } from './dto/approve-user.dto';
import { UsernameGeneratorService } from './services/username-generator.service';
import { PasswordGeneratorService } from './services/password-generator.service';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock class-transformer
jest.mock('class-transformer', () => ({
  plainToInstance: jest.fn((cls, plain) => plain),
  Exclude: jest.fn(() => (_target: unknown, _key: string) => {}),
  Expose: jest.fn(() => (_target: unknown, _key: string) => {}),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let usernameGeneratorService: jest.Mocked<UsernameGeneratorService>;
  let passwordGeneratorService: jest.Mocked<PasswordGeneratorService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    password_hash: 'hashed_password',
    role: UserRole.OPERATOR,
    status: UserStatus.ACTIVE,
    username: 'testuser',
    phone: null,
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
    failed_login_attempts: 0,
    account_locked_until: null,
    last_failed_login_at: null,
    settings: null,
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
    organization_id: null,
    organization: null,
  } as User;

  const mockPendingUser: User = {
    ...mockUser,
    id: 'pending-user-123',
    status: UserStatus.PENDING,
    username: null,
    password_hash: '',
  } as User;

  beforeEach(async () => {
    const mockUserRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockUsernameGeneratorService = {
      generateUsername: jest.fn().mockReturnValue('generated_username_12345'),
    };

    const mockPasswordGeneratorService = {
      generatePassword: jest.fn().mockReturnValue('GeneratedPassword123!'),
      validatePasswordStrength: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: UsernameGeneratorService,
          useValue: mockUsernameGeneratorService,
        },
        {
          provide: PasswordGeneratorService,
          useValue: mockPasswordGeneratorService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    usernameGeneratorService = module.get(UsernameGeneratorService);
    passwordGeneratorService = module.get(PasswordGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // CREATE USER TESTS (REQ-AUTH-31)
  // ============================================================================

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'TempPassword123!',
      full_name: 'New User',
      role: UserRole.OPERATOR,
    };

    it('should create a new user with requires_password_change = true', async () => {
      const newUser = {
        ...mockUser,
        email: createUserDto.email,
        full_name: createUserDto.full_name,
        requires_password_change: true,
      };

      userRepository.findOne.mockResolvedValue(null); // No existing user
      userRepository.create.mockReturnValue(newUser as any);
      userRepository.save.mockResolvedValue(newUser as any);

      mockedBcrypt.genSalt.mockResolvedValue('salt' as never);
      mockedBcrypt.hash.mockResolvedValue('hashed_password' as never);

      const result = await service.create(createUserDto);

      expect(result.requires_password_change).toBe(true);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createUserDto.email,
          full_name: createUserDto.full_name,
          status: UserStatus.ACTIVE,
          requires_password_change: true,
        }),
      );
    });

    it('should hash password before creating user', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      mockedBcrypt.genSalt.mockResolvedValue('generated-salt' as never);
      mockedBcrypt.hash.mockResolvedValue('hashed_password_output' as never);

      await service.create(createUserDto);

      expect(mockedBcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 'generated-salt');
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createUserDto)).rejects.toThrow(
        'Пользователь с таким email уже существует',
      );
    });

    it('should throw ConflictException if phone already exists', async () => {
      const createUserDtoWithPhone: CreateUserDto = {
        ...createUserDto,
        phone: '+79991234567',
      };

      // First call to create
      userRepository.findOne
        .mockResolvedValueOnce(null as any) // Email check passes
        .mockResolvedValueOnce(mockUser as any); // Phone check fails

      await expect(service.create(createUserDtoWithPhone)).rejects.toThrow(ConflictException);

      // Reset mocks for second assertion
      jest.clearAllMocks();

      userRepository.findOne
        .mockResolvedValueOnce(null as any) // Email check passes
        .mockResolvedValueOnce(mockUser as any); // Phone check fails

      await expect(service.create(createUserDtoWithPhone)).rejects.toThrow(
        'Пользователь с таким телефоном уже существует',
      );
    });

    it('should set status to ACTIVE by default', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      mockedBcrypt.genSalt.mockResolvedValue('salt' as never);
      mockedBcrypt.hash.mockResolvedValue('hashed_password' as never);

      await service.create(createUserDto);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.ACTIVE,
        }),
      );
    });

    it('should create user without phone successfully', async () => {
      const dtoWithoutPhone: CreateUserDto = {
        email: 'nophone@example.com',
        password: 'TempPassword123!',
        full_name: 'User Without Phone',
        role: UserRole.OPERATOR,
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue({ ...mockUser, phone: null } as any);
      userRepository.save.mockResolvedValue({ ...mockUser, phone: null } as any);

      mockedBcrypt.genSalt.mockResolvedValue('salt' as never);
      mockedBcrypt.hash.mockResolvedValue('hashed_password' as never);

      const result = await service.create(dtoWithoutPhone);

      expect(result).toBeDefined();
      // Should only call findOne once for email check, not for phone
      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // FIND ALL TESTS
  // ============================================================================

  describe('findAll', () => {
    it('should return all users ordered by created_at DESC', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-2' }];
      userRepository.find.mockResolvedValue(users as any);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(userRepository.find).toHaveBeenCalledWith({
        order: { created_at: 'DESC' },
      });
    });

    it('should return empty array when no users exist', async () => {
      userRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(userRepository.find).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // FIND ONE TESTS
  // ============================================================================

  describe('findOne', () => {
    it('should return user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await service.findOne('user-123');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Пользователь с ID non-existent-id не найден',
      );
    });
  });

  // ============================================================================
  // FIND ONE ENTITY TESTS
  // ============================================================================

  describe('findOneEntity', () => {
    it('should return user entity when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await service.findOneEntity('user-123');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw NotFoundException when user entity not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneEntity('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOneEntity('non-existent-id')).rejects.toThrow(
        'Пользователь с ID non-existent-id не найден',
      );
    });
  });

  // ============================================================================
  // FIND BY EMAIL TESTS
  // ============================================================================

  describe('findByEmail', () => {
    it('should return user when email exists', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.email = :email', {
        email: 'test@example.com',
      });
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.password_hash');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.two_fa_secret');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.refresh_token');
    });

    it('should return null when email not found', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should include sensitive fields in query selection', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      await service.findByEmail('test@example.com');

      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.password_hash');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.two_fa_secret');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.refresh_token');
    });
  });

  // ============================================================================
  // FIND BY TELEGRAM ID TESTS
  // ============================================================================

  describe('findByTelegramId', () => {
    it('should return user when telegram ID exists', async () => {
      const userWithTelegram = { ...mockUser, telegram_user_id: '123456789' };
      userRepository.findOne.mockResolvedValue(userWithTelegram as any);

      const result = await service.findByTelegramId('123456789');

      expect(result).toEqual(userWithTelegram);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { telegram_user_id: '123456789' },
      });
    });

    it('should return null when telegram ID not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByTelegramId('nonexistent-tg-id');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // FIND BY USERNAME TESTS
  // ============================================================================

  describe('findByUsername', () => {
    it('should return user when username exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await service.findByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return null when username not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByUsername('nonexistent-username');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // UPDATE USER TESTS
  // ============================================================================

  describe('update', () => {
    it('should update user fields successfully', async () => {
      const updateDto: UpdateUserDto = {
        full_name: 'Updated Name',
      };

      const updatedUser = { ...mockUser, full_name: 'Updated Name' };

      userRepository.findOne
        .mockResolvedValueOnce(mockUser as any) // findOneEntity call
        .mockResolvedValueOnce(updatedUser as any); // findOne after update
      userRepository.save.mockResolvedValue(updatedUser as any);

      const result = await service.update('user-123', updateDto);

      expect(result.full_name).toBe('Updated Name');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when updating to existing email', async () => {
      const updateDto: UpdateUserDto = {
        email: 'existing@example.com',
      };

      const existingUserWithEmail = {
        ...mockUser,
        id: 'other-user',
        email: 'existing@example.com',
      };

      userRepository.findOne
        .mockResolvedValueOnce(mockUser as any) // Find user being updated
        .mockResolvedValueOnce(existingUserWithEmail as any); // Find user with target email

      await expect(service.update('user-123', updateDto)).rejects.toThrow(ConflictException);

      // Reset mocks for second assertion
      userRepository.findOne
        .mockResolvedValueOnce(mockUser as any) // Find user being updated
        .mockResolvedValueOnce(existingUserWithEmail as any); // Find user with target email

      await expect(service.update('user-123', updateDto)).rejects.toThrow(
        'Пользователь с таким email уже существует',
      );
    });

    it('should throw ConflictException when updating to existing phone', async () => {
      const updateDto: UpdateUserDto = {
        phone: '+79991234567',
      };

      const userBeingUpdated = { ...mockUser, phone: '+79990000000' };
      const existingUserWithPhone = {
        ...mockUser,
        id: 'other-user',
        phone: '+79991234567',
      };

      userRepository.findOne
        .mockResolvedValueOnce(userBeingUpdated as any) // Find user being updated
        .mockResolvedValueOnce(existingUserWithPhone as any); // Find user with target phone

      await expect(service.update('user-123', updateDto)).rejects.toThrow(ConflictException);
    });

    it('should allow updating email to same value', async () => {
      const updateDto: UpdateUserDto = {
        email: 'test@example.com', // Same as current
      };

      const updatedUser = { ...mockUser };
      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.save.mockResolvedValue(updatedUser as any);

      const result = await service.update('user-123', updateDto);

      expect(result).toBeDefined();
      // Should not check for duplicate since email is unchanged
    });

    it('should allow updating phone to same value', async () => {
      const userWithPhone = { ...mockUser, phone: '+79991234567' };
      const updateDto: UpdateUserDto = {
        phone: '+79991234567', // Same as current
      };

      userRepository.findOne.mockResolvedValue(userWithPhone as any);
      userRepository.save.mockResolvedValue(userWithPhone as any);

      const result = await service.update('user-123', updateDto);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      const updateDto: UpdateUserDto = {
        full_name: 'Updated Name',
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // REMOVE USER TESTS
  // ============================================================================

  describe('remove', () => {
    it('should soft delete user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      await service.remove('user-123');

      expect(userRepository.softRemove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // UPDATE REFRESH TOKEN TESTS
  // ============================================================================

  describe('updateRefreshToken', () => {
    it('should update refresh token for user', async () => {
      const userId = 'user-123';
      const token = 'new-refresh-token';

      await service.updateRefreshToken(userId, token);

      expect(userRepository.update).toHaveBeenCalledWith(userId, { refresh_token: token });
    });

    it('should set refresh token to null when logging out', async () => {
      const userId = 'user-123';

      await service.updateRefreshToken(userId, null);

      expect(userRepository.update).toHaveBeenCalledWith(userId, { refresh_token: null });
    });
  });

  // ============================================================================
  // UPDATE LAST LOGIN TESTS
  // ============================================================================

  describe('updateLastLogin', () => {
    it('should update last login timestamp and IP', async () => {
      const userId = 'user-123';
      const ip = '192.168.1.100';

      await service.updateLastLogin(userId, ip);

      expect(userRepository.update).toHaveBeenCalledWith(userId, {
        last_login_at: expect.any(Date),
        last_login_ip: ip,
      });
    });

    it('should handle IPv6 addresses', async () => {
      const userId = 'user-123';
      const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';

      await service.updateLastLogin(userId, ipv6);

      expect(userRepository.update).toHaveBeenCalledWith(userId, {
        last_login_at: expect.any(Date),
        last_login_ip: ipv6,
      });
    });
  });

  // ============================================================================
  // VALIDATE PASSWORD TESTS
  // ============================================================================

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validatePassword(mockUser, 'correct-password');

      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('correct-password', mockUser.password_hash);
    });

    it('should return false for invalid password', async () => {
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validatePassword(mockUser, 'wrong-password');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // CHANGE PASSWORD TESTS
  // ============================================================================

  describe('changePassword', () => {
    it('should hash and update password', async () => {
      const userId = 'user-123';
      const newPassword = 'NewSecurePassword123!';

      mockedBcrypt.genSalt.mockResolvedValue('new-salt' as never);
      mockedBcrypt.hash.mockResolvedValue('new_hashed_password' as never);

      await service.changePassword(userId, newPassword);

      expect(mockedBcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(newPassword, 'new-salt');
      expect(userRepository.update).toHaveBeenCalledWith(userId, {
        password_hash: 'new_hashed_password',
      });
    });
  });

  // ============================================================================
  // SAVE USER TESTS
  // ============================================================================

  describe('save', () => {
    it('should save user entity directly', async () => {
      const userToSave = { ...mockUser, full_name: 'Direct Save User' } as User;
      userRepository.save.mockResolvedValue(userToSave as any);

      const result = await service.save(userToSave);

      expect(result).toEqual(userToSave);
      expect(userRepository.save).toHaveBeenCalledWith(userToSave);
    });
  });

  // ============================================================================
  // UPDATE IP WHITELIST TESTS (REQ-AUTH-60)
  // ============================================================================

  describe('updateIpWhitelist', () => {
    it('should successfully update IP Whitelist settings', async () => {
      const userId = 'user-123';
      const updateDto: UpdateIpWhitelistDto = {
        ip_whitelist_enabled: true,
        allowed_ips: ['192.168.1.100', '10.0.0.0/24'],
      };

      const existingUser = { ...mockUser };
      const updatedUser = {
        ...existingUser,
        ip_whitelist_enabled: true,
        allowed_ips: updateDto.allowed_ips,
      };

      userRepository.findOne.mockResolvedValue(existingUser as any);
      userRepository.save.mockResolvedValue(updatedUser as any);

      const result = await service.updateIpWhitelist(userId, updateDto);

      expect(result.ip_whitelist_enabled).toBe(true);
      expect(result.allowed_ips).toEqual(updateDto.allowed_ips);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_whitelist_enabled: true,
          allowed_ips: updateDto.allowed_ips,
        }),
      );
    });

    it('should throw BadRequestException if IP Whitelist enabled but no IPs provided', async () => {
      const userId = 'user-123';
      const updateDto: UpdateIpWhitelistDto = {
        ip_whitelist_enabled: true,
        allowed_ips: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser as any);

      await expect(service.updateIpWhitelist(userId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateIpWhitelist(userId, updateDto)).rejects.toThrow(
        'При включенном IP Whitelist необходимо указать хотя бы один IP адрес',
      );
    });

    it('should throw BadRequestException if IP Whitelist enabled with null IPs', async () => {
      const userId = 'user-123';
      const updateDto: UpdateIpWhitelistDto = {
        ip_whitelist_enabled: true,
        allowed_ips: undefined,
      };

      userRepository.findOne.mockResolvedValue(mockUser as any);

      await expect(service.updateIpWhitelist(userId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow disabling IP Whitelist without IPs', async () => {
      const userId = 'user-123';
      const updateDto: UpdateIpWhitelistDto = {
        ip_whitelist_enabled: false,
        allowed_ips: undefined,
      };

      const existingUser = {
        ...mockUser,
        ip_whitelist_enabled: true,
        allowed_ips: ['192.168.1.100'],
      };

      const updatedUser = {
        ...existingUser,
        ip_whitelist_enabled: false,
        allowed_ips: null,
      };

      userRepository.findOne.mockResolvedValue(existingUser as any);
      userRepository.save.mockResolvedValue(updatedUser as any);

      const result = await service.updateIpWhitelist(userId, updateDto);

      expect(result.ip_whitelist_enabled).toBe(false);
      expect(result.allowed_ips).toBeNull();
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'non-existent-user';
      const updateDto: UpdateIpWhitelistDto = {
        ip_whitelist_enabled: true,
        allowed_ips: ['192.168.1.100'],
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.updateIpWhitelist(userId, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should accept various IP formats (exact, CIDR, wildcard)', async () => {
      const userId = 'user-123';
      const updateDto: UpdateIpWhitelistDto = {
        ip_whitelist_enabled: true,
        allowed_ips: [
          '192.168.1.100', // Exact
          '10.0.0.0/24', // CIDR
          '172.16.1.*', // Wildcard
        ],
      };

      const existingUser = { ...mockUser };
      const updatedUser = {
        ...existingUser,
        ip_whitelist_enabled: true,
        allowed_ips: updateDto.allowed_ips,
      };

      userRepository.findOne.mockResolvedValue(existingUser as any);
      userRepository.save.mockResolvedValue(updatedUser as any);

      const result = await service.updateIpWhitelist(userId, updateDto);

      expect(result.allowed_ips).toEqual(updateDto.allowed_ips);
      expect(result.allowed_ips).toHaveLength(3);
    });

    it('should set allowed_ips to null when disabled', async () => {
      const userId = 'user-123';
      const updateDto: UpdateIpWhitelistDto = {
        ip_whitelist_enabled: false,
      };

      const existingUser = {
        ...mockUser,
        ip_whitelist_enabled: true,
        allowed_ips: ['192.168.1.100'],
      };

      userRepository.findOne.mockResolvedValue(existingUser as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));

      await service.updateIpWhitelist(userId, updateDto);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_whitelist_enabled: false,
          allowed_ips: null,
        }),
      );
    });
  });

  // ============================================================================
  // FIND ONE WITH ROLES TESTS
  // ============================================================================

  describe('findOneWithRoles', () => {
    it('should return user with roles and permissions', async () => {
      const userWithRoles = {
        ...mockUser,
        roles: [
          {
            id: 'role-1',
            name: 'Admin',
            permissions: [
              { id: 'perm-1', name: 'read:users' },
              { id: 'perm-2', name: 'write:users' },
            ],
          },
        ],
      };
      userRepository.findOne.mockResolvedValue(userWithRoles as any);

      const result = await service.findOneWithRoles('user-123');

      expect(result).toEqual(userWithRoles);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        relations: ['roles', 'roles.permissions'],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneWithRoles('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOneWithRoles('non-existent-id')).rejects.toThrow(
        'Пользователь с ID non-existent-id не найден',
      );
    });
  });

  // ============================================================================
  // BLOCK USER TESTS (REQ-AUTH-34)
  // ============================================================================

  describe('blockUser', () => {
    it('should block user and set status to SUSPENDED', async () => {
      const blockedUser = {
        ...mockUser,
        status: UserStatus.SUSPENDED,
        refresh_token: null,
      };

      userRepository.findOne.mockResolvedValue({ ...mockUser } as any);
      userRepository.save.mockResolvedValue(blockedUser as any);

      const result = await service.blockUser('user-123');

      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.SUSPENDED,
          refresh_token: null,
        }),
      );
    });

    it('should set block reason in settings', async () => {
      const reason = 'Violation of terms';
      const blockedUser = {
        ...mockUser,
        status: UserStatus.SUSPENDED,
        settings: {
          block_reason: reason,
          blocked_at: expect.any(String),
        },
      };

      userRepository.findOne.mockResolvedValue({ ...mockUser } as any);
      userRepository.save.mockResolvedValue(blockedUser as any);

      await service.blockUser('user-123', reason);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            block_reason: reason,
          }),
        }),
      );
    });

    it('should set account_locked_until when duration provided', async () => {
      const durationMinutes = 60;
      userRepository.findOne.mockResolvedValue({ ...mockUser } as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));

      await service.blockUser('user-123', undefined, durationMinutes);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          account_locked_until: expect.any(Date),
        }),
      );

      // Verify the lock time is approximately correct (within a minute)
      const savedUser = (userRepository.save as jest.Mock).mock.calls[0][0];
      const expectedTime = new Date();
      expectedTime.setMinutes(expectedTime.getMinutes() + durationMinutes);
      const actualTime = savedUser.account_locked_until.getTime();
      const expectedTimeMs = expectedTime.getTime();
      expect(Math.abs(actualTime - expectedTimeMs)).toBeLessThan(60000); // Within 1 minute
    });

    it('should invalidate refresh token when blocking', async () => {
      const userWithToken = { ...mockUser, refresh_token: 'existing-token' };
      userRepository.findOne.mockResolvedValue(userWithToken as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));

      await service.blockUser('user-123');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh_token: null,
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.blockUser('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // UNBLOCK USER TESTS (REQ-AUTH-35)
  // ============================================================================

  describe('unblockUser', () => {
    it('should unblock user and reset status to ACTIVE', async () => {
      const blockedUser = {
        ...mockUser,
        status: UserStatus.SUSPENDED,
        account_locked_until: new Date(),
        failed_login_attempts: 5,
        last_failed_login_at: new Date(),
        settings: { block_reason: 'Test', blocked_at: '2024-01-01' },
      };

      const unblockedUser = {
        ...blockedUser,
        status: UserStatus.ACTIVE,
        account_locked_until: null,
        failed_login_attempts: 0,
        last_failed_login_at: null,
        settings: {},
      };

      userRepository.findOne.mockResolvedValue(blockedUser as any);
      userRepository.save.mockResolvedValue(unblockedUser as any);

      const result = await service.unblockUser('user-123');

      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.ACTIVE,
          account_locked_until: null,
          failed_login_attempts: 0,
          last_failed_login_at: null,
        }),
      );
    });

    it('should clear block reason from settings', async () => {
      const blockedUser = {
        ...mockUser,
        status: UserStatus.SUSPENDED,
        settings: {
          block_reason: 'Test',
          blocked_at: '2024-01-01',
          other_setting: 'value',
        },
      };

      userRepository.findOne.mockResolvedValue(blockedUser as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));

      await service.unblockUser('user-123');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: { other_setting: 'value' },
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.unblockUser('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // DEACTIVATE USER TESTS (REQ-AUTH-34)
  // ============================================================================

  describe('deactivateUser', () => {
    it('should deactivate user and set status to INACTIVE', async () => {
      const deactivatedUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
        refresh_token: null,
        settings: {
          deactivated_at: expect.any(String),
        },
      };

      userRepository.findOne.mockResolvedValue({ ...mockUser } as any);
      userRepository.save.mockResolvedValue(deactivatedUser as any);

      const result = await service.deactivateUser('user-123');

      expect(result.status).toBe(UserStatus.INACTIVE);
    });

    it('should invalidate refresh token', async () => {
      const userWithToken = { ...mockUser, refresh_token: 'existing-token' };
      userRepository.findOne.mockResolvedValue(userWithToken as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));

      await service.deactivateUser('user-123');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh_token: null,
        }),
      );
    });

    it('should set deactivation timestamp in settings', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        settings: { existing: 'value' },
      } as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));

      await service.deactivateUser('user-123');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            existing: 'value',
            deactivated_at: expect.any(String),
          }),
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.deactivateUser('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // ACTIVATE USER TESTS
  // ============================================================================

  describe('activateUser', () => {
    it('should activate user and set status to ACTIVE', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
        settings: { deactivated_at: '2024-01-01' },
      };

      const activatedUser = {
        ...inactiveUser,
        status: UserStatus.ACTIVE,
        settings: {},
      };

      userRepository.findOne.mockResolvedValue(inactiveUser as any);
      userRepository.save.mockResolvedValue(activatedUser as any);

      const result = await service.activateUser('user-123');

      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it('should clear deactivation timestamp from settings', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
        settings: {
          deactivated_at: '2024-01-01',
          other_setting: 'value',
        },
      };

      userRepository.findOne.mockResolvedValue(inactiveUser as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));

      await service.activateUser('user-123');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: { other_setting: 'value' },
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.activateUser('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // GET PENDING USERS TESTS
  // ============================================================================

  describe('getPendingUsers', () => {
    it('should return users with PENDING status', async () => {
      const pendingUsers = [
        { ...mockPendingUser, id: 'pending-1' },
        { ...mockPendingUser, id: 'pending-2' },
      ];
      userRepository.find.mockResolvedValue(pendingUsers as any);

      const result = await service.getPendingUsers();

      expect(result).toEqual(pendingUsers);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { status: UserStatus.PENDING },
        order: { created_at: 'DESC' },
      });
    });

    it('should return empty array when no pending users', async () => {
      userRepository.find.mockResolvedValue([]);

      const result = await service.getPendingUsers();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // APPROVE USER TESTS
  // ============================================================================

  describe('approveUser', () => {
    const approveDto: ApproveUserDto = {
      role: UserRole.OPERATOR,
    };
    const adminId = 'admin-123';

    it('should approve pending user and generate credentials', async () => {
      const approvedUser = {
        ...mockPendingUser,
        status: UserStatus.ACTIVE,
        username: 'generated_username_12345',
        role: UserRole.OPERATOR,
        requires_password_change: true,
        approved_by_id: adminId,
        approved_at: expect.any(Date),
      };

      userRepository.findOne.mockResolvedValue(mockPendingUser as any);
      userRepository.save.mockResolvedValue(approvedUser as any);
      mockedBcrypt.genSalt.mockResolvedValue('salt' as never);
      mockedBcrypt.hash.mockResolvedValue('hashed_password' as never);

      const result = await service.approveUser('pending-user-123', approveDto, adminId);

      expect(result.user.status).toBe(UserStatus.ACTIVE);
      expect(result.credentials.username).toBe('generated_username_12345');
      expect(result.credentials.password).toBe('GeneratedPassword123!');
      expect(usernameGeneratorService.generateUsername).toHaveBeenCalledWith(
        mockPendingUser.full_name,
      );
      expect(passwordGeneratorService.generatePassword).toHaveBeenCalled();
    });

    it('should hash the generated password', async () => {
      // Create fresh mock for this test with PENDING status
      const pendingUserForTest = { ...mockPendingUser, status: UserStatus.PENDING };
      userRepository.findOne.mockResolvedValue(pendingUserForTest as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));
      mockedBcrypt.genSalt.mockResolvedValue('salt' as never);
      mockedBcrypt.hash.mockResolvedValue('hashed_generated_password' as never);

      await service.approveUser('pending-user-123', approveDto, adminId);

      expect(mockedBcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('GeneratedPassword123!', 'salt');
    });

    it('should set requires_password_change to true', async () => {
      // Create fresh mock for this test with PENDING status
      const pendingUserForTest = { ...mockPendingUser, status: UserStatus.PENDING };
      userRepository.findOne.mockResolvedValue(pendingUserForTest as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));
      mockedBcrypt.genSalt.mockResolvedValue('salt' as never);
      mockedBcrypt.hash.mockResolvedValue('hashed_password' as never);

      await service.approveUser('pending-user-123', approveDto, adminId);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          requires_password_change: true,
        }),
      );
    });

    it('should set approval metadata', async () => {
      // Create fresh mock for this test with PENDING status
      const pendingUserForTest = { ...mockPendingUser, status: UserStatus.PENDING };
      userRepository.findOne.mockResolvedValue(pendingUserForTest as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));
      mockedBcrypt.genSalt.mockResolvedValue('salt' as never);
      mockedBcrypt.hash.mockResolvedValue('hashed_password' as never);

      await service.approveUser('pending-user-123', approveDto, adminId);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          approved_by_id: adminId,
          approved_at: expect.any(Date),
        }),
      );
    });

    it('should throw BadRequestException when user is not pending', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any); // User with ACTIVE status

      await expect(service.approveUser('user-123', approveDto, adminId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approveUser('user-123', approveDto, adminId)).rejects.toThrow(
        'Only pending users can be approved',
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.approveUser('non-existent-id', approveDto, adminId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // REJECT USER TESTS
  // ============================================================================

  describe('rejectUser', () => {
    const reason = 'Invalid documentation provided';
    const adminId = 'admin-123';

    it('should reject pending user with reason', async () => {
      // Create fresh mock for this test with PENDING status
      const pendingUserForTest = { ...mockPendingUser, status: UserStatus.PENDING };
      const rejectedUser = {
        ...pendingUserForTest,
        status: UserStatus.REJECTED,
        rejection_reason: reason,
        rejected_by_id: adminId,
        rejected_at: expect.any(Date),
      };

      userRepository.findOne.mockResolvedValue(pendingUserForTest as any);
      userRepository.save.mockResolvedValue(rejectedUser as any);

      const result = await service.rejectUser('pending-user-123', reason, adminId);

      expect(result.status).toBe(UserStatus.REJECTED);
      expect(result.rejection_reason).toBe(reason);
    });

    it('should set rejection metadata', async () => {
      // Create fresh mock for this test with PENDING status
      const pendingUserForTest = { ...mockPendingUser, status: UserStatus.PENDING };
      userRepository.findOne.mockResolvedValue(pendingUserForTest as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));

      await service.rejectUser('pending-user-123', reason, adminId);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.REJECTED,
          rejection_reason: reason,
          rejected_by_id: adminId,
          rejected_at: expect.any(Date),
        }),
      );
    });

    it('should throw BadRequestException when user is not pending', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any); // User with ACTIVE status

      await expect(service.rejectUser('user-123', reason, adminId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.rejectUser('user-123', reason, adminId)).rejects.toThrow(
        'Only pending users can be rejected',
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.rejectUser('non-existent-id', reason, adminId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // FIND BY IDS TESTS
  // ============================================================================

  describe('findByIds', () => {
    it('should return empty array when ids array is empty', async () => {
      const result = await service.findByIds([]);

      expect(result).toEqual([]);
      expect(userRepository.find).not.toHaveBeenCalled();
    });

    it('should return users matching the provided ids', async () => {
      const user1 = { ...mockUser, id: 'user-1' };
      const user2 = { ...mockUser, id: 'user-2' };
      userRepository.find.mockResolvedValue([user1, user2] as any);

      const result = await service.findByIds(['user-1', 'user-2']);

      expect(result).toHaveLength(2);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { id: expect.anything() },
      });
    });

    it('should return only found users when some ids do not exist', async () => {
      const user1 = { ...mockUser, id: 'user-1' };
      userRepository.find.mockResolvedValue([user1] as any);

      const result = await service.findByIds(['user-1', 'non-existent']);

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no users match ids', async () => {
      userRepository.find.mockResolvedValue([]);

      const result = await service.findByIds(['non-existent-1', 'non-existent-2']);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // CREATE PENDING FROM TELEGRAM TESTS
  // ============================================================================

  describe('createPendingFromTelegram', () => {
    const telegramData = {
      telegram_id: '123456789',
      telegram_username: 'testuser',
      telegram_first_name: 'Test',
      telegram_last_name: 'User',
    };

    it('should create pending user from telegram data', async () => {
      const newUser = {
        ...mockPendingUser,
        telegram_user_id: telegramData.telegram_id,
        telegram_username: telegramData.telegram_username,
        full_name: 'Test User',
        email: `telegram_${telegramData.telegram_id}@vendhub.temp`,
        status: UserStatus.PENDING,
      };

      userRepository.findOne.mockResolvedValue(null); // No existing user
      userRepository.create.mockReturnValue(newUser as any);
      userRepository.save.mockResolvedValue(newUser as any);

      const result = await service.createPendingFromTelegram(telegramData);

      expect(result.telegram_user_id).toBe(telegramData.telegram_id);
      expect(result.status).toBe(UserStatus.PENDING);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegram_user_id: telegramData.telegram_id,
          email: `telegram_${telegramData.telegram_id}@vendhub.temp`,
          status: UserStatus.PENDING,
        }),
      );
    });

    it('should throw ConflictException if telegram user already exists', async () => {
      const existingUser = { ...mockUser, telegram_user_id: telegramData.telegram_id };
      userRepository.findOne.mockResolvedValue(existingUser as any);

      await expect(service.createPendingFromTelegram(telegramData)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createPendingFromTelegram(telegramData)).rejects.toThrow(
        'Пользователь с таким Telegram ID уже существует',
      );
    });

    it('should use telegram_username as full_name when first/last name not provided', async () => {
      const telegramDataWithUsername = {
        telegram_id: '123456789',
        telegram_username: 'testuser',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data) => data as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));

      await service.createPendingFromTelegram(telegramDataWithUsername);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: '@testuser',
        }),
      );
    });

    it('should use telegram_id as full_name when no name or username provided', async () => {
      const telegramDataMinimal = {
        telegram_id: '123456789',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data) => data as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));

      await service.createPendingFromTelegram(telegramDataMinimal);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Telegram User 123456789',
        }),
      );
    });

    it('should use only first name when last name not provided', async () => {
      const telegramDataFirstNameOnly = {
        telegram_id: '123456789',
        telegram_first_name: 'John',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data) => data as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));

      await service.createPendingFromTelegram(telegramDataFirstNameOnly);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'John',
        }),
      );
    });

    it('should combine first and last name for full_name', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data) => data as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));

      await service.createPendingFromTelegram(telegramData);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Test User',
        }),
      );
    });

    it('should set telegram_username to null when not provided', async () => {
      const telegramDataNoUsername = {
        telegram_id: '123456789',
        telegram_first_name: 'Test',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data) => data as any);
      userRepository.save.mockImplementation((user) => Promise.resolve(user as any));

      await service.createPendingFromTelegram(telegramDataNoUsername);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegram_username: null,
        }),
      );
    });
  });

  // ============================================================================
  // FIND BY ROLE TESTS
  // ============================================================================

  describe('findByRole', () => {
    it('should return active users with specified role by default', async () => {
      const operators = [
        { ...mockUser, id: 'op-1', role: UserRole.OPERATOR },
        { ...mockUser, id: 'op-2', role: UserRole.OPERATOR },
      ];
      userRepository.find.mockResolvedValue(operators as any);

      const result = await service.findByRole(UserRole.OPERATOR);

      expect(result).toHaveLength(2);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { role: UserRole.OPERATOR, status: UserStatus.ACTIVE },
        order: { created_at: 'DESC' },
      });
    });

    it('should return all users with specified role when activeOnly is false', async () => {
      const allOperators = [
        { ...mockUser, id: 'op-1', role: UserRole.OPERATOR, status: UserStatus.ACTIVE },
        { ...mockUser, id: 'op-2', role: UserRole.OPERATOR, status: UserStatus.INACTIVE },
      ];
      userRepository.find.mockResolvedValue(allOperators as any);

      const result = await service.findByRole(UserRole.OPERATOR, false);

      expect(result).toHaveLength(2);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { role: UserRole.OPERATOR },
        order: { created_at: 'DESC' },
      });
    });

    it('should return empty array when no users with role exist', async () => {
      userRepository.find.mockResolvedValue([]);

      const result = await service.findByRole(UserRole.OWNER);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // FIND BY ROLES TESTS
  // ============================================================================

  describe('findByRoles', () => {
    it('should return active users with any of the specified roles', async () => {
      const admins = [
        { ...mockUser, id: 'admin-1', role: UserRole.ADMIN },
        { ...mockUser, id: 'owner-1', role: UserRole.OWNER },
      ];

      const mockQueryBuilder = {
        whereInIds: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(admins),
      };
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.findByRoles([UserRole.ADMIN, UserRole.OWNER]);

      expect(result).toHaveLength(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.role IN (:...roles)', {
        roles: [UserRole.ADMIN, UserRole.OWNER],
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.status = :status', {
        status: UserStatus.ACTIVE,
      });
    });

    it('should return all users when activeOnly is false', async () => {
      const allAdmins = [
        { ...mockUser, id: 'admin-1', role: UserRole.ADMIN, status: UserStatus.ACTIVE },
        { ...mockUser, id: 'admin-2', role: UserRole.ADMIN, status: UserStatus.INACTIVE },
      ];

      const mockQueryBuilder = {
        whereInIds: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(allAdmins),
      };
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.findByRoles([UserRole.ADMIN], false);

      expect(result).toHaveLength(2);
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should not filter by role when roles array is empty', async () => {
      const mockQueryBuilder = {
        whereInIds: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      await service.findByRoles([]);

      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
    });

    it('should return empty array when no users match roles', async () => {
      const mockQueryBuilder = {
        whereInIds: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.findByRoles([UserRole.OWNER]);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // GET ADMIN USER IDS TESTS
  // ============================================================================

  describe('getAdminUserIds', () => {
    it('should return IDs of all active Owner and Admin users', async () => {
      const admins = [
        { ...mockUser, id: 'owner-1', role: UserRole.OWNER },
        { ...mockUser, id: 'admin-1', role: UserRole.ADMIN },
      ];

      const mockQueryBuilder = {
        whereInIds: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(admins),
      };
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getAdminUserIds();

      expect(result).toEqual(['owner-1', 'admin-1']);
    });

    it('should return empty array when no admins exist', async () => {
      const mockQueryBuilder = {
        whereInIds: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getAdminUserIds();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // GET MANAGER USER IDS TESTS
  // ============================================================================

  describe('getManagerUserIds', () => {
    it('should return IDs of all active Manager users', async () => {
      const managers = [
        { ...mockUser, id: 'manager-1', role: UserRole.MANAGER },
        { ...mockUser, id: 'manager-2', role: UserRole.MANAGER },
      ];
      userRepository.find.mockResolvedValue(managers as any);

      const result = await service.getManagerUserIds();

      expect(result).toEqual(['manager-1', 'manager-2']);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { role: UserRole.MANAGER, status: UserStatus.ACTIVE },
        order: { created_at: 'DESC' },
      });
    });

    it('should return empty array when no managers exist', async () => {
      userRepository.find.mockResolvedValue([]);

      const result = await service.getManagerUserIds();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // GET FIRST ADMIN ID TESTS
  // ============================================================================

  describe('getFirstAdminId', () => {
    it('should return first admin user ID', async () => {
      const admins = [
        { ...mockUser, id: 'admin-1', role: UserRole.ADMIN },
        { ...mockUser, id: 'admin-2', role: UserRole.ADMIN },
      ];

      const mockQueryBuilder = {
        whereInIds: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(admins),
      };
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getFirstAdminId();

      expect(result).toBe('admin-1');
    });

    it('should return null when no admins exist', async () => {
      const mockQueryBuilder = {
        whereInIds: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getFirstAdminId();

      expect(result).toBeNull();
    });
  });
});
