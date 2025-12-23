'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Settings as SettingsIcon,
  Bell,
  Globe,
  Database,
  Smartphone,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    company_name: 'VendHub',
    contact_email: 'info@vendhub.uz',
    contact_phone: '+998 99 123-45-67',
    currency: 'UZS',
    timezone: 'Asia/Tashkent',
    notifications_enabled: true,
    email_notifications: true,
    telegram_notifications: false,
    low_stock_threshold: 10,
    overdue_task_hours: 4,
  })

  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications()

  const [testSent, setTestSent] = useState(false)

  const handleSave = () => {
    alert('Настройки сохранены')
  }

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  const handleTestNotification = async () => {
    const success = await sendTestNotification()
    if (success) {
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
    }
  }

  const getPushStatusIcon = () => {
    if (pushLoading) return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
    if (!isSupported) return <XCircle className="h-4 w-4 text-gray-400" />
    if (permission === 'denied') return <XCircle className="h-4 w-4 text-red-500" />
    if (isSubscribed) return <CheckCircle2 className="h-4 w-4 text-green-500" />
    return <AlertCircle className="h-4 w-4 text-yellow-500" />
  }

  const getPushStatusText = () => {
    if (pushLoading) return 'Загрузка...'
    if (!isSupported) return 'Не поддерживается браузером'
    if (permission === 'denied') return 'Заблокировано в браузере'
    if (isSubscribed) return 'Включено'
    return 'Выключено'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Настройки системы</h1>
        <p className="mt-2 text-muted-foreground">Конфигурация приложения</p>
      </div>

      {/* General Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Общие настройки</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Название компании
            </label>
            <input
              type="text"
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <input
              type="email"
              value={settings.contact_email}
              onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Телефон</label>
            <input
              type="tel"
              value={settings.contact_phone}
              onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Валюта</label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:ring-2 focus:ring-primary"
            >
              <option value="UZS">Узбекский сум (сўм)</option>
              <option value="USD">Доллар США ($)</option>
              <option value="EUR">Евро (€)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Localization */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Локализация</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Часовой пояс</label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:ring-2 focus:ring-primary"
            >
              <option value="Asia/Tashkent">Ташкент (UTC+5)</option>
              <option value="Europe/Moscow">Москва (UTC+3)</option>
              <option value="Europe/Kiev">Киев (UTC+2)</option>
              <option value="Asia/Almaty">Алматы (UTC+6)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Уведомления</h3>
        </div>
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.notifications_enabled}
              onChange={(e) =>
                setSettings({ ...settings, notifications_enabled: e.target.checked })
              }
              className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
            />
            <span className="text-sm font-medium text-foreground">Включить уведомления</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.email_notifications}
              onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })}
              className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
            />
            <span className="text-sm font-medium text-foreground">Email уведомления</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.telegram_notifications}
              onChange={(e) =>
                setSettings({ ...settings, telegram_notifications: e.target.checked })
              }
              className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
            />
            <span className="text-sm font-medium text-foreground">Telegram уведомления</span>
          </label>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Push-уведомления браузера</h3>
        </div>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {getPushStatusIcon()}
              <div>
                <p className="text-sm font-medium text-foreground">Статус: {getPushStatusText()}</p>
                {pushError && <p className="text-xs text-red-500 mt-1">{pushError}</p>}
              </div>
            </div>

            {isSupported && permission !== 'denied' && (
              <Button
                variant={isSubscribed ? 'outline' : 'default'}
                size="sm"
                onClick={handlePushToggle}
                disabled={pushLoading}
              >
                {pushLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {isSubscribed ? 'Отключить' : 'Включить'}
              </Button>
            )}
          </div>

          {/* Test notification button */}
          {isSubscribed && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                disabled={pushLoading}
              >
                {pushLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                Отправить тестовое уведомление
              </Button>
              {testSent && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Отправлено!
                </span>
              )}
            </div>
          )}

          {/* Help text */}
          <p className="text-sm text-muted-foreground">
            Push-уведомления позволяют получать оповещения о важных событиях даже когда браузер
            закрыт. Работает на компьютерах и мобильных устройствах.
          </p>

          {permission === 'denied' && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">
                Уведомления заблокированы в настройках браузера. Чтобы разрешить их, нажмите на
                значок замка в адресной строке и измените настройки уведомлений для этого сайта.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Business Logic */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Бизнес-логика</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Порог низкого запаса
            </label>
            <input
              type="number"
              value={settings.low_stock_threshold}
              onChange={(e) =>
                setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:ring-2 focus:ring-primary"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Оповещение при количестве товара ниже этого значения
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Часов до эскалации задачи
            </label>
            <input
              type="number"
              value={settings.overdue_task_hours}
              onChange={(e) =>
                setSettings({ ...settings, overdue_task_hours: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:ring-2 focus:ring-primary"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Создание инцидента при просрочке задачи более этого времени
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave}>Сохранить изменения</Button>
        <Button variant="outline">Сбросить</Button>
      </div>
    </div>
  )
}
