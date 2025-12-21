import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  CreatePermissionDto,
  UpdatePermissionDto,
  AssignRoleDto,
} from './dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

/**
 * RBAC Controller - Role-Based Access Control API
 *
 * Provides REST endpoints for managing roles, permissions, and user-role assignments
 * Requires authentication and admin privileges
 */
@ApiTags('rbac')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // ============================================================================
  // ROLE ENDPOINTS
  // ============================================================================

  @Post('roles')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rbacService.createRole(createRoleDto);
  }

  @Get('roles')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all roles' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({ status: 200, description: 'Returns array of roles' })
  findAllRoles(@Query('isActive', new ParseBoolPipe({ optional: true })) isActive?: boolean) {
    return this.rbacService.findAllRoles(isActive);
  }

  @Get('roles/:id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Returns role with permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findOneRole(@Param('id') id: string) {
    return this.rbacService.findOneRole(id);
  }

  @Patch('roles/:id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, updateRoleDto);
  }

  @Delete('roles/:id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  removeRole(@Param('id') id: string) {
    return this.rbacService.removeRole(id);
  }

  @Post('roles/:id/permissions')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Add permissions to role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Permissions added successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 400, description: 'Invalid permission IDs' })
  addPermissionsToRole(@Param('id') id: string, @Body('permission_ids') permissionIds: string[]) {
    return this.rbacService.addPermissionsToRole(id, permissionIds);
  }

  @Delete('roles/:id/permissions')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Remove permissions from role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Permissions removed successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  removePermissionsFromRole(
    @Param('id') id: string,
    @Body('permission_ids') permissionIds: string[],
  ) {
    return this.rbacService.removePermissionsFromRole(id, permissionIds);
  }

  // ============================================================================
  // PERMISSION ENDPOINTS
  // ============================================================================

  @Post('permissions')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create new permission' })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  @ApiResponse({ status: 409, description: 'Permission name already exists' })
  createPermission(@Body() createPermissionDto: CreatePermissionDto) {
    return this.rbacService.createPermission(createPermissionDto);
  }

  @Get('permissions')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'Returns array of permissions' })
  findAllPermissions() {
    return this.rbacService.findAllPermissions();
  }

  @Get('permissions/:id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiParam({ name: 'id', description: 'Permission UUID' })
  @ApiResponse({ status: 200, description: 'Returns permission' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  findOnePermission(@Param('id') id: string) {
    return this.rbacService.findOnePermission(id);
  }

  @Patch('permissions/:id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update permission' })
  @ApiParam({ name: 'id', description: 'Permission UUID' })
  @ApiResponse({ status: 200, description: 'Permission updated successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({ status: 409, description: 'Permission name already exists' })
  updatePermission(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto) {
    return this.rbacService.updatePermission(id, updatePermissionDto);
  }

  @Delete('permissions/:id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete permission' })
  @ApiParam({ name: 'id', description: 'Permission UUID' })
  @ApiResponse({ status: 200, description: 'Permission deleted successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  removePermission(@Param('id') id: string) {
    return this.rbacService.removePermission(id);
  }

  // ============================================================================
  // USER-ROLE ASSIGNMENT ENDPOINTS (Placeholder)
  // ============================================================================

  @Post('users/assign-roles')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Assign roles to user',
    description: 'Note: Full implementation pending User-Role relationship',
  })
  @ApiResponse({ status: 200, description: 'Roles assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role or user IDs' })
  assignRolesToUser(@Body() assignRoleDto: AssignRoleDto) {
    return this.rbacService.assignRolesToUser(assignRoleDto.user_id, assignRoleDto.role_ids);
  }

  @Delete('users/:userId/roles')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Remove roles from user',
    description: 'Note: Full implementation pending User-Role relationship',
  })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Roles removed successfully' })
  removeRolesFromUser(@Param('userId') userId: string, @Body('role_ids') roleIds: string[]) {
    return this.rbacService.removeRolesFromUser(userId, roleIds);
  }

  @Get('users/:userId/roles')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get user roles',
    description: 'Note: Full implementation pending User-Role relationship',
  })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Returns array of user roles' })
  getUserRoles(@Param('userId') userId: string) {
    return this.rbacService.getUserRoles(userId);
  }

  @Get('users/:userId/permissions')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get user permissions',
    description: 'Note: Full implementation pending User-Role relationship',
  })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Returns array of user permissions' })
  getUserPermissions(@Param('userId') userId: string) {
    return this.rbacService.getUserPermissions(userId);
  }
}
