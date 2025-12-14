'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/lib/auth-api'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/types/common'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // SEC-1: Backend sets httpOnly cookies automatically
      // We only need to store user data for UI display
      const response = await authApi.login({ email: emailOrUsername, password })
      login(response.user)
      toast.success('Вход выполнен успешно!')
      router.push('/dashboard')
    } catch (error: unknown) {
      console.error('Login error:', error)
      toast.error(getErrorMessage(error) || 'Ошибка входа. Проверьте логин и пароль.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4">
          <LogIn className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">VendHub Manager</h1>
        <p className="mt-2 text-gray-600">Система управления вендинговыми автоматами</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700 mb-2">
            Email или имя пользователя
          </label>
          <input
            id="emailOrUsername"
            type="text"
            required
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder="••••••••"
          />
        </div>

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
