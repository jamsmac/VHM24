import { IsUUID, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';

/**
 * Reset Password DTO
 *
 * Used to complete password reset with valid token.
 * Validates new password meets security requirements.
 *
 * REQ-AUTH-45: Password Recovery
 * REQ-AUTH-41: Password Policy (basic validation)
 */
export class ResetPasswordDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Токен для сброса пароля (UUID)',
  })
  @IsUUID('4', { message: 'Токен должен быть в формате UUID' })
  token: string;

  @ApiProperty({
    example: 'NewSecurePassword123!',
    description:
      'Новый пароль (минимум 8 символов, заглавные и строчные буквы, цифры и спецсимволы)',
  })
  @IsString()
  @IsStrongPassword()
  newPassword: string;
}
