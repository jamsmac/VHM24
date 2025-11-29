import apiClient from './axios'

// Sales Report Types
export interface SalesReportData {
  total_sales: number
  total_transactions: number
  average_transaction: number
  growth_percentage: number
  daily_data: Array<{
    date: string
    sales: number
    transactions: number
  }>
  top_products: Array<{
    product_name: string
    quantity: number
    revenue: number
  }>
  top_machines: Array<{
    machine_number: string
    revenue: number
    transactions: number
  }>
}

// Inventory Report Types
export interface InventoryReportData {
  total_products: number
  warehouse_total: number
  operators_total: number
  machines_total: number
  low_stock_items: Array<{
    product_name: string
    warehouse: number
    operators: number
    machines: number
    low_stock_machines_count: number
  }>
  inventory_by_product: Array<{
    product_name: string
    sku: string
    warehouse: number
    operators: number
    machines: number
    total: number
  }>
}

// Tasks Report Types
export interface TasksReportData {
  total_completed: number
  total_pending: number
  total_overdue: number
  average_completion_time: number
  operator_performance: Array<{
    operator_name: string
    completed: number
    pending: number
    overdue: number
    average_time: number
  }>
  tasks_by_type: Array<{
    type: string
    completed: number
    pending: number
    overdue: number
  }>
}

// Financial Report Types
export interface FinancialReportData {
  total_revenue: number
  total_expenses: number
  total_profit: number
  profit_margin: number
  revenue_growth: number
  expense_growth: number
  profit_growth: number
  monthly_data: Array<{
    month: string
    revenue: number
    expenses: number
    profit: number
  }>
  revenue_by_category: Array<{
    category: string
    amount: number
    percentage: number
  }>
  expenses_by_category: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

export const reportsApi = {
  // Sales Report
  getSalesReport: async (params?: {
    date_from?: string
    date_to?: string
  }): Promise<SalesReportData> => {
    const response = await apiClient.get<SalesReportData>('/reports/sales', { params })
    return response.data
  },

  exportSalesReport: async (params?: {
    date_from?: string
    date_to?: string
    format?: 'csv' | 'xlsx' | 'pdf'
  }): Promise<Blob> => {
    const response = await apiClient.get('/reports/sales/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  },

  // Inventory Report
  getInventoryReport: async (): Promise<InventoryReportData> => {
    const response = await apiClient.get<InventoryReportData>('/reports/inventory')
    return response.data
  },

  exportInventoryReport: async (format?: 'csv' | 'xlsx' | 'pdf'): Promise<Blob> => {
    const response = await apiClient.get('/reports/inventory/export', {
      params: { format },
      responseType: 'blob',
    })
    return response.data
  },

  // Tasks Report
  getTasksReport: async (params?: {
    date_from?: string
    date_to?: string
    user_id?: string
  }): Promise<TasksReportData> => {
    const response = await apiClient.get<TasksReportData>('/reports/tasks', { params })
    return response.data
  },

  exportTasksReport: async (params?: {
    date_from?: string
    date_to?: string
    format?: 'csv' | 'xlsx' | 'pdf'
  }): Promise<Blob> => {
    const response = await apiClient.get('/reports/tasks/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  },

  // Financial Report
  getFinancialReport: async (params?: {
    date_from?: string
    date_to?: string
  }): Promise<FinancialReportData> => {
    const response = await apiClient.get<FinancialReportData>('/reports/financial', { params })
    return response.data
  },

  exportFinancialReport: async (params?: {
    date_from?: string
    date_to?: string
    format?: 'csv' | 'xlsx' | 'pdf'
  }): Promise<Blob> => {
    const response = await apiClient.get('/reports/financial/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  },
}
