import apiClient from './axios'
import type {
  Counterparty,
  CreateCounterpartyDto,
  UpdateCounterpartyDto,
  CounterpartyListParams,
  CounterpartyStats,
} from '@/types/counterparty'

/**
 * API client for Counterparty management
 * Handles all counterparty-related operations
 */
export const counterpartiesApi = {
  /**
   * Get all counterparties with optional filters
   */
  getAll: async (params?: CounterpartyListParams): Promise<Counterparty[]> => {
    const response = await apiClient.get<Counterparty[]>('/counterparties', { params })
    return response.data
  },

  /**
   * Get counterparty by ID
   */
  getById: async (id: string): Promise<Counterparty> => {
    const response = await apiClient.get<Counterparty>(`/counterparties/${id}`)
    return response.data
  },

  /**
   * Create new counterparty
   */
  create: async (data: CreateCounterpartyDto): Promise<Counterparty> => {
    const response = await apiClient.post<Counterparty>('/counterparties', data)
    return response.data
  },

  /**
   * Update counterparty
   */
  update: async (id: string, data: UpdateCounterpartyDto): Promise<Counterparty> => {
    const response = await apiClient.patch<Counterparty>(`/counterparties/${id}`, data)
    return response.data
  },

  /**
   * Soft delete counterparty
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/counterparties/${id}`)
  },

  /**
   * Restore soft-deleted counterparty
   */
  restore: async (id: string): Promise<Counterparty> => {
    const response = await apiClient.post<Counterparty>(`/counterparties/${id}/restore`)
    return response.data
  },

  /**
   * Get counterparty statistics
   */
  getStats: async (): Promise<CounterpartyStats> => {
    const response = await apiClient.get<CounterpartyStats>('/counterparties/stats')
    return response.data
  },

  /**
   * Get contracts for a specific counterparty
   */
  getContracts: async (id: string) => {
    const response = await apiClient.get(`/counterparties/${id}/contracts`)
    return response.data
  },

  /**
   * Get locations owned by a counterparty
   */
  getLocations: async (id: string) => {
    const response = await apiClient.get(`/counterparties/${id}/locations`)
    return response.data
  },

  /**
   * Validate INN (9 digits for Uzbekistan)
   */
  validateINN: (inn: string): boolean => {
    return /^[0-9]{9}$/.test(inn)
  },

  /**
   * Validate MFO (5 digits for Uzbekistan)
   */
  validateMFO: (mfo: string): boolean => {
    return /^[0-9]{5}$/.test(mfo)
  },
}
