import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType, ReportFormat, ScheduleFrequency } from '../entities/custom-report.entity';

export class CreateReportDto {
  @ApiProperty({ description: 'Report name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Report description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  report_type: ReportType;

  @ApiProperty({ enum: ReportFormat, default: ReportFormat.PDF })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @ApiProperty({ description: 'Report configuration' })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ description: 'Schedule report', default: false })
  @IsBoolean()
  @IsOptional()
  is_scheduled?: boolean;

  @ApiProperty({ enum: ScheduleFrequency, required: false })
  @IsEnum(ScheduleFrequency)
  @IsOptional()
  schedule_frequency?: ScheduleFrequency;

  @ApiProperty({ description: 'Schedule time (HH:mm)', required: false })
  @IsString()
  @IsOptional()
  schedule_time?: string;

  @ApiProperty({ description: 'Schedule days for weekly reports', required: false })
  @IsArray()
  @IsOptional()
  schedule_days?: string[];

  @ApiProperty({ description: 'Email recipients', required: false, type: [String] })
  @IsArray()
  @IsOptional()
  recipients?: string[];
}
