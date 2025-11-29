import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccessRequestStatus, AccessRequestSource } from '../entities/access-request.entity';
import { Type } from 'class-transformer';

/**
 * DTO for querying access requests with filters
 */
export class QueryAccessRequestDto {
  @ApiPropertyOptional({ enum: AccessRequestStatus })
  @IsOptional()
  @IsEnum(AccessRequestStatus)
  status?: AccessRequestStatus;

  @ApiPropertyOptional({ enum: AccessRequestSource })
  @IsOptional()
  @IsEnum(AccessRequestSource)
  source?: AccessRequestSource;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  telegram_id?: string;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
