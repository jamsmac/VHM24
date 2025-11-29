import {
  IsEnum,
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ThresholdType, SeverityLevel } from '../entities/inventory-difference-threshold.entity';

/**
 * DTO для создания порога расхождений
 */
export class CreateThresholdDto {
  @ApiProperty({
    enum: ThresholdType,
    example: ThresholdType.NOMENCLATURE,
    description: 'Тип порога',
  })
  @IsEnum(ThresholdType)
  threshold_type: ThresholdType;

  @ApiPropertyOptional({
    example: 'uuid',
    description: 'ID объекта (nomenclature, location, machine, operator) или NULL для GLOBAL',
  })
  @IsOptional()
  @IsUUID()
  reference_id?: string | null;

  @ApiProperty({
    example: 'Критический порог для скоропортящихся товаров',
    description: 'Название правила',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 50.0,
    description: 'Абсолютное значение порога (если не указано - не применяется)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold_abs?: number | null;

  @ApiPropertyOptional({
    example: 10.0,
    description: 'Относительное значение порога в процентах (если не указано - не применяется)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  threshold_rel?: number | null;

  @ApiProperty({
    enum: SeverityLevel,
    example: SeverityLevel.WARNING,
    description: 'Уровень серьёзности при превышении',
  })
  @IsEnum(SeverityLevel)
  severity_level: SeverityLevel;

  @ApiPropertyOptional({
    example: false,
    description: 'Создавать ли инцидент при превышении',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  create_incident?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Создавать ли задачу на разбор при превышении',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  create_task?: boolean;

  @ApiPropertyOptional({
    example: ['uuid1', 'uuid2'],
    description: 'Список user_id для уведомлений',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  notify_users?: string[] | null;

  @ApiPropertyOptional({
    example: ['ADMIN', 'MANAGER'],
    description: 'Список ролей для уведомлений',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notify_roles?: string[] | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Активен ли порог',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    example: 10,
    description: 'Приоритет применения (больше = выше приоритет)',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({
    example: 'Применяется к товарам с коротким сроком годности',
    description: 'Описание правила',
  })
  @IsOptional()
  @IsString()
  description?: string | null;
}

/**
 * DTO для обновления порога расхождений
 */
export class UpdateThresholdDto extends PartialType(CreateThresholdDto) {}

/**
 * DTO для фильтрации порогов
 */
export class GetThresholdsFilterDto {
  @ApiPropertyOptional({
    enum: ThresholdType,
    description: 'Фильтр по типу порога',
  })
  @IsOptional()
  @IsEnum(ThresholdType)
  threshold_type?: ThresholdType;

  @ApiPropertyOptional({ example: 'uuid', description: 'Фильтр по объекту' })
  @IsOptional()
  @IsUUID()
  reference_id?: string;

  @ApiPropertyOptional({
    enum: SeverityLevel,
    description: 'Фильтр по уровню серьёзности',
  })
  @IsOptional()
  @IsEnum(SeverityLevel)
  severity_level?: SeverityLevel;

  @ApiPropertyOptional({ description: 'Только активные', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
