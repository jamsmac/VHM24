import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  MinLength,
  Min,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDictionaryCode } from '@/common/validators';

export class CreateNomenclatureDto {
  @ApiProperty({ example: 'COFFEE-001' })
  @IsString()
  @MinLength(1, { message: 'SKU обязателен' })
  sku: string;

  @ApiProperty({ example: 'Кофе Arabica 1кг' })
  @IsString()
  @MinLength(2, { message: 'Название должно содержать минимум 2 символа' })
  name: string;

  @ApiProperty({ example: 'ingredients', description: 'Код из справочника product_categories' })
  @IsString()
  @IsDictionaryCode('product_categories')
  category_code: string;

  @ApiProperty({ example: 'kg', description: 'Код из справочника units_of_measure' })
  @IsString()
  @IsDictionaryCode('units_of_measure')
  unit_of_measure_code: string;

  @ApiPropertyOptional({ example: 'Высококачественная арабика из Колумбии' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 120000, description: 'Закупочная цена (сум)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchase_price?: number;

  @ApiPropertyOptional({ example: 200000, description: 'Продажная цена (сум)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  selling_price?: number;

  @ApiPropertyOptional({ example: 1.0, description: 'Вес единицы товара (кг)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ example: '4607001234567' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 10, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_stock_level?: number;

  @ApiPropertyOptional({ example: 100, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_stock_level?: number;

  @ApiPropertyOptional({ example: 180, description: 'Срок годности в днях' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shelf_life_days?: number;

  @ApiPropertyOptional({ example: 'uuid' })
  @IsOptional()
  @IsUUID()
  default_supplier_id?: string;

  @ApiPropertyOptional({ example: 'SUPP-COFFEE-001' })
  @IsOptional()
  @IsString()
  supplier_sku?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  is_ingredient?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  requires_temperature_control?: boolean;

  @ApiPropertyOptional({ example: 'https://example.com/coffee.jpg' })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiPropertyOptional({ example: ['https://example.com/1.jpg', 'https://example.com/2.jpg'] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: ['coffee', 'arabica', 'premium'] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}
