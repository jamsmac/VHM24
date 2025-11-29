import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsString,
  IsBoolean,
  IsObject,
  IsDateString,
} from 'class-validator';
import { AuditEventType, AuditSeverity } from '../entities/audit-log.entity';

export class CreateAuditLogDto {
  @IsEnum(AuditEventType)
  event_type: AuditEventType;

  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsUUID()
  target_user_id?: string;

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsString()
  user_agent?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @IsString()
  error_message?: string;

  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity;
}

export class AuditLogQueryDto {
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsEnum(AuditEventType)
  event_type?: AuditEventType;

  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}
