import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateHopperTypeDto {
  @ApiProperty({
    description: 'Unique code for hopper type',
    example: 'milk_powder',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @ApiProperty({
    description: 'Name in Russian',
    example: 'Сухое молоко',
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Name in English',
    example: 'Milk Powder',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name_en?: string;

  @ApiPropertyOptional({
    description: 'Description',
    example: 'Dry milk powder for beverage preparation',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Category (dairy, tea, coffee, chocolate, etc.)',
    example: 'dairy',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({
    description: 'Requires refrigeration',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requires_refrigeration?: boolean;

  @ApiPropertyOptional({
    description: 'Shelf life in days',
    example: 365,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  shelf_life_days?: number;

  @ApiPropertyOptional({
    description: 'Typical hopper capacity in kg',
    example: 2.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  typical_capacity_kg?: number;

  @ApiPropertyOptional({
    description: 'Unit of measure',
    example: 'kg',
    default: 'kg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit_of_measure?: string;
}

export class UpdateHopperTypeDto extends PartialType(CreateHopperTypeDto) {
  // code нельзя изменить
  code?: never;
}
