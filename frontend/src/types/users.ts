// Synced with backend/src/modules/users/entities/user.entity.ts
export enum UserRole {
  OWNER = 'Owner',
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  OPERATOR = 'Operator',
  COLLECTOR = 'Collector',
  TECHNICIAN = 'Technician',
  VIEWER = 'Viewer',
}

// Role metadata for UI
export const ROLE_CONFIG: Record<UserRole, {
  label: string;
  labelRu: string;
  color: string;
  badgeClass: string;
  permissions: string[];
}> = {
  [UserRole.OWNER]: {
    label: 'Owner',
    labelRu: 'Владелец',
    color: 'purple',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    permissions: ['all']
  },
  [UserRole.ADMIN]: {
    label: 'Admin',
    labelRu: 'Администратор',
    color: 'red',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    permissions: ['users', 'machines', 'reports', 'settings']
  },
  [UserRole.MANAGER]: {
    label: 'Manager',
    labelRu: 'Менеджер',
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    permissions: ['machines', 'tasks', 'reports']
  },
  [UserRole.OPERATOR]: {
    label: 'Operator',
    labelRu: 'Оператор',
    color: 'green',
    badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    permissions: ['tasks', 'machines.view']
  },
  [UserRole.COLLECTOR]: {
    label: 'Collector',
    labelRu: 'Инкассатор',
    color: 'yellow',
    badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    permissions: ['collections', 'machines.view']
  },
  [UserRole.TECHNICIAN]: {
    label: 'Technician',
    labelRu: 'Техник',
    color: 'orange',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    permissions: ['maintenance', 'machines.view']
  },
  [UserRole.VIEWER]: {
    label: 'Viewer',
    labelRu: 'Наблюдатель',
    color: 'gray',
    badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    permissions: ['view']
  }
};

// Helper function to get role label
export function getRoleLabel(role: UserRole, locale: 'en' | 'ru' = 'ru'): string {
  const config = ROLE_CONFIG[role];
  return locale === 'ru' ? config?.labelRu : config?.label;
}

// Helper function to get role badge class
export function getRoleBadgeClass(role: UserRole): string {
  return ROLE_CONFIG[role]?.badgeClass || ROLE_CONFIG[UserRole.VIEWER].badgeClass;
}

export interface User {
  id: string
  email: string
  username?: string
  full_name: string
  role: UserRole
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_login?: string
  stats?: {
    total_tasks?: number
    completed_tasks?: number
    pending_tasks?: number
    active_tasks?: number
    resolved_incidents?: number
  }
}

export interface CreateUserDto {
  email: string
  password: string
  full_name: string
  role: UserRole
  phone?: string
  username?: string
}

export interface UpdateUserDto {
  email?: string
  full_name?: string
  role?: UserRole
  phone?: string
  is_active?: boolean
}
