import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { User } from '@modules/users/entities/user.entity';
import {
  CreateRoleDto,
  UpdateRoleDto,
  CreatePermissionDto,
  UpdatePermissionDto,
  AssignRoleDto,
  PermissionAction,
} from './dto';

/**
 * RBAC Service - Role-Based Access Control
 *
 * Manages roles, permissions, and user-role assignments
 * Provides authorization checking methods for guards
 */
@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ============================================================================
  // ROLE MANAGEMENT
  // ============================================================================

  /**
   * Create a new role with optional permissions
   *
   * @param createRoleDto - Role creation data
   * @returns Created role with permissions
   * @throws ConflictException if role name already exists
   */
  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    // Check if role with this name already exists
    const existing = await this.roleRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existing) {
      throw new ConflictException(`Role with name "${createRoleDto.name}" already exists`);
    }

    // Create role
    const role = this.roleRepository.create({
      name: createRoleDto.name,
      description: createRoleDto.description,
      is_active: createRoleDto.is_active ?? true,
    });

    // Assign permissions if provided
    if (createRoleDto.permission_ids && createRoleDto.permission_ids.length > 0) {
      const permissions = await this.permissionRepository.find({
        where: { id: In(createRoleDto.permission_ids) },
      });

      if (permissions.length !== createRoleDto.permission_ids.length) {
        throw new BadRequestException('One or more permission IDs are invalid');
      }

      role.permissions = permissions;
    }

    return await this.roleRepository.save(role);
  }

  /**
   * Get all roles with optional filters
   *
   * @param isActive - Filter by active status
   * @returns Array of roles with permissions
   */
  async findAllRoles(isActive?: boolean): Promise<Role[]> {
    const query = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .orderBy('role.name', 'ASC');

    if (isActive !== undefined) {
      query.where('role.is_active = :isActive', { isActive });
    }

    return await query.getMany();
  }

  /**
   * Find role by ID
   *
   * @param id - Role ID
   * @returns Role with permissions
   * @throws NotFoundException if role not found
   */
  async findOneRole(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    return role;
  }

  /**
   * Find role by name
   *
   * @param name - Role name
   * @returns Role with permissions or null
   */
  async findRoleByName(name: string): Promise<Role | null> {
    return await this.roleRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }

  /**
   * Find multiple roles by names
   *
   * @param names - Array of role names
   * @returns Array of roles
   */
  async findRolesByNames(names: string[]): Promise<Role[]> {
    return await this.roleRepository.find({
      where: names.map((name) => ({ name })),
      relations: ['permissions'],
    });
  }

  /**
   * Update role
   *
   * @param id - Role ID
   * @param updateRoleDto - Updated role data
   * @returns Updated role
   * @throws NotFoundException if role not found
   * @throws ConflictException if new name conflicts
   */
  async updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOneRole(id);

    // Check name conflict if name is being updated
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existing = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name },
      });

      if (existing) {
        throw new ConflictException(`Role with name "${updateRoleDto.name}" already exists`);
      }
    }

    // Update basic fields
    if (updateRoleDto.name) role.name = updateRoleDto.name;
    if (updateRoleDto.description !== undefined) role.description = updateRoleDto.description;
    if (updateRoleDto.is_active !== undefined) role.is_active = updateRoleDto.is_active;

    // Update permissions if provided
    if (updateRoleDto.permission_ids) {
      const permissions = await this.permissionRepository.find({
        where: { id: In(updateRoleDto.permission_ids) },
      });

      if (permissions.length !== updateRoleDto.permission_ids.length) {
        throw new BadRequestException('One or more permission IDs are invalid');
      }

      role.permissions = permissions;
    }

    return await this.roleRepository.save(role);
  }

  /**
   * Soft delete role
   *
   * @param id - Role ID
   * @throws NotFoundException if role not found
   */
  async removeRole(id: string): Promise<void> {
    const role = await this.findOneRole(id);
    await this.roleRepository.softDelete(id);
  }

  /**
   * Add permissions to role
   *
   * @param roleId - Role ID
   * @param permissionIds - Array of permission IDs to add
   * @returns Updated role
   */
  async addPermissionsToRole(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.findOneRole(roleId);

    const permissions = await this.permissionRepository.find({
      where: { id: In(permissionIds) },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // Add new permissions (avoid duplicates)
    const existingIds = role.permissions.map((p) => p.id);
    const newPermissions = permissions.filter((p) => !existingIds.includes(p.id));

    role.permissions = [...role.permissions, ...newPermissions];

    return await this.roleRepository.save(role);
  }

  /**
   * Remove permissions from role
   *
   * @param roleId - Role ID
   * @param permissionIds - Array of permission IDs to remove
   * @returns Updated role
   */
  async removePermissionsFromRole(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.findOneRole(roleId);

    role.permissions = role.permissions.filter((p) => !permissionIds.includes(p.id));

    return await this.roleRepository.save(role);
  }

  // ============================================================================
  // PERMISSION MANAGEMENT
  // ============================================================================

  /**
   * Create a new permission
   *
   * @param createPermissionDto - Permission creation data
   * @returns Created permission
   * @throws ConflictException if permission name already exists
   */
  async createPermission(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    // Check if permission with this name already exists
    const existing = await this.permissionRepository.findOne({
      where: { name: createPermissionDto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Permission with name "${createPermissionDto.name}" already exists`,
      );
    }

    const permission = this.permissionRepository.create(createPermissionDto);
    return await this.permissionRepository.save(permission);
  }

  /**
   * Get all permissions
   *
   * @returns Array of permissions
   */
  async findAllPermissions(): Promise<Permission[]> {
    return await this.permissionRepository.find({
      order: { resource: 'ASC', action: 'ASC' },
    });
  }

  /**
   * Find permission by ID
   *
   * @param id - Permission ID
   * @returns Permission
   * @throws NotFoundException if permission not found
   */
  async findOnePermission(id: string): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID "${id}" not found`);
    }

    return permission;
  }

  /**
   * Find permission by name
   *
   * @param name - Permission name
   * @returns Permission or null
   */
  async findPermissionByName(name: string): Promise<Permission | null> {
    return await this.permissionRepository.findOne({
      where: { name },
    });
  }

  /**
   * Update permission
   *
   * @param id - Permission ID
   * @param updatePermissionDto - Updated permission data
   * @returns Updated permission
   * @throws NotFoundException if permission not found
   * @throws ConflictException if new name conflicts
   */
  async updatePermission(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<Permission> {
    const permission = await this.findOnePermission(id);

    // Check name conflict if name is being updated
    if (updatePermissionDto.name && updatePermissionDto.name !== permission.name) {
      const existing = await this.permissionRepository.findOne({
        where: { name: updatePermissionDto.name },
      });

      if (existing) {
        throw new ConflictException(
          `Permission with name "${updatePermissionDto.name}" already exists`,
        );
      }
    }

    // Update fields
    Object.assign(permission, updatePermissionDto);

    return await this.permissionRepository.save(permission);
  }

  /**
   * Soft delete permission
   *
   * @param id - Permission ID
   * @throws NotFoundException if permission not found
   */
  async removePermission(id: string): Promise<void> {
    const permission = await this.findOnePermission(id);
    await this.permissionRepository.softDelete(id);
  }

  // ============================================================================
  // AUTHORIZATION HELPERS (to be used by guards)
  // ============================================================================

  /**
   * Check if user has specific permission
   *
   * @param userId - User ID
   * @param resource - Resource name (e.g., 'machines')
   * @param action - Action (e.g., 'create')
   * @returns True if user has permission
   */
  async checkPermission(
    userId: string,
    resource: string,
    action: PermissionAction,
  ): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    const permissions = userRoles.flatMap((role) => role.permissions);
    return permissions.some((p) => p.resource === resource && p.action === action);
  }

  /**
   * Check if user has specific role
   *
   * @param userId - User ID
   * @param roleName - Role name
   * @returns True if user has role
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    return userRoles.some((role) => role.name === roleName);
  }

  /**
   * Get all roles assigned to a user
   *
   * @param userId - User ID
   * @returns Array of roles with permissions
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    return user.roles || [];
  }

  /**
   * Get all permissions for a user (from all their roles)
   *
   * @param userId - User ID
   * @returns Array of unique permissions
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const userRoles = await this.getUserRoles(userId);
    const allPermissions = userRoles.flatMap((role) => role.permissions);

    // Remove duplicates by permission ID
    const uniquePermissions = Array.from(
      new Map(allPermissions.map((perm) => [perm.id, perm])).values(),
    );

    return uniquePermissions;
  }

  /**
   * Assign roles to user
   *
   * Replaces existing roles with new ones
   *
   * @param userId - User ID
   * @param roleIds - Array of role IDs
   */
  async assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    // Validate roles exist
    const roles = await this.roleRepository.find({
      where: { id: In(roleIds) },
    });

    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more role IDs are invalid');
    }

    // Assign roles to user (replaces existing)
    user.roles = roles;
    await this.userRepository.save(user);
  }

  /**
   * Remove roles from user
   *
   * @param userId - User ID
   * @param roleIds - Array of role IDs to remove
   */
  async removeRolesFromUser(userId: string, roleIds: string[]): Promise<void> {
    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    // Remove specified roles
    user.roles = user.roles.filter((role) => !roleIds.includes(role.id));

    await this.userRepository.save(user);
  }
}
