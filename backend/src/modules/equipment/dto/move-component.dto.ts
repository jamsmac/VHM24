import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComponentLocationType } from '../entities/equipment-component.entity';
import { MovementType } from '../entities/component-movement.entity';

export class MoveComponentDto {
  @ApiProperty({
    enum: ComponentLocationType,
    description: 'Target location type',
    example: ComponentLocationType.WAREHOUSE,
  })
  @IsEnum(ComponentLocationType)
  to_location_type: ComponentLocationType;

  @ApiPropertyOptional({
    description: 'Target location reference (UUID or name)',
    example: 'warehouse-main',
  })
  @IsOptional()
  @IsString()
  to_location_ref?: string;

  @ApiProperty({
    enum: MovementType,
    description: 'Type of movement',
    example: MovementType.MOVE_TO_WAREHOUSE,
  })
  @IsEnum(MovementType)
  movement_type: MovementType;

  @ApiPropertyOptional({
    description: 'Related machine ID (if movement involves a machine)',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  related_machine_id?: string;

  @ApiPropertyOptional({
    description: 'Related task ID (if movement is part of a task)',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  task_id?: string;

  @ApiPropertyOptional({
    description: 'Comment about the movement',
    example: 'Component needs washing after 3 months of use',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
