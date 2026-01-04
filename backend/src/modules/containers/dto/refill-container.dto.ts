import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for refilling a container
 *
 * Adds quantity to the container and updates last_refill_date
 *
 * Part of VH24 Integration - Phase 4.1.1
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.1
 */
export class RefillContainerDto {
  @ApiProperty({
    description: 'Quantity to add to the container',
    example: 500,
    minimum: 0.001,
  })
  @IsNumber({}, { message: 'quantity must be a number' })
  @Min(0.001, { message: 'quantity must be greater than 0' })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Notes about this refill operation',
    example: 'Regular weekly refill',
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Batch number of the ingredient being added',
    example: 'BATCH-2026-001',
  })
  @IsOptional()
  @IsString({ message: 'batch_number must be a string' })
  batch_number?: string;
}
