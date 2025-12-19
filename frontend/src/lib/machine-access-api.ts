import { httpClient } from './axios'
import type {
  MachineAccess,
  CreateMachineAccessDto,
  UpdateMachineAccessDto,
  BulkAssignDto,
  ImportMachineAccessResult,
  AccessTemplate,
  CreateAccessTemplateDto,
  ApplyTemplateDto,
} from '@/types/machine-access'

/**
 * Machine Access API
 * Endpoints for per-machine user access control
 */
export const machineAccessApi = {
  // Access entries
  getByMachine: async (machineId: string): Promise<MachineAccess[]> => {
    const { data } = await httpClient.get(`/machines/access/machine/${machineId}`)
    return data
  },

  getByUser: async (userId: string): Promise<MachineAccess[]> => {
    const { data } = await httpClient.get(`/machines/access/user/${userId}`)
    return data
  },

  getAll: async (params?: {
    machine_id?: string
    user_id?: string
    role?: string
  }): Promise<MachineAccess[]> => {
    const { data } = await httpClient.get('/machines/access', { params })
    return data
  },

  create: async (dto: CreateMachineAccessDto): Promise<MachineAccess> => {
    const { data } = await httpClient.post('/machines/access', dto)
    return data
  },

  update: async (id: string, dto: UpdateMachineAccessDto): Promise<MachineAccess> => {
    const { data } = await httpClient.patch(`/machines/access/${id}`, dto)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await httpClient.delete(`/machines/access/${id}`)
  },

  // Bulk operations
  assignOwnerToAll: async (): Promise<{ count: number }> => {
    const { data } = await httpClient.post('/machines/access/assign-me-owner-all')
    return data
  },

  bulkAssign: async (dto: BulkAssignDto): Promise<ImportMachineAccessResult> => {
    const { data } = await httpClient.post('/machines/access/bulk-assign', dto)
    return data
  },

  // Import from file
  importFromFile: async (file: File): Promise<ImportMachineAccessResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await httpClient.post('/machines/access/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },

  // Templates
  getTemplates: async (): Promise<AccessTemplate[]> => {
    const { data } = await httpClient.get('/machines/access/templates')
    return data
  },

  getTemplateById: async (id: string): Promise<AccessTemplate> => {
    const { data } = await httpClient.get(`/machines/access/templates/${id}`)
    return data
  },

  createTemplate: async (dto: CreateAccessTemplateDto): Promise<AccessTemplate> => {
    const { data } = await httpClient.post('/machines/access/templates', dto)
    return data
  },

  updateTemplate: async (
    id: string,
    dto: Partial<CreateAccessTemplateDto>
  ): Promise<AccessTemplate> => {
    const { data } = await httpClient.patch(`/machines/access/templates/${id}`, dto)
    return data
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await httpClient.delete(`/machines/access/templates/${id}`)
  },

  applyTemplate: async (dto: ApplyTemplateDto): Promise<ImportMachineAccessResult> => {
    const { data } = await httpClient.post('/machines/access/templates/apply', dto)
    return data
  },
}
