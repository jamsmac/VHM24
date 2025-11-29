import {
  IsEnum,
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsObject,
  ValidateNested,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InventoryLevelType } from '../entities/inventory-actual-count.entity';

/**
 * DTO для создания одного фактического замера
 */
export class CreateActualCountDto {
  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @IsUUID()
  nomenclature_id: string;

  @ApiProperty({
    enum: InventoryLevelType,
    example: InventoryLevelType.WAREHOUSE,
    description: 'Уровень учёта',
  })
  @IsEnum(InventoryLevelType)
  level_type: InventoryLevelType;

  @ApiProperty({
    example: 'uuid',
    description: 'ID объекта (warehouse_id, operator_id или machine_id)',
  })
  @IsUUID()
  level_ref_id: string;

  @ApiProperty({
    example: '2025-11-20T10:30:00Z',
    description: 'Дата и время фактического замера',
  })
  @IsDateString()
  counted_at: string;

  @ApiProperty({ example: 150.5, description: 'Фактическое количество' })
  @IsNumber()
  @Min(0)
  actual_quantity: number;

  @ApiPropertyOptional({ example: 'шт', description: 'Единица измерения' })
  @IsOptional()
  @IsString()
  unit_of_measure?: string;

  @ApiPropertyOptional({
    example: 'Проведена инвентаризация основного склада',
    description: 'Примечания к замеру',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: 'uuid',
    description: 'ID сессии инвентаризации (для группировки)',
  })
  @IsOptional()
  @IsUUID()
  session_id?: string;

  @ApiPropertyOptional({
    example: { photos: ['photo1.jpg'] },
    description: 'Дополнительные метаданные',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO для элемента в массовой инвентаризации
 */
export class BatchCountItemDto {
  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @IsUUID()
  nomenclature_id: string;

  @ApiProperty({ example: 150.5, description: 'Фактическое количество' })
  @IsNumber()
  @Min(0)
  actual_quantity: number;

  @ApiPropertyOptional({ example: 'шт', description: 'Единица измерения' })
  @IsOptional()
  @IsString()
  unit_of_measure?: string;

  @ApiPropertyOptional({ example: 'Примечание к позиции', description: 'Примечания' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO для массовой инвентаризации (много товаров за раз)
 */
export class CreateBatchCountDto {
  @ApiProperty({
    enum: InventoryLevelType,
    example: InventoryLevelType.WAREHOUSE,
    description: 'Уровень учёта',
  })
  @IsEnum(InventoryLevelType)
  level_type: InventoryLevelType;

  @ApiProperty({
    example: 'uuid',
    description: 'ID объекта (warehouse_id, operator_id или machine_id)',
  })
  @IsUUID()
  level_ref_id: string;

  @ApiProperty({
    example: '2025-11-20T10:30:00Z',
    description: 'Дата и время инвентаризации',
  })
  @IsDateString()
  counted_at: string;

  @ApiProperty({
    type: [BatchCountItemDto],
    description: 'Список товаров с фактическими количествами',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchCountItemDto)
  items: BatchCountItemDto[];

  @ApiPropertyOptional({
    example: 'Плановая инвентаризация основного склада',
    description: 'Общие примечания к инвентаризации',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: 'uuid',
    description: 'ID сессии инвентаризации (будет сгенерирован, если не указан)',
  })
  @IsOptional()
  @IsUUID()
  session_id?: string;

  @ApiPropertyOptional({
    example: { inspector: 'Иванов И.И.', reason: 'Плановая проверка' },
    description: 'Дополнительные метаданные',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO для фильтрации фактических замеров
 */
export class GetActualCountsFilterDto {
  @ApiPropertyOptional({
    enum: InventoryLevelType,
    description: 'Фильтр по уровню учёта',
  })
  @IsOptional()
  @IsEnum(InventoryLevelType)
  level_type?: InventoryLevelType;

  @ApiPropertyOptional({ example: 'uuid', description: 'Фильтр по объекту' })
  @IsOptional()
  @IsUUID()
  level_ref_id?: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'Фильтр по товару' })
  @IsOptional()
  @IsUUID()
  nomenclature_id?: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'Фильтр по сессии' })
  @IsOptional()
  @IsUUID()
  session_id?: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'Фильтр по пользователю' })
  @IsOptional()
  @IsUUID()
  counted_by_user_id?: string;

  @ApiPropertyOptional({ example: '2025-11-01', description: 'Начало периода' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ example: '2025-11-30', description: 'Конец периода' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ example: 10, description: 'Лимит результатов', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 0, description: 'Смещение для пагинации', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}

/**
 * Response DTO для фактического замера с расчётным остатком
 */
export class ActualCountWithCalculatedDto {
  @ApiProperty({ description: 'Фактический замер' })
  actual_count: {
    id: string;
    nomenclature_id: string;
    nomenclature_name: string;
    level_type: string;
    level_ref_id: string;
    counted_at: Date;
    actual_quantity: number;
    unit_of_measure: string | null;
    notes: string | null;
    counted_by: {
      id: string;
      full_name: string;
    };
  };

  @ApiProperty({ description: 'Расчётный остаток на момент замера' })
  calculated_quantity: number;

  @ApiProperty({ description: 'Абсолютное расхождение' })
  difference_abs: number;

  @ApiProperty({ description: 'Относительное расхождение в %' })
  difference_rel: number;

  @ApiProperty({ description: 'Уровень серьёзности (INFO, WARNING, CRITICAL)' })
  severity: string;

  @ApiProperty({ description: 'Превышен ли порог' })
  threshold_exceeded: boolean;
}
