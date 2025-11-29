import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Request Password Reset DTO
 *
 * Used to initiate password recovery process.
 * Sends reset link to user's email.
 *
 * REQ-AUTH-45: Password Recovery
 */
export class RequestPasswordResetDto {
  @ApiProperty({
    example: 'user@vendhub.uz',
    description: 'Email адрес пользователя для восстановления пароля',
  })
  @IsEmail({}, { message: 'Неверный формат email' })
  email: string;
}
