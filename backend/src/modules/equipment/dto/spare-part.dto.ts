import { IsEnum, IsString, IsOptional, IsInt, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ComponentType } from '../entities/equipment-component.entity';

export class CreateSparePartDto {
  @ApiProperty({ example: 'SP-001-GRN', description: 'Артикул запчасти' })
  @IsString()
  part_number: string;

  @ApiProperty({ example: 'Жернова для кофемолки' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Керамические жернова для кофемолок Saeco' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ComponentType, example: ComponentType.GRINDER })
  @IsEnum(ComponentType)
  component_type: ComponentType;

  @ApiPropertyOptional({ example: 'Saeco' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'Saeco Aroma, Magic' })
  @IsOptional()
  @IsString()
  model_compatibility?: string;

  @ApiProperty({ example: 50, description: 'Количество на складе' })
  @IsInt()
  @Min(0)
  quantity_in_stock: number;

  @ApiProperty({ example: 10, description: 'Минимальный уровень запаса' })
  @IsInt()
  @Min(0)
  min_stock_level: number;

  @ApiPropertyOptional({ example: 100, description: 'Максимальный уровень запаса' })
  @IsOptional()
  @IsInt()
  @Min(0)
  max_stock_level?: number;

  @ApiPropertyOptional({ example: 'pcs', description: 'Единица измерения' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: 2500, description: 'Цена за единицу' })
  @IsNumber()
  @Min(0)
  unit_price: number;

  @ApiPropertyOptional({ example: 'ООО Кофемаш' })
  @IsOptional()
  @IsString()
  supplier_name?: string;

  @ApiPropertyOptional({ example: 'A-1-15' })
  @IsOptional()
  @IsString()
  storage_location?: string;
}

export class UpdateSparePartDto extends PartialType(CreateSparePartDto) {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class AdjustStockDto {
  @ApiProperty({
    example: 10,
    description: 'Количество (положительное - поступление, отрицательное - расход)',
  })
  @IsInt()
  quantity: number;

  @ApiProperty({ example: 'Поступление от поставщика' })
  @IsString()
  reason: string;
}
