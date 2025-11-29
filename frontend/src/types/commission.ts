/**
 * Commission Calculation Types (Расчеты комиссий)
 * History and tracking of commission calculations
 */

import { Contract } from './contract'

export enum PaymentStatus {
  PENDING = 'pending', // Ожидает оплаты
  PAID = 'paid', // Оплачено
  OVERDUE = 'overdue', // Просрочено
  CANCELLED = 'cancelled', // Отменено
}

export interface CommissionCalculation {
  id: string
  contract_id: string
  contract?: Contract

  // Calculation period
  period_start: string // ISO date
  period_end: string // ISO date

  // Revenue data (in UZS)
  total_revenue: number // Общий оборот за период
  transaction_count: number // Количество транзакций

  // Commission calculation
  commission_amount: number // Рассчитанная комиссия (UZS)
  commission_type: string // Тип комиссии на момент расчета
  calculation_details: Record<string, any> | null // Детали расчета (JSON)

  // Payment status
  payment_status: PaymentStatus
  payment_due_date: string | null // ISO date
  payment_date: string | null // ISO date
  payment_transaction_id: string | null

  // Additional info
  notes: string | null
  calculated_by_user_id: string | null

  // Timestamps
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CommissionQueryParams {
  payment_status?: PaymentStatus
  contract_id?: string
  period_start_from?: string // ISO date
  period_start_to?: string // ISO date
  page?: number
  limit?: number
}

export interface MarkPaidDto {
  payment_date: string // ISO date
  payment_transaction_id?: string
  notes?: string
}

export interface CommissionStats {
  total_calculations: number
  by_status: Record<PaymentStatus, number>
  total_pending_amount: number // UZS
  total_overdue_amount: number // UZS
  total_paid_amount: number // UZS
  overdue_count: number
  // Additional properties for dashboard
  pending_count: number
  pending_amount: number
  paid_count: number
  paid_amount: number
  overdue_amount: number
  total_revenue: number
  total_commission: number
}

/**
 * Revenue aggregation for a contract
 */
export interface RevenueAggregation {
  total_revenue: number
  transaction_count: number
  average_transaction: number
  period_start: string // ISO date
  period_end: string // ISO date
  breakdown?: {
    by_date?: Array<{
      date: string
      revenue: number
    }>
    by_machine?: Array<{
      machine_id: string
      machine_number: string
      revenue: number
    }>
  }
}

/**
 * Dashboard data for commissions
 */
export interface CommissionDashboard {
  stats: CommissionStats
  recent_calculations: CommissionCalculation[]
  overdue_payments: CommissionCalculation[]
  upcoming_payments: CommissionCalculation[] // Due within 7 days
  revenue_by_contract: Array<{
    contract_id: string
    contract_number: string
    total_revenue: number
    total_commission: number
    last_calculation_date: string
  }>
}

/**
 * Job status for async commission calculations
 */
export interface CommissionJobStatus {
  job_id: string
  state: 'waiting' | 'active' | 'completed' | 'failed'
  result?: {
    processed: number
  }
  failed_reason?: string
  created_at: string
  finished_on: string | null
}
