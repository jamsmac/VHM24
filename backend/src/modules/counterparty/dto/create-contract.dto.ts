import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsInt,
  IsDateString,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommissionType, ContractStatus, TieredCommissionTier } from '../entities/contract.entity';

/**
 * Tiered Commission Tier DTO for validation
 */
export class TieredCommissionTierDto implements TieredCommissionTier {
  @IsNumber()
  @Min(0)
  from: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  to: number | null;

  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;
}

/**
 * DTO for creating a new contract
 */
export class CreateContractDto {
  // Basic information
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  contract_number: string; // Номер договора

  @IsDateString()
  start_date: string; // Дата начала (ISO format)

  @IsOptional()
  @IsDateString()
  end_date?: string | null; // Дата окончания (ISO format, null = бессрочный)

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus; // Статус договора

  // Counterparty relation
  @IsUUID()
  counterparty_id: string; // ID контрагента

  // Commission configuration
  @IsEnum(CommissionType)
  commission_type: CommissionType; // Тип комиссии

  // For PERCENTAGE type
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commission_rate?: number | null; // Процент комиссии

  // For FIXED type
  @IsOptional()
  @IsNumber()
  @Min(0)
  commission_fixed_amount?: number | null; // Фиксированная сумма (UZS)

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'quarterly'])
  commission_fixed_period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | null;

  // For TIERED type
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TieredCommissionTierDto)
  commission_tiers?: TieredCommissionTier[] | null;

  // For HYBRID type
  @IsOptional()
  @IsNumber()
  @Min(0)
  commission_hybrid_fixed?: number | null; // Фиксированная часть (UZS)

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commission_hybrid_rate?: number | null; // Процентная часть (%)

  // Currency (always UZS)
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string; // Валюта (по умолчанию UZS)

  // Payment terms
  @IsOptional()
  @IsInt()
  @Min(1)
  payment_term_days?: number; // Срок оплаты (дней)

  @IsOptional()
  @IsEnum(['prepayment', 'postpayment', 'on_delivery'])
  payment_type?: 'prepayment' | 'postpayment' | 'on_delivery';

  // Additional conditions
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_monthly_revenue?: number | null; // Минимальный месячный оборот (UZS)

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  penalty_rate?: number | null; // Ставка пени (% в день)

  @IsOptional()
  @IsString()
  special_conditions?: string | null; // Особые условия

  @IsOptional()
  @IsString()
  notes?: string | null; // Примечания

  @IsOptional()
  @IsUUID()
  contract_file_id?: string | null; // ID файла договора
}
