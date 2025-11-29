import { IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentStatus } from '../entities/commission-calculation.entity';

/**
 * Query DTO for filtering commission calculations
 */
export class CommissionQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by payment status',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Filter by contract ID',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  contract_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by period start date (YYYY-MM-DD)',
    example: '2025-11-01',
  })
  @IsOptional()
  @IsDateString()
  period_start_from?: string;

  @ApiPropertyOptional({
    description: 'Filter by period start date (YYYY-MM-DD)',
    example: '2025-11-30',
  })
  @IsOptional()
  @IsDateString()
  period_start_to?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
