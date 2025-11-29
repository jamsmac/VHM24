'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { incidentsApi } from '@/lib/incidents-api'
import { machinesApi } from '@/lib/machines-api'
import { Button } from '@/components/ui/button'
import { FormSelect, FormTextarea } from '@/components/ui/form-field'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-toastify'
import { IncidentType, IncidentPriority } from '@/types/incidents'

export default function CreateIncidentPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    incident_type: '' as IncidentType,
    machine_id: '',
    priority: 'medium' as IncidentPriority,
    title: '',
    description: '',
  })

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => machinesApi.getAll({}),
  })

  const createMutation = useMutation({
    mutationFn: incidentsApi.create,
    onSuccess: () => {
      toast.success('Инцидент создан успешно')
      router.push('/incidents')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Ошибка при создании инцидента')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const typeLabels: Record<IncidentType, string> = {
    technical_failure: 'Техническая неисправность',
    out_of_stock: 'Закончился товар',
    cash_full: 'Переполнен купюроприемник',
    cash_discrepancy: 'Расхождение в инкассации',
    vandalism: 'Вандализм',
    power_outage: 'Отключение питания',
    other: 'Прочее',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/incidents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Создать инцидент</h1>
          <p className="mt-2 text-gray-600">Регистрация нового инцидента</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSelect
            label="Тип инцидента"
            id="incident_type"
            required
            value={formData.incident_type}
            onChange={(e) => handleChange('incident_type', e.target.value)}
            options={[
              { value: '', label: 'Выберите тип' },
              ...Object.entries(typeLabels).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />

          <FormSelect
            label="Аппарат"
            id="machine_id"
            required
            value={formData.machine_id}
            onChange={(e) => handleChange('machine_id', e.target.value)}
            options={[
              { value: '', label: 'Выберите аппарат' },
              ...(machines?.map((machine) => ({
                value: machine.id,
                label: `${machine.machine_number} - ${machine.location?.name}`,
              })) || []),
            ]}
          />

          <FormSelect
            label="Приоритет"
            id="priority"
            required
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            options={[
              { value: 'low', label: 'Низкий' },
              { value: 'medium', label: 'Средний' },
              { value: 'high', label: 'Высокий' },
              { value: 'critical', label: 'Критичный' },
            ]}
            helpText="Критичный - требует немедленного внимания"
          />

          <FormTextarea
            label="Описание"
            id="description"
            required
            rows={6}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Подробное описание проблемы..."
          />

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Информация</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Инцидент будет автоматически присвоен статус "Открыт"</li>
              <li>• Вы можете назначить оператора после создания</li>
              <li>• Уведомления будут отправлены ответственным лицам</li>
              <li>
                • Инциденты типа "Расхождение в инкассации" создаются автоматически системой
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Создание...' : 'Создать инцидент'}
            </Button>
            <Link href="/incidents">
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
