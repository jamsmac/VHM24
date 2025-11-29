import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsObject,
} from 'class-validator';
import { WarehouseType } from '../entities/warehouse.entity';

/**
 * Metadata structure for warehouses
 */
export interface WarehouseMetadata {
  certification?: string;
  security_level?: string;
  operating_hours?: string;
  [key: string]: string | number | boolean | undefined;
}

export class CreateWarehouseDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsEnum(WarehouseType)
  warehouse_type: WarehouseType;

  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  @IsNumber()
  total_area_sqm?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  manager_name?: string;

  @IsOptional()
  @IsString()
  contact_phone?: string;

  @IsOptional()
  @IsString()
  contact_email?: string;

  @IsOptional()
  @IsObject()
  metadata?: WarehouseMetadata;
}
