import { IsUUID, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToWarehouseDto {
  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @IsUUID()
  nomenclature_id: string;

  @ApiProperty({ example: 100.5, description: 'Количество для добавления' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({
    example: 'Приход товара по накладной INV-2024-001',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: { purchase_price: 150.5, invoice_number: 'INV-2024-001' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RemoveFromWarehouseDto {
  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @IsUUID()
  nomenclature_id: string;

  @ApiProperty({ example: 10.5, description: 'Количество для списания' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({
    example: 'Списание просроченного товара',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateWarehouseInventoryDto {
  @ApiPropertyOptional({ example: 20, description: 'Минимальный уровень запаса' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_stock_level?: number;

  @ApiPropertyOptional({ example: 200, description: 'Максимальный уровень запаса' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_stock_level?: number;

  @ApiPropertyOptional({ example: 'Стеллаж A-12' })
  @IsOptional()
  @IsString()
  location_in_warehouse?: string;
}
