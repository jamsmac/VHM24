import apiClient from './axios'
import type {
  CommissionCalculation,
  CommissionQueryParams,
  MarkPaidDto,
  CommissionStats,
  RevenueAggregation,
  CommissionDashboard,
  CommissionJobStatus,
} from '@/types/commission'

/**
 * API client for Commission Calculation management
 * Handles commission calculations, payment tracking, and reporting
 */
export const commissionsApi = {
  /**
   * Get all commission calculations with filters
   */
  getAll: async (params?: CommissionQueryParams): Promise<{
    data: CommissionCalculation[]
    total: number
    page: number
    limit: number
  }> => {
    const response = await apiClient.get<{
      data: CommissionCalculation[]
      total: number
      page: number
      limit: number
    }>('/commissions', { params })
    return response.data
  },

  /**
   * Get commission calculation by ID
   */
  getById: async (id: string): Promise<CommissionCalculation> => {
    const response = await apiClient.get<CommissionCalculation>(`/commissions/${id}`)
    return response.data
  },

  /**
   * Get commission statistics
   */
  getStats: async (): Promise<CommissionStats> => {
    const response = await apiClient.get<CommissionStats>('/commissions/stats')
    return response.data
  },

  /**
   * Get dashboard data (stats + recent calculations + overdue)
   */
  getDashboard: async (): Promise<CommissionDashboard> => {
    const response = await apiClient.get<CommissionDashboard>('/commissions/dashboard')
    return response.data
  },

  /**
   * Get pending commission calculations
   */
  getPending: async (): Promise<CommissionCalculation[]> => {
    const response = await apiClient.get<CommissionCalculation[]>('/commissions/pending')
    return response.data
  },

  /**
   * Get overdue commission calculations
   */
  getOverdue: async (): Promise<CommissionCalculation[]> => {
    const response = await apiClient.get<CommissionCalculation[]>('/commissions/overdue')
    return response.data
  },

  /**
   * Mark a commission as paid
   */
  markPaid: async (id: string, data: MarkPaidDto): Promise<CommissionCalculation> => {
    const response = await apiClient.post<CommissionCalculation>(
      `/commissions/${id}/mark-paid`,
      data,
    )
    return response.data
  },

  /**
   * Cancel a commission calculation
   */
  cancel: async (id: string, reason?: string): Promise<CommissionCalculation> => {
    const response = await apiClient.post<CommissionCalculation>(
      `/commissions/${id}/cancel`,
      { reason },
    )
    return response.data
  },

  /**
   * Recalculate a commission (admin only)
   */
  recalculate: async (id: string): Promise<CommissionCalculation> => {
    const response = await apiClient.post<CommissionCalculation>(
      `/commissions/${id}/recalculate`,
    )
    return response.data
  },

  /**
   * Get revenue aggregation for a contract
   */
  getRevenue: async (
    contractId: string,
    periodStart: string,
    periodEnd: string,
    includeBreakdown?: boolean,
  ): Promise<RevenueAggregation> => {
    const response = await apiClient.get<RevenueAggregation>('/commissions/revenue', {
      params: {
        contract_id: contractId,
        period_start: periodStart,
        period_end: periodEnd,
        include_breakdown: includeBreakdown,
      },
    })
    return response.data
  },

  /**
   * Get revenue by period for charts/analytics
   */
  getRevenueByPeriod: async (periodStart: string, periodEnd: string): Promise<Array<{
    date: string
    revenue: number
    commission: number
  }>> => {
    const response = await apiClient.get('/commissions/revenue-by-period', {
      params: {
        period_start: periodStart,
        period_end: periodEnd,
      },
    })
    return response.data
  },

  /**
   * Trigger manual commission calculation (async job)
   */
  calculateNow: async (params?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'all'
    contractId?: string
    periodStart?: string
    periodEnd?: string
  }): Promise<{
    message: string
    job_id: string
    period: string
    status: string
    note: string
  }> => {
    const response = await apiClient.post('/commissions/calculate-now', params)
    return response.data
  },

  /**
   * Get job status for async commission calculation
   */
  getJobStatus: async (jobId: string): Promise<CommissionJobStatus> => {
    const response = await apiClient.get<CommissionJobStatus>(`/commissions/jobs/${jobId}`)
    return response.data
  },

  /**
   * Export commission calculations to Excel/CSV
   */
  exportCalculations: async (params?: CommissionQueryParams): Promise<Blob> => {
    const response = await apiClient.get('/commissions/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  },

  /**
   * Get commission calculations for a specific contract
   */
  getByContract: async (contractId: string): Promise<CommissionCalculation[]> => {
    const response = await apiClient.get<CommissionCalculation[]>(
      `/commissions/by-contract/${contractId}`,
    )
    return response.data
  },

  /**
   * Get upcoming payment deadlines (next 7 days)
   */
  getUpcoming: async (): Promise<CommissionCalculation[]> => {
    const response = await apiClient.get<CommissionCalculation[]>('/commissions/upcoming')
    return response.data
  },

  /**
   * Update payment due date
   */
  updateDueDate: async (id: string, newDueDate: string): Promise<CommissionCalculation> => {
    const response = await apiClient.patch<CommissionCalculation>(
      `/commissions/${id}/due-date`,
      { payment_due_date: newDueDate },
    )
    return response.data
  },

  /**
   * Add notes to a commission calculation
   */
  addNotes: async (id: string, notes: string): Promise<CommissionCalculation> => {
    const response = await apiClient.patch<CommissionCalculation>(
      `/commissions/${id}/notes`,
      { notes },
    )
    return response.data
  },
}
