'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/lib/auth-api'
import { Button } from '@/components/ui/button'
import { LogIn, Shield, Key, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/types/common'

type LoginStep = 'credentials' | '2fa'
type TwoFAMode = 'totp' | 'backup'

interface TwoFAData {
  userId: string
  tempToken: string
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  // Step management
  const [step, setStep] = useState<LoginStep>('credentials')
  const [twoFAData, setTwoFAData] = useState<TwoFAData | null>(null)
  const [twoFAMode, setTwoFAMode] = useState<TwoFAMode>('totp')

  // Form state
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [twoFACode, setTwoFACode] = useState('')

  // Loading states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // SEC-1: Backend sets httpOnly cookies automatically
      // We only need to store user data for UI display
      const response = await authApi.login({ email: emailOrUsername, password })

      // Check if 2FA is required
      // When 2FA is required, backend returns access_token as temporary token
      if (response.requires_2fa && response.access_token) {
        setTwoFAData({
          userId: response.user?.id || '',
          tempToken: response.access_token,
        })
        setStep('2fa')
        setLoading(false)
        return
      }

      // No 2FA required, complete login
      login(
        response.access_token,
        response.user,
        response.refresh_token,
        response.expires_in
      )
      toast.success('Вход выполнен успешно!')
      router.push('/dashboard')
    } catch (error: unknown) {
      console.error('Login error:', error)
      setError(getErrorMessage(error) || 'Ошибка входа. Проверьте логин и пароль.')
    } finally {
      setLoading(false)
    }
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!twoFAData) {
      setError('Ошибка сессии. Попробуйте войти снова.')
      setStep('credentials')
      return
    }

    // Validate code length
    if (twoFAMode === 'totp' && twoFACode.length !== 6) {
      setError('Код должен содержать 6 цифр')
      return
    }

    if (twoFAMode === 'backup' && twoFACode.length < 8) {
      setError('Резервный код должен содержать минимум 8 символов')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let response

      if (twoFAMode === 'totp') {
        response = await authApi.verify2FA({
          temp_token: twoFAData.tempToken,
          token: twoFACode,
        })
      } else {
        response = await authApi.verify2FABackup({
          temp_token: twoFAData.tempToken,
          backup_code: twoFACode,
        })
      }

      // Complete login
      login(
        response.access_token,
        response.user,
        response.refresh_token,
        response.expires_in
      )
      toast.success('Вход выполнен успешно!')
      router.push('/dashboard')
    } catch (error: unknown) {
      console.error('2FA verification error:', error)
      const message = getErrorMessage(error)

      if (message?.toLowerCase().includes('locked')) {
        setError('Учётная запись временно заблокирована из-за множества неудачных попыток.')
      } else {
        setError(
          twoFAMode === 'totp'
            ? 'Неверный код. Проверьте время на устройстве и попробуйте снова.'
            : 'Неверный резервный код.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBackToCredentials = () => {
    setStep('credentials')
    setTwoFAData(null)
    setTwoFACode('')
    setError(null)
  }

  // Credentials step
  if (step === 'credentials') {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">VendHub Manager</h1>
          <p className="mt-2 text-gray-600">Система управления вендинговыми автоматами</p>
        </div>

        <form onSubmit={handleCredentialsSubmit} className="space-y-6">
          <div>
            <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700 mb-2">
              Email или имя пользователя
            </label>
            <input
              id="emailOrUsername"
              type="text"
              required
              value={emailOrUsername}
              onChange={(e) => {
                setEmailOrUsername(e.target.value)
                setError(null)
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              placeholder="user@example.com или username"
            />
            <p className="mt-2 text-xs text-gray-500">Введите ваш email или имя пользователя</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            isLoading={loading}
            className="w-full py-3"
            size="lg"
          >
            Войти
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>По умолчанию: admin@vendhub.ru / password</p>
        </div>
      </div>
    )
  }

  // 2FA step
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4">
          <Shield className="h-6 w-6 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Двухфакторная аутентификация</h1>
        <p className="mt-2 text-gray-600 text-sm">
          {twoFAMode === 'totp'
            ? 'Введите код из приложения-аутентификатора'
            : 'Введите один из ваших резервных кодов'}
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex border border-gray-200 rounded-lg p-1 mb-6">
        <button
          type="button"
          onClick={() => {
            setTwoFAMode('totp')
            setTwoFACode('')
            setError(null)
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            twoFAMode === 'totp'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Shield className="w-4 h-4" />
          Код аутентификатора
        </button>
        <button
          type="button"
          onClick={() => {
            setTwoFAMode('backup')
            setTwoFACode('')
            setError(null)
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            twoFAMode === 'backup'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Key className="w-4 h-4" />
          Резервный код
        </button>
      </div>

      <form onSubmit={handle2FASubmit} className="space-y-6">
        <div>
          {twoFAMode === 'totp' ? (
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={twoFACode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                setTwoFACode(value)
                setError(null)
              }}
              placeholder="000000"
              className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={twoFACode}
              onChange={(e) => {
                setTwoFACode(e.target.value.toUpperCase())
                setError(null)
              }}
              placeholder="XXXXXXXX"
              className="w-full text-center text-xl tracking-widest font-mono px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
              autoFocus
            />
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Button
            type="submit"
            disabled={loading || (twoFAMode === 'totp' ? twoFACode.length !== 6 : twoFACode.length < 8)}
            className="w-full py-3"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Проверка...
              </>
            ) : (
              'Подтвердить'
            )}
          </Button>

          <button
            type="button"
            onClick={handleBackToCredentials}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться к логину
          </button>
        </div>
      </form>

      {/* Help Text */}
      <p className="mt-6 text-xs text-gray-500 text-center">
        {twoFAMode === 'totp' ? (
          <>
            Не можете получить код?{' '}
            <button
              type="button"
              onClick={() => setTwoFAMode('backup')}
              className="text-blue-600 hover:underline"
            >
              Используйте резервный код
            </button>
          </>
        ) : (
          <>
            После использования резервный код будет недействителен.{' '}
            <button
              type="button"
              onClick={() => setTwoFAMode('totp')}
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
