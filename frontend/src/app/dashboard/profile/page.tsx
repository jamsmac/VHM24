'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  profileApi,
  getRoleLabel,
  getStatusLabel,
  getStatusColor,
  formatUserAgent,
  getDeviceIcon,
  type TwoFactorSetup,
  type UserProfile,
  type Session,
} from '@/lib/profile-api'
import {
  notificationsApi,
  NotificationType,
  NotificationChannel,
  notificationTypeLabels,
  channelLabels,
} from '@/lib/notifications-api'
import { Button } from '@/components/ui/button'
import {
  User,
  Shield,
  Bell,
  Key,
  Smartphone,
  Monitor,
  LogOut,
  CheckCircle,
  XCircle,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  MapPin,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

type TabType = 'profile' | 'security' | 'notifications'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const queryClient = useQueryClient()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getProfile,
  })

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: profileApi.getActiveSessions,
    enabled: activeTab === 'security',
  })

  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationsApi.getPreferences,
    enabled: activeTab === 'notifications',
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Профиль</h1>
        <p className="mt-2 text-gray-600">
          Управление профилем, безопасностью и уведомлениями
        </p>
      </div>

      {/* Profile Card */}
      {profile && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="h-10 w-10 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {profile.full_name}
              </h2>
              <p className="text-gray-500">{profile.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-600">
                  {getRoleLabel(profile.role)}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(profile.status)}`}>
                  {getStatusLabel(profile.status)}
                </span>
                {profile.is_2fa_enabled && (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-600">
                    <Shield className="h-3 w-3" />
                    2FA
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <User className="h-4 w-4" />
            Профиль
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'security'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Shield className="h-4 w-4" />
            Безопасность
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'notifications'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Bell className="h-4 w-4" />
            Уведомления
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <ProfileTab profile={profile} isLoading={profileLoading} />
      )}

      {activeTab === 'security' && (
        <SecurityTab
          profile={profile}
          sessions={sessions || []}
          isLoading={sessionsLoading}
        />
      )}

      {activeTab === 'notifications' && (
        <NotificationsTab
          preferences={preferences || []}
          isLoading={preferencesLoading}
        />
      )}
    </div>
  )
}

// Profile Tab Component
function ProfileTab({ profile, isLoading }: { profile: UserProfile | undefined; isLoading: boolean }) {
  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!profile) {
    return <div className="text-center py-8 text-gray-500">Не удалось загрузить профиль</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Личные данные</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">ФИО</p>
              <p className="font-medium text-gray-900">{profile.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{profile.email}</p>
            </div>
          </div>
          {profile.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Телефон</p>
                <p className="font-medium text-gray-900">{profile.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Информация об аккаунте</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Роль</p>
              <p className="font-medium text-gray-900">{getRoleLabel(profile.role)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Дата регистрации</p>
              <p className="font-medium text-gray-900">
                {new Date(profile.created_at).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>
          {profile.last_login_at && (
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Последний вход</p>
                <p className="font-medium text-gray-900">
                  {formatDistanceToNow(new Date(profile.last_login_at), {
                    addSuffix: true,
                    locale: ru,
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {profile.telegram_username && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Telegram</h3>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Аккаунт</p>
              <p className="font-medium text-gray-900">@{profile.telegram_username}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Security Tab Component
function SecurityTab({
  profile,
  sessions,
  isLoading,
}: {
  profile: UserProfile | undefined
  sessions: Session[]
  isLoading: boolean
}) {
  const queryClient = useQueryClient()
  const [showSetup2FA, setShowSetup2FA] = useState(false)
  const [setup2FAData, setSetup2FAData] = useState<TwoFactorSetup | null>(null)
  const [verificationCode, setVerificationCode] = useState('')

  const setup2FAMutation = useMutation({
    mutationFn: profileApi.setup2FA,
    onSuccess: (data) => {
      setSetup2FAData(data)
      setShowSetup2FA(true)
    },
    onError: () => {
      toast.error('Ошибка при настройке 2FA')
    },
  })

  const enable2FAMutation = useMutation({
    mutationFn: ({ secret, token }: { secret: string; token: string }) =>
      profileApi.enable2FA(secret, token),
    onSuccess: () => {
      toast.success('2FA успешно включена')
      setShowSetup2FA(false)
      setSetup2FAData(null)
      setVerificationCode('')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: () => {
      toast.error('Неверный код подтверждения')
    },
  })

  const disable2FAMutation = useMutation({
    mutationFn: (token: string) => profileApi.disable2FA(token),
    onSuccess: () => {
      toast.success('2FA отключена')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: () => {
      toast.error('Неверный код подтверждения')
    },
  })

  const revokeSessionMutation = useMutation({
    mutationFn: profileApi.revokeSession,
    onSuccess: () => {
      toast.success('Сессия завершена')
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
    onError: () => {
      toast.error('Ошибка при завершении сессии')
    },
  })

  return (
    <div className="space-y-6">
      {/* 2FA Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Key className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Двухфакторная аутентификация</h3>
              <p className="text-sm text-gray-500">
                Дополнительный уровень защиты для вашего аккаунта
              </p>
            </div>
          </div>
          {profile?.is_2fa_enabled ? (
            <span className="flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-600">
              <CheckCircle className="h-4 w-4" />
              Включена
            </span>
          ) : (
            <span className="flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-600">
              <XCircle className="h-4 w-4" />
              Отключена
            </span>
          )}
        </div>

        {!profile?.is_2fa_enabled && !showSetup2FA && (
          <Button
            onClick={() => setup2FAMutation.mutate()}
            disabled={setup2FAMutation.isPending}
          >
            {setup2FAMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Настроить 2FA
          </Button>
        )}

        {showSetup2FA && setup2FAData && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Настройка 2FA</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  1. Отсканируйте QR-код в приложении аутентификатора (Google Authenticator, Authy и т.д.)
                </p>
                <div className="bg-white p-4 rounded-lg border inline-block">
                  <img src={setup2FAData.qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  2. Или введите код вручную:
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <code className="px-3 py-2 bg-gray-100 rounded text-sm font-mono">
                    {setup2FAData.manualEntryKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(setup2FAData.manualEntryKey)
                      toast.success('Скопировано')
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  3. Введите код из приложения для подтверждения:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md text-center font-mono text-lg"
                    maxLength={6}
                  />
                  <Button
                    onClick={() =>
                      enable2FAMutation.mutate({
                        secret: setup2FAData.secret,
                        token: verificationCode,
                      })
                    }
                    disabled={verificationCode.length !== 6 || enable2FAMutation.isPending}
                  >
                    Подтвердить
                  </Button>
                  <Button variant="outline" onClick={() => setShowSetup2FA(false)}>
                    Отмена
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {profile?.is_2fa_enabled && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-3">
              Для отключения 2FA введите код из приложения аутентификатора:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-32 px-3 py-2 border border-gray-300 rounded-md text-center font-mono text-lg"
                maxLength={6}
              />
              <Button
                variant="outline"
                onClick={() => disable2FAMutation.mutate(verificationCode)}
                disabled={verificationCode.length !== 6 || disable2FAMutation.isPending}
              >
                Отключить 2FA
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Monitor className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Активные сессии</h3>
              <p className="text-sm text-gray-500">
                Устройства, с которых выполнен вход в аккаунт
              </p>
            </div>
          </div>
          <span className="text-sm text-gray-500">
            {sessions.length} активных
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 border rounded-lg ${
                  session.is_current ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getDeviceIcon(session.device_type)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {formatUserAgent(session.user_agent)}
                        </p>
                        {session.is_current && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-600">
                            Текущая
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {session.ip_address}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDistanceToNow(new Date(session.created_at), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!session.is_current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeSessionMutation.mutate(session.id)}
                      disabled={revokeSessionMutation.isPending}
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Завершить
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Notifications Tab Component
function NotificationsTab({
  preferences,
  isLoading,
}: {
  preferences: any[]
  isLoading: boolean
}) {
  const queryClient = useQueryClient()

  const updatePreferenceMutation = useMutation({
    mutationFn: ({
      type,
      channel,
      isEnabled,
    }: {
      type: NotificationType
      channel: NotificationChannel
      isEnabled: boolean
    }) => notificationsApi.updatePreference(type, channel, { is_enabled: isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
      toast.success('Настройки сохранены')
    },
    onError: () => {
      toast.error('Ошибка при сохранении')
    },
  })

  // Group preferences by notification type
  const groupedPreferences = preferences.reduce((acc, pref) => {
    if (!acc[pref.notification_type]) {
      acc[pref.notification_type] = {}
    }
    acc[pref.notification_type][pref.channel] = pref
    return acc
  }, {} as Record<string, Record<string, any>>)

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const channels = Object.values(NotificationChannel)
  const types = Object.values(NotificationType)

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Настройки уведомлений</h3>
        <p className="text-sm text-gray-500 mt-1">
          Выберите, какие уведомления вы хотите получать и через какие каналы
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Тип уведомления
              </th>
              {channels.map((channel) => (
                <th
                  key={channel}
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {channelLabels[channel]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {types.map((type) => (
              <tr key={type} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {notificationTypeLabels[type]}
                </td>
                {channels.map((channel) => {
                  const pref = groupedPreferences[type]?.[channel]
                  const isEnabled = pref?.is_enabled ?? false
                  return (
                    <td key={channel} className="px-6 py-4 text-center">
                      <button
                        onClick={() =>
                          updatePreferenceMutation.mutate({
                            type,
                            channel,
                            isEnabled: !isEnabled,
                          })
                        }
                        disabled={updatePreferenceMutation.isPending}
                        className={`
                          p-1.5 rounded-full transition-colors
                          ${isEnabled
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }
                        `}
                      >
                        {isEnabled ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
