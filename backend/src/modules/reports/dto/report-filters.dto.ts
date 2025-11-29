import { IsOptional, IsDateString, IsUUID, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ReportFormat {
  JSON = 'json',
  XLSX = 'xlsx',
  PDF = 'pdf',
}

export class ReportFiltersDto {
  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Дата начала периода (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    example: '2025-01-31',
    description: 'Дата окончания периода (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    example: 'uuid',
    description: 'UUID аппарата (для отчета по конкретному аппарату)',
  })
  @IsOptional()
  @IsUUID()
  machine_id?: string;

  @ApiPropertyOptional({
    example: 'uuid',
    description: 'UUID локации (для отчета по локации)',
  })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiPropertyOptional({
    enum: ReportFormat,
    default: ReportFormat.JSON,
    description: 'Формат экспорта отчета',
  })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @ApiPropertyOptional({
    example: 90,
    default: 90,
    description: 'Количество дней вперед для отслеживания сроков годности',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  days_ahead?: number;
}
