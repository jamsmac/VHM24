import { IsArray, IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for approving an access request
 *
 * According to REQ-AUTH-33: Admin assigns roles when approving
 */
export class ApproveAccessRequestDto {
  @ApiProperty({
    example: ['operator'],
    description: 'Role names to assign to the user',
  })
  @IsArray()
  @IsString({ each: true })
  role_names: string[];

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email for the new user account (optional, can be set later by user)',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'tempPass123!',
    description: 'Temporary password (will be auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  temporary_password?: string;

  @ApiPropertyOptional({
    example: 'Approved for operator role in warehouse A',
    description: 'Admin notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
