import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for moving a machine to a new location
 * REQ-MD-MACH-02: История перемещений аппаратов
 */
export class MoveMachineDto {
  @ApiProperty({
    description: 'ID новой локации',
    example: 'uuid',
  })
  @IsUUID()
  to_location_id: string;

  @ApiPropertyOptional({
    description: 'Причина перемещения',
    example: 'Низкие продажи на предыдущей локации',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Дополнительные примечания',
    example: 'Перемещение выполнено утром 20.11.2025',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
