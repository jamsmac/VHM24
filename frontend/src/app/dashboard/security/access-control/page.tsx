'use client'

import { Badge } from '@/components/ui/badge'
import { Shield, User } from 'lucide-react'

export default function AccessControlPage() {
  const roles = [
    { name: 'Администратор', users: 2, permissions: ['Все права'] },
    { name: 'Менеджер', users: 5, permissions: ['Управление аппаратами', 'Управление задачами', 'Просмотр отчетов'] },
    { name: 'Оператор', users: 12, permissions: ['Выполнение задач', 'Управление инвентарем'] },
    { name: 'Бухгалтер', users: 1, permissions: ['Просмотр финансов', 'Экспорт отчетов'] },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Управление доступом</h1>
        <p className="mt-2 text-gray-600">Роли и права пользователей</p>
      </div>

      <div className="grid gap-4">
        {roles.map((role, idx) => (
          <div key={idx} className="bg-white rounded-lg border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Shield className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{role.name}</h3>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {role.users} пользователей
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Права доступа:</p>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map((perm, pidx) => (
                  <Badge key={pidx} className="bg-blue-100 text-blue-800">
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
