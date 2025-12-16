import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsUUID,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AlertMetric,
  AlertOperator,
  AlertSeverity,
} from '../entities/alert-rule.entity';

/**
 * Create Alert Rule DTO
 */
export class CreateAlertRuleDto {
  @ApiProperty({ example: 'Low Stock Alert', description: 'Rule name' })
  @IsString()
  @MinLength(2, { message: 'Название должно содержать минимум 2 символа' })
  @MaxLength(100, { message: 'Название должно содержать максимум 100 символов' })
  name: string;

  @ApiPropertyOptional({
    example: 'Triggers when machine stock falls below threshold',
    description: 'Rule description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: AlertMetric, example: AlertMetric.LOW_STOCK_PERCENTAGE })
  @IsEnum(AlertMetric, { message: 'Недопустимый тип метрики' })
  metric: AlertMetric;

  @ApiProperty({ enum: AlertOperator, example: AlertOperator.LESS_THAN })
  @IsEnum(AlertOperator, { message: 'Недопустимый оператор сравнения' })
  operator: AlertOperator;

  @ApiProperty({ example: 20, description: 'Threshold value for comparison' })
  @IsNumber({}, { message: 'Пороговое значение должно быть числом' })
  threshold: number;

  @ApiPropertyOptional({
    enum: AlertSeverity,
    example: AlertSeverity.WARNING,
    default: AlertSeverity.WARNING,
  })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;

  @ApiPropertyOptional({
    example: 60,
    description: 'Cooldown period in minutes (1-1440)',
    default: 60,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Период ожидания должен быть минимум 1 минута' })
  @Max(1440, { message: 'Период ожидания должен быть максимум 1440 минут (24 часа)' })
  cooldown_minutes?: number;

  @ApiPropertyOptional({
    example: { machine_ids: ['uuid1', 'uuid2'] },
    description: 'Scope filters',
  })
  @IsOptional()
  scope_filters?: {
    machine_ids?: string[];
    location_ids?: string[];
    machine_types?: string[];
  };

  @ApiPropertyOptional({
    example: ['user-uuid-1'],
    description: 'User IDs to notify',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  notify_user_ids?: string[];

  @ApiPropertyOptional({
    example: ['ADMIN', 'MANAGER'],
    description: 'Roles to notify',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notify_roles?: string[];

  @ApiPropertyOptional({
    example: ['telegram', 'email'],
    description: 'Notification channels',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notification_channels?: string[];

  @ApiPropertyOptional({
    example: 30,
    description: 'Minutes before escalation',
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  escalation_minutes?: number;

  @ApiPropertyOptional({
    example: { escalation_roles: ['ADMIN'], auto_create_task: true },
    description: 'Escalation configuration',
  })
  @IsOptional()
  escalation_config?: {
    escalation_roles?: string[];
    escalation_user_ids?: string[];
    auto_create_task?: boolean;
    task_type?: string;
  };
}
