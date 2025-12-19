import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ClientLanguage {
  RU = 'ru',
  UZ = 'uz',
  EN = 'en',
}

/**
 * DTO for Telegram auth initData validation
 */
export class TelegramAuthDto {
  @ApiProperty({
    description: 'Telegram Web App initData string',
    example: 'query_id=...&user=...&auth_date=...&hash=...',
  })
  @IsString()
  initData: string;
}

/**
 * DTO for client registration/profile update
 */
export class ClientProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  full_name?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Invalid phone number format' })
  phone?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: ClientLanguage, default: ClientLanguage.RU })
  @IsOptional()
  @IsEnum(ClientLanguage)
  language?: ClientLanguage;
}

/**
 * Response DTO for client auth
 */
export class ClientAuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty()
  user: ClientUserResponseDto;
}

/**
 * Response DTO for client user
 */
export class ClientUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  telegram_username?: string;

  @ApiProperty()
  telegram_id: string;

  @ApiPropertyOptional()
  full_name?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty()
  is_verified: boolean;

  @ApiProperty({ enum: ClientLanguage })
  language: ClientLanguage;

  @ApiProperty()
  created_at: Date;

  @ApiPropertyOptional()
  loyalty_points?: number;
}
