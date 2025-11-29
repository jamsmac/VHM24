import apiClient from './axios'
import { InventoryItem, WarehouseInventoryItem } from '@/types/inventory'

export interface TransferDto {
  nomenclature_id: string
  quantity: number
  batch_number?: string
  notes?: string
}

export const inventoryApi = {
  // Warehouse inventory
  getWarehouseInventory: async (warehouseId?: string): Promise<WarehouseInventoryItem[]> => {
    const response = await apiClient.get<WarehouseInventoryItem[]>('/inventory/warehouse', {
      params: { warehouse_id: warehouseId },
    })
    return response.data
  },

  // Operator inventory
  getOperatorInventory: async (operatorId?: string): Promise<InventoryItem[]> => {
    const response = await apiClient.get<InventoryItem[]>('/inventory/operators', {
      params: { operator_id: operatorId },
    })
    return response.data
  },

  // Machine inventory
  getMachineInventory: async (machineId?: string): Promise<InventoryItem[]> => {
    const response = await apiClient.get<InventoryItem[]>('/inventory/machines', {
      params: { machine_id: machineId },
    })
    return response.data
  },

  // Transfers
  transferWarehouseToOperator: async (data: {
    warehouse_id: string
    operator_id: string
    nomenclature_id: string
    quantity: number
    batch_number?: string
    notes?: string
  }) => {
    const response = await apiClient.post('/inventory/transfer-warehouse-to-operator', data)
    return response.data
  },

  transferOperatorToMachine: async (data: {
    operator_id: string
    machine_id: string
    nomenclature_id: string
    quantity: number
    task_id?: string
    notes?: string
  }) => {
    const response = await apiClient.post('/inventory/transfer-operator-to-machine', data)
    return response.data
  },

  // Movements history
  getMovements: async (params?: {
    nomenclatureId?: string
    dateFrom?: string
    dateTo?: string
  }) => {
    const response = await apiClient.get('/inventory/movements', { params })
    return response.data
  },

  // Low stock alerts
  getLowStock: async () => {
    const response = await apiClient.get('/inventory/low-stock')
    return response.data
  },

  // Expiring soon
  getExpiringSoon: async (days: number = 7) => {
    const response = await apiClient.get('/inventory/expiring-soon', {
      params: { days },
    })
    return response.data
  },
}
