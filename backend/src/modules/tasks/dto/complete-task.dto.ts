import {
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  Min,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO для фактического количества товара при завершении задачи пополнения
 */
export class CompleteTaskItemDto {
  @ApiProperty({ example: 'uuid', description: 'ID товара из номенклатуры' })
  @IsString()
  nomenclature_id: string;

  @ApiProperty({
    example: 10.5,
    description: 'Фактическое количество (может отличаться от запланированного)',
  })
  @IsNumber()
  @Min(0)
  actual_quantity: number;
}

/**
 * DTO для завершения задачи
 * Поддерживает офлайн-режим: можно завершить без фото, загрузить их позже
 */
export class CompleteTaskDto {
  @ApiPropertyOptional({
    example: 48750.5,
    description: 'Фактическая сумма денег (для задач инкассации)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actual_cash_amount?: number;

  @ApiPropertyOptional({
    type: [CompleteTaskItemDto],
    description:
      'Фактические количества товаров (для задач пополнения). Если не указано, используются запланированные количества.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteTaskItemDto)
  items?: CompleteTaskItemDto[];

  @ApiPropertyOptional({
    example: 'Все выполнено согласно плану',
    description: 'Комментарий при завершении задачи',
  })
  @IsOptional()
  @IsString()
  completion_notes?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Пропустить проверку фото (офлайн-режим). Фото можно будет загрузить позже.',
  })
  @IsOptional()
  @IsBoolean()
  skip_photos?: boolean;

  @ApiPropertyOptional({
    example: '2025-11-15T14:30:00Z',
    description:
      'Дата фактического выполнения операции (для ввода исторических данных). Если не указано, используется текущее время.',
  })
  @IsOptional()
  @IsDateString()
  operation_date?: string;
}
