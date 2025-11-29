import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import {
  IsEnum,
  IsOptional,
  IsDateString,
  IsString,
  IsArray,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '../entities/task.entity';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: 'uuid' })
  @IsOptional()
  @IsString()
  assigned_to_user_id?: string;

  @ApiPropertyOptional({ example: '2024-12-31T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduled_date?: string;

  @ApiPropertyOptional({ example: '2024-12-31T18:00:00Z' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({ example: 'Обновленное описание задачи' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: [
      { item: 'Проверить чистоту бункеров', completed: true },
      { item: 'Проверить уровень воды', completed: false },
    ],
  })
  @IsOptional()
  @IsArray()
  checklist?: Array<{ item: string; completed: boolean }>;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Ожидаемая сумма денег (для инкассации)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expected_cash_amount?: number;
}
