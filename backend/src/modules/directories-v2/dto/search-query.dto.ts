import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EntryStatus, EntryOrigin } from '../entities/directory-entry.entity';

/**
 * DTO for searching directory entries
 */
export class SearchQueryDto {
  @ApiPropertyOptional({ description: 'Search query string (min 2 characters for search)' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: EntryStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(EntryStatus)
  status?: EntryStatus;

  @ApiPropertyOptional({ enum: EntryOrigin, description: 'Filter by origin' })
  @IsOptional()
  @IsEnum(EntryOrigin)
  origin?: EntryOrigin;

  @ApiPropertyOptional({ description: 'Filter by parent entry ID' })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiPropertyOptional({ description: 'Filter by tags (comma-separated)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  tags?: string[];

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Include recent selections in response' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  include_recent?: boolean = false;

  @ApiPropertyOptional({ description: 'Sort field (prefix with - for DESC)', default: 'name_ru' })
  @IsOptional()
  @IsString()
  sort?: string = 'name_ru';

  @ApiPropertyOptional({ description: 'Include only root entries (parent_id IS NULL)' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  roots_only?: boolean = false;
}
