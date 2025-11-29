import { IsUUID, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskItemDto {
  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @IsUUID()
  nomenclature_id: string;

  @ApiProperty({ example: 10, description: 'Планируемое количество' })
  @IsNumber()
  @Min(0.001, { message: 'Количество должно быть больше 0' })
  planned_quantity: number;

  @ApiProperty({ example: 'kg', description: 'Единица измерения' })
  @IsString()
  unit_of_measure_code: string;

  @ApiPropertyOptional({ example: 'Проверить срок годности' })
  @IsOptional()
  @IsString()
  notes?: string;
}
