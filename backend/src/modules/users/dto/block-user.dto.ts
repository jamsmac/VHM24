import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for blocking a user account
 * REQ-AUTH-34, REQ-AUTH-35
 */
export class BlockUserDto {
  @ApiPropertyOptional({
    description: 'Причина блокировки',
    example: 'Нарушение правил использования системы',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Длительность блокировки в минутах. Если не указано - блокировка бессрочная',
    example: 60,
    minimum: 1,
    maximum: 525600, // 1 year in minutes
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(525600)
  durationMinutes?: number;
}
