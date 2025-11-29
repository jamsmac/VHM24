import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/**
 * DTO for updating an existing role
 *
 * All fields from CreateRoleDto are optional for updates
 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
