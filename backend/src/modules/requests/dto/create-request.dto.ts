import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
  IsNumber,
  IsDateString,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RequestPriority } from '../entities/request.entity';

/**
 * DTO для позиции заявки.
 */
export class CreateRequestItemDto {
  @ApiProperty({ description: 'ID материала' })
  @IsUUID()
  material_id: string;

  @ApiProperty({ example: 10, description: 'Количество' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'ID поставщика (если отличается от материала)' })
  @IsOptional()
  @IsUUID()
  supplier_id?: string;

  @ApiPropertyOptional({ example: 'шт', description: 'Единица измерения' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 15000, description: 'Цена за единицу' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unit_price?: number;

  @ApiPropertyOptional({ example: 'Срочно нужно', description: 'Примечание к позиции' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO для создания заявки на материалы.
 */
export class CreateRequestDto {
  @ApiPropertyOptional({
    enum: RequestPriority,
    default: RequestPriority.NORMAL,
    description: 'Приоритет заявки',
  })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @ApiPropertyOptional({ example: 'Нужно для пополнения автоматов', description: 'Комментарий' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ example: '2025-01-20', description: 'Желаемая дата доставки' })
  @IsOptional()
  @IsDateString()
  desired_delivery_date?: string;

  @ApiProperty({
    type: [CreateRequestItemDto],
    description: 'Позиции заявки',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Заявка должна содержать хотя бы одну позицию' })
  @ValidateNested({ each: true })
  @Type(() => CreateRequestItemDto)
  items: CreateRequestItemDto[];
}
