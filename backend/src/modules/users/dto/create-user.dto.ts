import { IsEmail, IsString, IsEnum, IsOptional, MinLength, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../entities/user.entity';
import { IsStrongPassword } from '@modules/auth/decorators/is-strong-password.decorator';

export class CreateUserDto {
  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  @MinLength(2, { message: 'Полное имя должно содержать минимум 2 символа' })
  full_name: string;

  @ApiProperty({ example: 'ivan@vendhub.uz' })
  @IsEmail({}, { message: 'Неверный формат email' })
  email: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsPhoneNumber('UZ', { message: 'Неверный формат телефона' })
  phone?: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    minLength: 8,
    description:
      'Пароль должен содержать минимум 8 символов, заглавные и строчные буквы, цифры и спецсимволы',
  })
  @IsString()
  @IsStrongPassword()
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.OPERATOR })
  @IsEnum(UserRole, { message: 'Неверная роль пользователя' })
  role: UserRole;

  @ApiPropertyOptional({
    enum: UserStatus,
    example: UserStatus.PENDING,
    description: 'User status (defaults to PENDING for new registrations)',
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Неверный статус пользователя' })
  status?: UserStatus;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  telegram_user_id?: string;

  @ApiPropertyOptional({ example: '@ivan_operator' })
  @IsOptional()
  @IsString()
  telegram_username?: string;
}
