import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ZoneType } from '../entities/warehouse-zone.entity';

/**
 * Metadata structure for warehouse zones
 */
export interface ZoneMetadata {
  temperature?: number;
  humidity?: number;
  shelves?: number;
  rows?: number;
  positions_per_row?: number;
  [key: string]: string | number | boolean | undefined;
}

export class CreateZoneDto {
  @IsUUID()
  warehouse_id: string;

  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsEnum(ZoneType)
  zone_type: ZoneType;

  @IsOptional()
  @IsNumber()
  area_sqm?: number;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: ZoneMetadata;
}

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ZoneType)
  zone_type?: ZoneType;

  @IsOptional()
  @IsNumber()
  area_sqm?: number;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: ZoneMetadata;
}
