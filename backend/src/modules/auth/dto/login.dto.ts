import { IsEmail, IsString, MinLength, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiPropertyOptional({
    example: 'admin@vendhub.uz',
    description: 'Email address (required if username not provided)',
  })
  @IsOptional()
  @ValidateIf((o) => !o.username)
  @IsEmail({}, { message: 'Неверный формат email' })
  email?: string;

  @ApiPropertyOptional({
    example: 'admin_user_12345',
    description: 'Username (required if email not provided)',
  })
  @IsOptional()
  @ValidateIf((o) => !o.email)
  @IsString({ message: 'Имя пользователя должно быть строкой' })
  @MinLength(1, { message: 'Имя пользователя обязательно' })
  username?: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(1, { message: 'Пароль обязателен' })
  password: string;
}
