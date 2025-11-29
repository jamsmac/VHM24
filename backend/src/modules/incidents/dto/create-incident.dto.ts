import { IsEnum, IsUUID, IsString, IsOptional, IsObject, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentType, IncidentPriority } from '../entities/incident.entity';

export class CreateIncidentDto {
  @ApiProperty({ enum: IncidentType, example: IncidentType.TECHNICAL_FAILURE })
  @IsEnum(IncidentType)
  incident_type: IncidentType;

  @ApiPropertyOptional({
    enum: IncidentPriority,
    default: IncidentPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(IncidentPriority)
  priority?: IncidentPriority;

  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @IsUUID()
  machine_id: string;

  @ApiProperty({ example: 'Аппарат не выдает сдачу' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Купюроприемник не возвращает сдачу при оплате' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'ID репортера' })
  @IsOptional()
  @IsUUID()
  reported_by_user_id?: string;

  @ApiPropertyOptional({
    example: { error_code: 'E42', component: 'bill_validator' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateIncidentDto {
  @ApiPropertyOptional({ enum: IncidentPriority })
  @IsOptional()
  @IsEnum(IncidentPriority)
  priority?: IncidentPriority;

  @ApiPropertyOptional({ example: 'uuid', description: 'ID назначенного специалиста' })
  @IsOptional()
  @IsUUID()
  assigned_to_user_id?: string;

  @ApiPropertyOptional({ example: 'Обновленное описание' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ResolveIncidentDto {
  @ApiProperty({ example: 'Заменен модуль купюроприемника' })
  @IsString()
  resolution_notes: string;

  @ApiPropertyOptional({ example: 2500.5, description: 'Стоимость ремонта' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  repair_cost?: number;

  @ApiPropertyOptional({ example: 'uuid', description: 'ID задачи ремонта' })
  @IsOptional()
  @IsUUID()
  repair_task_id?: string;
}
