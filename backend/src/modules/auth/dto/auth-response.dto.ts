import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

/**
 * User data returned in authentication response
 */
export class AuthUserDto {
  @ApiProperty({ example: 'uuid-here', description: 'User ID' })
  id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email',
  })
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  full_name: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.OPERATOR,
    description: 'User role',
  })
  role: UserRole;
}

/**
 * Authentication response DTO
 *
 * Returned by login, register, and password change endpoints
 */
export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token (expires in 15 minutes)',
  })
  access_token: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token (expires in 7 days)',
  })
  refresh_token: string;

  @ApiProperty({
    type: AuthUserDto,
    description: 'User information',
  })
  user: AuthUserDto;

  @ApiPropertyOptional({
    example: true,
    description:
      '(REQ-AUTH-42) Indicates if 2FA verification is required. When true, access_token is temporary and only valid for 2FA verification endpoint. User must call /auth/2fa/verify to get full access tokens.',
  })
  requires_2fa?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      '(REQ-AUTH-31) Indicates if password change is required on first login. When true, user must call /auth/first-login-change-password to set a new password before gaining full access. Access token is valid only for this endpoint.',
  })
  requires_password_change?: boolean;
}

/**
 * Tokens-only response DTO
 *
 * Returned by refresh token endpoint
 */
export class AuthTokensDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token (expires in 15 minutes)',
  })
  access_token: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token (expires in 7 days)',
  })
  refresh_token: string;
}
