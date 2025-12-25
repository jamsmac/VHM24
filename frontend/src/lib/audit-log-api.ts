import apiClient from './axios'

// Event types matching backend enum
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',

  // Password events
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',

  // 2FA events
  TWO_FA_ENABLED = '2fa_enabled',
  TWO_FA_DISABLED = '2fa_disabled',
  TWO_FA_VERIFIED = '2fa_verified',
  TWO_FA_FAILED = '2fa_failed',

  // Account management
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_UPDATED = 'account_updated',
  ACCOUNT_BLOCKED = 'account_blocked',
  ACCOUNT_UNBLOCKED = 'account_unblocked',
  ACCOUNT_DELETED = 'account_deleted',

  // Role and permission changes
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  PERMISSION_CHANGED = 'permission_changed',

  // Access request events
  ACCESS_REQUEST_CREATED = 'access_request_created',
  ACCESS_REQUEST_APPROVED = 'access_request_approved',
  ACCESS_REQUEST_REJECTED = 'access_request_rejected',

  // Security events
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  IP_BLOCKED = 'ip_blocked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',

  // Session events
  SESSION_CREATED = 'session_created',
  SESSION_TERMINATED = 'session_terminated',
  SESSION_EXPIRED = 'session_expired',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// Labels for display
export const eventTypeLabels: Record<AuditEventType, string> = {
  [AuditEventType.LOGIN_SUCCESS]: 'Успешный вход',
  [AuditEventType.LOGIN_FAILED]: 'Неудачный вход',
  [AuditEventType.LOGOUT]: 'Выход',
  [AuditEventType.TOKEN_REFRESH]: 'Обновление токена',
  [AuditEventType.PASSWORD_CHANGED]: 'Смена пароля',
  [AuditEventType.PASSWORD_RESET_REQUESTED]: 'Запрос сброса пароля',
  [AuditEventType.PASSWORD_RESET_COMPLETED]: 'Пароль сброшен',
  [AuditEventType.TWO_FA_ENABLED]: '2FA включён',
  [AuditEventType.TWO_FA_DISABLED]: '2FA отключён',
  [AuditEventType.TWO_FA_VERIFIED]: '2FA подтверждён',
  [AuditEventType.TWO_FA_FAILED]: 'Ошибка 2FA',
  [AuditEventType.ACCOUNT_CREATED]: 'Аккаунт создан',
  [AuditEventType.ACCOUNT_UPDATED]: 'Аккаунт обновлён',
  [AuditEventType.ACCOUNT_BLOCKED]: 'Аккаунт заблокирован',
  [AuditEventType.ACCOUNT_UNBLOCKED]: 'Аккаунт разблокирован',
  [AuditEventType.ACCOUNT_DELETED]: 'Аккаунт удалён',
  [AuditEventType.ROLE_ASSIGNED]: 'Роль назначена',
  [AuditEventType.ROLE_REMOVED]: 'Роль снята',
  [AuditEventType.PERMISSION_CHANGED]: 'Права изменены',
  [AuditEventType.ACCESS_REQUEST_CREATED]: 'Запрос доступа создан',
  [AuditEventType.ACCESS_REQUEST_APPROVED]: 'Запрос доступа одобрен',
  [AuditEventType.ACCESS_REQUEST_REJECTED]: 'Запрос доступа отклонён',
  [AuditEventType.BRUTE_FORCE_DETECTED]: 'Обнаружена атака',
  [AuditEventType.IP_BLOCKED]: 'IP заблокирован',
  [AuditEventType.SUSPICIOUS_ACTIVITY]: 'Подозрительная активность',
  [AuditEventType.SESSION_CREATED]: 'Сессия создана',
  [AuditEventType.SESSION_TERMINATED]: 'Сессия завершена',
  [AuditEventType.SESSION_EXPIRED]: 'Сессия истекла',
}

export const severityLabels: Record<AuditSeverity, string> = {
  [AuditSeverity.INFO]: 'Информация',
  [AuditSeverity.WARNING]: 'Предупреждение',
  [AuditSeverity.ERROR]: 'Ошибка',
  [AuditSeverity.CRITICAL]: 'Критично',
}

// Event type categories for filtering
export const eventTypeCategories = {
  authentication: [
    AuditEventType.LOGIN_SUCCESS,
    AuditEventType.LOGIN_FAILED,
    AuditEventType.LOGOUT,
    AuditEventType.TOKEN_REFRESH,
  ],
  password: [
    AuditEventType.PASSWORD_CHANGED,
    AuditEventType.PASSWORD_RESET_REQUESTED,
    AuditEventType.PASSWORD_RESET_COMPLETED,
  ],
  twoFactor: [
    AuditEventType.TWO_FA_ENABLED,
    AuditEventType.TWO_FA_DISABLED,
    AuditEventType.TWO_FA_VERIFIED,
    AuditEventType.TWO_FA_FAILED,
  ],
  account: [
    AuditEventType.ACCOUNT_CREATED,
    AuditEventType.ACCOUNT_UPDATED,
    AuditEventType.ACCOUNT_BLOCKED,
    AuditEventType.ACCOUNT_UNBLOCKED,
    AuditEventType.ACCOUNT_DELETED,
  ],
  roles: [
    AuditEventType.ROLE_ASSIGNED,
    AuditEventType.ROLE_REMOVED,
    AuditEventType.PERMISSION_CHANGED,
  ],
  access: [
    AuditEventType.ACCESS_REQUEST_CREATED,
    AuditEventType.ACCESS_REQUEST_APPROVED,
    AuditEventType.ACCESS_REQUEST_REJECTED,
  ],
  security: [
    AuditEventType.BRUTE_FORCE_DETECTED,
    AuditEventType.IP_BLOCKED,
    AuditEventType.SUSPICIOUS_ACTIVITY,
  ],
  session: [
    AuditEventType.SESSION_CREATED,
    AuditEventType.SESSION_TERMINATED,
    AuditEventType.SESSION_EXPIRED,
  ],
}

export const categoryLabels: Record<keyof typeof eventTypeCategories, string> = {
  authentication: 'Аутентификация',
  password: 'Пароли',
  twoFactor: 'Двухфакторная',
  account: 'Аккаунты',
  roles: 'Роли',
  access: 'Доступ',
  security: 'Безопасность',
  session: 'Сессии',
}

export interface AuditLogUser {
  id: string
  email: string
  first_name: string
  last_name: string
}

export interface AuditLog {
  id: string
  event_type: AuditEventType
  severity: AuditSeverity
  user_id: string | null
  user: AuditLogUser | null
  target_user_id: string | null
  target_user: AuditLogUser | null
  ip_address: string | null
  user_agent: string | null
  description: string | null
  metadata: Record<string, unknown>
  success: boolean
  error_message: string | null
  created_at: string
}

export interface AuditLogQueryParams {
  event_type?: AuditEventType
  severity?: AuditSeverity
  user_id?: string
  target_user_id?: string
  ip_address?: string
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

export interface AuditLogResponse {
  data: AuditLog[]
  total: number
  limit: number
  offset: number
}

export const auditLogApi = {
  /**
   * Get audit logs with filters
   */
  getAll: async (params: AuditLogQueryParams = {}): Promise<AuditLogResponse> => {
    const response = await apiClient.get<AuditLogResponse>('/audit-logs', {
      params: {
        ...params,
        limit: params.limit || 50,
        offset: params.offset || 0,
      },
    })
    return response.data
  },

  /**
   * Get audit log by ID
   */
  getById: async (id: string): Promise<AuditLog> => {
    const response = await apiClient.get<AuditLog>(`/audit-logs/${id}`)
    return response.data
  },

  /**
   * Get recent activity (last 24 hours)
   */
  getRecentActivity: async (limit: number = 10): Promise<AuditLog[]> => {
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 1)

    const response = await apiClient.get<AuditLogResponse>('/audit-logs', {
      params: {
        from_date: fromDate.toISOString(),
        limit,
        offset: 0,
      },
    })
    return response.data.data
  },

  /**
   * Get security events (warnings, errors, critical)
   */
  getSecurityEvents: async (limit: number = 20): Promise<AuditLog[]> => {
    const response = await apiClient.get<AuditLogResponse>('/audit-logs', {
      params: {
        limit,
        offset: 0,
      },
    })
    // Filter security-related events on client side
    return response.data.data.filter(
      (log) =>
        log.severity !== AuditSeverity.INFO ||
        eventTypeCategories.security.includes(log.event_type)
    )
  },

  /**
   * Get login history for a user
   */
  getUserLoginHistory: async (userId: string, limit: number = 20): Promise<AuditLog[]> => {
    const response = await apiClient.get<AuditLogResponse>('/audit-logs', {
      params: {
        user_id: userId,
        limit,
        offset: 0,
      },
    })
    return response.data.data.filter((log) =>
      eventTypeCategories.authentication.includes(log.event_type)
    )
  },
}

// Helper functions
export function getSeverityColor(severity: AuditSeverity): string {
  switch (severity) {
    case AuditSeverity.INFO:
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case AuditSeverity.WARNING:
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case AuditSeverity.ERROR:
      return 'text-red-600 bg-red-50 border-red-200'
    case AuditSeverity.CRITICAL:
      return 'text-red-800 bg-red-100 border-red-300'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function getEventTypeIcon(eventType: AuditEventType): string {
  if (eventTypeCategories.authentication.includes(eventType)) return 'LogIn'
  if (eventTypeCategories.password.includes(eventType)) return 'Key'
  if (eventTypeCategories.twoFactor.includes(eventType)) return 'Shield'
  if (eventTypeCategories.account.includes(eventType)) return 'User'
  if (eventTypeCategories.roles.includes(eventType)) return 'UserCog'
  if (eventTypeCategories.access.includes(eventType)) return 'Lock'
  if (eventTypeCategories.security.includes(eventType)) return 'AlertTriangle'
  if (eventTypeCategories.session.includes(eventType)) return 'Monitor'
  return 'Activity'
}

export function formatUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Неизвестно'

  // Extract browser info
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  if (userAgent.includes('Opera')) return 'Opera'

  return userAgent.substring(0, 30) + '...'
}

export function isSecurityEvent(log: AuditLog): boolean {
  return (
    log.severity !== AuditSeverity.INFO ||
    eventTypeCategories.security.includes(log.event_type) ||
    !log.success
  )
}

export function getEventIcon(eventType: AuditEventType): string {
  if (eventTypeCategories.authentication.includes(eventType)) {
    return eventType === AuditEventType.LOGIN_SUCCESS ? '✅' :
           eventType === AuditEventType.LOGIN_FAILED ? '❌' :
           eventType === AuditEventType.LOGOUT ? '🚪' : '🔄'
  }
  if (eventTypeCategories.password.includes(eventType)) return '🔑'
  if (eventTypeCategories.twoFactor.includes(eventType)) {
    return eventType === AuditEventType.TWO_FA_ENABLED ? '🛡️' :
           eventType === AuditEventType.TWO_FA_DISABLED ? '🔓' :
           eventType === AuditEventType.TWO_FA_VERIFIED ? '✅' : '❌'
  }
  if (eventTypeCategories.account.includes(eventType)) {
    return eventType === AuditEventType.ACCOUNT_CREATED ? '👤' :
           eventType === AuditEventType.ACCOUNT_BLOCKED ? '🚫' :
           eventType === AuditEventType.ACCOUNT_UNBLOCKED ? '✅' :
           eventType === AuditEventType.ACCOUNT_DELETED ? '🗑️' : '📝'
  }
  if (eventTypeCategories.roles.includes(eventType)) return '👑'
  if (eventTypeCategories.access.includes(eventType)) return '🔐'
  if (eventTypeCategories.security.includes(eventType)) return '⚠️'
  if (eventTypeCategories.session.includes(eventType)) return '💻'
  return '📋'
}

export function getEventColor(eventType: AuditEventType): string {
  if (eventTypeCategories.security.includes(eventType)) {
    return 'text-red-600 bg-red-50'
  }
  if (eventType === AuditEventType.LOGIN_FAILED ||
      eventType === AuditEventType.TWO_FA_FAILED ||
      eventType === AuditEventType.ACCOUNT_BLOCKED) {
    return 'text-red-600 bg-red-50'
  }
  if (eventType === AuditEventType.LOGIN_SUCCESS ||
      eventType === AuditEventType.TWO_FA_VERIFIED ||
      eventType === AuditEventType.ACCOUNT_CREATED) {
    return 'text-green-600 bg-green-50'
  }
  if (eventTypeCategories.password.includes(eventType)) {
    return 'text-yellow-600 bg-yellow-50'
  }
  if (eventTypeCategories.twoFactor.includes(eventType)) {
    return 'text-indigo-600 bg-indigo-50'
  }
  if (eventTypeCategories.session.includes(eventType)) {
    return 'text-blue-600 bg-blue-50'
  }
  return 'text-gray-600 bg-gray-50'
}
