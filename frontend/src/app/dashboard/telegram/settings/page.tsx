'use client'

import React, { useEffect, useState } from 'react'
import { telegramApi } from '@/lib/telegram-api'
import { TelegramSettings, UpdateTelegramSettingsDto, TelegramBotMode, NotificationTypeLabels } from '@/types/telegram'
import { Save, Bot, Webhook, RefreshCw, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'

export default function TelegramSettingsPage() {
  const [settings, setSettings] = useState<TelegramSettings | null>(null)
  const [formData, setFormData] = useState<UpdateTelegramSettingsDto>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data = await telegramApi.getSettings()
      setSettings(data)
      setFormData({
        bot_token: '',
        bot_username: data.bot_username || '',
        mode: data.mode,
        webhook_url: data.webhook_url || '',
        is_active: data.is_active,
        send_notifications: data.send_notifications,
        default_notification_preferences: data.default_notification_preferences,
      })
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Only send bot_token if it's been changed
      const dataToSend: UpdateTelegramSettingsDto = {
        ...formData,
      }

      if (!formData.bot_token || formData.bot_token.includes('...')) {
        delete dataToSend.bot_token
      }

      await telegramApi.updateSettings(dataToSend)
      await fetchSettings()

      alert('Настройки сохранены! Бот будет перезапущен автоматически.')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Не удалось сохранить настройки')
    } finally {
      setSaving(false)
    }
  }

  const toggleNotificationDefault = (key: string) => {
    const currentPrefs = formData.default_notification_preferences || {}
    setFormData({
      ...formData,
      default_notification_preferences: {
        ...currentPrefs,
        [key]: !currentPrefs[key],
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Настройки Telegram бота</h1>
        <p className="text-gray-600 mt-1">
          Настройте бота для интеграции с Telegram
        </p>
      </div>

      {/* Bot Status */}
      <div className="backdrop-blur-md bg-white/90 rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Статус бота</h2>
              <p className="text-sm text-gray-600">
                {settings?.is_active ? 'Бот активен и работает' : 'Бот неактивен'}
              </p>
            </div>
          </div>
          {settings?.is_active ? (
            <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              Активен
            </span>
          ) : (
            <span className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
              <XCircle className="h-5 w-5" />
              Неактивен
            </span>
          )}
        </div>
      </div>

      {/* Bot Configuration */}
      <div className="backdrop-blur-md bg-white/90 rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Конфигурация бота</h2>

        <div className="space-y-6">
          {/* Bot Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bot Token
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Получите токен у{' '}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                @BotFather
              </a>{' '}
              в Telegram
            </p>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={formData.bot_token || settings?.bot_token || ''}
                onChange={(e) => setFormData({ ...formData, bot_token: e.target.value })}
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Bot Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bot Username
            </label>
            <input
              type="text"
              value={formData.bot_username || ''}
              onChange={(e) => setFormData({ ...formData, bot_username: e.target.value })}
              placeholder="my_vendhub_bot"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Bot Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Режим работы
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: TelegramBotMode.POLLING })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.mode === TelegramBotMode.POLLING
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <RefreshCw className={`h-6 w-6 mb-2 ${formData.mode === TelegramBotMode.POLLING ? 'text-blue-600' : 'text-gray-600'}`} />
                <div className="font-medium text-gray-900">Polling</div>
                <div className="text-xs text-gray-600">Рекомендуется для начала</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: TelegramBotMode.WEBHOOK })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.mode === TelegramBotMode.WEBHOOK
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <Webhook className={`h-6 w-6 mb-2 ${formData.mode === TelegramBotMode.WEBHOOK ? 'text-blue-600' : 'text-gray-600'}`} />
                <div className="font-medium text-gray-900">Webhook</div>
                <div className="text-xs text-gray-600">Для продакшена</div>
              </button>
            </div>
          </div>

          {/* Webhook URL (if webhook mode) */}
          {formData.mode === TelegramBotMode.WEBHOOK && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={formData.webhook_url || ''}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder="https://your-domain.com/api/telegram/webhook"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Активировать бота</div>
              <div className="text-sm text-gray-600">
                Включите бота для начала работы
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={`w-14 h-7 rounded-full transition-colors relative ${
                formData.is_active ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                  formData.is_active ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Send Notifications Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Отправлять уведомления</div>
              <div className="text-sm text-gray-600">
                Включить отправку уведомлений пользователям
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, send_notifications: !formData.send_notifications })}
              className={`w-14 h-7 rounded-full transition-colors relative ${
                formData.send_notifications ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                  formData.send_notifications ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Default Notification Preferences */}
      <div className="backdrop-blur-md bg-white/90 rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Настройки уведомлений по умолчанию
        </h2>
        <p className="text-gray-600 mb-6">
          Эти настройки будут применены для новых пользователей бота
        </p>

        <div className="space-y-3">
          {Object.entries(NotificationTypeLabels).map(([key, label]) => {
            const isEnabled = formData.default_notification_preferences?.[key] !== false

            return (
              <button
                key={key}
                onClick={() => toggleNotificationDefault(key)}
                className={`w-full flex items-center justify-between p-4 rounded-lg transition-all ${
                  isEnabled
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200'
                    : 'bg-gray-50 border-2 border-gray-200'
                }`}
              >
                <span className={`font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                  {label}
                </span>
                <div
                  className={`w-14 h-7 rounded-full transition-colors relative ${
                    isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                      isEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Сохранить настройки
            </>
          )}
        </button>
        <button
          onClick={fetchSettings}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          Отменить
        </button>
      </div>

      {/* Help Box */}
      <div className="backdrop-blur-md bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">💡 Как настроить бота</h3>
        <ol className="space-y-2 text-sm text-gray-700">
          <li>1. Создайте бота через @BotFather в Telegram</li>
          <li>2. Скопируйте полученный токен и вставьте его выше</li>
          <li>3. Укажите username вашего бота (без @)</li>
          <li>4. Выберите режим работы (Polling для начала)</li>
          <li>5. Активируйте бота переключателем</li>
          <li>6. Сохраните настройки</li>
        </ol>
      </div>
    </div>
  )
}
