import {
  IsArray,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsUUID,
  ArrayMinSize,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReconciliationSource } from '../entities/reconciliation-run.entity';

/**
 * DTO для создания прогона сверки.
 */
export class CreateReconciliationRunDto {
  @ApiProperty({ example: '2025-01-01', description: 'Начало периода' })
  @IsDateString()
  date_from: string;

  @ApiProperty({ example: '2025-01-31', description: 'Конец периода' })
  @IsDateString()
  date_to: string;

  @ApiProperty({
    enum: ReconciliationSource,
    isArray: true,
    example: [
      ReconciliationSource.HW,
      ReconciliationSource.SALES_REPORT,
      ReconciliationSource.FISCAL,
    ],
    description: 'Источники данных для сверки',
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'Нужно выбрать минимум 2 источника для сверки' })
  @IsEnum(ReconciliationSource, { each: true })
  sources: ReconciliationSource[];

  @ApiPropertyOptional({
    type: [String],
    description: 'ID автоматов для сверки (если пусто - все)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  machine_ids?: string[];

  @ApiPropertyOptional({
    example: 5,
    default: 5,
    description: 'Допустимое отклонение по времени (секунды)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  time_tolerance?: number;

  @ApiPropertyOptional({
    example: 100,
    default: 100,
    description: 'Допустимое отклонение по сумме (сум)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  amount_tolerance?: number;
}
