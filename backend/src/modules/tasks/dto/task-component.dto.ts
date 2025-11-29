import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComponentRole } from '../entities/task-component.entity';

/**
 * DTO для связи задач с компонентами (REQ-TASK-21)
 *
 * Используется при создании задач типа REPLACE_*, CLEANING, REPAIR
 */
export class TaskComponentDto {
  @ApiProperty({
    description: 'Component ID',
    example: 'uuid',
  })
  @IsUUID()
  component_id: string;

  @ApiProperty({
    enum: ComponentRole,
    description:
      'Component role in the task: ' + 'OLD (removed), NEW (installed), TARGET (serviced)',
    example: ComponentRole.OLD,
  })
  @IsEnum(ComponentRole)
  role: ComponentRole;

  @ApiPropertyOptional({
    description: 'Notes about the component (reason for replacement, condition, etc.)',
    example: 'Component worn out after 6 months of use',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
