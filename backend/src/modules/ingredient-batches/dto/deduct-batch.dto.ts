import { IsNumber, IsUUID, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for deducting quantity from batches using FIFO
 *
 * Used to deduct ingredients from batches in First-In-First-Out order.
 * The oldest batches (by received_date) are depleted first.
 *
 * Part of VH24 Integration - Phase 4.1.3
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.3
 */
export class DeductBatchDto {
  @ApiProperty({
    description: 'UUID of the nomenclature (ingredient) to deduct from',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'nomenclature_id must be a valid UUID' })
  nomenclature_id: string;

  @ApiProperty({
    description: 'Quantity to deduct from available batches',
    example: 50,
    minimum: 0.001,
  })
  @IsNumber({}, { message: 'quantity must be a number' })
  @Min(0.001, { message: 'quantity must be greater than 0' })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Reason for the deduction',
    example: 'Used for production of Coffee Americano',
  })
  @IsOptional()
  @IsString({ message: 'reason must be a string' })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Reference ID (e.g., task_id, sale_id, recipe_id)',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID('4', { message: 'reference_id must be a valid UUID' })
  reference_id?: string;

  @ApiPropertyOptional({
    description: 'Type of reference (e.g., task, sale, recipe)',
    example: 'sale',
  })
  @IsOptional()
  @IsString({ message: 'reference_type must be a string' })
  reference_type?: string;
}

/**
 * Response DTO for deduction operation
 */
export class DeductBatchResponseDto {
  @ApiProperty({
    description: 'Total quantity successfully deducted',
    example: 50,
  })
  deducted_quantity: number;

  @ApiProperty({
    description: 'Number of batches affected by the deduction',
    example: 2,
  })
  batches_affected: number;

  @ApiProperty({
    description: 'Details of each batch affected',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        batch_id: { type: 'string', format: 'uuid' },
        batch_number: { type: 'string' },
        deducted_from_batch: { type: 'number' },
        remaining_after: { type: 'number' },
        status_after: { type: 'string', enum: ['in_stock', 'depleted'] },
      },
    },
  })
  affected_batches: {
    batch_id: string;
    batch_number: string;
    deducted_from_batch: number;
    remaining_after: number;
    status_after: string;
  }[];

  @ApiProperty({
    description: 'Remaining total stock after deduction',
    example: 950,
  })
  remaining_stock: number;
}
