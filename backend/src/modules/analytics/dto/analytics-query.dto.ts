import { IsString, IsOptional, IsDateString, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MetricType {
  REVENUE = 'revenue',
  TRANSACTIONS = 'transactions',
  UNITS_SOLD = 'units_sold',
  AVERAGE_TRANSACTION = 'average_transaction',
  UPTIME = 'uptime',
  DOWNTIME = 'downtime',
  AVAILABILITY = 'availability',
  PROFIT_MARGIN = 'profit_margin',
}

export enum GroupByType {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  MACHINE = 'machine',
  LOCATION = 'location',
  PRODUCT = 'product',
}

export class AnalyticsQueryDto {
  @ApiProperty({ description: 'Start date', required: false })
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiProperty({ description: 'End date', required: false })
  @IsDateString()
  @IsOptional()
  end_date?: string;

  @ApiProperty({ description: 'Machine IDs', required: false, type: [String] })
  @IsArray()
  @IsOptional()
  machine_ids?: string[];

  @ApiProperty({ description: 'Location IDs', required: false, type: [String] })
  @IsArray()
  @IsOptional()
  location_ids?: string[];

  @ApiProperty({ description: 'Product IDs', required: false, type: [String] })
  @IsArray()
  @IsOptional()
  product_ids?: string[];

  @ApiProperty({ enum: MetricType, isArray: true, required: false })
  @IsArray()
  @IsOptional()
  metrics?: MetricType[];

  @ApiProperty({ enum: GroupByType, required: false })
  @IsEnum(GroupByType)
  @IsOptional()
  group_by?: GroupByType;
}
