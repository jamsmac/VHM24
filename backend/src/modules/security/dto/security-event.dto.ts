import { IsEnum, IsOptional, IsUUID, IsString, IsBoolean, IsObject } from 'class-validator';
import { SecurityEventType, SecurityLevel } from '../entities/security-event.entity';

export class CreateSecurityEventDto {
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsString()
  user_email?: string;

  @IsEnum(SecurityEventType)
  event_type: SecurityEventType;

  @IsOptional()
  @IsEnum(SecurityLevel)
  security_level?: SecurityLevel;

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsString()
  user_agent?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsBoolean()
  is_blocked?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  details?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  requires_investigation?: boolean;
}

export class InvestigateEventDto {
  @IsUUID()
  investigated_by_id: string;

  @IsString()
  investigation_notes: string;
}
