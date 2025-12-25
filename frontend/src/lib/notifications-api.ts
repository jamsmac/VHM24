import apiClient from './axios'

// Enums matching backend
export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',
  LOW_STOCK_WAREHOUSE = 'low_stock_warehouse',
  LOW_STOCK_MACHINE = 'low_stock_machine',
  MACHINE_ERROR = 'machine_error',
  INCIDENT_CREATED = 'incident_created',
  COMPLAINT_RECEIVED = 'complaint_received',
  DAILY_REPORT = 'daily_report',
  SYSTEM_ALERT = 'system_alert',
  COMPONENT_NEEDS_MAINTENANCE = 'component_needs_maintenance',
  COMPONENT_NEARING_LIFETIME = 'component_nearing_lifetime',
  SPARE_PART_LOW_STOCK = 'spare_part_low_stock',
  WASHING_OVERDUE = 'washing_overdue',
  WASHING_UPCOMING = 'washing_upcoming',
  OTHER = 'other',
}

export enum NotificationChannel {
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  SMS = 'sms',
  WEB_PUSH = 'web_push',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Labels
export const notificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.TASK_ASSIGNED]: 'Задача назначена',
  [NotificationType.TASK_COMPLETED]: 'Задача выполнена',
  [NotificationType.TASK_OVERDUE]: 'Задача просрочена',
  [NotificationType.LOW_STOCK_WAREHOUSE]: 'Низкий остаток на складе',
  [NotificationType.LOW_STOCK_MACHINE]: 'Низкий остаток в аппарате',
  [NotificationType.MACHINE_ERROR]: 'Ошибка аппарата',
  [NotificationType.INCIDENT_CREATED]: 'Создан инцидент',
  [NotificationType.COMPLAINT_RECEIVED]: 'Получена жалоба',
  [NotificationType.DAILY_REPORT]: 'Ежедневный отчёт',
  [NotificationType.SYSTEM_ALERT]: 'Системное оповещение',
  [NotificationType.COMPONENT_NEEDS_MAINTENANCE]: 'Требуется обслуживание',
  [NotificationType.COMPONENT_NEARING_LIFETIME]: 'Компонент близок к замене',
  [NotificationType.SPARE_PART_LOW_STOCK]: 'Низкий запас запчастей',
  [NotificationType.WASHING_OVERDUE]: 'Мойка просрочена',
  [NotificationType.WASHING_UPCOMING]: 'Приближается мойка',
  [NotificationType.OTHER]: 'Другое',
}

export const channelLabels: Record<NotificationChannel, string> = {
  [NotificationChannel.TELEGRAM]: 'Telegram',
  [NotificationChannel.EMAIL]: 'Email',
  [NotificationChannel.SMS]: 'SMS',
  [NotificationChannel.WEB_PUSH]: 'Push-уведомления',
  [NotificationChannel.IN_APP]: 'В приложении',
}

export const statusLabels: Record<NotificationStatus, string> = {
  [NotificationStatus.PENDING]: 'Ожидает',
  [NotificationStatus.SENT]: 'Отправлено',
  [NotificationStatus.DELIVERED]: 'Доставлено',
  [NotificationStatus.READ]: 'Прочитано',
  [NotificationStatus.FAILED]: 'Ошибка',
}

export const priorityLabels: Record<NotificationPriority, string> = {
  [NotificationPriority.LOW]: 'Низкий',
  [NotificationPriority.NORMAL]: 'Обычный',
  [NotificationPriority.HIGH]: 'Высокий',
  [NotificationPriority.URGENT]: 'Срочный',
}

// Interfaces
export interface NotificationUser {
  id: string
  email: string
  first_name: string
  last_name: string
}

export interface Notification {
  id: string
  type: NotificationType
  channel: NotificationChannel
  status: NotificationStatus
  priority: NotificationPriority
  recipient_id: string
  recipient?: NotificationUser
  title: string
  message: string
  data: Record<string, unknown> | null
  action_url: string | null
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  delivery_response: string | null
  error_message: string | null
  retry_count: number
  next_retry_at: string | null
  created_at: string
  updated_at: string
}

export interface NotificationPreference {
  id: string
  user_id: string
  notification_type: NotificationType
  channel: NotificationChannel
  is_enabled: boolean
  settings: Record<string, unknown> | null
}

export interface NotificationStats {
  total: number
  unread: number
  byType?: Record<NotificationType, number>
  byPriority?: Record<NotificationPriority, number>
}

export interface CreateNotificationDto {
  type: NotificationType
  channel: NotificationChannel
  recipient_id: string
  title: string
  message: string
  priority?: NotificationPriority
  data?: Record<string, unknown>
  action_url?: string
}

export interface UpdatePreferenceDto {
  is_enabled?: boolean
  settings?: Record<string, unknown>
}

export const notificationsApi = {
  /**
   * Get current user's notifications
   */
  getMyNotifications: async (
    status?: NotificationStatus,
    unreadOnly?: boolean
  ): Promise<Notification[]> => {
    const params: Record<string, string | boolean> = {}
    if (status) params.status = status
    if (unreadOnly) params.unreadOnly = true

    const response = await apiClient.get<Notification[]>('/notifications/my', { params })
    return response.data
  },

  /**
   * Get notification stats
   */
  getStats: async (): Promise<NotificationStats> => {
    const response = await apiClient.get<NotificationStats>('/notifications/stats')
    return response.data
  },

  /**
   * Get notification by ID
   */
  getById: async (id: string): Promise<Notification> => {
    const response = await apiClient.get<Notification>(`/notifications/${id}`)
    return response.data
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (id: string): Promise<Notification> => {
    const response = await apiClient.patch<Notification>(`/notifications/${id}/read`)
    return response.data
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/notifications/mark-all-read')
  },

  /**
   * Delete notification
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`)
  },

  /**
   * Get user preferences
   */
  getPreferences: async (): Promise<NotificationPreference[]> => {
    const response = await apiClient.get<NotificationPreference[]>('/notifications/preferences/my')
    return response.data
  },

  /**
   * Update preference
   */
  updatePreference: async (
    type: NotificationType,
    channel: NotificationChannel,
    data: UpdatePreferenceDto
  ): Promise<NotificationPreference> => {
    const response = await apiClient.patch<NotificationPreference>(
      `/notifications/preferences/${type}/${channel}`,
      data
    )
    return response.data
  },

  /**
   * Create notification (admin only)
   */
  create: async (data: CreateNotificationDto): Promise<Notification> => {
    const response = await apiClient.post<Notification>('/notifications', data)
    return response.data
  },

  /**
   * Resend failed notification
   */
  resend: async (id: string): Promise<Notification> => {
    const response = await apiClient.post<Notification>(`/notifications/${id}/resend`)
    return response.data
  },
}

// Helper functions
export function getPriorityColor(priority: NotificationPriority): string {
  switch (priority) {
    case NotificationPriority.LOW:
      return 'text-gray-500 bg-gray-50 border-gray-200'
    case NotificationPriority.NORMAL:
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case NotificationPriority.HIGH:
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case NotificationPriority.URGENT:
      return 'text-red-600 bg-red-50 border-red-200'
    default:
      return 'text-gray-500 bg-gray-50 border-gray-200'
  }
}

export function getStatusColor(status: NotificationStatus): string {
  switch (status) {
    case NotificationStatus.PENDING:
      return 'text-yellow-600 bg-yellow-50'
    case NotificationStatus.SENT:
      return 'text-blue-600 bg-blue-50'
    case NotificationStatus.DELIVERED:
      return 'text-green-600 bg-green-50'
    case NotificationStatus.READ:
      return 'text-gray-600 bg-gray-50'
    case NotificationStatus.FAILED:
      return 'text-red-600 bg-red-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

export function isUnread(notification: Notification): boolean {
  return notification.status !== NotificationStatus.READ && notification.read_at === null
}

export function getNotificationTypeCategory(type: NotificationType): string {
  if (type.includes('task')) return 'tasks'
  if (type.includes('stock') || type.includes('spare')) return 'inventory'
  if (type.includes('machine') || type.includes('component') || type.includes('washing')) return 'equipment'
  if (type.includes('incident')) return 'incidents'
  if (type.includes('complaint')) return 'complaints'
  if (type.includes('report')) return 'reports'
  return 'system'
}
