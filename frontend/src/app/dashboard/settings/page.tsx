'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Settings as SettingsIcon, Bell, Globe, Database, Shield } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    company_name: 'VendHub',
    contact_email: 'info@vendhub.ru',
    contact_phone: '+7 (999) 123-45-67',
    currency: 'RUB',
    timezone: 'Europe/Moscow',
    notifications_enabled: true,
    email_notifications: true,
    telegram_notifications: false,
    low_stock_threshold: 10,
    overdue_task_hours: 4,
  })

  const handleSave = () => {
    alert('Настройки сохранены')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Настройки системы</h1>
        <p className="mt-2 text-gray-600">Конфигурация приложения</p>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Общие настройки</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название компании
            </label>
            <input
              type="text"
              value={settings.company_name}
              onChange={(e) => setSettings({...settings, company_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={settings.contact_email}
              onChange={(e) => setSettings({...settings, contact_email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Телефон
            </label>
            <input
              type="tel"
              value={settings.contact_phone}
              onChange={(e) => setSettings({...settings, contact_phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Валюта
            </label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings({...settings, currency: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="RUB">Российский рубль (₽)</option>
              <option value="USD">Доллар США ($)</option>
              <option value="EUR">Евро (€)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Localization */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Локализация</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Часовой пояс
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({...settings, timezone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="Europe/Moscow">Москва (UTC+3)</option>
              <option value="Europe/Kiev">Киев (UTC+2)</option>
              <option value="Asia/Almaty">Алматы (UTC+6)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Уведомления</h3>
        </div>
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.notifications_enabled}
              onChange={(e) => setSettings({...settings, notifications_enabled: e.target.checked})}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
            />
            <span className="text-sm font-medium">Включить уведомления</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.email_notifications}
              onChange={(e) => setSettings({...settings, email_notifications: e.target.checked})}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
            />
            <span className="text-sm font-medium">Email уведомления</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.telegram_notifications}
              onChange={(e) => setSettings({...settings, telegram_notifications: e.target.checked})}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
            />
            <span className="text-sm font-medium">Telegram уведомления</span>
          </label>
        </div>
      </div>

      {/* Business Logic */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Бизнес-логика</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Порог низкого запаса
            </label>
            <input
              type="number"
              value={settings.low_stock_threshold}
              onChange={(e) => setSettings({...settings, low_stock_threshold: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-sm text-gray-500 mt-1">
              Оповещение при количестве товара ниже этого значения
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Часов до эскалации задачи
            </label>
            <input
              type="number"
              value={settings.overdue_task_hours}
              onChange={(e) => setSettings({...settings, overdue_task_hours: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-sm text-gray-500 mt-1">
              Создание инцидента при просрочке задачи более этого времени
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave}>
          Сохранить изменения
        </Button>
        <Button variant="secondary">
          Сбросить
        </Button>
      </div>
    </div>
  )
}
