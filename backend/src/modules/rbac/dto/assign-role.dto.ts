import { IsUUID, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for assigning roles to a user
 *
 * Used to manage user-role associations in the RBAC system
 */
export class AssignRoleDto {
  @ApiProperty({
    example: 'user-uuid-here',
    description: 'User ID to assign roles to',
  })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  user_id: string;

  @ApiProperty({
    example: ['role-uuid-1', 'role-uuid-2'],
    description: 'Array of role IDs to assign to the user',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one role must be provided' })
  @IsUUID('4', { each: true, message: 'Each role ID must be a valid UUID' })
  role_ids: string[];
}
