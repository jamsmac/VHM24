import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new role in the RBAC system
 *
 * Roles define collections of permissions that can be assigned to users
 */
export class CreateRoleDto {
  @ApiProperty({
    example: 'Warehouse Manager',
    description: 'Unique role name',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'Role name must be at least 2 characters' })
  @MaxLength(100, { message: 'Role name must not exceed 100 characters' })
  name: string;

  @ApiPropertyOptional({
    example: 'Manages warehouse inventory and operations',
    description: 'Role description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the role is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    example: ['uuid1', 'uuid2', 'uuid3'],
    description: 'Array of permission IDs to assign to this role',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each permission ID must be a valid UUID' })
  permission_ids?: string[];
}
