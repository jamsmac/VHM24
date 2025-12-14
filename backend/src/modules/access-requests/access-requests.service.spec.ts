import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { AccessRequestsService } from './access-requests.service';
import {
  AccessRequest,
  AccessRequestStatus,
  AccessRequestSource,
} from './entities/access-request.entity';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { ApproveAccessRequestDto } from './dto/approve-access-request.dto';
import { RejectAccessRequestDto } from './dto/reject-access-request.dto';
import { QueryAccessRequestDto } from './dto/query-access-request.dto';
import { UsersService } from '@modules/users/users.service';
import { RbacService } from '@modules/rbac/rbac.service';
import { User, UserStatus, UserRole } from '@modules/users/entities/user.entity';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';

describe('AccessRequestsService', () => {
  let service: AccessRequestsService;
  let mockAccessRequestRepository: jest.Mocked<Repository<AccessRequest>>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockRbacService: jest.Mocked<RbacService>;

  // Test data
  const mockTelegramId = '123456789';
  const mockAdminUserId = 'admin-user-id';
  const mockRequestId = 'request-id-1';
  const mockCreatedUserId = 'created-user-id';

  const mockAccessRequest: Partial<AccessRequest> = {
    id: mockRequestId,
    telegram_id: mockTelegramId,
    telegram_username: 'testuser',
    telegram_first_name: 'Test',
    telegram_last_name: 'User',
    source: AccessRequestSource.TELEGRAM,
    status: AccessRequestStatus.NEW,
    created_at: new Date(),
    processed_by_user_id: null,
    processed_at: null,
    rejection_reason: null,
    created_user_id: null,
    metadata: {},
    notes: null,
  };

  const mockApprovedRequest: Partial<AccessRequest> = {
    ...mockAccessRequest,
    status: AccessRequestStatus.APPROVED,
    processed_by_user_id: mockAdminUserId,
    processed_at: new Date(),
    created_user_id: mockCreatedUserId,
  };

  const _mockRejectedRequest: Partial<AccessRequest> = {
    ...mockAccessRequest,
    status: AccessRequestStatus.REJECTED,
    processed_by_user_id: mockAdminUserId,
    processed_at: new Date(),
    rejection_reason: 'Not eligible',
  };

  const mockUserResponse: Partial<UserResponseDto> = {
    id: mockCreatedUserId,
    full_name: 'Test User',
    email: 'test@example.com',
    telegram_user_id: mockTelegramId,
    telegram_username: 'testuser',
    status: UserStatus.ACTIVE,
    role: UserRole.OPERATOR,
  };

  const mockRole = {
    id: 'role-1',
    name: 'operator',
    display_name: 'Operator',
  };

  // Mock User entity for checking existing user
  const mockUser: Partial<User> = {
    id: mockCreatedUserId,
    full_name: 'Test User',
    email: 'test@example.com',
    telegram_user_id: mockTelegramId,
    telegram_username: 'testuser',
    status: UserStatus.ACTIVE,
    role: UserRole.OPERATOR,
  };

  beforeEach(async () => {
    mockAccessRequestRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      softRemove: jest.fn(),
    } as any;

    mockUsersService = {
      findByTelegramId: jest.fn(),
      create: jest.fn(),
    } as any;

    mockRbacService = {
      findRolesByNames: jest.fn(),
      assignRolesToUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessRequestsService,
        {
          provide: getRepositoryToken(AccessRequest),
          useValue: mockAccessRequestRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: RbacService,
          useValue: mockRbacService,
        },
      ],
    }).compile();

    service = module.get<AccessRequestsService>(AccessRequestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create access request successfully', async () => {
      // Arrange
      const createDto: CreateAccessRequestDto = {
        telegram_id: mockTelegramId,
        telegram_username: 'testuser',
        telegram_first_name: 'Test',
        telegram_last_name: 'User',
        source: AccessRequestSource.TELEGRAM,
      };

      mockUsersService.findByTelegramId.mockResolvedValue(null);
      mockAccessRequestRepository.findOne.mockResolvedValue(null);
      mockAccessRequestRepository.create.mockReturnValue(mockAccessRequest as AccessRequest);
      mockAccessRequestRepository.save.mockResolvedValue(mockAccessRequest as AccessRequest);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockAccessRequest);
      expect(mockUsersService.findByTelegramId).toHaveBeenCalledWith(mockTelegramId);
      expect(mockAccessRequestRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockAccessRequestRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when user already exists', async () => {
      // Arrange
      const createDto: CreateAccessRequestDto = {
        telegram_id: mockTelegramId,
      };

      mockUsersService.findByTelegramId.mockResolvedValue(mockUser as User);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(
        'User with this Telegram ID already exists',
      );
      expect(mockAccessRequestRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when pending request already exists', async () => {
      // Arrange
      const createDto: CreateAccessRequestDto = {
        telegram_id: mockTelegramId,
      };

      mockUsersService.findByTelegramId.mockResolvedValue(null);
      mockAccessRequestRepository.findOne.mockResolvedValue(mockAccessRequest as AccessRequest);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Pending access request already exists for this Telegram ID',
      );
    });
  });

  describe('findAll', () => {
    it('should return all access requests with pagination', async () => {
      // Arrange
      const queryDto: QueryAccessRequestDto = {
        limit: 20,
        offset: 0,
      };
      const mockRequests = [mockAccessRequest, mockApprovedRequest];
      mockAccessRequestRepository.findAndCount.mockResolvedValue([
        mockRequests as AccessRequest[],
        2,
      ]);

      // Act
      const result = await service.findAll(queryDto);

      // Assert
      expect(result.data).toEqual(mockRequests);
      expect(result.total).toBe(2);
      expect(mockAccessRequestRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        relations: ['processed_by', 'created_user'],
        order: { created_at: 'DESC' },
        take: 20,
        skip: 0,
      });
    });

    it('should filter by status', async () => {
      // Arrange
      const queryDto: QueryAccessRequestDto = {
        status: AccessRequestStatus.NEW,
      };
      mockAccessRequestRepository.findAndCount.mockResolvedValue([
        [mockAccessRequest] as AccessRequest[],
        1,
      ]);

      // Act
      const result = await service.findAll(queryDto);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(mockAccessRequestRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: AccessRequestStatus.NEW },
        }),
      );
    });

    it('should filter by source', async () => {
      // Arrange
      const queryDto: QueryAccessRequestDto = {
        source: AccessRequestSource.TELEGRAM,
      };
      mockAccessRequestRepository.findAndCount.mockResolvedValue([
        [mockAccessRequest] as AccessRequest[],
        1,
      ]);

      // Act
      const _result = await service.findAll(queryDto);

      // Assert
      expect(mockAccessRequestRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { source: AccessRequestSource.TELEGRAM },
        }),
      );
    });

    it('should filter by telegram_id', async () => {
      // Arrange
      const queryDto: QueryAccessRequestDto = {
        telegram_id: mockTelegramId,
      };
      mockAccessRequestRepository.findAndCount.mockResolvedValue([
        [mockAccessRequest] as AccessRequest[],
        1,
      ]);

      // Act
      const _result = await service.findAll(queryDto);

      // Assert
      expect(mockAccessRequestRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { telegram_id: mockTelegramId },
        }),
      );
    });

    it('should use default pagination when not provided', async () => {
      // Arrange
      const queryDto: QueryAccessRequestDto = {};
      mockAccessRequestRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(queryDto);

      // Assert
      expect(mockAccessRequestRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return access request by ID', async () => {
      // Arrange
      mockAccessRequestRepository.findOne.mockResolvedValue(mockAccessRequest as AccessRequest);

      // Act
      const result = await service.findOne(mockRequestId);

      // Assert
      expect(result).toEqual(mockAccessRequest);
      expect(mockAccessRequestRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRequestId },
        relations: ['processed_by', 'created_user'],
      });
    });

    it('should throw NotFoundException when request not found', async () => {
      // Arrange
      mockAccessRequestRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Access request with ID non-existent-id not found',
      );
    });
  });

  describe('approve', () => {
    const approveDto: ApproveAccessRequestDto = {
      role_names: ['operator'],
      email: 'operator@example.com',
      notes: 'Approved for operator role',
    };

    it('should approve access request and create user', async () => {
      // Arrange
      mockAccessRequestRepository.findOne
        .mockResolvedValueOnce(mockAccessRequest as AccessRequest) // First call for approve
        .mockResolvedValueOnce(mockApprovedRequest as AccessRequest); // Second call for return
      mockRbacService.findRolesByNames.mockResolvedValue([mockRole] as any);
      mockUsersService.create.mockResolvedValue(mockUserResponse as UserResponseDto);
      mockRbacService.assignRolesToUser.mockResolvedValue(undefined);
      mockAccessRequestRepository.save.mockResolvedValue(mockApprovedRequest as AccessRequest);

      // Act
      const result = await service.approve(mockRequestId, approveDto, mockAdminUserId);

      // Assert
      expect(result.status).toBe(AccessRequestStatus.APPROVED);
      expect(mockRbacService.findRolesByNames).toHaveBeenCalledWith(['operator']);
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(mockRbacService.assignRolesToUser).toHaveBeenCalledWith(mockCreatedUserId, ['role-1']);
    });

    it('should generate temporary password when not provided', async () => {
      // Arrange
      const approveWithoutPassword: ApproveAccessRequestDto = {
        role_names: ['operator'],
      };

      // Create fresh objects for this test to avoid mutation
      const newRequest = { ...mockAccessRequest, status: AccessRequestStatus.NEW };
      const approvedRequest = { ...mockAccessRequest, status: AccessRequestStatus.APPROVED };

      mockAccessRequestRepository.findOne
        .mockResolvedValueOnce(newRequest as AccessRequest)
        .mockResolvedValueOnce(approvedRequest as AccessRequest);
      mockRbacService.findRolesByNames.mockResolvedValue([mockRole] as any);
      mockUsersService.create.mockResolvedValue(mockUserResponse as UserResponseDto);
      mockRbacService.assignRolesToUser.mockResolvedValue(undefined);
      mockAccessRequestRepository.save.mockResolvedValue(approvedRequest as AccessRequest);

      // Act
      await service.approve(mockRequestId, approveWithoutPassword, mockAdminUserId);

      // Assert
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password: expect.any(String),
        }),
      );
    });

    it('should generate email from telegram_id when not provided', async () => {
      // Arrange
      const approveWithoutEmail: ApproveAccessRequestDto = {
        role_names: ['operator'],
      };

      // Create fresh objects for this test to avoid mutation
      const newRequest = { ...mockAccessRequest, status: AccessRequestStatus.NEW };
      const approvedRequest = { ...mockAccessRequest, status: AccessRequestStatus.APPROVED };

      mockAccessRequestRepository.findOne
        .mockResolvedValueOnce(newRequest as AccessRequest)
        .mockResolvedValueOnce(approvedRequest as AccessRequest);
      mockRbacService.findRolesByNames.mockResolvedValue([mockRole] as any);
      mockUsersService.create.mockResolvedValue(mockUserResponse as UserResponseDto);
      mockRbacService.assignRolesToUser.mockResolvedValue(undefined);
      mockAccessRequestRepository.save.mockResolvedValue(approvedRequest as AccessRequest);

      // Act
      await service.approve(mockRequestId, approveWithoutEmail, mockAdminUserId);

      // Assert
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: `telegram_${mockTelegramId}@vendhub.temp`,
        }),
      );
    });

    it('should throw BadRequestException when request already processed', async () => {
      // Arrange
      mockAccessRequestRepository.findOne.mockResolvedValue(mockApprovedRequest as AccessRequest);

      // Act & Assert
      await expect(service.approve(mockRequestId, approveDto, mockAdminUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approve(mockRequestId, approveDto, mockAdminUserId)).rejects.toThrow(
        'Cannot approve request with status "approved"',
      );
    });

    it('should throw BadRequestException when role names are invalid', async () => {
      // Arrange
      const approveWithInvalidRoles: ApproveAccessRequestDto = {
        role_names: ['operator', 'invalid_role'],
      };

      // Create fresh object to avoid mutation from previous tests
      const newRequest = { ...mockAccessRequest, status: AccessRequestStatus.NEW };

      mockAccessRequestRepository.findOne.mockResolvedValue(newRequest as AccessRequest);
      mockRbacService.findRolesByNames.mockResolvedValue([mockRole] as any); // Only one role found

      // Act & Assert
      await expect(
        service.approve(mockRequestId, approveWithInvalidRoles, mockAdminUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.approve(mockRequestId, approveWithInvalidRoles, mockAdminUserId),
      ).rejects.toThrow('One or more role names are invalid');
    });

    it('should build full name from telegram data', async () => {
      // Arrange
      // Create fresh objects for this test to avoid mutation
      const newRequest = { ...mockAccessRequest, status: AccessRequestStatus.NEW };
      const approvedRequest = { ...mockAccessRequest, status: AccessRequestStatus.APPROVED };

      mockAccessRequestRepository.findOne
        .mockResolvedValueOnce(newRequest as AccessRequest)
        .mockResolvedValueOnce(approvedRequest as AccessRequest);
      mockRbacService.findRolesByNames.mockResolvedValue([mockRole] as any);
      mockUsersService.create.mockResolvedValue(mockUserResponse as UserResponseDto);
      mockRbacService.assignRolesToUser.mockResolvedValue(undefined);
      mockAccessRequestRepository.save.mockResolvedValue(approvedRequest as AccessRequest);

      // Act
      await service.approve(mockRequestId, approveDto, mockAdminUserId);

      // Assert
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Test User',
        }),
      );
    });

    it('should use telegram username as full name when first/last names missing', async () => {
      // Arrange
      const requestWithOnlyUsername: Partial<AccessRequest> = {
        ...mockAccessRequest,
        status: AccessRequestStatus.NEW,
        telegram_first_name: null,
        telegram_last_name: null,
        telegram_username: 'testuser',
      };

      const approvedRequest = { ...requestWithOnlyUsername, status: AccessRequestStatus.APPROVED };

      mockAccessRequestRepository.findOne
        .mockResolvedValueOnce(requestWithOnlyUsername as AccessRequest)
        .mockResolvedValueOnce(approvedRequest as AccessRequest);
      mockRbacService.findRolesByNames.mockResolvedValue([mockRole] as any);
      mockUsersService.create.mockResolvedValue(mockUserResponse as UserResponseDto);
      mockRbacService.assignRolesToUser.mockResolvedValue(undefined);
      mockAccessRequestRepository.save.mockResolvedValue(approvedRequest as AccessRequest);

      // Act
      await service.approve(mockRequestId, approveDto, mockAdminUserId);

      // Assert
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: '@testuser',
        }),
      );
    });

    it('should use telegram ID as full name when all names are missing', async () => {
      // Arrange
      const requestWithNoNames: Partial<AccessRequest> = {
        ...mockAccessRequest,
        status: AccessRequestStatus.NEW,
        telegram_first_name: null,
        telegram_last_name: null,
        telegram_username: null,
      };

      const approvedRequest = { ...requestWithNoNames, status: AccessRequestStatus.APPROVED };

      mockAccessRequestRepository.findOne
        .mockResolvedValueOnce(requestWithNoNames as AccessRequest)
        .mockResolvedValueOnce(approvedRequest as AccessRequest);
      mockRbacService.findRolesByNames.mockResolvedValue([mockRole] as any);
      mockUsersService.create.mockResolvedValue(mockUserResponse as UserResponseDto);
      mockRbacService.assignRolesToUser.mockResolvedValue(undefined);
      mockAccessRequestRepository.save.mockResolvedValue(approvedRequest as AccessRequest);

      // Act
      await service.approve(mockRequestId, approveDto, mockAdminUserId);

      // Assert
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: `Telegram User ${mockTelegramId}`,
        }),
      );
    });
  });

  describe('reject', () => {
    const rejectDto: RejectAccessRequestDto = {
      rejection_reason: 'Not eligible for access',
      notes: 'Does not meet requirements',
    };

    it('should reject access request successfully', async () => {
      // Arrange
      // Create fresh objects for this test to avoid mutation
      const newRequest = { ...mockAccessRequest, status: AccessRequestStatus.NEW };
      const rejectedRequest = {
        ...mockAccessRequest,
        status: AccessRequestStatus.REJECTED,
        rejection_reason: rejectDto.rejection_reason,
      };

      mockAccessRequestRepository.findOne
        .mockResolvedValueOnce(newRequest as AccessRequest)
        .mockResolvedValueOnce(rejectedRequest as AccessRequest);
      mockAccessRequestRepository.save.mockResolvedValue(rejectedRequest as AccessRequest);

      // Act
      const result = await service.reject(mockRequestId, rejectDto, mockAdminUserId);

      // Assert
      expect(result.status).toBe(AccessRequestStatus.REJECTED);
      expect(mockAccessRequestRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AccessRequestStatus.REJECTED,
          processed_by_user_id: mockAdminUserId,
          rejection_reason: rejectDto.rejection_reason,
        }),
      );
    });

    it('should throw BadRequestException when request already processed', async () => {
      // Arrange
      mockAccessRequestRepository.findOne.mockResolvedValue(mockApprovedRequest as AccessRequest);

      // Act & Assert
      await expect(service.reject(mockRequestId, rejectDto, mockAdminUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reject(mockRequestId, rejectDto, mockAdminUserId)).rejects.toThrow(
        'Cannot reject request with status "approved"',
      );
    });

    it('should handle rejection without notes', async () => {
      // Arrange
      const rejectWithoutNotes: RejectAccessRequestDto = {
        rejection_reason: 'Not eligible',
      };

      // Create fresh objects for this test to avoid mutation
      const newRequest = { ...mockAccessRequest, status: AccessRequestStatus.NEW };
      const rejectedRequest = {
        ...mockAccessRequest,
        status: AccessRequestStatus.REJECTED,
        rejection_reason: 'Not eligible',
      };

      mockAccessRequestRepository.findOne
        .mockResolvedValueOnce(newRequest as AccessRequest)
        .mockResolvedValueOnce(rejectedRequest as AccessRequest);
      mockAccessRequestRepository.save.mockResolvedValue(rejectedRequest as AccessRequest);

      // Act
      await service.reject(mockRequestId, rejectWithoutNotes, mockAdminUserId);

      // Assert
      expect(mockAccessRequestRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: null,
        }),
      );
    });
  });

  describe('remove', () => {
    it('should soft delete access request', async () => {
      // Arrange
      mockAccessRequestRepository.findOne.mockResolvedValue(mockAccessRequest as AccessRequest);
      mockAccessRequestRepository.softRemove.mockResolvedValue(mockAccessRequest as AccessRequest);

      // Act
      await service.remove(mockRequestId);

      // Assert
      expect(mockAccessRequestRepository.softRemove).toHaveBeenCalledWith(mockAccessRequest);
    });

    it('should throw NotFoundException when request not found', async () => {
      // Arrange
      mockAccessRequestRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple roles in approval', async () => {
      // Arrange
      const approveWithMultipleRoles: ApproveAccessRequestDto = {
        role_names: ['operator', 'collector'],
      };

      const roles = [
        { id: 'role-1', name: 'operator' },
        { id: 'role-2', name: 'collector' },
      ];

      // Create fresh objects for this test to avoid mutation
      const newRequest = { ...mockAccessRequest, status: AccessRequestStatus.NEW };
      const approvedRequest = { ...mockAccessRequest, status: AccessRequestStatus.APPROVED };

      mockAccessRequestRepository.findOne
        .mockResolvedValueOnce(newRequest as AccessRequest)
        .mockResolvedValueOnce(approvedRequest as AccessRequest);
      mockRbacService.findRolesByNames.mockResolvedValue(roles as any);
      mockUsersService.create.mockResolvedValue(mockUserResponse as UserResponseDto);
      mockRbacService.assignRolesToUser.mockResolvedValue(undefined);
      mockAccessRequestRepository.save.mockResolvedValue(approvedRequest as AccessRequest);

      // Act
      await service.approve(mockRequestId, approveWithMultipleRoles, mockAdminUserId);

      // Assert
      expect(mockRbacService.assignRolesToUser).toHaveBeenCalledWith(mockCreatedUserId, [
        'role-1',
        'role-2',
      ]);
    });

    it('should handle concurrent create requests with same telegram_id', async () => {
      // Arrange - First call succeeds, second fails with conflict
      const createDto: CreateAccessRequestDto = {
        telegram_id: mockTelegramId,
      };

      mockUsersService.findByTelegramId.mockResolvedValue(null);
      mockAccessRequestRepository.findOne.mockResolvedValue(mockAccessRequest as AccessRequest);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should handle empty result in findAll', async () => {
      // Arrange
      mockAccessRequestRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      const result = await service.findAll({});

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
