import {
  IsEnum,
  IsUUID,
  IsString,
  IsOptional,
  IsInt,
  IsDate,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ComponentType } from '../entities/equipment-component.entity';
import { WashingFrequency } from '../entities/washing-schedule.entity';

export class CreateWashingScheduleDto {
  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @IsUUID()
  machine_id: string;

  @ApiProperty({ example: 'Ежедневная мойка варочной группы' })
  @IsString()
  name: string;

  @ApiProperty({ enum: WashingFrequency, example: WashingFrequency.DAILY })
  @IsEnum(WashingFrequency)
  frequency: WashingFrequency;

  @ApiPropertyOptional({ example: 7, description: 'Интервал в днях (для CUSTOM)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  interval_days?: number;

  @ApiProperty({
    type: [String],
    enum: ComponentType,
    example: [ComponentType.BREWER, ComponentType.MIXER],
  })
  @IsArray()
  @IsEnum(ComponentType, { each: true })
  component_types: ComponentType[];

  @ApiProperty({ type: Date, example: '2024-11-20' })
  @IsDate()
  @Type(() => Date)
  next_wash_date: Date;

  @ApiPropertyOptional({ example: 'Использовать моющее средство X, промыть 3 раза' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ example: ['Моющее средство X', 'Щетка', 'Салфетки'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  required_materials?: string[];

  @ApiPropertyOptional({ example: 30, description: 'Ожидаемая длительность (минуты)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimated_duration_minutes?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  auto_create_tasks?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'За сколько дней уведомлять' })
  @IsOptional()
  @IsInt()
  @Min(0)
  notification_days_before?: number;
}

export class UpdateWashingScheduleDto extends PartialType(CreateWashingScheduleDto) {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CompleteWashingDto {
  @ApiProperty({ example: 'uuid', description: 'ID пользователя, выполнившего мойку' })
  @IsUUID()
  performed_by_user_id: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'ID связанной задачи' })
  @IsOptional()
  @IsUUID()
  task_id?: string;

  @ApiPropertyOptional({ example: 'Мойка выполнена согласно инструкции' })
  @IsOptional()
  @IsString()
  notes?: string;
}
