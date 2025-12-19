/**
 * Machine access types - per-machine user access control
 */

export enum MachineAccessRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  TECHNICIAN = 'technician',
  VIEWER = 'viewer',
}

export interface MachineAccess {
  id: string
  machine_id: string
  user_id: string
  role: MachineAccessRole
  created_at: string
  created_by_id: string | null
  // Joined relations
  machine?: {
    id: string
    machine_number: string
    name: string
  }
  user?: {
    id: string
    email: string
    username: string
    full_name: string
  }
  created_by?: {
    id: string
    username: string
    full_name: string
  }
}

export interface CreateMachineAccessDto {
  machine_id: string
  user_id: string
  role: MachineAccessRole
}

export interface UpdateMachineAccessDto {
  role?: MachineAccessRole
}

export interface BulkAssignDto {
  machine_ids: string[]
  user_id: string
  role: MachineAccessRole
}

export interface ImportMachineAccessResult {
  applied_count: number
  updated_count: number
  skipped_count: number
  errors: string[]
}

// Access templates
export interface AccessTemplate {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  created_by_id: string | null
  rows: AccessTemplateRow[]
}

export interface AccessTemplateRow {
  id: string
  template_id: string
  user_id: string
  role: MachineAccessRole
  user?: {
    id: string
    email: string
    username: string
    full_name: string
  }
}

export interface CreateAccessTemplateDto {
  name: string
  description?: string
  rows: {
    user_id: string
    role: MachineAccessRole
  }[]
}

export interface ApplyTemplateDto {
  template_id: string
  machine_ids: string[]
}

// Role display helpers
export const machineAccessRoleLabels: Record<MachineAccessRole, string> = {
  [MachineAccessRole.OWNER]: 'Владелец',
  [MachineAccessRole.ADMIN]: 'Администратор',
  [MachineAccessRole.MANAGER]: 'Менеджер',
  [MachineAccessRole.OPERATOR]: 'Оператор',
  [MachineAccessRole.TECHNICIAN]: 'Техник',
  [MachineAccessRole.VIEWER]: 'Наблюдатель',
}

export const machineAccessRoleColors: Record<MachineAccessRole, string> = {
  [MachineAccessRole.OWNER]: 'bg-purple-100 text-purple-800',
  [MachineAccessRole.ADMIN]: 'bg-red-100 text-red-800',
  [MachineAccessRole.MANAGER]: 'bg-blue-100 text-blue-800',
  [MachineAccessRole.OPERATOR]: 'bg-green-100 text-green-800',
  [MachineAccessRole.TECHNICIAN]: 'bg-yellow-100 text-yellow-800',
  [MachineAccessRole.VIEWER]: 'bg-gray-100 text-gray-800',
}
