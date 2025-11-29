import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { UserRole, UserStatus } from '../entities/user.entity';

/**
 * User Response DTO - Safe user data for API responses
 *
 * This DTO excludes all sensitive fields:
 * - password_hash
 * - two_fa_secret
 * - refresh_token
 *
 * Use this DTO for all API responses that return user data
 */
@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ example: 'uuid' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'John Doe' })
  full_name: string;

  @Expose()
  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @Expose()
  @ApiProperty({ example: '+1234567890', nullable: true })
  phone: string | null;

  @Expose()
  @ApiProperty({ enum: UserRole, example: UserRole.OPERATOR })
  role: UserRole;

  @Expose()
  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  @Expose()
  @ApiProperty({ example: '123456789', nullable: true })
  telegram_user_id: string | null;

  @Expose()
  @ApiProperty({ example: 'johndoe', nullable: true })
  telegram_username: string | null;

  @Expose()
  @ApiProperty({ example: false })
  is_2fa_enabled: boolean;

  @Expose()
  @ApiProperty({ example: '2024-01-01T00:00:00Z', nullable: true })
  last_login_at: Date | null;

  @Expose()
  @ApiProperty({ example: '192.168.1.1', nullable: true })
  last_login_ip: string | null;

  @Expose()
  @ApiProperty({ example: 0 })
  failed_login_attempts: number;

  @Expose()
  @ApiProperty({ example: null, nullable: true })
  account_locked_until: Date | null;

  @Expose()
  @ApiProperty({ example: null, nullable: true })
  last_failed_login_at: Date | null;

  @Expose()
  @ApiProperty({ example: {}, nullable: true })
  settings: Record<string, any> | null;

  @Expose()
  @ApiProperty({ example: false })
  ip_whitelist_enabled: boolean;

  @Expose()
  @ApiProperty({ example: ['192.168.1.1'], nullable: true })
  allowed_ips: string[] | null;

  @Expose()
  @ApiProperty({ example: false })
  requires_password_change: boolean;

  @Expose()
  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  created_at: Date;

  @Expose()
  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  updated_at: Date;

  // Explicitly exclude sensitive fields
  @Exclude()
  password_hash?: never;

  @Exclude()
  two_fa_secret?: never;

  @Exclude()
  refresh_token?: never;

  @Exclude()
  deleted_at?: never;
}

/**
 * User list response DTO with minimal fields
 * Use for list endpoints where full user data is not needed
 */
@Exclude()
export class UserListItemDto {
  @Expose()
  @ApiProperty({ example: 'uuid' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'John Doe' })
  full_name: string;

  @Expose()
  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @Expose()
  @ApiProperty({ example: '+1234567890', nullable: true })
  phone: string | null;

  @Expose()
  @ApiProperty({ enum: UserRole, example: UserRole.OPERATOR })
  role: UserRole;

  @Expose()
  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  @Expose()
  @ApiProperty({ example: false })
  is_2fa_enabled: boolean;

  @Expose()
  @ApiProperty({ example: '2024-01-01T00:00:00Z', nullable: true })
  last_login_at: Date | null;
}
