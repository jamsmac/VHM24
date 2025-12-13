import {
  IsEnum,
  IsUUID,
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceType } from '../entities/component-maintenance.entity';

export class CreateMaintenanceDto {
  @ApiProperty({ example: 'uuid', description: 'ID компонента' })
  @IsUUID()
  component_id: string;

  @ApiProperty({ enum: MaintenanceType, example: MaintenanceType.CLEANING })
  @IsEnum(MaintenanceType)
  maintenance_type: MaintenanceType;

  @ApiProperty({ example: 'uuid', description: 'ID пользователя, выполнившего обслуживание' })
  @IsUUID()
  performed_by_user_id: string;

  @ApiProperty({ example: 'Выполнена полная чистка и смазка компонента' })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    example: [{ spare_part_id: 'uuid', quantity: 2, part_number: 'SP-001', name: 'Жернова' }],
  })
  @IsOptional()
  @IsArray()
  spare_parts_used?: Array<{
    spare_part_id: string;
    quantity: number;
    part_number: string;
    name: string;
  }>;

  @ApiPropertyOptional({ example: 1500, description: 'Стоимость работ' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  labor_cost?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Стоимость запчастей' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  parts_cost?: number;

  @ApiPropertyOptional({ example: 45, description: 'Длительность работ (минуты)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration_minutes?: number;

  @ApiPropertyOptional({ example: 'Компонент работает нормально' })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_successful?: boolean;

  @ApiPropertyOptional({
    example: '2025-05-15',
    description: 'Рекомендуемая дата следующего обслуживания',
  })
  @IsOptional()
  @IsString()
  next_maintenance_date?: string;

  @ApiPropertyOptional({ example: ['https://...', 'https://...'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photo_urls?: string[];

  @ApiPropertyOptional({ example: 'uuid', description: 'ID связанной задачи' })
  @IsOptional()
  @IsUUID()
  task_id?: string;

  @ApiPropertyOptional({ example: 'Требуется повторная проверка через неделю' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MaintenanceFiltersDto {
  @ApiPropertyOptional({ example: 'uuid' })
  @IsOptional()
  @IsUUID()
  component_id?: string;

  @ApiPropertyOptional({ enum: MaintenanceType })
  @IsOptional()
  @IsEnum(MaintenanceType)
  maintenance_type?: MaintenanceType;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  from_date?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsString()
  to_date?: string;
}
