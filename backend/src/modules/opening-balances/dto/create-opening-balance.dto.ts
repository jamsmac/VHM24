import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOpeningBalanceDto {
  @ApiProperty({ description: 'Номенклатура ID' })
  @IsUUID()
  nomenclature_id: string;

  @ApiPropertyOptional({ description: 'Склад ID' })
  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @ApiProperty({ description: 'Дата начала учета', example: '2024-01-01' })
  @IsDateString()
  balance_date: string;

  @ApiProperty({ description: 'Количество', example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: 'Единица измерения', example: 'шт' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ description: 'Себестоимость за единицу (UZS)', example: 5000 })
  @IsNumber()
  @Min(0)
  unit_cost: number;

  @ApiPropertyOptional({ description: 'Номер партии' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  batch_number?: string;

  @ApiPropertyOptional({ description: 'Срок годности', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @ApiPropertyOptional({ description: 'Место хранения на складе' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ description: 'Примечания' })
  @IsOptional()
  @IsString()
  notes?: string;
}
