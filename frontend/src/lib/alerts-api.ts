/**
 * Alerts API
 *
 * Handles alert rules management and alert history
 */

import apiClient from './axios'

// ============================================================================
// Types
// ============================================================================

export enum AlertMetric {
  LOW_STOCK_PERCENTAGE = 'low_stock_percentage',
  MACHINE_ERROR_COUNT = 'machine_error_count',
  TASK_OVERDUE_HOURS = 'task_overdue_hours',
  INCIDENT_COUNT = 'incident_count',
  COLLECTION_DUE_DAYS = 'collection_due_days',
  COMPONENT_LIFETIME_PERCENTAGE = 'component_lifetime_percentage',
  WASHING_OVERDUE_DAYS = 'washing_overdue_days',
  DAILY_SALES_DROP_PERCENTAGE = 'daily_sales_drop_percentage',
  MACHINE_OFFLINE_HOURS = 'machine_offline_hours',
  SPARE_PART_LOW_STOCK = 'spare_part_low_stock',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

export enum AlertOperator {
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN_OR_EQUAL = '<=',
  EQUAL = '==',
  NOT_EQUAL = '!=',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  EXPIRED = 'expired',
}

export interface AlertRule {
  id: string
  name: string
  description: string | null
  metric: AlertMetric
  operator: AlertOperator
  threshold: number
  severity: AlertSeverity
  is_enabled: boolean
  cooldown_minutes: number
  scope_filters: {
    machine_ids?: string[]
    location_ids?: string[]
    machine_types?: string[]
  } | null
  notify_user_ids: string[] | null
  notify_roles: string[] | null
  notification_channels: string[] | null
  escalation_minutes: number | null
  escalation_config: {
    escalation_roles?: string[]
    escalation_user_ids?: string[]
    auto_create_task?: boolean
    task_type?: string
  } | null
  last_triggered_at: string | null
  trigger_count: number
  created_at: string
  updated_at: string
}

export interface AlertHistory {
  id: string
  alert_rule_id: string
  alert_rule?: AlertRule
  status: AlertStatus
  severity: AlertSeverity
  title: string
  message: string
  triggered_at: string
  machine_id: string | null
  location_id: string | null
  metric_snapshot: {
    current_value: number
    threshold: number
    metric: string
    additional_data?: Record<string, any>
  } | null
  acknowledged_at: string | null
  acknowledged_by_id: string | null
  acknowledged_by?: { id: string; first_name: string; last_name: string }
  acknowledgement_note: string | null
  resolved_at: string | null
  resolved_by_id: string | null
  resolved_by?: { id: string; first_name: string; last_name: string }
  resolution_note: string | null
  escalated_at: string | null
  escalation_level: number
  created_at: string
}

export interface CreateAlertRuleDto {
  name: string
  description?: string
  metric: AlertMetric
  operator: AlertOperator
  threshold: number
  severity?: AlertSeverity
  is_enabled?: boolean
  cooldown_minutes?: number
  scope_filters?: {
    machine_ids?: string[]
    location_ids?: string[]
    machine_types?: string[]
  }
  notify_user_ids?: string[]
  notify_roles?: string[]
  notification_channels?: string[]
  escalation_minutes?: number
  escalation_config?: {
    escalation_roles?: string[]
    escalation_user_ids?: string[]
    auto_create_task?: boolean
    task_type?: string
  }
}

export interface UpdateAlertRuleDto extends Partial<CreateAlertRuleDto> {}

export interface AlertRuleFilters {
  is_enabled?: boolean
  metric?: AlertMetric
  severity?: AlertSeverity
}

export interface AlertHistoryFilters {
  status?: AlertStatus
  alert_rule_id?: string
  machine_id?: string
  location_id?: string
  severity?: string
  date_from?: string
  date_to?: string
  limit?: number
}

export interface AlertStatistics {
  total: number
  active_count: number
  by_status: Array<{ status: AlertStatus; count: number }>
  by_severity: Array<{ severity: AlertSeverity; count: number }>
  avg_resolution_time_minutes: number | null
}

// ============================================================================
// API Client
// ============================================================================

export const alertsApi = {
  // Rules
  createRule: async (dto: CreateAlertRuleDto): Promise<AlertRule> => {
    const response = await apiClient.post<AlertRule>('/alerts/rules', dto)
    return response.data
  },

  getRules: async (filters?: AlertRuleFilters): Promise<AlertRule[]> => {
    const params = new URLSearchParams()
    if (filters?.is_enabled !== undefined) {
      params.append('is_enabled', String(filters.is_enabled))
    }
    if (filters?.metric) params.append('metric', filters.metric)
    if (filters?.severity) params.append('severity', filters.severity)

    const response = await apiClient.get<AlertRule[]>(`/alerts/rules?${params.toString()}`)
    return response.data
  },

  getRule: async (id: string): Promise<AlertRule> => {
    const response = await apiClient.get<AlertRule>(`/alerts/rules/${id}`)
    return response.data
  },

  updateRule: async (id: string, dto: UpdateAlertRuleDto): Promise<AlertRule> => {
    const response = await apiClient.patch<AlertRule>(`/alerts/rules/${id}`, dto)
    return response.data
  },

  deleteRule: async (id: string): Promise<void> => {
    await apiClient.delete(`/alerts/rules/${id}`)
  },

  toggleRule: async (id: string, enabled: boolean): Promise<AlertRule> => {
    const response = await apiClient.patch<AlertRule>(
      `/alerts/rules/${id}/toggle?enabled=${enabled}`
    )
    return response.data
  },

  testRule: async (
    id: string,
    currentValue: number,
    machineId?: string
  ): Promise<AlertHistory | null> => {
    const response = await apiClient.post<AlertHistory | null>(`/alerts/rules/${id}/test`, {
      current_value: currentValue,
      machine_id: machineId,
    })
    return response.data
  },

  // History
  getHistory: async (filters?: AlertHistoryFilters): Promise<AlertHistory[]> => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.alert_rule_id) params.append('alert_rule_id', filters.alert_rule_id)
    if (filters?.machine_id) params.append('machine_id', filters.machine_id)
    if (filters?.location_id) params.append('location_id', filters.location_id)
    if (filters?.severity) params.append('severity', filters.severity)
    if (filters?.date_from) params.append('date_from', filters.date_from)
    if (filters?.date_to) params.append('date_to', filters.date_to)
    if (filters?.limit) params.append('limit', String(filters.limit))

    const response = await apiClient.get<AlertHistory[]>(`/alerts/history?${params.toString()}`)
    return response.data
  },

  getActiveAlerts: async (): Promise<AlertHistory[]> => {
    const response = await apiClient.get<AlertHistory[]>('/alerts/history/active')
    return response.data
  },

  getActiveAlertsCount: async (): Promise<number> => {
    const response = await apiClient.get<{ count: number }>('/alerts/history/count')
    return response.data.count
  },

  getAlert: async (id: string): Promise<AlertHistory> => {
    const response = await apiClient.get<AlertHistory>(`/alerts/history/${id}`)
    return response.data
  },

  acknowledgeAlert: async (id: string, note?: string): Promise<AlertHistory> => {
    const response = await apiClient.post<AlertHistory>(`/alerts/history/${id}/acknowledge`, {
      note,
    })
    return response.data
  },

  resolveAlert: async (id: string, note?: string): Promise<AlertHistory> => {
    const response = await apiClient.post<AlertHistory>(`/alerts/history/${id}/resolve`, {
      note,
    })
    return response.data
  },

  // Statistics
  getStatistics: async (dateFrom?: string, dateTo?: string): Promise<AlertStatistics> => {
    const params = new URLSearchParams()
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)

    const response = await apiClient.get<AlertStatistics>(`/alerts/statistics?${params.toString()}`)
    return response.data
  },
}

export default alertsApi
