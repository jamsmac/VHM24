import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WidgetType, ChartType, TimeRange } from '../entities/dashboard-widget.entity';

export class CreateWidgetDto {
  @ApiProperty({ description: 'Widget title' })
  @IsString()
  title: string;

  @ApiProperty({ enum: WidgetType, description: 'Widget type' })
  @IsEnum(WidgetType)
  widget_type: WidgetType;

  @ApiProperty({ enum: ChartType, required: false })
  @IsEnum(ChartType)
  @IsOptional()
  chart_type?: ChartType;

  @ApiProperty({ enum: TimeRange, default: TimeRange.LAST_7_DAYS })
  @IsEnum(TimeRange)
  @IsOptional()
  time_range?: TimeRange;

  @ApiProperty({ description: 'Widget position', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiProperty({ description: 'Grid width (1-12)', default: 6 })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  width?: number;

  @ApiProperty({ description: 'Grid height', default: 4 })
  @IsInt()
  @Min(1)
  @IsOptional()
  height?: number;

  @ApiProperty({ description: 'Widget configuration', required: false })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiProperty({ description: 'Widget visibility', default: true })
  @IsBoolean()
  @IsOptional()
  is_visible?: boolean;
}
