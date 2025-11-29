import { IsUUID, IsString, IsEnum, IsDateString, IsOptional, IsObject } from 'class-validator';
import { SyncDirection } from '../entities/sync-job.entity';

export class CreateSyncJobDto {
  @IsUUID()
  integration_id: string;

  @IsString()
  job_name: string;

  @IsEnum(SyncDirection)
  direction: SyncDirection;

  @IsString()
  entity_type: string;

  @IsDateString()
  scheduled_at: Date;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  triggered_by_id?: string;
}
