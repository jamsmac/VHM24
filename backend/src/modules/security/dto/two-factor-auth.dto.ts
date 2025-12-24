import { IsString, IsUUID, IsEmail, Length, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Admin Enable 2FA DTO
 *
 * Used by admins to set up 2FA for other users.
 * Different from self-service Enable2FADto in auth module.
 */
export class AdminEnable2FADto {
  @ApiProperty({
    description: 'User ID to enable 2FA for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'User email for QR code generation',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}

/**
 * Admin Verify 2FA DTO
 *
 * Used by admins to verify 2FA token for other users.
 * Different from self-service Verify2FADto in auth module.
 */
export class AdminVerify2FADto {
  @ApiProperty({
    description: 'User ID to verify 2FA for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'TOTP token from authenticator app (6 digits)',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'Token must be 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Token must contain only digits' })
  token: string;
}

/**
 * Admin Verify Backup Code DTO
 *
 * Used by admins to verify backup code for other users.
 * Different from self-service VerifyBackupCodeDto in auth module.
 */
export class AdminVerifyBackupCodeDto {
  @ApiProperty({
    description: 'User ID to verify backup code for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'Backup code (8-16 characters, alphanumeric uppercase)',
    example: 'A1B2C3D4',
  })
  @IsString()
  @MinLength(8, { message: 'Backup code must be at least 8 characters' })
  @MaxLength(16, { message: 'Backup code must be at most 16 characters' })
  @Matches(/^[A-Z0-9]+$/, { message: 'Backup code must contain only uppercase letters and digits' })
  code: string;
}
