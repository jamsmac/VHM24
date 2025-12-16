import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Verify Backup Code DTO
 *
 * Used to verify backup code during 2FA login when TOTP is unavailable.
 *
 * REQ-AUTH-43: 2FA Verification with backup codes
 */
export class VerifyBackupCodeDto {
  @ApiProperty({
    example: 'A1B2C3D4',
    description: 'Backup code (8 characters, alphanumeric uppercase)',
  })
  @IsString()
  @MinLength(8, { message: 'Резервный код должен содержать минимум 8 символов' })
  @MaxLength(16, { message: 'Резервный код должен содержать максимум 16 символов' })
  @Matches(/^[A-Z0-9]+$/, { message: 'Резервный код должен содержать только заглавные буквы и цифры' })
  code: string;
}
