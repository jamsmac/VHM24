'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { usersApi } from '@/lib/users-api'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect } from '@/components/ui/form-field'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/lib/utils'
import { UserRole } from '@/types/users'

export default function CreateUserPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    phone: '',
    email: '',
    role: 'operator' as UserRole,
  })

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      toast.success('Пользователь создан успешно')
      router.push('/users')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при создании пользователя'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Добавить пользователя</h1>
          <p className="mt-2 text-gray-600">Создание нового пользователя системы</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormInput
            label="Имя пользователя"
            id="username"
            type="text"
            required
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            placeholder="username"
            helpText="Используется для входа в систему (только латинские буквы и цифры)"
          />

          <FormInput
            label="Пароль"
            id="password"
            type="password"
            required
            minLength={6}
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder="Минимум 6 символов"
          />

          <FormInput
            label="Полное имя"
            id="full_name"
            type="text"
            required
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            placeholder="Иванов Иван Иванович"
          />

          <FormInput
            label="Телефон"
            id="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+7 (999) 123-45-67"
          />

          <FormInput
            label="Email"
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="user@example.com"
          />

          <div>
            <FormSelect
              label="Роль"
              id="role"
              required
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value as UserRole)}
              options={[
                { value: 'operator', label: 'Оператор' },
                { value: 'manager', label: 'Менеджер' },
                { value: 'accountant', label: 'Бухгалтер' },
                { value: 'admin', label: 'Администратор' },
              ]}
            />
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Описание ролей:</h4>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>
                  <strong>Оператор:</strong> Выполнение задач, управление инвентарем на руках
                </li>
                <li>
                  <strong>Менеджер:</strong> Управление аппаратами, задачами, инвентарем и отчетами
                </li>
                <li>
                  <strong>Бухгалтер:</strong> Доступ к финансовым отчетам и транзакциям
                </li>
                <li>
                  <strong>Администратор:</strong> Полный доступ ко всем функциям системы
                </li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Создание...' : 'Создать пользователя'}
            </Button>
            <Link href="/users">
              <Button type="button" variant="secondary">
                Отмена
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
