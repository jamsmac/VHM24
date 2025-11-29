import apiClient from './axios'
import type {
  Contract,
  CreateContractDto,
  UpdateContractDto,
  ContractListParams,
  ContractStats,
  CommissionPreview,
} from '@/types/contract'

/**
 * API client for Contract management
 * Handles all contract-related operations including commission calculations
 */
export const contractsApi = {
  /**
   * Get all contracts with optional filters
   */
  getAll: async (params?: ContractListParams): Promise<Contract[]> => {
    const response = await apiClient.get<Contract[]>('/contracts', { params })
    return response.data
  },

  /**
   * Get contract by ID
   */
  getById: async (id: string): Promise<Contract> => {
    const response = await apiClient.get<Contract>(`/contracts/${id}`)
    return response.data
  },

  /**
   * Create new contract
   */
  create: async (data: CreateContractDto): Promise<Contract> => {
    const response = await apiClient.post<Contract>('/contracts', data)
    return response.data
  },

  /**
   * Update contract
   */
  update: async (id: string, data: UpdateContractDto): Promise<Contract> => {
    const response = await apiClient.patch<Contract>(`/contracts/${id}`, data)
    return response.data
  },

  /**
   * Soft delete contract
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/contracts/${id}`)
  },

  /**
   * Restore soft-deleted contract
   */
  restore: async (id: string): Promise<Contract> => {
    const response = await apiClient.post<Contract>(`/contracts/${id}/restore`)
    return response.data
  },

  /**
   * Get contract statistics
   */
  getStats: async (): Promise<ContractStats> => {
    const response = await apiClient.get<ContractStats>('/contracts/stats')
    return response.data
  },

  /**
   * Get all commission calculations for a contract
   */
  getCommissionCalculations: async (id: string) => {
    const response = await apiClient.get(`/contracts/${id}/commission-calculations`)
    return response.data
  },

  /**
   * Get machines linked to this contract
   */
  getMachines: async (id: string) => {
    const response = await apiClient.get(`/contracts/${id}/machines`)
    return response.data
  },

  /**
   * Link a machine to a contract
   */
  linkMachine: async (contractId: string, machineId: string): Promise<void> => {
    await apiClient.post(`/contracts/${contractId}/machines/${machineId}`)
  },

  /**
   * Unlink a machine from a contract
   */
  unlinkMachine: async (contractId: string, machineId: string): Promise<void> => {
    await apiClient.delete(`/contracts/${contractId}/machines/${machineId}`)
  },

  /**
   * Preview commission calculation for a contract
   */
  previewCommission: async (
    id: string,
    revenue: number,
  ): Promise<CommissionPreview> => {
    const response = await apiClient.post<CommissionPreview>(
      `/contracts/${id}/commission-preview`,
      { revenue },
    )
    return response.data
  },

  /**
   * Activate a draft contract
   */
  activate: async (id: string): Promise<Contract> => {
    const response = await apiClient.post<Contract>(`/contracts/${id}/activate`)
    return response.data
  },

  /**
   * Suspend an active contract
   */
  suspend: async (id: string, reason?: string): Promise<Contract> => {
    const response = await apiClient.post<Contract>(`/contracts/${id}/suspend`, { reason })
    return response.data
  },

  /**
   * Terminate a contract
   */
  terminate: async (id: string, reason?: string): Promise<Contract> => {
    const response = await apiClient.post<Contract>(`/contracts/${id}/terminate`, { reason })
    return response.data
  },

  /**
   * Check if a contract number is unique
   */
  checkContractNumber: async (contractNumber: string): Promise<{ available: boolean }> => {
    const response = await apiClient.get<{ available: boolean }>(
      `/contracts/check-number/${contractNumber}`,
    )
    return response.data
  },
}
