export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
  ACCOUNTANT = 'accountant',
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
