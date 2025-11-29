export enum IncidentType {
  TECHNICAL_FAILURE = 'technical_failure',
  OUT_OF_STOCK = 'out_of_stock',
  CASH_FULL = 'cash_full',
  CASH_DISCREPANCY = 'cash_discrepancy', // NEW!
  VANDALISM = 'vandalism',
  POWER_OUTAGE = 'power_outage',
  OTHER = 'other',
}

export enum IncidentStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum IncidentPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface Incident {
  id: string
  incident_number?: string
  incident_type: IncidentType
  status: IncidentStatus
  priority: IncidentPriority
  machine_id: string
  machine?: {
    machine_number: string
    location?: {
      name: string
    }
  }
  title: string
  description: string
  reported_by_user_id?: string
  reported_by?: {
    full_name: string
  }
  reported_at: string
  assigned_to_user_id?: string
  assigned_to?: {
    full_name: string
  }
  started_at?: string
  resolved_at?: string
  closed_at?: string
  resolution_notes?: string
  repair_task_id?: string
  repair_cost?: number
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  created_by?: {
    full_name: string
  }
}

export interface CreateIncidentDto {
  incident_type: IncidentType
  priority: IncidentPriority
  machine_id: string
  title: string
  description: string
  reported_by_user_id?: string
  metadata?: Record<string, unknown>
}
