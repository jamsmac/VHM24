import { IsString, IsUUID, IsNumber, IsOptional } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  warehouse_id: string;

  @IsUUID()
  product_id: string;

  @IsNumber()
  quantity: number;

  @IsString()
  unit: string;

  @IsString()
  reserved_for: string;

  @IsOptional()
  @IsUUID()
  reserved_by_id?: string;

  @IsOptional()
  @IsNumber()
  expires_in_hours?: number;

  @IsOptional()
  @IsUUID()
  batch_id?: string;
}

export class FulfillReservationDto {
  @IsNumber()
  quantity_fulfilled: number;
}
