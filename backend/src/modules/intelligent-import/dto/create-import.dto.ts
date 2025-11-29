import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { DomainType } from '../interfaces/common.interface';

export class CreateImportDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File to import (XLSX, CSV, JSON, XML)',
  })
  file: Express.Multer.File;

  @ApiProperty({
    enum: DomainType,
    required: false,
    description: 'Override domain detection (optional)',
  })
  @IsOptional()
  @IsEnum(DomainType)
  domain?: DomainType;
}
