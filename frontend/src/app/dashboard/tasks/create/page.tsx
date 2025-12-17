'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { tasksApi } from '@/lib/tasks-api'
import { machinesApi } from '@/lib/machines-api'
import { usersApi } from '@/lib/users-api'
import { UserRole } from '@/types/users'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { TaskType, TaskPriority } from '@/types/tasks'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/lib/utils'
import { TaskComponentsSelector, type TaskComponent } from '@/components/tasks/TaskComponentsSelector'

export default function CreateTaskPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    type_code: '' as TaskType,
    machine_id: '',
    assigned_to: '',
    priority: 'medium' as TaskPriority,
    scheduled_date: '',
    description: '',
    items: [] as Array<{ product_id: string; quantity: number }>,
    components: [] as TaskComponent[],
  })

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => machinesApi.getAll({}),
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll({ role: UserRole.OPERATOR }),
  })

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      toast.success('Задача создана успешно')
      router.push('/tasks')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при создании задачи'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate components for replace tasks
    if (formData.type_code.startsWith('replace_')) {
      const hasOldComponent = formData.components.some(c => c.role === 'old')
      const hasNewComponent = formData.components.some(c => c.role === 'new')

      if (!hasOldComponent || !hasNewComponent) {
        toast.error('Для задач замены необходимо указать хотя бы один старый и один новый компонент')
        return
      }

      // Validate that components are selected
      const hasEmptyComponents = formData.components.some(c => !c.component_id)
      if (hasEmptyComponents) {
        toast.error('Выберите компоненты для всех добавленных позиций')
        return
      }
    }

    // Validate components for cleaning/repair tasks
    if ((formData.type_code === 'cleaning' || formData.type_code === 'repair') && formData.components.length === 0) {
      toast.error(`Для задачи "${formData.type_code === 'cleaning' ? 'мойка' : 'ремонт'}" необходимо указать хотя бы один компонент`)
      return
    }

    createMutation.mutate({
      type_code: formData.type_code,
      machine_id: formData.machine_id,
      assigned_to_user_id: formData.assigned_to,
      priority: formData.priority,
      scheduled_date: formData.scheduled_date,
      description: formData.description,
      items: formData.items.map(item => ({
        nomenclature_id: item.product_id,
        planned_quantity: item.quantity,
        unit_of_measure_code: 'pcs', // Default unit
      })),
    })
  }

  const handleChange = (field: string, value: string | TaskComponent[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tasks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Создать задачу</h1>
          <p className="mt-2 text-gray-600">Создание новой задачи для оператора</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSelect
            label="Тип задачи"
            id="type_code"
            required
            value={formData.type_code}
            onChange={(e) => handleChange('type_code', e.target.value as TaskType)}
            options={[
              { value: '', label: 'Выберите тип' },
              { value: 'refill', label: 'Пополнение товара', group: 'Основные операции' },
              { value: 'collection', label: 'Инкассация', group: 'Основные операции' },
              { value: 'maintenance', label: 'Техническое обслуживание', group: 'Основные операции' },
              { value: 'inspection', label: 'Проверка', group: 'Основные операции' },
              { value: 'replace_hopper', label: 'Замена бункера', group: 'Замена компонентов' },
              { value: 'replace_grinder', label: 'Замена гриндера', group: 'Замена компонентов' },
              { value: 'replace_brewer', label: 'Замена варочной группы', group: 'Замена компонентов' },
              { value: 'replace_mixer', label: 'Замена миксера', group: 'Замена компонентов' },
              { value: 'cleaning', label: 'Мойка компонента', group: 'Обслуживание' },
              { value: 'repair', label: 'Ремонт', group: 'Обслуживание' },
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
            label="Назначить оператору"
            id="assigned_to"
            required
            value={formData.assigned_to}
            onChange={(e) => handleChange('assigned_to', e.target.value)}
            options={[
              { value: '', label: 'Выберите оператора' },
              ...(users?.map((user) => ({
                value: user.id,
                label: `${user.full_name} (${user.phone})`,
              })) || []),
            ]}
          />

          <FormSelect
            label="Приоритет"
            id="priority"
            required
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value as TaskPriority)}
            options={[
              { value: 'low', label: 'Низкий' },
              { value: 'medium', label: 'Средний' },
              { value: 'high', label: 'Высокий' },
              { value: 'critical', label: 'Критичный' },
            ]}
          />

          <FormInput
            label="Дата выполнения"
            id="scheduled_date"
            type="datetime-local"
            required
            value={formData.scheduled_date}
            onChange={(e) => handleChange('scheduled_date', e.target.value)}
          />

          <FormTextarea
            label="Описание"
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Дополнительная информация о задаче..."
          />

          {/* Task Components Selector */}
          <TaskComponentsSelector
            taskType={formData.type_code}
            machineId={formData.machine_id}
            components={formData.components}
            onChange={(components) => handleChange('components', components)}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Создание...' : 'Создать задачу'}
            </Button>
            <Link href="/tasks">
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
