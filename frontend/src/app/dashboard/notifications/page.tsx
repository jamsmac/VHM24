'use client'

import { useState, useEffect } from 'react'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { MobileNav } from '@/components/layout/MobileNav'
import { Bell, BellOff, CheckCheck, Trash2, Settings } from 'lucide-react'
import { toast } from 'react-toastify'
import { formatDateTime } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  body: string
  type: 'task' | 'system' | 'alert' | 'info'
  read: boolean
  created_at: Date
  data?: { url?: string }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [isPushEnabled, setIsPushEnabled] = useState(false)

  useEffect(() => {
    checkPushPermission()
    setNotifications([
      {
        id: '1',
        title: 'Новая задача назначена',
        body: 'Пополнение аппарата M-001',
        type: 'task',
        read: false,
        created_at: new Date(Date.now() - 30 * 60 * 1000),
        data: { url: '/dashboard/tasks/1' },
      },
      {
        id: '2',
        title: 'Задача завершена',
        body: 'Обслуживание M-003 завершено',
        type: 'info',
        read: true,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    ])
  }, [])

  const checkPushPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsPushEnabled(Notification.permission === 'granted')
    }
  }

  const requestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Push уведомления не поддерживаются')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setIsPushEnabled(true)
      toast.success('Push уведомления включены!')
    }
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    toast.success('Все отмечены как прочитанные')
  }

  const clearAll = () => {
    if (confirm('Удалить все уведомления?')) {
      setNotifications([])
      toast.success('Все удалены')
    }
  }

  const filtered = notifications.filter(n => filter === 'all' ? true : !n.read)
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader title="Уведомления" actions={
        <button onClick={requestPushPermission} className="p-2 rounded-lg active:bg-gray-100 touch-manipulation">
          <Settings className="h-6 w-6 text-gray-700" />
        </button>
      } />

      <div className="p-4 space-y-4">
        {!isPushEnabled && (
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
            <div className="flex items-start gap-3">
              <Bell className="h-8 w-8 text-indigo-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-indigo-900 mb-2">Включите Push уведомления</h3>
                <p className="text-sm text-indigo-700 mb-3">Получайте уведомления о новых задачах</p>
                <button onClick={requestPushPermission}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium active:bg-indigo-700 touch-manipulation">
                  Включить уведомления
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium touch-manipulation ${
                filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'
              }`}>
              Все ({notifications.length})
            </button>
            <button onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium touch-manipulation ${
                filter === 'unread' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'
              }`}>
              Непрочитанные ({unreadCount})
            </button>
          </div>
          {notifications.length > 0 && (
            <button onClick={markAllAsRead} className="p-2 rounded-lg bg-white border active:bg-gray-50 touch-manipulation">
              <CheckCheck className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Нет уведомлений</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === 'unread' ? 'Все прочитаны' : 'Уведомления появятся здесь'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => (
              <div key={n.id} className={`bg-white rounded-xl p-4 border transition-all touch-manipulation ${
                n.read ? 'border-gray-200' : 'border-indigo-300 shadow-sm'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                    n.type === 'task' ? 'bg-blue-100' :
                    n.type === 'alert' ? 'bg-red-100' :
                    n.type === 'info' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {n.type === 'task' ? '📋' : n.type === 'alert' ? '⚠️' : 'ℹ️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-semibold ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {n.title}
                      </h3>
                      {!n.read && <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1.5" />}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{n.body}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{formatDateTime(n.created_at)}</span>
                      <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
                        className="p-1.5 rounded-lg active:bg-gray-100 touch-manipulation">
                        <Trash2 className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {notifications.length > 0 && (
          <button onClick={clearAll}
            className="w-full bg-red-50 text-red-700 px-4 py-3 rounded-lg font-medium border border-red-200 active:bg-red-100 touch-manipulation">
            <Trash2 className="h-5 w-5 inline-block mr-2" />
            Очистить все уведомления
          </button>
        )}
      </div>

      <MobileNav />
    </div>
  )
}
