import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComponentLocationType } from '../entities/equipment-component.entity';

export class RemoveComponentDto {
  @ApiProperty({
    enum: ComponentLocationType,
    description: 'Where to move the component after removal',
    example: ComponentLocationType.WAREHOUSE,
  })
  @IsEnum(ComponentLocationType)
  target_location: ComponentLocationType;

  @ApiPropertyOptional({
    description: 'Target location reference',
    example: 'warehouse-main',
  })
  @IsOptional()
  @IsString()
  target_location_ref?: string;

  @ApiPropertyOptional({
    description: 'Related task ID (if removal is part of a task)',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  task_id?: string;

  @ApiPropertyOptional({
    description: 'Reason for removal',
    example: 'Component needs maintenance',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
