import { IsString, IsBoolean, IsOptional, IsInt, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDictionaryDto {
  @ApiProperty({ example: 'machine_types' })
  @IsString()
  @MinLength(1, { message: 'Код обязателен' })
  code: string;

  @ApiProperty({ example: 'Типы аппаратов' })
  @IsString()
  @MinLength(1, { message: 'Название обязательно' })
  name_ru: string;

  @ApiPropertyOptional({ example: 'Machine Types' })
  @IsOptional()
  @IsString()
  name_en?: string;

  @ApiPropertyOptional({ example: 'Справочник типов вендинговых автоматов' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_system?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  sort_order?: number;
}
