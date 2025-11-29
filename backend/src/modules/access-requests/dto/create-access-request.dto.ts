import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessRequestSource } from '../entities/access-request.entity';

/**
 * DTO for creating an access request
 *
 * According to REQ-AUTH-32: Only technical data is collected
 */
export class CreateAccessRequestDto {
  @ApiProperty({ example: '123456789', description: 'Telegram user ID' })
  @IsString()
  telegram_id: string;

  @ApiPropertyOptional({ example: 'john_doe', description: 'Telegram username' })
  @IsOptional()
  @IsString()
  telegram_username?: string;

  @ApiPropertyOptional({ example: 'John', description: 'Telegram first name' })
  @IsOptional()
  @IsString()
  telegram_first_name?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Telegram last name' })
  @IsOptional()
  @IsString()
  telegram_last_name?: string;

  @ApiPropertyOptional({
    enum: AccessRequestSource,
    default: AccessRequestSource.TELEGRAM,
  })
  @IsOptional()
  @IsEnum(AccessRequestSource)
  source?: AccessRequestSource;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}
