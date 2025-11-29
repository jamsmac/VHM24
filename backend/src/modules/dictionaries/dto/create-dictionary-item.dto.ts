import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsObject,
  MinLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDictionaryItemDto {
  @ApiProperty({ example: 'coffee_machine' })
  @IsString()
  @MinLength(1, { message: 'Код обязателен' })
  code: string;

  @ApiProperty({ example: 'Кофейный автомат' })
  @IsString()
  @MinLength(1, { message: 'Значение обязательно' })
  value_ru: string;

  @ApiPropertyOptional({ example: 'Coffee Machine' })
  @IsOptional()
  @IsString()
  value_en?: string;

  @ApiPropertyOptional({ example: 'Автомат для приготовления кофе' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  sort_order?: number;

  @ApiPropertyOptional({ example: { color: '#FF0000', icon: 'coffee' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
