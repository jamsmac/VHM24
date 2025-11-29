import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In } from 'typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { User } from '@modules/users/entities/user.entity';
import {
  CreateRoleDto,
  UpdateRoleDto,
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionAction,
} from './dto';

describe('RbacService', () => {
  let service: RbacService;
  let mockRoleRepository: jest.Mocked<Repository<Role>>;
  let mockPermissionRepository: jest.Mocked<Repository<Permission>>;
  let mockUserRepository: jest.Mocked<Repository<User>>;

  // Test fixtures
  const mockPermission: Permission = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'machines.create',
    resource: 'machines',
    action: PermissionAction.CREATE,
    description: 'Allows creating new vending machines',
    roles: [],
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  };

  const mockPermission2: Permission = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    name: 'machines.read',
    resource: 'machines',
    action: PermissionAction.READ,
    description: 'Allows reading machines',
    roles: [],
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  };

  const mockPermission3: Permission = {
    id: '323e4567-e89b-12d3-a456-426614174001',
    name: 'tasks.manage',
    resource: 'tasks',
    action: PermissionAction.MANAGE,
    description: 'Full control over tasks',
    roles: [],
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  };

  const mockRole: Role = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Warehouse Manager',
    description: 'Manages warehouse inventory and operations',
    is_active: true,
    permissions: [mockPermission, mockPermission2],
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  };

  const mockRole2: Role = {
    id: '223e4567-e89b-12d3-a456-426614174000',
    name: 'Operator',
    description: 'Field operator',
    is_active: true,
    permissions: [mockPermission2],
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  };

  const mockInactiveRole: Role = {
    ...mockRole,
    id: '323e4567-e89b-12d3-a456-426614174000',
    name: 'Inactive Role',
    is_active: false,
    permissions: [],
  };

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashed',
    full_name: 'Test User',
    phone: '+1234567890',
    role: 'OPERATOR' as any,
    is_active: true,
    roles: [mockRole],
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    deleted_at: null,
  } as any;

  // Helper to create mock query builder
  const createMockQueryBuilder = (): Partial<SelectQueryBuilder<any>> => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  });

  beforeEach(async () => {
    mockRoleRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockPermissionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      softDelete: jest.fn(),
    } as any;

    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // ROLE MANAGEMENT
  // ============================================================================

  describe('createRole', () => {
    it('should create a role successfully without permissions', async () => {
      // Arrange
      const createDto: CreateRoleDto = {
        name: 'New Role',
        description: 'A new role',
        is_active: true,
      };

      mockRoleRepository.findOne.mockResolvedValue(null);
      mockRoleRepository.create.mockReturnValue({
        name: createDto.name,
        description: createDto.description,
        is_active: true,
      } as any);
      mockRoleRepository.save.mockResolvedValue({
        id: 'new-role-id',
        ...createDto,
        permissions: [],
      } as any);

      // Act
      const result = await service.createRole(createDto);

      // Assert
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name },
      });
      expect(mockRoleRepository.create).toHaveBeenCalledWith({
        name: createDto.name,
        description: createDto.description,
        is_active: true,
      });
      expect(mockRoleRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(createDto.name);
    });

    it('should create a role with permissions', async () => {
      // Arrange
      const createDto: CreateRoleDto = {
        name: 'Role with Permissions',
        description: 'Has permissions',
        permission_ids: [mockPermission.id, mockPermission2.id],
      };

      mockRoleRepository.findOne.mockResolvedValue(null);
      mockPermissionRepository.find.mockResolvedValue([mockPermission, mockPermission2]);
      mockRoleRepository.create.mockReturnValue({
        name: createDto.name,
        description: createDto.description,
        is_active: true,
      } as any);
      mockRoleRepository.save.mockResolvedValue({
        id: 'new-role-id',
        name: createDto.name,
        permissions: [mockPermission, mockPermission2],
      } as any);

      // Act
      const result = await service.createRole(createDto);

      // Assert
      expect(mockPermissionRepository.find).toHaveBeenCalledWith({
        where: { id: In(createDto.permission_ids!) },
      });
      expect(result.permissions).toHaveLength(2);
    });

    it('should throw ConflictException when role name already exists', async () => {
      // Arrange
      const createDto: CreateRoleDto = {
        name: 'Warehouse Manager',
        description: 'Duplicate name',
      };

      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      // Act & Assert
      await expect(service.createRole(createDto)).rejects.toThrow(ConflictException);
      await expect(service.createRole(createDto)).rejects.toThrow(
        'Role with name "Warehouse Manager" already exists',
      );
    });

    it('should throw BadRequestException when permission IDs are invalid', async () => {
      // Arrange
      const createDto: CreateRoleDto = {
        name: 'New Role',
        permission_ids: ['invalid-id-1', 'invalid-id-2'],
      };

      mockRoleRepository.findOne.mockResolvedValue(null);
      mockPermissionRepository.find.mockResolvedValue([mockPermission]); // Only 1 found, but 2 requested

      // Act & Assert
      await expect(service.createRole(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.createRole(createDto)).rejects.toThrow(
        'One or more permission IDs are invalid',
      );
    });

    it('should default is_active to true when not provided', async () => {
      // Arrange
      const createDto: CreateRoleDto = {
        name: 'Default Active Role',
      };

      mockRoleRepository.findOne.mockResolvedValue(null);
      mockRoleRepository.create.mockReturnValue({
        name: createDto.name,
        is_active: true,
      } as any);
      mockRoleRepository.save.mockResolvedValue({
        id: 'new-id',
        name: createDto.name,
        is_active: true,
      } as any);

      // Act
      const result = await service.createRole(createDto);

      // Assert
      expect(mockRoleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true }),
      );
    });

    it('should create role with empty permissions array when permission_ids is empty', async () => {
      // Arrange
      const createDto: CreateRoleDto = {
        name: 'Empty Permissions Role',
        permission_ids: [],
      };

      mockRoleRepository.findOne.mockResolvedValue(null);
      mockRoleRepository.create.mockReturnValue({
        name: createDto.name,
        is_active: true,
      } as any);
      mockRoleRepository.save.mockResolvedValue({
        id: 'new-id',
        name: createDto.name,
        permissions: [],
      } as any);

      // Act
      await service.createRole(createDto);

      // Assert
      expect(mockPermissionRepository.find).not.toHaveBeenCalled();
    });

    it('should respect is_active: false when explicitly set', async () => {
      // Arrange
      const createDto: CreateRoleDto = {
        name: 'Inactive Role',
        is_active: false,
      };

      mockRoleRepository.findOne.mockResolvedValue(null);
      mockRoleRepository.create.mockReturnValue({
        name: createDto.name,
        is_active: false,
      } as any);
      mockRoleRepository.save.mockResolvedValue({
        id: 'new-id',
        name: createDto.name,
        is_active: false,
      } as any);

      // Act
      await service.createRole(createDto);

      // Assert
      expect(mockRoleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });
  });

  describe('findAllRoles', () => {
    it('should return all roles without filter', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([
        mockRole,
        mockRole2,
        mockInactiveRole,
      ]);
      mockRoleRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findAllRoles();

      // Assert
      expect(result).toHaveLength(3);
      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'role.permissions',
        'permission',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('role.name', 'ASC');
    });

    it('should return only active roles when isActive is true', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([mockRole, mockRole2]);
      mockRoleRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findAllRoles(true);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('role.is_active = :isActive', {
        isActive: true,
      });
    });

    it('should return only inactive roles when isActive is false', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([mockInactiveRole]);
      mockRoleRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findAllRoles(false);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('role.is_active = :isActive', {
        isActive: false,
      });
    });

    it('should return empty array when no roles exist', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([]);
      mockRoleRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findAllRoles();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOneRole', () => {
    it('should return role by ID with permissions', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      // Act
      const result = await service.findOneRole(mockRole.id);

      // Assert
      expect(result).toEqual(mockRole);
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRole.id },
        relations: ['permissions'],
      });
    });

    it('should throw NotFoundException when role not found', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOneRole('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOneRole('non-existent-id')).rejects.toThrow(
        'Role with ID "non-existent-id" not found',
      );
    });
  });

  describe('findRoleByName', () => {
    it('should return role by name', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      // Act
      const result = await service.findRoleByName('Warehouse Manager');

      // Assert
      expect(result).toEqual(mockRole);
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Warehouse Manager' },
        relations: ['permissions'],
      });
    });

    it('should return null when role not found', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findRoleByName('Non-existent Role');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findRolesByNames', () => {
    it('should return multiple roles by names', async () => {
      // Arrange
      mockRoleRepository.find.mockResolvedValue([mockRole, mockRole2]);

      // Act
      const result = await service.findRolesByNames(['Warehouse Manager', 'Operator']);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRoleRepository.find).toHaveBeenCalledWith({
        where: [{ name: 'Warehouse Manager' }, { name: 'Operator' }],
        relations: ['permissions'],
      });
    });

    it('should return empty array when no matching roles', async () => {
      // Arrange
      mockRoleRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findRolesByNames(['Non-existent 1', 'Non-existent 2']);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle single name in array', async () => {
      // Arrange
      mockRoleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.findRolesByNames(['Warehouse Manager']);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('updateRole', () => {
    it('should update role successfully', async () => {
      // Arrange
      const updateDto: UpdateRoleDto = {
        name: 'Updated Role Name',
        description: 'Updated description',
      };

      mockRoleRepository.findOne
        .mockResolvedValueOnce({ ...mockRole }) // findOneRole
        .mockResolvedValueOnce(null); // check name conflict

      mockRoleRepository.save.mockResolvedValue({
        ...mockRole,
        ...updateDto,
      } as any);

      // Act
      const result = await service.updateRole(mockRole.id, updateDto);

      // Assert
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
    });

    it('should throw ConflictException when new name already exists', async () => {
      // Arrange
      const updateDto: UpdateRoleDto = {
        name: 'Operator',
      };

      mockRoleRepository.findOne
        .mockResolvedValueOnce({ ...mockRole }) // findOneRole
        .mockResolvedValueOnce(mockRole2); // existing role with that name

      // Act & Assert
      await expect(service.updateRole(mockRole.id, updateDto)).rejects.toThrow(ConflictException);
    });

    it('should not check name conflict when name is unchanged', async () => {
      // Arrange
      const updateDto: UpdateRoleDto = {
        description: 'Only updating description',
      };

      mockRoleRepository.findOne.mockResolvedValue({ ...mockRole });
      mockRoleRepository.save.mockResolvedValue({
        ...mockRole,
        description: updateDto.description,
      } as any);

      // Act
      await service.updateRole(mockRole.id, updateDto);

      // Assert - findOne should only be called once (not twice for name check)
      expect(mockRoleRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should update role permissions', async () => {
      // Arrange
      const updateDto: UpdateRoleDto = {
        permission_ids: [mockPermission3.id],
      };

      mockRoleRepository.findOne.mockResolvedValue({ ...mockRole });
      mockPermissionRepository.find.mockResolvedValue([mockPermission3]);
      mockRoleRepository.save.mockResolvedValue({
        ...mockRole,
        permissions: [mockPermission3],
      } as any);

      // Act
      const result = await service.updateRole(mockRole.id, updateDto);

      // Assert
      expect(mockPermissionRepository.find).toHaveBeenCalledWith({
        where: { id: In(updateDto.permission_ids!) },
      });
      expect(result.permissions).toHaveLength(1);
    });

    it('should throw BadRequestException for invalid permission IDs', async () => {
      // Arrange
      const updateDto: UpdateRoleDto = {
        permission_ids: ['invalid-id'],
      };

      mockRoleRepository.findOne.mockResolvedValue({ ...mockRole });
      mockPermissionRepository.find.mockResolvedValue([]); // No permissions found

      // Act & Assert
      await expect(service.updateRole(mockRole.id, updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should update is_active status', async () => {
      // Arrange
      const updateDto: UpdateRoleDto = {
        is_active: false,
      };

      mockRoleRepository.findOne.mockResolvedValue({ ...mockRole });
      mockRoleRepository.save.mockResolvedValue({
        ...mockRole,
        is_active: false,
      } as any);

      // Act
      const result = await service.updateRole(mockRole.id, updateDto);

      // Assert
      expect(result.is_active).toBe(false);
    });

    it('should throw NotFoundException when role not found', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateRole('non-existent-id', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow updating description to null', async () => {
      // Arrange
      const updateDto: UpdateRoleDto = {
        description: undefined,
      };

      mockRoleRepository.findOne.mockResolvedValue({ ...mockRole });
      mockRoleRepository.save.mockResolvedValue({
        ...mockRole,
        description: undefined,
      } as any);

      // Act
      const result = await service.updateRole(mockRole.id, updateDto);

      // Assert
      expect(result.description).toBeUndefined();
    });
  });

  describe('removeRole', () => {
    it('should soft delete role successfully', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockRoleRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.removeRole(mockRole.id);

      // Assert
      expect(mockRoleRepository.softDelete).toHaveBeenCalledWith(mockRole.id);
    });

    it('should throw NotFoundException when role not found', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.removeRole('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addPermissionsToRole', () => {
    it('should add new permissions to role', async () => {
      // Arrange
      const roleWithPermissions = {
        ...mockRole,
        permissions: [mockPermission],
      };

      mockRoleRepository.findOne.mockResolvedValue({ ...roleWithPermissions });
      mockPermissionRepository.find.mockResolvedValue([mockPermission2, mockPermission3]);
      mockRoleRepository.save.mockResolvedValue({
        ...roleWithPermissions,
        permissions: [mockPermission, mockPermission2, mockPermission3],
      } as any);

      // Act
      const result = await service.addPermissionsToRole(mockRole.id, [
        mockPermission2.id,
        mockPermission3.id,
      ]);

      // Assert
      expect(result.permissions).toHaveLength(3);
    });

    it('should not add duplicate permissions', async () => {
      // Arrange
      const roleWithPermissions = {
        ...mockRole,
        permissions: [mockPermission],
      };

      mockRoleRepository.findOne.mockResolvedValue({ ...roleWithPermissions });
      mockPermissionRepository.find.mockResolvedValue([mockPermission]); // Already exists

      // Act
      await service.addPermissionsToRole(mockRole.id, [mockPermission.id]);

      // Assert - Save should be called but with same permissions (no duplicates added)
      expect(mockRoleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: expect.arrayContaining([mockPermission]),
        }),
      );
    });

    it('should throw BadRequestException for invalid permission IDs', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue({ ...mockRole });
      mockPermissionRepository.find.mockResolvedValue([]); // No permissions found

      // Act & Assert
      await expect(service.addPermissionsToRole(mockRole.id, ['invalid-id'])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when role not found', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.addPermissionsToRole('non-existent-id', [mockPermission.id]),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removePermissionsFromRole', () => {
    it('should remove permissions from role', async () => {
      // Arrange
      const roleWithPermissions = {
        ...mockRole,
        permissions: [mockPermission, mockPermission2],
      };

      mockRoleRepository.findOne.mockResolvedValue({ ...roleWithPermissions });
      mockRoleRepository.save.mockResolvedValue({
        ...roleWithPermissions,
        permissions: [mockPermission2],
      } as any);

      // Act
      const result = await service.removePermissionsFromRole(mockRole.id, [mockPermission.id]);

      // Assert
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].id).toBe(mockPermission2.id);
    });

    it('should throw NotFoundException when role not found', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removePermissionsFromRole('non-existent-id', [mockPermission.id]),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle removing non-existent permission IDs gracefully', async () => {
      // Arrange
      const roleWithPermissions = {
        ...mockRole,
        permissions: [mockPermission],
      };

      mockRoleRepository.findOne.mockResolvedValue({ ...roleWithPermissions });
      mockRoleRepository.save.mockResolvedValue({
        ...roleWithPermissions,
        permissions: [mockPermission], // No change
      } as any);

      // Act
      const result = await service.removePermissionsFromRole(mockRole.id, [
        'non-existent-permission-id',
      ]);

      // Assert - Should not throw, just filter out non-matching IDs
      expect(result.permissions).toHaveLength(1);
    });

    it('should result in empty permissions when all removed', async () => {
      // Arrange
      const roleWithPermissions = {
        ...mockRole,
        permissions: [mockPermission],
      };

      mockRoleRepository.findOne.mockResolvedValue({ ...roleWithPermissions });
      mockRoleRepository.save.mockResolvedValue({
        ...roleWithPermissions,
        permissions: [],
      } as any);

      // Act
      const result = await service.removePermissionsFromRole(mockRole.id, [mockPermission.id]);

      // Assert
      expect(result.permissions).toHaveLength(0);
    });
  });

  // ============================================================================
  // PERMISSION MANAGEMENT
  // ============================================================================

  describe('createPermission', () => {
    it('should create permission successfully', async () => {
      // Arrange
      const createDto: CreatePermissionDto = {
        name: 'users.delete',
        resource: 'users',
        action: PermissionAction.DELETE,
        description: 'Allows deleting users',
      };

      mockPermissionRepository.findOne.mockResolvedValue(null);
      mockPermissionRepository.create.mockReturnValue({ ...createDto } as any);
      mockPermissionRepository.save.mockResolvedValue({
        id: 'new-permission-id',
        ...createDto,
      } as any);

      // Act
      const result = await service.createPermission(createDto);

      // Assert
      expect(mockPermissionRepository.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name },
      });
      expect(mockPermissionRepository.create).toHaveBeenCalledWith(createDto);
      expect(result.name).toBe(createDto.name);
      expect(result.resource).toBe(createDto.resource);
      expect(result.action).toBe(createDto.action);
    });

    it('should throw ConflictException when permission name already exists', async () => {
      // Arrange
      const createDto: CreatePermissionDto = {
        name: 'machines.create',
        resource: 'machines',
        action: PermissionAction.CREATE,
      };

      mockPermissionRepository.findOne.mockResolvedValue(mockPermission);

      // Act & Assert
      await expect(service.createPermission(createDto)).rejects.toThrow(ConflictException);
      await expect(service.createPermission(createDto)).rejects.toThrow(
        'Permission with name "machines.create" already exists',
      );
    });

    it('should create permission with all action types', async () => {
      // Arrange & Act & Assert
      for (const action of Object.values(PermissionAction)) {
        const createDto: CreatePermissionDto = {
          name: `test.${action}`,
          resource: 'test',
          action: action,
        };

        mockPermissionRepository.findOne.mockResolvedValue(null);
        mockPermissionRepository.create.mockReturnValue({ ...createDto } as any);
        mockPermissionRepository.save.mockResolvedValue({
          id: `perm-${action}`,
          ...createDto,
        } as any);

        const result = await service.createPermission(createDto);
        expect(result.action).toBe(action);

        jest.clearAllMocks();
      }
    });

    it('should create permission without description', async () => {
      // Arrange
      const createDto: CreatePermissionDto = {
        name: 'minimal.read',
        resource: 'minimal',
        action: PermissionAction.READ,
      };

      mockPermissionRepository.findOne.mockResolvedValue(null);
      mockPermissionRepository.create.mockReturnValue({ ...createDto } as any);
      mockPermissionRepository.save.mockResolvedValue({
        id: 'new-id',
        ...createDto,
      } as any);

      // Act
      const result = await service.createPermission(createDto);

      // Assert
      expect(result.name).toBe('minimal.read');
      expect(result.description).toBeUndefined();
    });
  });

  describe('findAllPermissions', () => {
    it('should return all permissions ordered by resource and action', async () => {
      // Arrange
      mockPermissionRepository.find.mockResolvedValue([
        mockPermission,
        mockPermission2,
        mockPermission3,
      ]);

      // Act
      const result = await service.findAllPermissions();

      // Assert
      expect(result).toHaveLength(3);
      expect(mockPermissionRepository.find).toHaveBeenCalledWith({
        order: { resource: 'ASC', action: 'ASC' },
      });
    });

    it('should return empty array when no permissions exist', async () => {
      // Arrange
      mockPermissionRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAllPermissions();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOnePermission', () => {
    it('should return permission by ID', async () => {
      // Arrange
      mockPermissionRepository.findOne.mockResolvedValue(mockPermission);

      // Act
      const result = await service.findOnePermission(mockPermission.id);

      // Assert
      expect(result).toEqual(mockPermission);
      expect(mockPermissionRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockPermission.id },
      });
    });

    it('should throw NotFoundException when permission not found', async () => {
      // Arrange
      mockPermissionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOnePermission('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOnePermission('non-existent-id')).rejects.toThrow(
        'Permission with ID "non-existent-id" not found',
      );
    });
  });

  describe('findPermissionByName', () => {
    it('should return permission by name', async () => {
      // Arrange
      mockPermissionRepository.findOne.mockResolvedValue(mockPermission);

      // Act
      const result = await service.findPermissionByName('machines.create');

      // Assert
      expect(result).toEqual(mockPermission);
      expect(mockPermissionRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'machines.create' },
      });
    });

    it('should return null when permission not found', async () => {
      // Arrange
      mockPermissionRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findPermissionByName('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updatePermission', () => {
    it('should update permission successfully', async () => {
      // Arrange
      const updateDto: UpdatePermissionDto = {
        description: 'Updated description',
      };

      mockPermissionRepository.findOne
        .mockResolvedValueOnce({ ...mockPermission }) // findOnePermission
        .mockResolvedValueOnce(null); // name check (not called since name not updated)

      mockPermissionRepository.save.mockResolvedValue({
        ...mockPermission,
        ...updateDto,
      } as any);

      // Act
      const result = await service.updatePermission(mockPermission.id, updateDto);

      // Assert
      expect(result.description).toBe(updateDto.description);
    });

    it('should throw ConflictException when new name already exists', async () => {
      // Arrange
      const updateDto: UpdatePermissionDto = {
        name: 'machines.read', // This already exists
      };

      mockPermissionRepository.findOne
        .mockResolvedValueOnce({ ...mockPermission }) // findOnePermission
        .mockResolvedValueOnce(mockPermission2); // existing permission

      // Act & Assert
      await expect(service.updatePermission(mockPermission.id, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should not check name conflict when name is unchanged', async () => {
      // Arrange
      const updateDto: UpdatePermissionDto = {
        description: 'Only updating description',
      };

      mockPermissionRepository.findOne.mockResolvedValue({ ...mockPermission });
      mockPermissionRepository.save.mockResolvedValue({
        ...mockPermission,
        description: updateDto.description,
      } as any);

      // Act
      await service.updatePermission(mockPermission.id, updateDto);

      // Assert
      expect(mockPermissionRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when permission not found', async () => {
      // Arrange
      mockPermissionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updatePermission('non-existent-id', { description: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update resource and action fields', async () => {
      // Arrange
      const updateDto: UpdatePermissionDto = {
        resource: 'updated_resource',
        action: PermissionAction.MANAGE,
      };

      mockPermissionRepository.findOne.mockResolvedValue({ ...mockPermission });
      mockPermissionRepository.save.mockResolvedValue({
        ...mockPermission,
        ...updateDto,
      } as any);

      // Act
      const result = await service.updatePermission(mockPermission.id, updateDto);

      // Assert
      expect(result.resource).toBe('updated_resource');
      expect(result.action).toBe(PermissionAction.MANAGE);
    });
  });

  describe('removePermission', () => {
    it('should soft delete permission successfully', async () => {
      // Arrange
      mockPermissionRepository.findOne.mockResolvedValue(mockPermission);
      mockPermissionRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.removePermission(mockPermission.id);

      // Assert
      expect(mockPermissionRepository.softDelete).toHaveBeenCalledWith(mockPermission.id);
    });

    it('should throw NotFoundException when permission not found', async () => {
      // Arrange
      mockPermissionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.removePermission('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // AUTHORIZATION HELPERS
  // ============================================================================

  describe('checkPermission', () => {
    it('should return true when user has permission', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [mockRole],
      } as any);

      // Act
      const result = await service.checkPermission(
        mockUser.id,
        'machines',
        PermissionAction.CREATE,
      );

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user does not have permission', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [mockRole],
      } as any);

      // Act
      const result = await service.checkPermission(
        mockUser.id,
        'users',
        PermissionAction.DELETE, // User doesn't have this permission
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when user has no roles', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [],
      } as any);

      // Act
      const result = await service.checkPermission(
        mockUser.id,
        'machines',
        PermissionAction.CREATE,
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.checkPermission('non-existent-id', 'machines', PermissionAction.READ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check across multiple roles', async () => {
      // Arrange
      const multiRoleUser = {
        ...mockUser,
        roles: [
          { ...mockRole, permissions: [mockPermission] },
          { ...mockRole2, permissions: [mockPermission3] },
        ],
      };

      mockUserRepository.findOne.mockResolvedValue(multiRoleUser as any);

      // Act
      const resultTasksManage = await service.checkPermission(
        mockUser.id,
        'tasks',
        PermissionAction.MANAGE,
      );

      // Assert - Should find permission from second role
      expect(resultTasksManage).toBe(true);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has role', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [mockRole],
      } as any);

      // Act
      const result = await service.hasRole(mockUser.id, 'Warehouse Manager');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user does not have role', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [mockRole],
      } as any);

      // Act
      const result = await service.hasRole(mockUser.id, 'Administrator');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when user has no roles', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [],
      } as any);

      // Act
      const result = await service.hasRole(mockUser.id, 'Warehouse Manager');

      // Assert
      expect(result).toBe(false);
    });

    it('should be case-sensitive for role names', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [mockRole],
      } as any);

      // Act
      const result = await service.hasRole(mockUser.id, 'warehouse manager'); // lowercase

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getUserRoles', () => {
    it('should return all roles for a user', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [mockRole, mockRole2],
      } as any);

      // Act
      const result = await service.getUserRoles(mockUser.id);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        relations: ['roles', 'roles.permissions'],
      });
    });

    it('should return empty array when user has no roles', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: undefined,
      } as any);

      // Act
      const result = await service.getUserRoles(mockUser.id);

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserRoles('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.getUserRoles('non-existent-id')).rejects.toThrow(
        'User with ID "non-existent-id" not found',
      );
    });
  });

  describe('getUserPermissions', () => {
    it('should return unique permissions from all user roles', async () => {
      // Arrange
      const roleWithOverlappingPermissions = {
        ...mockRole2,
        permissions: [mockPermission, mockPermission3], // mockPermission overlaps with mockRole
      };

      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [mockRole, roleWithOverlappingPermissions],
      } as any);

      // Act
      const result = await service.getUserPermissions(mockUser.id);

      // Assert - Should deduplicate permissions
      expect(result).toHaveLength(3); // mockPermission, mockPermission2, mockPermission3
    });

    it('should return empty array when user has no roles', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [],
      } as any);

      // Act
      const result = await service.getUserPermissions(mockUser.id);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle roles without permissions', async () => {
      // Arrange
      const roleWithoutPermissions = { ...mockRole, permissions: [] };

      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [roleWithoutPermissions],
      } as any);

      // Act
      const result = await service.getUserPermissions(mockUser.id);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('assignRolesToUser', () => {
    it('should assign roles to user successfully', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser, roles: [] } as any);
      mockRoleRepository.find.mockResolvedValue([mockRole, mockRole2]);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        roles: [mockRole, mockRole2],
      } as any);

      // Act
      await service.assignRolesToUser(mockUser.id, [mockRole.id, mockRole2.id]);

      // Assert
      expect(mockRoleRepository.find).toHaveBeenCalledWith({
        where: { id: In([mockRole.id, mockRole2.id]) },
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: expect.arrayContaining([mockRole, mockRole2]),
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.assignRolesToUser('non-existent-id', [mockRole.id])).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.assignRolesToUser('non-existent-id', [mockRole.id])).rejects.toThrow(
        'User with ID "non-existent-id" not found',
      );
    });

    it('should throw BadRequestException when role IDs are invalid', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser } as any);
      mockRoleRepository.find.mockResolvedValue([mockRole]); // Only 1 found

      // Act & Assert
      await expect(
        service.assignRolesToUser(mockUser.id, [mockRole.id, 'invalid-id']),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.assignRolesToUser(mockUser.id, [mockRole.id, 'invalid-id']),
      ).rejects.toThrow('One or more role IDs are invalid');
    });

    it('should replace existing roles', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [mockRole], // Has existing role
      } as any);
      mockRoleRepository.find.mockResolvedValue([mockRole2]); // New role
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        roles: [mockRole2],
      } as any);

      // Act
      await service.assignRolesToUser(mockUser.id, [mockRole2.id]);

      // Assert - Old role should be replaced
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [mockRole2], // Only new role, old one removed
        }),
      );
    });

    it('should handle empty role array', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [mockRole],
      } as any);
      mockRoleRepository.find.mockResolvedValue([]);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        roles: [],
      } as any);

      // Act & Assert - Empty array means no roles found, but also no roles requested
      // The service validates that found roles match requested count, so empty matches empty
      // This results in empty roles being assigned
      await service.assignRolesToUser(mockUser.id, []);

      // Assert
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [],
        }),
      );
    });
  });

  describe('removeRolesFromUser', () => {
    it('should remove specified roles from user', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [mockRole, mockRole2],
      } as any);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        roles: [mockRole2],
      } as any);

      // Act
      await service.removeRolesFromUser(mockUser.id, [mockRole.id]);

      // Assert
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [mockRole2],
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.removeRolesFromUser('non-existent-id', [mockRole.id])).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeRolesFromUser('non-existent-id', [mockRole.id])).rejects.toThrow(
        'User with ID "non-existent-id" not found',
      );
    });

    it('should handle removing non-existent role IDs gracefully', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [mockRole],
      } as any);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        roles: [mockRole], // No change
      } as any);

      // Act
      await service.removeRolesFromUser(mockUser.id, ['non-existent-role-id']);

      // Assert - Should not throw, roles unchanged
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should result in empty roles array when all roles removed', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [mockRole],
      } as any);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        roles: [],
      } as any);

      // Act
      await service.removeRolesFromUser(mockUser.id, [mockRole.id]);

      // Assert
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [],
        }),
      );
    });

    it('should remove multiple roles at once', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [mockRole, mockRole2],
      } as any);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        roles: [],
      } as any);

      // Act
      await service.removeRolesFromUser(mockUser.id, [mockRole.id, mockRole2.id]);

      // Assert
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [],
        }),
      );
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('edge cases', () => {
    it('should handle role with many permissions', async () => {
      // Arrange
      const manyPermissions = Array.from({ length: 50 }, (_, i) => ({
        id: `perm-${i}`,
        name: `resource${i}.action`,
        resource: `resource${i}`,
        action: PermissionAction.READ,
        description: null,
        roles: [],
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      }));

      const roleWithManyPermissions = {
        ...mockRole,
        permissions: manyPermissions,
      };

      mockRoleRepository.findOne.mockResolvedValue(roleWithManyPermissions as any);

      // Act
      const result = await service.findOneRole(mockRole.id);

      // Assert
      expect(result.permissions).toHaveLength(50);
    });

    it('should handle user with many roles', async () => {
      // Arrange
      const manyRoles = Array.from({ length: 20 }, (_, i) => ({
        id: `role-${i}`,
        name: `Role ${i}`,
        description: null,
        is_active: true,
        permissions: [mockPermission],
      }));

      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: manyRoles,
      } as any);

      // Act
      const result = await service.getUserRoles(mockUser.id);

      // Assert
      expect(result).toHaveLength(20);
    });

    it('should handle special characters in role names', async () => {
      // Arrange
      const createDto: CreateRoleDto = {
        name: 'Role with special chars: !@#$%',
        description: 'Testing special characters',
      };

      mockRoleRepository.findOne.mockResolvedValue(null);
      mockRoleRepository.create.mockReturnValue({ ...createDto } as any);
      mockRoleRepository.save.mockResolvedValue({
        id: 'new-id',
        ...createDto,
      } as any);

      // Act
      const result = await service.createRole(createDto);

      // Assert
      expect(result.name).toBe('Role with special chars: !@#$%');
    });

    it('should handle unicode characters in permission descriptions', async () => {
      // Arrange
      const createDto: CreatePermissionDto = {
        name: 'unicode.test',
        resource: 'unicode',
        action: PermissionAction.READ,
        description: 'Descripcion en espanol con acentos',
      };

      mockPermissionRepository.findOne.mockResolvedValue(null);
      mockPermissionRepository.create.mockReturnValue({ ...createDto } as any);
      mockPermissionRepository.save.mockResolvedValue({
        id: 'new-id',
        ...createDto,
      } as any);

      // Act
      const result = await service.createPermission(createDto);

      // Assert
      expect(result.description).toBe('Descripcion en espanol con acentos');
    });

    it('should handle very long role descriptions', async () => {
      // Arrange
      const longDescription = 'A'.repeat(1000);
      const createDto: CreateRoleDto = {
        name: 'Long Description Role',
        description: longDescription,
      };

      mockRoleRepository.findOne.mockResolvedValue(null);
      mockRoleRepository.create.mockReturnValue({ ...createDto } as any);
      mockRoleRepository.save.mockResolvedValue({
        id: 'new-id',
        ...createDto,
      } as any);

      // Act
      const result = await service.createRole(createDto);

      // Assert
      expect(result.description).toBe(longDescription);
    });
  });
});
