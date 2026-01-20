import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  IsObject,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntryOrigin, EntryStatus } from '../entities/directory-entry.entity';

/**
 * DTO for creating a new directory entry
 */
export class CreateEntryDto {
  @ApiProperty({ example: 'PROD-001', description: 'Unique code within directory' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  code: string;

  @ApiProperty({ example: 'Кофе Американо', description: 'Russian display name' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  name_ru: string;

  @ApiPropertyOptional({ example: 'Americano Coffee', description: 'English display name' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name_en?: string;

  @ApiPropertyOptional({ description: 'Parent entry ID for hierarchical directories' })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiPropertyOptional({ enum: EntryOrigin, default: EntryOrigin.LOCAL })
  @IsOptional()
  @IsEnum(EntryOrigin)
  origin?: EntryOrigin;

  @ApiPropertyOptional({ description: 'External ID from source system' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  external_id?: string;

  @ApiPropertyOptional({ enum: EntryStatus, default: EntryStatus.ACTIVE })
  @IsOptional()
  @IsEnum(EntryStatus)
  status?: EntryStatus;

  @ApiPropertyOptional({ description: 'Tags for filtering and categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ description: 'Field values as key-value pairs' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Entry validity start date' })
  @IsOptional()
  @IsDateString()
  valid_from?: string;

  @ApiPropertyOptional({ description: 'Entry validity end date' })
  @IsOptional()
  @IsDateString()
  valid_to?: string;
}
