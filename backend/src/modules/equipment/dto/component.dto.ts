import {
  IsEnum,
  IsUUID,
  IsString,
  IsOptional,
  IsInt,
  IsDate,
  IsObject,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ComponentType, ComponentStatus } from '../entities/equipment-component.entity';

export class CreateComponentDto {
  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @IsUUID()
  machine_id: string;

  @ApiProperty({ enum: ComponentType, example: ComponentType.GRINDER })
  @IsEnum(ComponentType)
  component_type: ComponentType;

  @ApiProperty({ example: 'Кофемолка Saeco' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Saeco Aroma' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'SN12345678' })
  @IsOptional()
  @IsString()
  serial_number?: string;

  @ApiPropertyOptional({ example: 'Saeco' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ type: Date, example: '2024-01-15' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  installation_date?: Date;

  @ApiPropertyOptional({ example: 180, description: 'Интервал обслуживания (дни)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maintenance_interval_days?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Ожидаемый срок службы (часы)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  expected_lifetime_hours?: number;

  @ApiPropertyOptional({ example: 'Установлен при первоначальной установке аппарата' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateComponentDto extends PartialType(CreateComponentDto) {
  @ApiPropertyOptional({ enum: ComponentStatus })
  @IsOptional()
  @IsEnum(ComponentStatus)
  status?: ComponentStatus;

  @ApiPropertyOptional({ type: Date })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  last_maintenance_date?: Date;

  @ApiPropertyOptional({ type: Date })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  next_maintenance_date?: Date;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  working_hours?: number;
}

export class ReplaceComponentDto {
  @ApiProperty({ example: 'uuid', description: 'ID нового компонента' })
  @IsUUID()
  new_component_id: string;

  @ApiProperty({ example: 'Компонент выработал ресурс' })
  @IsString()
  reason: string;

  @ApiProperty({ example: 'uuid', description: 'ID пользователя, выполнившего замену' })
  @IsUUID()
  performed_by_user_id: string;
}
