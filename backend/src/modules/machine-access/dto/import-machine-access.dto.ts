import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MachineAccessRole } from '../entities/machine-access.entity';

/**
 * DTO for a single row in CSV/XLSX import.
 * Accepts machine_number (preferred) or serial_number (fallback).
 * Accepts user_identifier: uuid OR email OR username OR telegram_username.
 */
export class ImportMachineAccessRowDto {
  @ApiPropertyOptional({ description: 'Machine number (preferred identifier)' })
  @IsOptional()
  @IsString()
  machine_number?: string;

  @ApiPropertyOptional({ description: 'Machine serial number (fallback identifier)' })
  @IsOptional()
  @IsString()
  serial_number?: string;

  @ApiProperty({ description: 'User identifier: uuid, email, username, or telegram_username' })
  @IsString()
  user_identifier: string;

  @ApiProperty({ enum: MachineAccessRole, description: 'Access role' })
  @IsEnum(MachineAccessRole)
  role: MachineAccessRole;
}

/**
 * Response for import operation.
 */
export class ImportMachineAccessResponseDto {
  @ApiProperty({ description: 'Number of new access entries created' })
  applied_count: number;

  @ApiProperty({ description: 'Number of existing entries updated' })
  updated_count: number;

  @ApiProperty({ description: 'Number of rows skipped due to errors' })
  skipped_count: number;

  @ApiProperty({ description: 'List of errors with row details' })
  errors: ImportErrorDto[];
}

export class ImportErrorDto {
  @ApiProperty({ description: 'Row number in the import file' })
  rowNumber: number;

  @ApiProperty({ description: 'Error reason' })
  reason: string;

  @ApiPropertyOptional({ description: 'Raw row data' })
  rawRow?: Record<string, any>;
}
