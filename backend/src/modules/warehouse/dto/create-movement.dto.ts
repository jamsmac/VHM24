import { IsString, IsUUID, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateReceiptDto {
  @IsUUID()
  warehouse_id: string;

  @IsUUID()
  product_id: string;

  @IsNumber()
  quantity: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  unit_cost?: number;

  @IsOptional()
  @IsString()
  batch_number?: string;

  @IsOptional()
  @IsDateString()
  production_date?: Date;

  @IsOptional()
  @IsDateString()
  expiry_date?: Date;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  reference_document?: string;
}

export class CreateShipmentDto {
  @IsUUID()
  warehouse_id: string;

  @IsUUID()
  product_id: string;

  @IsNumber()
  quantity: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsUUID()
  batch_id?: string;

  @IsOptional()
  @IsString()
  reference_document?: string;
}

export class CreateTransferDto {
  @IsUUID()
  from_warehouse_id: string;

  @IsUUID()
  to_warehouse_id: string;

  @IsUUID()
  product_id: string;

  @IsNumber()
  quantity: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsUUID()
  batch_id?: string;
}

export class CreateAdjustmentDto {
  @IsUUID()
  warehouse_id: string;

  @IsUUID()
  product_id: string;

  @IsNumber()
  quantity: number; // Can be positive or negative

  @IsString()
  unit: string;

  @IsOptional()
  @IsUUID()
  batch_id?: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  reference_document?: string;
}
