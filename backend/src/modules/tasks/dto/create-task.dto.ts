import {
  IsEnum,
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  IsNumber,
  ValidateNested,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType, TaskPriority } from '../entities/task.entity';
import { CreateTaskItemDto } from './create-task-item.dto';
import { TaskComponentDto } from './task-component.dto';

export class CreateTaskDto {
  @ApiProperty({ enum: TaskType, example: TaskType.REFILL })
  @IsEnum(TaskType, { message: 'Неверный тип задачи' })
  type_code: TaskType;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.NORMAL })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @IsUUID()
  machine_id: string;

  @ApiProperty({ example: 'uuid', description: 'ID назначенного оператора' })
  @IsUUID()
  assigned_to_user_id: string;

  @ApiProperty({ example: 'uuid', description: 'ID создателя задачи' })
  @IsUUID()
  created_by_user_id: string;

  @ApiPropertyOptional({ example: '2024-12-31T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduled_date?: string;

  @ApiPropertyOptional({ example: '2024-12-31T18:00:00Z' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({ example: 'Необходимо пополнить кофе и молоко' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: [
      { item: 'Проверить чистоту бункеров', completed: false },
      { item: 'Проверить уровень воды', completed: false },
    ],
  })
  @IsOptional()
  @IsArray()
  checklist?: Array<{ item: string; completed: boolean }>;

  @ApiPropertyOptional({ example: 50000, description: 'Ожидаемая сумма денег (для инкассации)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expected_cash_amount?: number;

  @ApiPropertyOptional({
    type: [CreateTaskItemDto],
    description: 'Список товаров (для задач пополнения)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskItemDto)
  items?: CreateTaskItemDto[];

  @ApiPropertyOptional({
    type: [TaskComponentDto],
    description: 'Компоненты для задач замены/обслуживания (REPLACE_*, CLEANING, REPAIR)',
    example: [
      { component_id: 'uuid-old', role: 'old', notes: 'Изношенная кофемолка' },
      { component_id: 'uuid-new', role: 'new', notes: 'Новая кофемолка' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskComponentDto)
  components?: TaskComponentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
