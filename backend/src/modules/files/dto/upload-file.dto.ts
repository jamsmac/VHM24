import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDictionaryCode } from '@/common/validators';

/**
 * DTO for file upload metadata
 * Note: The actual file is handled by @UploadedFile() decorator with FileInterceptor,
 * not through this DTO. This DTO only contains the metadata fields.
 */
export class UploadFileDto {
  @ApiProperty({ example: 'task', description: 'Тип сущности (task, machine, etc.)' })
  @IsString()
  entity_type: string;

  @ApiProperty({ example: 'uuid', description: 'ID сущности' })
  @IsString()
  entity_id: string;

  @ApiProperty({ example: 'task_photo_before', description: 'Категория файла из справочника' })
  @IsString()
  @IsDictionaryCode('file_categories')
  category_code: string;

  @ApiPropertyOptional({ example: 'Фото аппарата перед пополнением' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['popolnenie', 'coffee-machine'] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

/**
 * Swagger schema for file upload endpoint
 * Used only for API documentation purposes
 */
export class UploadFileSwaggerDto extends UploadFileDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'File to upload' })
  file: Express.Multer.File;
}
