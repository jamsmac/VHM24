import apiClient from './axios'

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

export interface AnalyticsQuery {
  start_date?: string
  end_date?: string
  machine_ids?: string[]
  location_ids?: string[]
  product_ids?: string[]
  metrics?: MetricType[]
  group_by?: GroupByType
}

export interface MetricResult {
  metric: MetricType
  value: number
  previous_value?: number
  change_percent?: number
  data?: Array<{
    date?: string
    group?: string
    value: number
  }>
}

export interface TopMachine {
  machine_id: string
  machine_number: string
  machine_name: string
  location_name: string
  revenue: number
  transaction_count: number
  units_sold: number
}

export interface TopProduct {
  product_id: string
  product_name: string
  units_sold: number
  revenue: number
  profit: number
}

export interface MachineStatusSummary {
  total: number
  active: number
  offline: number
  error: number
  maintenance: number
  low_stock: number
}

export const analyticsApi = {
  /**
   * Get analytics metrics with filters
   */
  async getMetrics(query: AnalyticsQuery): Promise<MetricResult[]> {
    const response = await apiClient.get('/analytics/metrics', { params: query })
    return response.data
  },

  /**
   * Get top performing machines
   */
  async getTopMachines(limit?: number, days?: number): Promise<TopMachine[]> {
    const response = await apiClient.get('/analytics/top-machines', {
      params: { limit, days },
    })
    return response.data
  },

  /**
   * Get top selling products
   */
  async getTopProducts(limit?: number, days?: number): Promise<TopProduct[]> {
    const response = await apiClient.get('/analytics/top-products', {
      params: { limit, days },
    })
    return response.data
  },

  /**
   * Get machine status summary
   */
  async getMachineStatus(): Promise<MachineStatusSummary> {
    const response = await apiClient.get('/analytics/machine-status')
    return response.data
  },

  /**
   * Get user dashboard widgets
   */
  async getWidgets(): Promise<any[]> {
    const response = await apiClient.get('/analytics/dashboard/widgets')
    return response.data
  },

  /**
   * Create dashboard widget
   */
  async createWidget(widget: any): Promise<any> {
    const response = await apiClient.post('/analytics/dashboard/widgets', widget)
    return response.data
  },

  /**
   * Update dashboard widget
   */
  async updateWidget(id: string, widget: any): Promise<any> {
    const response = await apiClient.put(`/analytics/dashboard/widgets/${id}`, widget)
    return response.data
  },

  /**
   * Delete dashboard widget
   */
  async deleteWidget(id: string): Promise<void> {
    await apiClient.delete(`/analytics/dashboard/widgets/${id}`)
  },

  /**
   * Reorder dashboard widgets
   */
  async reorderWidgets(widgetIds: string[]): Promise<void> {
    await apiClient.post('/analytics/dashboard/widgets/reorder', { widgetIds })
  },
}
