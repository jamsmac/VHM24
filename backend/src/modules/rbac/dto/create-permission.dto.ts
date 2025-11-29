import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Permission actions available in the system
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  MANAGE = 'manage', // Full control over resource
}

/**
 * DTO for creating a new permission in the RBAC system
 *
 * Permissions define specific actions that can be performed on resources
 */
export class CreatePermissionDto {
  @ApiProperty({
    example: 'machines.create',
    description: 'Unique permission name (typically resource.action format)',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'Permission name must be at least 2 characters' })
  @MaxLength(100, { message: 'Permission name must not exceed 100 characters' })
  name: string;

  @ApiProperty({
    example: 'machines',
    description: 'Resource this permission applies to (e.g., machines, users, tasks)',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100, { message: 'Resource name must not exceed 100 characters' })
  resource: string;

  @ApiProperty({
    enum: PermissionAction,
    example: PermissionAction.CREATE,
    description: 'Action allowed by this permission',
  })
  @IsEnum(PermissionAction, {
    message: 'Action must be one of: create, read, update, delete, execute, manage',
  })
  action: PermissionAction;

  @ApiPropertyOptional({
    example: 'Allows creating new vending machines',
    description: 'Permission description',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
