import {
  IsUUID,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  MinLength,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateRecipeIngredientDto } from './create-recipe-ingredient.dto';
import { IsDictionaryCode } from '@/common/validators';

export class CreateRecipeDto {
  @ApiProperty({ example: 'uuid', description: 'ID напитка из nomenclature' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ example: 'Капучино классический' })
  @IsString()
  @MinLength(2, { message: 'Название должно содержать минимум 2 символа' })
  name: string;

  @ApiProperty({ example: 'primary', description: 'Код из справочника recipe_types' })
  @IsString()
  @IsDictionaryCode('recipe_types')
  type_code: string;

  @ApiPropertyOptional({ example: 'Классический рецепт капучино' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 45, description: 'Время приготовления в секундах' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  preparation_time_seconds?: number;

  @ApiPropertyOptional({ example: 90, description: 'Температура в градусах Цельсия' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  temperature_celsius?: number;

  @ApiPropertyOptional({ example: 200, default: 1, description: 'Объем порции (мл)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  serving_size_ml?: number;

  @ApiPropertyOptional({
    example: { pressure: 9, speed: 'medium' },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiProperty({
    type: [CreateRecipeIngredientDto],
    description: 'Список ингредиентов',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients: CreateRecipeIngredientDto[];
}
