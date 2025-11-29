import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Validate Reset Token DTO
 *
 * Used to check if password reset token is valid.
 * Returns success if token exists, not expired, and not used.
 *
 * REQ-AUTH-45: Password Recovery
 */
export class ValidateResetTokenDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Токен для сброса пароля (UUID)',
  })
  @IsUUID('4', { message: 'Токен должен быть в формате UUID' })
  token: string;
}
