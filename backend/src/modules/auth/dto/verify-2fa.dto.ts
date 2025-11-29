import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Verify 2FA DTO
 *
 * Used to verify TOTP token during login or other operations.
 *
 * REQ-AUTH-43: 2FA Verification
 */
export class Verify2FADto {
  @ApiProperty({
    example: '123456',
    description: 'Verification code from authenticator app (6 digits)',
  })
  @IsString()
  @Length(6, 6, { message: 'Код должен содержать 6 цифр' })
  @Matches(/^\d{6}$/, { message: 'Код должен содержать только цифры' })
  token: string;
}
