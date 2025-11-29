import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PurchaseStatus {
  PENDING = 'pending',
  RECEIVED = 'received',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
}

export class CreatePurchaseDto {
  @ApiProperty({ description: 'Дата закупки', example: '2024-01-15' })
  @IsDateString()
  purchase_date: string;

  @ApiPropertyOptional({ description: 'Номер счета-фактуры', example: 'INV-2024-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoice_number?: string;

  @ApiProperty({ description: 'ID поставщика' })
  @IsUUID()
  supplier_id: string;

  @ApiProperty({ description: 'ID номенклатуры' })
  @IsUUID()
  nomenclature_id: string;

  @ApiPropertyOptional({ description: 'ID склада' })
  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @ApiProperty({ description: 'Количество', example: 100 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Единица измерения', example: 'шт' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ description: 'Цена за единицу без НДС (UZS)', example: 10000 })
  @IsNumber()
  @Min(0)
  unit_price: number;

  @ApiPropertyOptional({
    description: 'Ставка НДС (%)',
    example: 15,
    default: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vat_rate?: number;

  @ApiPropertyOptional({ description: 'Номер партии' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  batch_number?: string;

  @ApiPropertyOptional({ description: 'Дата производства', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  production_date?: string;

  @ApiPropertyOptional({ description: 'Срок годности', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @ApiPropertyOptional({
    description: 'Статус поставки',
    enum: PurchaseStatus,
    default: PurchaseStatus.RECEIVED,
  })
  @IsOptional()
  @IsEnum(PurchaseStatus)
  status?: PurchaseStatus;

  @ApiPropertyOptional({ description: 'Фактическая дата поставки', example: '2024-01-20' })
  @IsOptional()
  @IsDateString()
  delivery_date?: string;

  @ApiPropertyOptional({ description: 'Номер накладной' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  delivery_note_number?: string;

  @ApiPropertyOptional({
    description: 'Валюта',
    example: 'UZS',
    default: 'UZS',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Курс валюты к UZS', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchange_rate?: number;

  @ApiPropertyOptional({ description: 'Способ оплаты', example: 'bank_transfer' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  payment_method?: string;

  @ApiPropertyOptional({ description: 'Дата оплаты', example: '2024-01-14' })
  @IsOptional()
  @IsDateString()
  payment_date?: string;

  @ApiPropertyOptional({ description: 'Примечания' })
  @IsOptional()
  @IsString()
  notes?: string;
}
