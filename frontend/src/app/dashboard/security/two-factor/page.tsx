'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, ShieldCheck, ShieldOff, AlertTriangle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { twoFactorApi, TwoFactorStatus } from '@/lib/two-factor-api'
import { TwoFactorSetup } from '@/components/security/TwoFactorSetup'

export default function TwoFactorPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDisabling, setIsDisabling] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadStatus()
    }
  }, [user?.id])

  const loadStatus = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const data = await twoFactorApi.getStatus(user.id)
      setStatus(data)
    } catch (err) {
      console.error('Error loading 2FA status:', err)
      // Default to disabled if can't fetch status
      setStatus({ enabled: false })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!user?.id) return

    setIsDisabling(true)
    setError(null)

    try {
      await twoFactorApi.disable(user.id)
      setStatus({ enabled: false })
      setShowDisableConfirm(false)
    } catch (err) {
      setError('Не удалось отключить 2FA. Попробуйте позже.')
      console.error('Error disabling 2FA:', err)
    } finally {
      setIsDisabling(false)
    }
  }

  const handleSetupSuccess = () => {
    setShowSetup(false)
    loadStatus()
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Пожалуйста, войдите в систему</p>
      </div>
    )
  }

  // Show setup wizard
  if (showSetup) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setShowSetup(false)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к настройкам
        </button>

        <TwoFactorSetup
          userId={user.id}
          email={user.email || ''}
          onSuccess={handleSetupSuccess}
          onCancel={() => setShowSetup(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Двухфакторная аутентификация</h1>
          <p className="mt-2 text-gray-600">
            Управление дополнительной защитой вашей учётной записи
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/security')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          К безопасности
        </button>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              status?.enabled ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {status?.enabled ? (
                <ShieldCheck className="w-6 h-6 text-green-600" />
              ) : (
                <ShieldOff className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                {status?.enabled ? '2FA включена' : '2FA отключена'}
              </h2>
              <p className="text-gray-600 mt-1">
                {status?.enabled
                  ? 'Ваша учётная запись защищена двухфакторной аутентификацией. При входе вам потребуется код из приложения-аутентификатора.'
                  : 'Двухфакторная аутентификация не настроена. Рекомендуем включить её для дополнительной защиты.'}
              </p>

              {status?.enabled && status.enabledAt && (
                <p className="text-sm text-gray-500 mt-2">
                  Включена: {new Date(status.enabledAt).toLocaleDateString('ru-RU')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          {status?.enabled ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowSetup(true)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Перенастроить 2FA
                </button>
              </div>
              <button
                onClick={() => setShowDisableConfirm(true)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                Отключить 2FA
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSetup(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Включить 2FA
            </button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* How it works */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Как это работает</h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0">1</span>
              При входе вы вводите свой пароль как обычно
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0">2</span>
              Затем вам нужно ввести 6-значный код из приложения-аутентификатора
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0">3</span>
              Код меняется каждые 30 секунд, что делает взлом практически невозможным
            </li>
          </ul>
        </div>

        {/* Backup codes info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Резервные коды</h3>
          <p className="text-sm text-gray-600 mb-3">
            При настройке 2FA вы получите 10 резервных кодов. Используйте их, если потеряете доступ к аутентификатору.
          </p>
          {status?.enabled && status.backupCodesRemaining !== undefined && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              status.backupCodesRemaining > 3
                ? 'bg-green-100 text-green-700'
                : status.backupCodesRemaining > 0
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
            }`}>
              <span className="font-medium">{status.backupCodesRemaining}</span>
              резервных кодов осталось
            </div>
          )}
        </div>
      </div>

      {/* Disable Confirmation Modal */}
      {showDisableConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Отключить 2FA?
              </h3>
            </div>

            <p className="text-gray-600 mb-4">
              После отключения двухфакторной аутентификации ваша учётная запись будет менее защищена.
              Для входа будет достаточно только пароля.
            </p>

            {error && (
              <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDisableConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleDisable2FA}
                disabled={isDisabling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDisabling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Отключение...
                  </>
                ) : (
                  'Да, отключить'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
