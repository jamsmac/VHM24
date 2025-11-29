import { IsString, IsOptional, IsObject, IsUUID } from 'class-validator';

export class CreateWebhookDto {
  @IsOptional()
  @IsUUID()
  integration_id?: string;

  @IsString()
  event_type: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  external_id?: string;

  @IsObject()
  payload: Record<string, any>;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
