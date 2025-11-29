import { IsOptional, IsUUID, IsNumber } from 'class-validator';

export class BatchQueryDto {
  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @IsOptional()
  @IsUUID()
  product_id?: string;
}

export class ExpiringBatchesDto {
  @IsUUID()
  warehouse_id: string;

  @IsOptional()
  @IsNumber()
  days_threshold?: number;
}
