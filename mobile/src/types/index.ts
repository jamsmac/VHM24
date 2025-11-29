/**
 * VendHub Mobile - TypeScript Type Definitions
 */

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  telegram_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  ACCOUNTANT = 'accountant',
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to_id: string;
  assigned_to?: User;
  equipment_id: string | null;
  equipment?: Equipment;
  location?: string;
  due_date: string | null;
  photos: TaskPhoto[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface TaskPhoto {
  id: string;
  task_id: string;
  url: string;
  caption: string | null;
  uploaded_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  serial_number: string;
  location: string;
  status: EquipmentStatus;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
}

export enum EquipmentType {
  VENDING_MACHINE = 'vending_machine',
  COFFEE_MACHINE = 'coffee_machine',
  TERMINAL = 'terminal',
}

export enum EquipmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  BROKEN = 'broken',
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  equipment_id: string;
  equipment?: Equipment;
  reported_by_id: string;
  reported_by?: User;
  photos: string[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum IncidentStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface OfflineTask {
  tempId: string;
  task: Partial<Task>;
  action: 'create' | 'update' | 'complete';
  timestamp: number;
  synced: boolean;
}

export interface OfflinePhoto {
  tempId: string;
  taskId: string;
  uri: string;
  caption: string | null;
  timestamp: number;
  synced: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to_id?: string;
  equipment_id?: string;
  due_date_from?: string;
  due_date_to?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: {
    type: 'task' | 'incident' | 'system';
    id?: string;
    [key: string]: any;
  };
}
