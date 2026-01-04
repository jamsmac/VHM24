import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsUUID,
  IsDateString,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IngredientBatchStatus } from '../entities/ingredient-batch.entity';

/**
 * DTO for creating a new ingredient batch
 *
 * Part of VH24 Integration - Phase 4.1.3
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.3
 */
export class CreateIngredientBatchDto {
  @ApiProperty({
    description: 'UUID of the nomenclature (ingredient) this batch belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'nomenclature_id must be a valid UUID' })
  nomenclature_id: string;

  @ApiProperty({
    description: 'Unique batch number/identifier (unique per nomenclature)',
    example: 'BATCH-2026-001',
    maxLength: 100,
  })
  @IsString({ message: 'batch_number must be a string' })
  @MaxLength(100, { message: 'batch_number cannot exceed 100 characters' })
  batch_number: string;

  @ApiProperty({
    description: 'Quantity received in this batch',
    example: 1000,
    minimum: 0.001,
  })
  @IsNumber({}, { message: 'quantity must be a number' })
  @Min(0.001, { message: 'quantity must be greater than 0' })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Initial remaining quantity (defaults to quantity if not specified)',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'remaining_quantity must be a number' })
  @Min(0, { message: 'remaining_quantity cannot be negative' })
  remaining_quantity?: number;

  @ApiPropertyOptional({
    description: 'Purchase price per unit (in UZS)',
    example: 25000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'purchase_price must be a number' })
  @Min(0, { message: 'purchase_price cannot be negative' })
  purchase_price?: number;

  @ApiPropertyOptional({
    description: 'UUID of the supplier (counterparty)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'supplier_id must be a valid UUID' })
  supplier_id?: string;

  @ApiPropertyOptional({
    description: 'Date when the batch was manufactured',
    example: '2025-12-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'manufacture_date must be a valid date string' })
  manufacture_date?: string;

  @ApiPropertyOptional({
    description: 'Expiry/Best before date',
    example: '2026-12-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'expiry_date must be a valid date string' })
  expiry_date?: string;

  @ApiPropertyOptional({
    description: 'Date when the batch was received (defaults to today)',
    example: '2026-01-04',
  })
  @IsOptional()
  @IsDateString({}, { message: 'received_date must be a valid date string' })
  received_date?: string;

  @ApiPropertyOptional({
    description: 'Status of the batch',
    enum: IngredientBatchStatus,
    default: IngredientBatchStatus.IN_STOCK,
  })
  @IsOptional()
  @IsEnum(IngredientBatchStatus, { message: 'Invalid batch status' })
  status?: IngredientBatchStatus;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'kg',
    maxLength: 20,
  })
  @IsString({ message: 'unit must be a string' })
  @MaxLength(20, { message: 'unit cannot exceed 20 characters' })
  unit: string;

  @ApiPropertyOptional({
    description: 'Notes or additional information about the batch',
    example: 'Premium quality coffee beans from Colombia',
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the batch',
    example: { certificate: 'CERT-001', quality_grade: 'A' },
  })
  @IsOptional()
  @IsObject({ message: 'metadata must be an object' })
  metadata?: Record<string, any>;
}
