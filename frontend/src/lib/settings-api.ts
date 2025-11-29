import apiClient from './axios'

export interface SystemSettings {
  // General
  company_name: string
  contact_email: string
  contact_phone: string
  currency: 'RUB' | 'USD' | 'EUR'
  timezone: string

  // Notifications
  notifications_enabled: boolean
  email_notifications: boolean
  telegram_notifications: boolean
  sms_notifications?: boolean

  // Business Logic
  low_stock_threshold: number
  overdue_task_hours: number
  cash_capacity_warning_percentage: number
  cash_discrepancy_threshold_percentage: number

  // Maintenance
  auto_backup_enabled: boolean
  auto_backup_time: string
  backup_retention_days: number

  // Integration
  telegram_bot_token?: string
  email_smtp_host?: string
  email_smtp_port?: number
  email_smtp_user?: string
  sms_provider?: string
  sms_api_key?: string
}

export const settingsApi = {
  getSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get<SystemSettings>('/settings')
    return response.data
  },

  updateSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const response = await apiClient.patch<SystemSettings>('/settings', settings)
    return response.data
  },

  resetSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.post<SystemSettings>('/settings/reset')
    return response.data
  },

  testNotification: async (type: 'email' | 'telegram' | 'sms'): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/settings/test-notification/${type}`)
    return response.data
  },
}
