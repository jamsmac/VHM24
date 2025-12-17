import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlertStatus } from '../entities/alert-history.entity';

/**
 * Acknowledge Alert DTO
 */
export class AcknowledgeAlertDto {
  @ApiPropertyOptional({
    example: 'Will address this tomorrow morning',
    description: 'Optional note when acknowledging',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/**
 * Resolve Alert DTO
 */
export class ResolveAlertDto {
  @ApiPropertyOptional({
    example: 'Refill task completed, stock is now at 95%',
    description: 'Resolution note',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/**
 * Filter Alert History DTO
 */
export class FilterAlertHistoryDto {
  @ApiPropertyOptional({ enum: AlertStatus })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @ApiPropertyOptional({ description: 'Filter by alert rule ID' })
  @IsOptional()
  @IsUUID()
  alert_rule_id?: string;

  @ApiPropertyOptional({ description: 'Filter by machine ID' })
  @IsOptional()
  @IsUUID()
  machine_id?: string;

  @ApiPropertyOptional({ description: 'Filter by location ID' })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiPropertyOptional({ description: 'Filter by severity' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ description: 'Date from (ISO string)' })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Date to (ISO string)' })
  @IsOptional()
  @IsString()
  date_to?: string;
}
