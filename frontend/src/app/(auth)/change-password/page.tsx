'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/lib/utils'
import apiClient from '@/lib/axios'

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null)

  // Validate password strength
  const validatePasswordStrength = (password: string) => {
    if (password.length < 8) {
      setPasswordStrength('weak')
      return false
    }

    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*\-_=+]/.test(password)

    const strengthScore = [hasUppercase, hasLowercase, hasNumbers, hasSpecial].filter(Boolean).length

    if (strengthScore >= 3) {
      setPasswordStrength('strong')
      return true
    } else if (strengthScore >= 2) {
      setPasswordStrength('medium')
      return true
    } else {
      setPasswordStrength('weak')
      return false
    }
  }

  const handlePasswordChange = (value: string) => {
    setNewPassword(value)
    if (value) {
      validatePasswordStrength(value)
    } else {
      setPasswordStrength(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate inputs
      if (!newPassword || !confirmPassword) {
        toast.error('Пожалуйста, заполните все поля')
        setLoading(false)
        return
      }

      if (newPassword.length < 8) {
        toast.error('Пароль должен содержать минимум 8 символов')
        setLoading(false)
        return
      }

      if (!validatePasswordStrength(newPassword)) {
        toast.error(
          'Пароль должен содержать:\n' +
          '- Минимум 8 символов\n' +
          '- Прописные и строчные буквы\n' +
          '- Цифры\n' +
          '- Специальные символы (!@#$%^&*)'
        )
        setLoading(false)
        return
      }

      if (newPassword !== confirmPassword) {
        toast.error('Пароли не совпадают')
        setLoading(false)
        return
      }

      // Call API to change password
      const response = await apiClient.post('/auth/change-password', {
        newPassword,
      })

      if (response.status === 200 || response.status === 204) {
        toast.success('Пароль успешно изменен!')
        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      }
    } catch (error: unknown) {
      console.error('Change password error:', error)
      toast.error(getErrorMessage(error, 'Ошибка при изменении пароля. Попробуйте еще раз.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4">
          <Lock className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Изменить пароль</h1>
        <p className="mt-2 text-gray-600">Установите новый пароль для вашей учетной записи</p>
        {user && <p className="mt-3 text-sm text-gray-500">Пользователь: <strong>{user.full_name}</strong></p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* New Password Field */}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Новый пароль
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => handlePasswordChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      passwordStrength === 'weak'
                        ? 'w-1/3 bg-red-500'
                        : passwordStrength === 'medium'
                          ? 'w-2/3 bg-yellow-500'
                          : 'w-full bg-green-500'
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-semibold ${
                    passwordStrength === 'weak'
                      ? 'text-red-600'
                      : passwordStrength === 'medium'
                        ? 'text-yellow-600'
                        : 'text-green-600'
                  }`}
                >
                  {passwordStrength === 'weak' && 'Слабый'}
                  {passwordStrength === 'medium' && 'Средний'}
                  {passwordStrength === 'strong' && 'Сильный'}
                </span>
              </div>

              {/* Password Requirements */}
              <div className="text-xs text-gray-600 space-y-1">
                <p className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                  ✓ Минимум 8 символов
                </p>
                <p className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>
                  ✓ Прописные буквы (A-Z)
                </p>
                <p className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>
                  ✓ Строчные буквы (a-z)
                </p>
                <p className={/\d/.test(newPassword) ? 'text-green-600' : ''}>
                  ✓ Цифры (0-9)
                </p>
                <p className={/[!@#$%^&*\-_=+]/.test(newPassword) ? 'text-green-600' : ''}>
                  ✓ Специальные символы (!@#$%^&*)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Подтвердите пароль
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-indigo-500 transition pr-10 ${
                confirmPassword && newPassword !== confirmPassword
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-indigo-500'
              }`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-2 text-sm text-red-600">Пароли не совпадают</p>
          )}

          {confirmPassword && newPassword === confirmPassword && (
            <p className="mt-2 text-sm text-green-600">✓ Пароли совпадают</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          isLoading={loading}
          className="w-full py-3"
          size="lg"
          disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
        >
          Изменить пароль
        </Button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>💡 Совет:</strong> Используйте надежный пароль, включающий прописные и строчные буквы, цифры и специальные символы.
        </p>
      </div>
    </div>
  )
}
