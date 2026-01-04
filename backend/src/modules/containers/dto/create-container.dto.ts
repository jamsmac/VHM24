import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsObject,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContainerStatus } from '../entities/container.entity';

/**
 * DTO for creating a new container (hopper/bunker)
 *
 * Part of VH24 Integration - Phase 4.1.1
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.1
 */
export class CreateContainerDto {
  @ApiProperty({
    description: 'UUID of the machine this container belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'machine_id must be a valid UUID' })
  machine_id: string;

  @ApiPropertyOptional({
    description: 'UUID of the nomenclature (ingredient) stored in this container',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'nomenclature_id must be a valid UUID' })
  nomenclature_id?: string;

  @ApiProperty({
    description: 'Slot number within the machine (1-based)',
    example: 1,
    minimum: 1,
    maximum: 50,
  })
  @IsNumber({}, { message: 'slot_number must be a number' })
  @Min(1, { message: 'slot_number must be at least 1' })
  @Max(50, { message: 'slot_number cannot exceed 50' })
  slot_number: number;

  @ApiPropertyOptional({
    description: 'Human-readable name for the container',
    example: 'Кофе в зернах',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'name must be a string' })
  @MaxLength(100, { message: 'name cannot exceed 100 characters' })
  name?: string;

  @ApiProperty({
    description: 'Maximum capacity of the container',
    example: 1000,
    minimum: 0.001,
  })
  @IsNumber({}, { message: 'capacity must be a number' })
  @Min(0.001, { message: 'capacity must be greater than 0' })
  capacity: number;

  @ApiPropertyOptional({
    description: 'Initial quantity in the container',
    example: 500,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'current_quantity must be a number' })
  @Min(0, { message: 'current_quantity cannot be negative' })
  current_quantity?: number;

  @ApiPropertyOptional({
    description: 'Unit of measurement (g, ml, pcs)',
    example: 'g',
    default: 'g',
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: 'unit must be a string' })
  @MaxLength(20, { message: 'unit cannot exceed 20 characters' })
  unit?: string;

  @ApiPropertyOptional({
    description: 'Minimum level threshold for low stock alerts',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'min_level must be a number' })
  @Min(0, { message: 'min_level cannot be negative' })
  min_level?: number;

  @ApiPropertyOptional({
    description: 'Container status',
    enum: ContainerStatus,
    default: ContainerStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ContainerStatus, { message: 'Invalid container status' })
  status?: ContainerStatus;

  @ApiPropertyOptional({
    description: 'Additional metadata for the container',
    example: { sensor_id: 'S001', calibration_date: '2025-01-01' },
  })
  @IsOptional()
  @IsObject({ message: 'metadata must be an object' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Notes or comments about the container',
    example: 'Requires weekly cleaning',
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  notes?: string;
}
