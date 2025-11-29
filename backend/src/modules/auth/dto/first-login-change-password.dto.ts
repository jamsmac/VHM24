import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';

/**
 * DTO for changing password on first login
 *
 * REQ-AUTH-31: First Login Password Change
 *
 * Используется когда пользователь входит впервые с временным паролем
 * и должен установить собственный пароль.
 */
export class FirstLoginChangePasswordDto {
  @ApiProperty({
    example: 'TempPassword123!',
    description: 'Текущий временный пароль',
  })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty({
    example: 'MyNewSecurePassword123!',
    description:
      'Новый пароль (минимум 8 символов, должен содержать заглавные, строчные буквы, цифры и спецсимволы)',
  })
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @IsStrongPassword({
    message:
      'Пароль должен содержать минимум 8 символов, включая заглавные и строчные буквы, цифры и специальные символы',
  })
  newPassword: string;
}
