/**
 * Contract Types (Договоры)
 * Commission contracts for Uzbekistan market
 */

import { Counterparty } from './counterparty'

export enum CommissionType {
  PERCENTAGE = 'percentage', // Процент от оборота
  FIXED = 'fixed', // Фиксированная сумма
  TIERED = 'tiered', // Ступенчатая
  HYBRID = 'hybrid', // Гибридная: фиксированная + процент
}

export enum ContractStatus {
  DRAFT = 'draft', // Черновик
  ACTIVE = 'active', // Действующий
  SUSPENDED = 'suspended', // Приостановлен
  EXPIRED = 'expired', // Истек
  TERMINATED = 'terminated', // Расторгнут
}

/**
 * Tiered Commission Tier
 * Example:
 * { from: 0, to: 10000000, rate: 10 } // 0-10M UZS: 10%
 * { from: 10000000, to: null, rate: 15 } // >10M UZS: 15%
 */
export interface TieredCommissionTier {
  from: number // Начало диапазона (UZS)
  to: number | null // Конец диапазона (null = бесконечность)
  rate: number // Ставка комиссии (%)
}

export interface Contract {
  id: string
  contract_number: string // Номер договора
  start_date: string // ISO date
  end_date: string | null // ISO date (null = бессрочный)
  status: ContractStatus

  // Counterparty relation
  counterparty_id: string
  counterparty?: Counterparty

  // Commission configuration
  commission_type: CommissionType
  commission_rate: number | null // For PERCENTAGE type
  commission_fixed_amount: number | null // For FIXED type
  commission_fixed_period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | null
  commission_tiers: TieredCommissionTier[] | null // For TIERED type
  commission_hybrid_fixed: number | null // For HYBRID type
  commission_hybrid_rate: number | null // For HYBRID type

  // Currency (always UZS for Uzbekistan)
  currency: string

  // Payment terms
  payment_term_days: number // Срок оплаты (дней)
  payment_type: 'prepayment' | 'postpayment' | 'on_delivery'

  // Additional conditions
  minimum_monthly_revenue: number | null
  penalty_rate: number | null // Ставка пени (% в день)
  special_conditions: string | null
  notes: string | null

  // File attachment
  contract_file_id: string | null

  // Timestamps
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateContractDto {
  contract_number: string
  start_date: string // ISO date string
  end_date?: string | null
  status?: ContractStatus
  counterparty_id: string
  commission_type: CommissionType
  commission_rate?: number | null
  commission_fixed_amount?: number | null
  commission_fixed_period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | null
  commission_tiers?: TieredCommissionTier[] | null
  commission_hybrid_fixed?: number | null
  commission_hybrid_rate?: number | null
  currency?: string
  payment_term_days?: number
  payment_type?: 'prepayment' | 'postpayment' | 'on_delivery'
  minimum_monthly_revenue?: number | null
  penalty_rate?: number | null
  special_conditions?: string | null
  notes?: string | null
  contract_file_id?: string | null
}

export type UpdateContractDto = Partial<CreateContractDto>

export interface ContractListParams {
  status?: ContractStatus
  counterparty_id?: string
  commission_type?: CommissionType
  page?: number
  limit?: number
}

export interface ContractStats {
  total_contracts: number
  by_status: Record<ContractStatus, number>
  active_count: number
  expiring_soon_count: number // Contracts expiring within 30 days
}

/**
 * Commission calculation preview for a contract
 */
export interface CommissionPreview {
  commission_type: CommissionType
  estimated_revenue: number
  estimated_commission: number
  calculation_details: Record<string, any>
}
