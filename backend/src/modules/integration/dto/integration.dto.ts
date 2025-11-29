import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  IsUrl,
} from 'class-validator';
import { IntegrationType } from '../entities/integration.entity';

export class CreateIntegrationDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsEnum(IntegrationType)
  type: IntegrationType;

  @IsString()
  provider: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  api_endpoint?: string;

  @IsOptional()
  @IsString()
  api_key?: string;

  @IsOptional()
  @IsString()
  api_secret?: string;

  @IsOptional()
  @IsUrl()
  webhook_url?: string;

  @IsOptional()
  @IsString()
  webhook_secret?: string;

  @IsOptional()
  @IsNumber()
  sync_interval_minutes?: number;

  @IsOptional()
  @IsBoolean()
  auto_sync_enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateIntegrationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  api_endpoint?: string;

  @IsOptional()
  @IsString()
  api_key?: string;

  @IsOptional()
  @IsString()
  api_secret?: string;

  @IsOptional()
  @IsNumber()
  sync_interval_minutes?: number;

  @IsOptional()
  @IsBoolean()
  auto_sync_enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
