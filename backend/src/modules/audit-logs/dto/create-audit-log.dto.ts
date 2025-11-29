import { IsEnum, IsOptional, IsString, IsBoolean, IsUUID } from 'class-validator';
import { AuditEventType, AuditSeverity } from '../entities/audit-log.entity';

/**
 * DTO for creating audit log entries
 */
export class CreateAuditLogDto {
  @IsEnum(AuditEventType)
  event_type: AuditEventType;

  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity;

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
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @IsString()
  error_message?: string;
}
