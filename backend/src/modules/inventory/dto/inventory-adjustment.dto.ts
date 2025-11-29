import {
  IsEnum,
  IsUUID,
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryLevelType } from '../entities/inventory-actual-count.entity';
import { AdjustmentReason, AdjustmentStatus } from '../entities/inventory-adjustment.entity';

/**
 * DTO для создания корректировки остатков
 */
export class CreateAdjustmentDto {
  @ApiProperty({ example: 'uuid', description: 'ID товара' })
  @IsUUID()
  nomenclature_id: string;

  @ApiProperty({
    enum: InventoryLevelType,
    example: InventoryLevelType.WAREHOUSE,
    description: 'Уровень учёта',
  })
  @IsEnum(InventoryLevelType)
  level_type: InventoryLevelType;

  @ApiProperty({ example: 'uuid', description: 'ID объекта уровня (warehouse/operator/machine)' })
  @IsUUID()
  level_ref_id: string;

  @ApiPropertyOptional({
    example: 'uuid',
    description: 'ID замера (если корректировка на основе инвентаризации)',
  })
  @IsOptional()
  @IsUUID()
  actual_count_id?: string;

  @ApiProperty({ example: 100, description: 'Текущее количество' })
  @IsNumber()
  @Min(0)
  old_quantity: number;

  @ApiProperty({ example: 95, description: 'Новое количество после корректировки' })
  @IsNumber()
  @Min(0)
  new_quantity: number;

  @ApiProperty({
    enum: AdjustmentReason,
    example: AdjustmentReason.INVENTORY_DIFFERENCE,
    description: 'Причина корректировки',
  })
  @IsEnum(AdjustmentReason)
  reason: AdjustmentReason;

  @ApiPropertyOptional({ example: 'Обнаружено повреждение упаковки', description: 'Комментарий' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ example: true, default: true, description: 'Требует согласования' })
  @IsOptional()
  @IsBoolean()
  requires_approval?: boolean;
}

/**
 * DTO для одобрения/отклонения корректировки
 */
export class ApproveAdjustmentDto {
  @ApiProperty({
    enum: [AdjustmentStatus.APPROVED, AdjustmentStatus.REJECTED],
    example: AdjustmentStatus.APPROVED,
    description: 'Новый статус (approved или rejected)',
  })
  @IsEnum([AdjustmentStatus.APPROVED, AdjustmentStatus.REJECTED])
  status: AdjustmentStatus.APPROVED | AdjustmentStatus.REJECTED;

  @ApiPropertyOptional({
    example: 'Корректировка одобрена менеджером',
    description: 'Комментарий к решению',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

/**
 * DTO для фильтрации корректировок
 */
export class FilterAdjustmentsDto {
  @ApiPropertyOptional({ enum: AdjustmentStatus, description: 'Фильтр по статусу' })
  @IsOptional()
  @IsEnum(AdjustmentStatus)
  status?: AdjustmentStatus;

  @ApiPropertyOptional({ enum: InventoryLevelType, description: 'Фильтр по уровню' })
  @IsOptional()
  @IsEnum(InventoryLevelType)
  level_type?: InventoryLevelType;

  @ApiPropertyOptional({ description: 'ID объекта уровня' })
  @IsOptional()
  @IsUUID()
  level_ref_id?: string;

  @ApiPropertyOptional({ description: 'ID товара' })
  @IsOptional()
  @IsUUID()
  nomenclature_id?: string;

  @ApiPropertyOptional({ description: 'ID создателя' })
  @IsOptional()
  @IsUUID()
  created_by_user_id?: string;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Количество записей' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Смещение' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
