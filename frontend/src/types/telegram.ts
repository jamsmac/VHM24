// Telegram Types
export enum TelegramUserStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  INACTIVE = 'inactive',
}

export enum TelegramLanguage {
  RU = 'ru',
  EN = 'en',
}

export enum TelegramBotMode {
  POLLING = 'polling',
  WEBHOOK = 'webhook',
}

export enum TelegramMessageType {
  COMMAND = 'command',
  NOTIFICATION = 'notification',
  CALLBACK = 'callback',
  MESSAGE = 'message',
  ERROR = 'error',
}

export enum TelegramMessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export interface NotificationPreferences {
  [key: string]: boolean | undefined
  machine_offline?: boolean
  machine_online?: boolean
  low_stock?: boolean
  sales_milestone?: boolean
  maintenance_due?: boolean
  equipment_needs_maintenance?: boolean
  equipment_low_stock?: boolean
  equipment_washing_due?: boolean
  payment_failed?: boolean
  task_assigned?: boolean
  task_completed?: boolean
  custom?: boolean
}

export interface TelegramUser {
  id: string
  telegram_id: string
  user_id: string
  chat_id: string
  username: string | null
  first_name: string | null
  last_name: string | null
  language: TelegramLanguage
  status: TelegramUserStatus
  notification_preferences: NotificationPreferences
  last_interaction_at: string | null
  verification_code: string | null
  is_verified: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  user?: any
}

export interface TelegramSettings {
  id: string
  setting_key: string
  bot_token: string
  bot_username: string | null
  mode: TelegramBotMode
  webhook_url: string | null
  is_active: boolean
  send_notifications: boolean
  default_notification_preferences: NotificationPreferences
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface TelegramMessageLog {
  id: string
  telegram_user_id: string | null
  chat_id: string | null
  message_type: TelegramMessageType
  command: string | null
  message_text: string
  telegram_message_id: number | null
  status: TelegramMessageStatus
  error_message: string | null
  metadata: Record<string, any>
  created_at: string
}

export interface TelegramStatistics {
  total: number
  active: number
  verified: number
  unverified: number
}

export interface BotInfo {
  is_configured: boolean
  is_active: boolean
  bot_username: string | null
  send_notifications: boolean
}

export interface MyTelegramAccount {
  linked: boolean
  verified?: boolean
  telegram_user?: TelegramUser
}

export interface VerificationCodeResponse {
  verification_code: string
  instructions: string
}

// DTOs
export interface UpdateTelegramUserDto {
  language?: TelegramLanguage
  status?: TelegramUserStatus
  notification_preferences?: NotificationPreferences
}

export interface UpdateTelegramSettingsDto {
  bot_token?: string
  bot_username?: string
  mode?: TelegramBotMode
  webhook_url?: string
  is_active?: boolean
  send_notifications?: boolean
  default_notification_preferences?: NotificationPreferences
}

export interface SendTelegramMessageDto {
  user_id: string
  message: string
  inline_keyboard?: any
}

// Labels
export const TelegramLanguageLabels: Record<TelegramLanguage, string> = {
  [TelegramLanguage.RU]: 'Русский',
  [TelegramLanguage.EN]: 'English',
}

export const TelegramUserStatusLabels: Record<TelegramUserStatus, string> = {
  [TelegramUserStatus.ACTIVE]: 'Активен',
  [TelegramUserStatus.BLOCKED]: 'Заблокирован',
  [TelegramUserStatus.INACTIVE]: 'Неактивен',
}

export const TelegramBotModeLabels: Record<TelegramBotMode, string> = {
  [TelegramBotMode.POLLING]: 'Опрос (Polling)',
  [TelegramBotMode.WEBHOOK]: 'Webhook',
}

export const NotificationTypeLabels: Record<string, string> = {
  machine_offline: 'Машина оффлайн',
  machine_online: 'Машина онлайн',
  low_stock: 'Низкий запас',
  sales_milestone: 'Достижение продаж',
  maintenance_due: 'Требуется обслуживание',
  equipment_needs_maintenance: 'Оборудование требует обслуживания',
  equipment_low_stock: 'Низкий запас запчастей',
  equipment_washing_due: 'Требуется мойка',
  payment_failed: 'Ошибка оплаты',
  task_assigned: 'Назначена задача',
  task_completed: 'Задача выполнена',
  custom: 'Пользовательские уведомления',
}
