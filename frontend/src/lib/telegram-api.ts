import { apiClient } from './axios'
import type {
  TelegramUser,
  TelegramSettings,
  TelegramStatistics,
  BotInfo,
  MyTelegramAccount,
  VerificationCodeResponse,
  UpdateTelegramUserDto,
  UpdateTelegramSettingsDto,
  SendTelegramMessageDto,
} from '@/types/telegram'

export const telegramApi = {
  // Telegram Users
  getAllUsers: async (): Promise<TelegramUser[]> => {
    const response = await apiClient.get('/telegram/users')
    return response.data
  },

  getUserStatistics: async (): Promise<TelegramStatistics> => {
    const response = await apiClient.get('/telegram/users/statistics')
    return response.data
  },

  getMyAccount: async (): Promise<MyTelegramAccount> => {
    const response = await apiClient.get('/telegram/users/me')
    return response.data
  },

  generateVerificationCode: async (): Promise<VerificationCodeResponse> => {
    const response = await apiClient.post('/telegram/users/generate-code')
    return response.data
  },

  unlinkMyAccount: async (): Promise<{ message: string }> => {
    const response = await apiClient.delete('/telegram/users/me')
    return response.data
  },

  getUserById: async (id: string): Promise<TelegramUser> => {
    const response = await apiClient.get(`/telegram/users/${id}`)
    return response.data
  },

  updateUser: async (id: string, data: UpdateTelegramUserDto): Promise<TelegramUser> => {
    const response = await apiClient.put(`/telegram/users/${id}`, data)
    return response.data
  },

  deleteUser: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/telegram/users/${id}`)
    return response.data
  },

  // Telegram Settings
  getSettings: async (): Promise<TelegramSettings> => {
    const response = await apiClient.get('/telegram/settings')
    return response.data
  },

  getBotInfo: async (): Promise<BotInfo> => {
    const response = await apiClient.get('/telegram/settings/info')
    return response.data
  },

  updateSettings: async (data: UpdateTelegramSettingsDto): Promise<TelegramSettings> => {
    const response = await apiClient.put('/telegram/settings', data)
    return response.data
  },

  // Telegram Notifications
  sendNotification: async (data: SendTelegramMessageDto): Promise<{ message: string }> => {
    const response = await apiClient.post('/telegram/notifications/send', data)
    return response.data
  },

  sendTestNotification: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/telegram/notifications/test', { user_id: userId })
    return response.data
  },
}
