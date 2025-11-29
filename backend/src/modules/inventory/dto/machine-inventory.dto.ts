import { IsUUID, IsNumber, Min, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMachineInventoryDto {
  @ApiPropertyOptional({ example: 5, description: 'Минимальный уровень для уведомления' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_stock_level?: number;

  @ApiPropertyOptional({ example: 50, description: 'Максимальная вместимость' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_capacity?: number;

  @ApiPropertyOptional({ example: 'A-12', description: 'Номер слота в аппарате' })
  @IsOptional()
  @IsString()
  slot_number?: string;
}

/**
 * DTO для регистрации продажи (расхода ингредиента)
 * Вызывается при создании транзакции продажи
 */
export class RecordSaleDto {
  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @IsUUID()
  machine_id: string;

  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @IsUUID()
  nomenclature_id: string;

  @ApiProperty({ example: 1, description: 'Количество проданного товара' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({
    example: 'uuid',
    description: 'ID транзакции продажи',
  })
  @IsOptional()
  @IsUUID()
  transaction_id?: string;

  @ApiPropertyOptional({
    example: '2025-11-15T14:30:00Z',
    description:
      'Дата фактического выполнения продажи (для ввода исторических данных). Если не указано, используется текущее время.',
  })
  @IsOptional()
  @IsDateString()
  operation_date?: string;
}

/**
 * DTO для корректировки инвентаря (инвентаризация)
 */
export class AdjustInventoryDto {
  @ApiProperty({ example: 15.5, description: 'Новое фактическое количество' })
  @IsNumber()
  @Min(0)
  actual_quantity: number;

  @ApiPropertyOptional({
    example: 'Корректировка после инвентаризации',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
