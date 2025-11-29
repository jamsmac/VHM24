import { apiClient } from './axios'
import type {
  EquipmentComponent,
  SparePart,
  WashingSchedule,
  ComponentMaintenance,
  ComponentMovement,
  HopperType,
  CreateComponentDto,
  UpdateComponentDto,
  CreateSparePartDto,
  AdjustStockDto,
  CreateWashingScheduleDto,
  CompleteWashingDto,
  CreateMaintenanceDto,
  CreateHopperTypeDto,
  UpdateHopperTypeDto,
  ComponentStats,
  SparePartStats,
  WashingStats,
  MaintenanceStats,
  ComponentType,
  ComponentStatus,
  MaintenanceType,
  ComponentLocationType,
  MovementType,
} from '@/types/equipment'

// Components API
export const componentsApi = {
  getAll: async (params?: {
    machineId?: string
    componentType?: ComponentType
    status?: ComponentStatus
  }) => {
    const response = await apiClient.get<EquipmentComponent[]>(
      '/equipment/components',
      { params }
    )
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get<EquipmentComponent>(
      `/equipment/components/${id}`
    )
    return response.data
  },

  create: async (data: CreateComponentDto) => {
    const response = await apiClient.post<EquipmentComponent>(
      '/equipment/components',
      data
    )
    return response.data
  },

  update: async (id: string, data: UpdateComponentDto) => {
    const response = await apiClient.patch<EquipmentComponent>(
      `/equipment/components/${id}`,
      data
    )
    return response.data
  },

  delete: async (id: string) => {
    await apiClient.delete(`/equipment/components/${id}`)
  },

  replace: async (id: string, newComponentId: string) => {
    const response = await apiClient.post<EquipmentComponent>(
      `/equipment/components/${id}/replace`,
      { new_component_id: newComponentId }
    )
    return response.data
  },

  getNeedingMaintenance: async () => {
    const response = await apiClient.get<EquipmentComponent[]>(
      '/equipment/components/needs-maintenance'
    )
    return response.data
  },

  getNearingLifetime: async () => {
    const response = await apiClient.get<EquipmentComponent[]>(
      '/equipment/components/nearing-lifetime'
    )
    return response.data
  },

  getStats: async () => {
    const response = await apiClient.get<ComponentStats>(
      '/equipment/components/stats'
    )
    return response.data
  },

  // Component movements
  getMovements: async (componentId: string) => {
    const response = await apiClient.get<ComponentMovement[]>(
      `/equipment/components/${componentId}/movements`
    )
    return response.data
  },

  getLocation: async (componentId: string) => {
    const response = await apiClient.get<{
      component: EquipmentComponent
      lastMovement: ComponentMovement | null
    }>(`/equipment/components/${componentId}/location`)
    return response.data
  },

  install: async (
    componentId: string,
    data: {
      machine_id: string
      task_id?: string
      comment?: string
    }
  ) => {
    const response = await apiClient.post<ComponentMovement>(
      `/equipment/components/${componentId}/install`,
      data
    )
    return response.data
  },

  remove: async (
    componentId: string,
    data: {
      target_location: ComponentLocationType
      target_location_ref?: string
      task_id?: string
      comment?: string
    }
  ) => {
    const response = await apiClient.post<ComponentMovement>(
      `/equipment/components/${componentId}/remove`,
      data
    )
    return response.data
  },

  move: async (
    componentId: string,
    data: {
      to_location_type: ComponentLocationType
      to_location_ref?: string
      movement_type: MovementType
      related_machine_id?: string
      task_id?: string
      comment?: string
    }
  ) => {
    const response = await apiClient.post<ComponentMovement>(
      `/equipment/components/${componentId}/move`,
      data
    )
    return response.data
  },
}

// Spare Parts API
export const sparePartsApi = {
  getAll: async (params?: {
    componentType?: ComponentType
    lowStock?: boolean
  }) => {
    const response = await apiClient.get<SparePart[]>(
      '/equipment/spare-parts',
      { params }
    )
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get<SparePart>(
      `/equipment/spare-parts/${id}`
    )
    return response.data
  },

  create: async (data: CreateSparePartDto) => {
    const response = await apiClient.post<SparePart>(
      '/equipment/spare-parts',
      data
    )
    return response.data
  },

  update: async (id: string, data: Partial<CreateSparePartDto>) => {
    const response = await apiClient.patch<SparePart>(
      `/equipment/spare-parts/${id}`,
      data
    )
    return response.data
  },

  delete: async (id: string) => {
    await apiClient.delete(`/equipment/spare-parts/${id}`)
  },

  adjustStock: async (id: string, data: AdjustStockDto) => {
    const response = await apiClient.post<SparePart>(
      `/equipment/spare-parts/${id}/adjust-stock`,
      data
    )
    return response.data
  },

  getLowStock: async () => {
    const response = await apiClient.get<SparePart[]>(
      '/equipment/spare-parts/low-stock'
    )
    return response.data
  },

  getStats: async () => {
    const response = await apiClient.get<SparePartStats>(
      '/equipment/spare-parts/stats'
    )
    return response.data
  },
}

// Washing Schedules API
export const washingSchedulesApi = {
  getAll: async (params?: {
    machineId?: string
    isActive?: boolean
  }) => {
    const response = await apiClient.get<WashingSchedule[]>(
      `/equipment/washing-schedules`,
      { params }
    )
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get<WashingSchedule>(
      `/equipment/washing-schedules/${id}`
    )
    return response.data
  },

  create: async (data: CreateWashingScheduleDto) => {
    const response = await apiClient.post<WashingSchedule>(
      `/equipment/washing-schedules`,
      data
    )
    return response.data
  },

  update: async (id: string, data: Partial<CreateWashingScheduleDto>) => {
    const response = await apiClient.patch<WashingSchedule>(
      `/equipment/washing-schedules/${id}`,
      data
    )
    return response.data
  },

  delete: async (id: string) => {
    await apiClient.delete(`/equipment/washing-schedules/${id}`)
  },

  complete: async (id: string, data: CompleteWashingDto) => {
    const response = await apiClient.post<WashingSchedule>(
      `/equipment/washing-schedules/${id}/complete`,
      data
    )
    return response.data
  },

  getOverdue: async () => {
    const response = await apiClient.get<WashingSchedule[]>(
      `/equipment/washing-schedules/overdue`
    )
    return response.data
  },

  getUpcoming: async (daysAhead: number = 7) => {
    const response = await apiClient.get<WashingSchedule[]>(
      `/equipment/washing-schedules/upcoming`,
      { params: { daysAhead } }
    )
    return response.data
  },

  getStats: async (machineId?: string) => {
    const response = await apiClient.get<WashingStats>(
      `/equipment/washing-schedules/stats`,
      { params: { machineId } }
    )
    return response.data
  },
}

// Maintenance API
export const maintenanceApi = {
  getAll: async (params?: {
    component_id?: string
    maintenance_type?: MaintenanceType
    from_date?: string
    to_date?: string
  }) => {
    const response = await apiClient.get<ComponentMaintenance[]>(
      `/equipment/maintenance`,
      { params }
    )
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ComponentMaintenance>(
      `/equipment/maintenance/${id}`
    )
    return response.data
  },

  create: async (data: CreateMaintenanceDto) => {
    const response = await apiClient.post<ComponentMaintenance>(
      `/equipment/maintenance`,
      data
    )
    return response.data
  },

  getComponentHistory: async (componentId: string) => {
    const response = await apiClient.get<ComponentMaintenance[]>(
      `/equipment/maintenance/component/${componentId}`
    )
    return response.data
  },

  getMachineHistory: async (machineId: string, maintenanceType?: MaintenanceType) => {
    const response = await apiClient.get<ComponentMaintenance[]>(
      `/equipment/maintenance/machine/${machineId}`,
      { params: { maintenanceType } }
    )
    return response.data
  },

  getStats: async (params?: {
    componentId?: string
    fromDate?: string
    toDate?: string
  }) => {
    const response = await apiClient.get<MaintenanceStats>(
      `/equipment/maintenance/stats`,
      { params }
    )
    return response.data
  },
}

// Hopper Types API
export const hopperTypesApi = {
  getAll: async (params?: { category?: string }) => {
    const response = await apiClient.get<HopperType[]>(
      '/equipment/hopper-types',
      { params }
    )
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get<HopperType>(
      `/equipment/hopper-types/${id}`
    )
    return response.data
  },

  getByCode: async (code: string) => {
    const response = await apiClient.get<HopperType>(
      `/equipment/hopper-types/by-code/${code}`
    )
    return response.data
  },

  getCategories: async () => {
    const response = await apiClient.get<string[]>(
      '/equipment/hopper-types/categories'
    )
    return response.data
  },

  create: async (data: CreateHopperTypeDto) => {
    const response = await apiClient.post<HopperType>(
      '/equipment/hopper-types',
      data
    )
    return response.data
  },

  update: async (id: string, data: UpdateHopperTypeDto) => {
    const response = await apiClient.patch<HopperType>(
      `/equipment/hopper-types/${id}`,
      data
    )
    return response.data
  },

  delete: async (id: string) => {
    await apiClient.delete(`/equipment/hopper-types/${id}`)
  },
}
