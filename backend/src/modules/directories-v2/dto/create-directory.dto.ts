import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DirectoryType, DirectoryScope } from '../entities/directory.entity';
import { DirectoryFieldType } from '../entities/directory-field.entity';

/**
 * DTO for creating a field within a directory
 */
export class CreateFieldDto {
  @ApiProperty({ example: 'product_code', description: 'Field code (snake_case)' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z_][a-z0-9_]*$/, {
    message: 'Field code must be lowercase with underscores',
  })
  code: string;

  @ApiProperty({ example: 'Код товара', description: 'Russian field label' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name_ru: string;

  @ApiPropertyOptional({ example: 'Product Code', description: 'English field label' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name_en?: string;

  @ApiPropertyOptional({ description: 'Help text / description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DirectoryFieldType, example: DirectoryFieldType.TEXT })
  @IsEnum(DirectoryFieldType)
  field_type: DirectoryFieldType;

  @ApiPropertyOptional({ description: 'Reference directory ID for REFERENCE type fields' })
  @IsOptional()
  @IsUUID()
  reference_directory_id?: string;

  @ApiPropertyOptional({ description: 'Allow free text input for SELECT fields' })
  @IsOptional()
  @IsBoolean()
  allow_free_text?: boolean;

  @ApiPropertyOptional({ description: 'Field is required' })
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @ApiPropertyOptional({ description: 'Field must be unique across entries' })
  @IsOptional()
  @IsBoolean()
  is_unique?: boolean;

  @ApiPropertyOptional({ description: 'Include in full-text search' })
  @IsOptional()
  @IsBoolean()
  is_searchable?: boolean;

  @ApiPropertyOptional({ description: 'Show in table/list view' })
  @IsOptional()
  @IsBoolean()
  show_in_table?: boolean;

  @ApiPropertyOptional({ description: 'Show in card/detail view' })
  @IsOptional()
  @IsBoolean()
  show_in_card?: boolean;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  sort_order?: number;

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  default_value?: any;

  @ApiPropertyOptional({ description: 'Validation rules' })
  @IsOptional()
  validation?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Options for SELECT/MULTISELECT fields' })
  @IsOptional()
  @IsArray()
  options?: Array<{
    value: string;
    label_ru: string;
    label_en?: string;
    color?: string;
    icon?: string;
    isDefault?: boolean;
    sortOrder?: number;
  }>;
}

/**
 * DTO for directory settings
 */
export class DirectorySettingsDto {
  @ApiPropertyOptional({ description: 'Allow inline creation from select dropdowns' })
  @IsOptional()
  @IsBoolean()
  allow_inline_create?: boolean;

  @ApiPropertyOptional({ description: 'Allow local overlay for external entries' })
  @IsOptional()
  @IsBoolean()
  allow_local_overlay?: boolean;

  @ApiPropertyOptional({ description: 'Require approval for new entries' })
  @IsOptional()
  @IsBoolean()
  requires_approval?: boolean;

  @ApiPropertyOptional({ description: 'Enable prefetch for dropdown caching' })
  @IsOptional()
  @IsBoolean()
  prefetch?: boolean;

  @ApiPropertyOptional({ description: 'Enable offline mode support' })
  @IsOptional()
  @IsBoolean()
  offline_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Max entries for offline cache' })
  @IsOptional()
  offline_max_entries?: number;
}

/**
 * DTO for creating a new directory
 */
export class CreateDirectoryDto {
  @ApiProperty({ example: 'products', description: 'Unique slug (lowercase, underscores)' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Slug must be lowercase letters, numbers, and underscores',
  })
  slug: string;

  @ApiProperty({ example: 'Товары', description: 'Russian display name' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name_ru: string;

  @ApiPropertyOptional({ example: 'Products', description: 'English display name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name_en?: string;

  @ApiPropertyOptional({ description: 'Description of the directory' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: DirectoryType, example: DirectoryType.INTERNAL })
  @IsEnum(DirectoryType)
  type: DirectoryType;

  @ApiPropertyOptional({ enum: DirectoryScope, example: DirectoryScope.GLOBAL })
  @IsOptional()
  @IsEnum(DirectoryScope)
  scope?: DirectoryScope;

  @ApiPropertyOptional({ description: 'Organization ID for scoped directories' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiPropertyOptional({ description: 'Enable hierarchical entries' })
  @IsOptional()
  @IsBoolean()
  is_hierarchical?: boolean;

  @ApiPropertyOptional({ description: 'Icon identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ type: DirectorySettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DirectorySettingsDto)
  settings?: DirectorySettingsDto;

  @ApiPropertyOptional({ type: [CreateFieldDto], description: 'Fields to create with the directory' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFieldDto)
  fields?: CreateFieldDto[];
}
