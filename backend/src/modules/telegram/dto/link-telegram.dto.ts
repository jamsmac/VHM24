import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkTelegramDto {
  @ApiProperty({
    description: 'Verification code from Telegram bot',
    example: 'ABC123',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  verification_code: string;
}

export class GenerateVerificationCodeDto {
  @ApiProperty({
    description: 'User ID to generate code for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  user_id: string;
}
