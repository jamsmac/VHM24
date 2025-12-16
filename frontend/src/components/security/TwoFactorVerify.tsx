'use client'

import { useState } from 'react'
import { Shield, Key, Loader2, AlertTriangle } from 'lucide-react'
import { twoFactorApi } from '@/lib/two-factor-api'

interface TwoFactorVerifyProps {
  userId: string
  onSuccess: () => void
  onCancel?: () => void
}

type VerifyMode = 'totp' | 'backup'

export function TwoFactorVerify({ userId, onSuccess, onCancel }: TwoFactorVerifyProps) {
  const [mode, setMode] = useState<VerifyMode>('totp')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    if (mode === 'totp' && code.length !== 6) {
      setError('Код должен содержать 6 цифр')
      return
    }

    if (mode === 'backup' && code.length < 8) {
      setError('Резервный код должен содержать минимум 8 символов')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let result
      if (mode === 'totp') {
        result = await twoFactorApi.verify(userId, code)
      } else {
        result = await twoFactorApi.verifyBackupCode(userId, code)
      }

      if (result.verified) {
        onSuccess()
      } else {
        setError(
          mode === 'totp'
            ? 'Неверный код. Проверьте время на устройстве.'
            : 'Неверный резервный код.'
        )
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : ''
      if (errorMessage.includes('locked')) {
        setError('Учётная запись временно заблокирована из-за множества неудачных попыток.')
      } else {
        setError('Ошибка проверки. Попробуйте снова.')
      }
      console.error('2FA verify error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleVerify()
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          Двухфакторная аутентификация
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          {mode === 'totp'
            ? 'Введите код из приложения-аутентификатора'
            : 'Введите один из ваших резервных кодов'}
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex border border-gray-200 rounded-lg p-1 mb-4">
        <button
          onClick={() => {
            setMode('totp')
            setCode('')
            setError(null)
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'totp'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Shield className="w-4 h-4" />
          Код аутентификатора
        </button>
        <button
          onClick={() => {
            setMode('backup')
            setCode('')
            setError(null)
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'backup'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Key className="w-4 h-4" />
          Резервный код
        </button>
      </div>

      {/* Code Input */}
      <div className="mb-4">
        {mode === 'totp' ? (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '')
              setCode(value)
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="000000"
            className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="XXXXXXXX"
            className="w-full text-center text-xl tracking-widest font-mono px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
            autoFocus
          />
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleVerify}
          disabled={isLoading || (mode === 'totp' ? code.length !== 6 : code.length < 8)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Проверка...
            </>
          ) : (
            'Подтвердить'
          )}
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Отмена
          </button>
        )}
      </div>

      {/* Help Text */}
      <p className="mt-4 text-xs text-gray-500 text-center">
        {mode === 'totp' ? (
          <>
            Не можете получить код?{' '}
            <button
              onClick={() => setMode('backup')}
              className="text-blue-600 hover:underline"
            >
              Используйте резервный код
            </button>
          </>
        ) : (
          <>
            После использования резервный код будет недействителен.{' '}
            <button
              onClick={() => setMode('totp')}
              className="text-blue-600 hover:underline"
            >
              Вернуться к аутентификатору
            </button>
          </>
        )}
      </p>
    </div>
  )
}

export default TwoFactorVerify
