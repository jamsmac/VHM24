import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Enable 2FA DTO
 *
 * Used to enable two-factor authentication.
 * Requires the secret generated from setup and a valid token.
 *
 * REQ-AUTH-42: 2FA Setup
 */
export class Enable2FADto {
  @ApiProperty({
    example: 'JBSWY3DPEHPK3PXP',
    description: 'TOTP secret from setup step',
  })
  @IsString()
  secret: string;

  @ApiProperty({
    example: '123456',
    description: 'Verification code from authenticator app (6 digits)',
  })
  @IsString()
  @Length(6, 6, { message: 'Код должен содержать 6 цифр' })
  @Matches(/^\d{6}$/, { message: 'Код должен содержать только цифры' })
  token: string;
}
