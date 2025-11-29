import { IsString, IsOptional, IsBoolean, IsObject, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Filter options for inventory report presets
 */
export interface InventoryReportFilters {
  level_type?: string;
  level_ref_id?: string;
  nomenclature_id?: string;
  date_from?: string;
  date_to?: string;
  severity?: string;
  threshold_exceeded_only?: boolean;
}

/**
 * Create Inventory Report Preset DTO
 */
export class CreateInventoryReportPresetDto {
  @ApiProperty({
    example: 'Критические расхождения на этой неделе',
    description: 'Название пресета',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Фильтр для поиска критических расхождений',
    description: 'Описание пресета',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: {
      level_type: 'MACHINE',
      level_ref_id: 'uuid',
      severity: 'CRITICAL',
      threshold_exceeded_only: true,
    },
    description: 'Объект с фильтрами для отчёта',
  })
  @IsObject()
  filters: InventoryReportFilters;

  @ApiProperty({
    example: false,
    description: 'Установить как пресет по умолчанию',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

/**
 * Update Inventory Report Preset DTO
 */
export class UpdateInventoryReportPresetDto {
  @ApiProperty({
    example: 'Обновлённое название',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Обновлённое описание',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsObject()
  filters?: InventoryReportFilters;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

/**
 * Inventory Report Preset Response DTO
 */
export class InventoryReportPresetResponseDto {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  filters: InventoryReportFilters;
  is_default: boolean;
  is_shared: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}
