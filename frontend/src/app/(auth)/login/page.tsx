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
      // Note: Tokens are handled via httpOnly cookies by the backend
      login(response.user)
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
      // Note: Tokens are handled via httpOnly cookies by the backend
      login(response.user)
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
      <div className="p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Вход в систему</h1>
          <p className="mt-2 text-slate-400">Введите данные для входа в аккаунт</p>
        </div>

        <form onSubmit={handleCredentialsSubmit} className="space-y-5">
          <div>
            <label htmlFor="emailOrUsername" className="block text-sm font-medium text-slate-300 mb-2">
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
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              placeholder="user@example.com или username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
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
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            isLoading={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 hover:from-blue-600 hover:via-purple-600 hover:to-blue-700 transition-all hover:shadow-lg hover:shadow-blue-500/30"
            size="lg"
          >
            Войти
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-sm text-slate-500">демо доступ</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <div className="text-center text-sm text-slate-400">
          <p>admin@vendhub.ru / password</p>
        </div>
      </div>
    )
  }

  // 2FA step
  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Двухфакторная аутентификация</h1>
        <p className="mt-2 text-slate-400">
          {twoFAMode === 'totp'
            ? 'Введите код из приложения-аутентификатора'
            : 'Введите один из ваших резервных кодов'}
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-slate-800/50 border border-white/10 rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => {
            setTwoFAMode('totp')
            setTwoFACode('')
            setError(null)
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            twoFAMode === 'totp'
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield className="w-4 h-4" />
          Аутентификатор
        </button>
        <button
          type="button"
          onClick={() => {
            setTwoFAMode('backup')
            setTwoFACode('')
            setError(null)
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            twoFAMode === 'backup'
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Key className="w-4 h-4" />
          Резервный код
        </button>
      </div>

      <form onSubmit={handle2FASubmit} className="space-y-5">
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
              className="w-full text-center text-3xl tracking-[0.5em] font-mono px-4 py-4 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
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
              className="w-full text-center text-2xl tracking-widest font-mono px-4 py-4 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition uppercase"
              autoFocus
            />
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Button
            type="submit"
            disabled={loading || (twoFAMode === 'totp' ? twoFACode.length !== 6 : twoFACode.length < 8)}
            isLoading={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 hover:from-blue-600 hover:via-purple-600 hover:to-blue-700 transition-all hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            size="lg"
          >
            Подтвердить
          </Button>

          <button
            type="button"
            onClick={handleBackToCredentials}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться к логину
          </button>
        </div>
      </form>

      {/* Help Text */}
      <p className="mt-6 text-xs text-slate-500 text-center">
        {twoFAMode === 'totp' ? (
          <>
            Не можете получить код?{' '}
            <button
              type="button"
              onClick={() => setTwoFAMode('backup')}
              className="text-blue-400 hover:text-blue-300 hover:underline"
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
              className="text-blue-400 hover:text-blue-300 hover:underline"
            >
              Вернуться к аутентификатору
            </button>
          </>
        )}
      </p>
    </div>
  )
}
