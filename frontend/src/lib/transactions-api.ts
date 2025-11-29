import apiClient from './axios'
import type { Transaction, TransactionStats, TransactionType } from '@/types/transactions'

export const transactionsApi = {
  getAll: async (params?: {
    transactionType?: TransactionType
    machineId?: string
    userId?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<Transaction[]> => {
    const response = await apiClient.get<Transaction[]>('/transactions', { params })
    return response.data
  },

  getById: async (id: string): Promise<Transaction> => {
    const response = await apiClient.get<Transaction>(`/transactions/${id}`)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`)
  },

  getStats: async (dateFrom?: string, dateTo?: string): Promise<TransactionStats> => {
    const response = await apiClient.get<TransactionStats>('/transactions/stats', {
      params: { dateFrom, dateTo },
    })
    return response.data
  },

  getDailyRevenue: async (dateFrom: string, dateTo: string) => {
    const response = await apiClient.get('/transactions/daily-revenue', {
      params: { dateFrom, dateTo },
    })
    return response.data
  },

  getTopRecipes: async (limit: number = 10, dateFrom?: string, dateTo?: string) => {
    const response = await apiClient.get('/transactions/top-recipes', {
      params: { limit, dateFrom, dateTo },
    })
    return response.data
  },

  getMachineStats: async (dateFrom?: string, dateTo?: string) => {
    const response = await apiClient.get('/transactions/machine-stats', {
      params: { dateFrom, dateTo },
    })
    return response.data
  },
}
