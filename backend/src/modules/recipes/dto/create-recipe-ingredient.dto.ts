import { IsUUID, IsNumber, IsString, Min, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecipeIngredientDto {
  @ApiProperty({ example: 'uuid', description: 'ID ингредиента из nomenclature' })
  @IsUUID()
  ingredient_id: string;

  @ApiProperty({ example: 15.5, description: 'Количество ингредиента' })
  @IsNumber()
  @Min(0.001, { message: 'Количество должно быть больше 0' })
  quantity: number;

  @ApiProperty({ example: 'g', description: 'Код из справочника units_of_measure' })
  @IsString()
  unit_of_measure_code: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  sort_order?: number;
}
