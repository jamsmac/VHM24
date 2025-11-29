import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsObject,
  IsDateString,
  MinLength,
  Min,
  Max,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MachineStatus } from '../entities/machine.entity';
import { IsDictionaryCode } from '@/common/validators';

export class CreateMachineDto {
  @ApiProperty({ example: 'M-001' })
  @IsString()
  @MinLength(1, { message: 'Номер аппарата обязателен' })
  machine_number: string;

  @ApiProperty({ example: 'Кофейный автомат в холле' })
  @IsString()
  @MinLength(2, { message: 'Название должно содержать минимум 2 символа' })
  name: string;

  @ApiProperty({ example: 'coffee_machine', description: 'Код из справочника machine_types' })
  @IsString()
  @IsDictionaryCode('machine_types')
  type_code: string;

  @ApiPropertyOptional({ enum: MachineStatus, default: MachineStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus;

  @ApiProperty({ example: 'uuid', description: 'ID локации' })
  @IsUUID()
  location_id: string;

  @ApiPropertyOptional({ example: 'Saeco' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'Aulika Top' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'SN123456789' })
  @IsOptional()
  @IsString()
  serial_number?: string;

  @ApiPropertyOptional({ example: 2023 })
  @IsOptional()
  @IsNumber()
  @Min(2000)
  @Max(2100)
  year_of_manufacture?: number;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  installation_date?: string;

  @ApiPropertyOptional({ example: '2024-06-01' })
  @IsOptional()
  @IsDateString()
  last_maintenance_date?: string;

  @ApiPropertyOptional({ example: '2024-12-01' })
  @IsOptional()
  @IsDateString()
  next_maintenance_date?: string;

  @ApiPropertyOptional({ example: 20, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_product_slots?: number;

  @ApiPropertyOptional({
    example: 500000,
    description: 'Вместимость купюроприемника (сум)',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cash_capacity?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  accepts_cash?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  accepts_card?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  accepts_qr?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  accepts_nfc?: boolean;

  @ApiProperty({ example: 'QR-M001' })
  @IsString()
  qr_code: string;

  @ApiPropertyOptional({ example: 'https://vendhub.uz/complaint/QR-M001' })
  @IsOptional()
  @IsString()
  qr_code_url?: string;

  @ApiPropertyOptional({ example: 'uuid' })
  @IsOptional()
  @IsUUID()
  assigned_operator_id?: string;

  @ApiPropertyOptional({ example: 'uuid' })
  @IsOptional()
  @IsUUID()
  assigned_technician_id?: string;

  @ApiPropertyOptional({ example: 'Требует еженедельной мойки' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: { temperature: 90 } })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  low_stock_threshold_percent?: number;
}
