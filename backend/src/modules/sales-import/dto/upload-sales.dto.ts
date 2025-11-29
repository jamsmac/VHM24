import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ImportFileType } from '../entities/sales-import.entity';

export class UploadSalesDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Excel or CSV file',
  })
  file: Express.Multer.File;

  @ApiProperty({
    enum: ImportFileType,
    example: ImportFileType.EXCEL,
    required: false,
  })
  @IsEnum(ImportFileType)
  @IsOptional()
  file_type?: ImportFileType;
}

export class SalesRowDto {
  @ApiProperty({ example: '2025-11-14' })
  @IsDateString()
  sale_date: string;

  @ApiProperty({ example: 'M-001' })
  machine_number: string;

  @ApiProperty({ example: 150.5 })
  amount: number;

  @ApiProperty({ example: 'cash', required: false })
  @IsOptional()
  payment_method?: string;

  @ApiProperty({ example: 'Espresso', required: false })
  @IsOptional()
  product_name?: string;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  quantity?: number;
}

export class ImportMappingDto {
  @ApiProperty({
    example: { date: 'Дата', machine: 'Аппарат', amount: 'Сумма' },
    description: 'Column name mapping from file to system fields',
  })
  mapping: Record<string, string>;
}
