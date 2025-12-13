import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialCategory } from '../entities/material.entity';

/**
 * DTO для создания материала.
 */
export class CreateMaterialDto {
  @ApiProperty({ example: 'Кофе Арабика 1кг', description: 'Название материала' })
  @IsString()
  @MinLength(2, { message: 'Название должно быть минимум 2 символа' })
  @MaxLength(255)
  name: string;

  @ApiProperty({
    enum: MaterialCategory,
    example: MaterialCategory.INGREDIENTS,
    description: 'Категория материала',
  })
  @IsEnum(MaterialCategory)
  category: MaterialCategory;

  @ApiPropertyOptional({ example: 'кг', default: 'шт', description: 'Единица измерения' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ example: 'COF-ARB-001', description: 'Артикул / SKU' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ example: 'Арабика премиум качества', description: 'Описание' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 150000, description: 'Цена за единицу (сум)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unit_price?: number;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Минимальное количество для заказа' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  min_order_quantity?: number;

  @ApiPropertyOptional({ description: 'ID поставщика по умолчанию' })
  @IsOptional()
  @IsUUID()
  supplier_id?: string;

  @ApiPropertyOptional({ default: true, description: 'Активен ли материал' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 'https://...', description: 'URL изображения' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Порядок сортировки' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sort_order?: number;
}
