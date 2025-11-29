export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
}

export enum TaskType {
  REFILL = 'refill',
  COLLECTION = 'collection',
  REPAIR = 'repair',
  MAINTENANCE = 'maintenance',
  CLEANING = 'cleaning',
  INSPECTION = 'inspection',
  REPLACE_HOPPER = 'replace_hopper',
  REPLACE_GRINDER = 'replace_grinder',
  REPLACE_BREWER = 'replace_brewer',
  REPLACE_MIXER = 'replace_mixer',
  OTHER = 'other',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface Task {
  id: string
  type_code: TaskType
  status: TaskStatus
  priority: TaskPriority
  machine_id: string
  machine?: {
    id: string
    machine_number: string
    location?: {
      name: string
    }
  }
  assigned_to_user_id?: string
  assigned_to?: {
    full_name: string
  }
  created_by_user_id: string
  created_by?: {
    full_name: string
  }
  scheduled_date: string
  due_date?: string
  started_at?: string
  completed_at?: string
  description?: string
  has_photo_before: boolean
  has_photo_after: boolean
  pending_photos?: boolean
  actual_cash_amount?: number
  expected_cash_amount?: number
  notes?: string
  completed_by?: string | { full_name: string }
  components?: Array<{
    component_id: string
    component_type: string
    action: string
  }>
  items?: TaskItem[]
  created_at: string
  updated_at: string
}

export interface TaskItem {
  id: string
  task_id: string
  nomenclature_id: string
  nomenclature?: {
    name: string
    unit_of_measure_code: string
  }
  planned_quantity: number
  actual_quantity?: number
  unit_of_measure_code: string
}

export interface CreateTaskDto {
  type_code: TaskType
  priority: TaskPriority
  machine_id: string
  assigned_to_user_id?: string
  scheduled_date: string
  due_date?: string
  description?: string
  items?: Array<{
    nomenclature_id: string
    planned_quantity: number
    unit_of_measure_code: string
  }>
}

export interface CompleteTaskDto {
  completion_notes?: string
  actual_cash_amount?: number
  skip_photos?: boolean
  items?: Array<{
    nomenclature_id: string
    actual_quantity: number
  }>
}

export interface TaskStats {
  total: number
  by_status: Record<TaskStatus, number>
  by_type: Record<TaskType, number>
  overdue: number
  in_progress: number
  pending_photos?: number
}

export interface TaskPhoto {
  id: string
  task_id: string
  category_code: 'task_photo_before' | 'task_photo_after'
  file_path: string
  original_filename: string
  mime_type: string
  created_at: string
  url?: string
  file_url?: string
  cloudflare_url?: string
}

export interface TaskComponent {
  id?: string
  component_id: string
  component_type: string
  action: string
  role?: 'old' | 'new' | 'service'
  notes?: string
  component?: {
    name: string
    serial_number?: string
  }
}
