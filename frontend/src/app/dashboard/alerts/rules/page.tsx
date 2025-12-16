'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  alertsApi,
  AlertRule,
  AlertMetric,
  AlertSeverity,
  AlertOperator,
  CreateAlertRuleDto,
} from '@/lib/alerts-api'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import {
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Settings2,
  Bell,
  ArrowLeft,
  X,
  Save,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const metricLabels: Record<AlertMetric, string> = {
  [AlertMetric.LOW_STOCK_PERCENTAGE]: 'Уровень заполнения (%)',
  [AlertMetric.MACHINE_ERROR_COUNT]: 'Количество ошибок',
  [AlertMetric.TASK_OVERDUE_HOURS]: 'Просрочка задачи (часов)',
  [AlertMetric.INCIDENT_COUNT]: 'Количество инцидентов',
  [AlertMetric.COLLECTION_DUE_DAYS]: 'Дней до инкассации',
  [AlertMetric.COMPONENT_LIFETIME_PERCENTAGE]: 'Ресурс компонента (%)',
  [AlertMetric.WASHING_OVERDUE_DAYS]: 'Просрочка мойки (дней)',
  [AlertMetric.DAILY_SALES_DROP_PERCENTAGE]: 'Падение продаж (%)',
  [AlertMetric.MACHINE_OFFLINE_HOURS]: 'Офлайн (часов)',
  [AlertMetric.SPARE_PART_LOW_STOCK]: 'Запас запчастей',
}

const severityLabels: Record<AlertSeverity, string> = {
  [AlertSeverity.INFO]: 'Информация',
  [AlertSeverity.WARNING]: 'Предупреждение',
  [AlertSeverity.CRITICAL]: 'Критично',
  [AlertSeverity.EMERGENCY]: 'Экстренно',
}

const operatorLabels: Record<AlertOperator, string> = {
  [AlertOperator.GREATER_THAN]: 'Больше (>)',
  [AlertOperator.LESS_THAN]: 'Меньше (<)',
  [AlertOperator.GREATER_THAN_OR_EQUAL]: 'Больше или равно (>=)',
  [AlertOperator.LESS_THAN_OR_EQUAL]: 'Меньше или равно (<=)',
  [AlertOperator.EQUAL]: 'Равно (=)',
  [AlertOperator.NOT_EQUAL]: 'Не равно (!=)',
}

const severityColors: Record<AlertSeverity, string> = {
  [AlertSeverity.INFO]: 'bg-blue-100 text-blue-700',
  [AlertSeverity.WARNING]: 'bg-yellow-100 text-yellow-700',
  [AlertSeverity.CRITICAL]: 'bg-orange-100 text-orange-700',
  [AlertSeverity.EMERGENCY]: 'bg-red-100 text-red-700',
}

function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: AlertRule
  onToggle: (id: string, enabled: boolean) => void
  onEdit: (rule: AlertRule) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{rule.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs ${severityColors[rule.severity]}`}>
              {severityLabels[rule.severity]}
            </span>
            {!rule.is_enabled && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                Отключено
              </span>
            )}
          </div>
          {rule.description && (
            <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
          )}
          <div className="mt-3 text-sm text-gray-500">
            <span className="font-medium">{metricLabels[rule.metric]}</span>
            {' '}
            {operatorLabels[rule.operator].split(' ')[0].toLowerCase()}
            {' '}
            <span className="font-medium">{rule.threshold}</span>
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Срабатываний: {rule.trigger_count} | Период ожидания: {rule.cooldown_minutes} мин
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(rule.id, !rule.is_enabled)}
            className={`p-2 rounded-md hover:bg-gray-100 ${rule.is_enabled ? 'text-green-600' : 'text-gray-400'}`}
            title={rule.is_enabled ? 'Отключить' : 'Включить'}
          >
            {rule.is_enabled ? (
              <ToggleRight className="h-5 w-5" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={() => onEdit(rule)}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
            title="Редактировать"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            className="p-2 rounded-md hover:bg-red-50 text-red-600"
            title="Удалить"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function RuleFormModal({
  rule,
  onClose,
  onSave,
}: {
  rule?: AlertRule
  onClose: () => void
  onSave: (data: CreateAlertRuleDto) => void
}) {
  const [formData, setFormData] = useState<CreateAlertRuleDto>({
    name: rule?.name || '',
    description: rule?.description || '',
    metric: rule?.metric || AlertMetric.LOW_STOCK_PERCENTAGE,
    operator: rule?.operator || AlertOperator.LESS_THAN,
    threshold: rule?.threshold || 20,
    severity: rule?.severity || AlertSeverity.WARNING,
    cooldown_minutes: rule?.cooldown_minutes || 60,
    is_enabled: rule?.is_enabled ?? true,
    notification_channels: rule?.notification_channels || ['in_app'],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {rule ? 'Редактировать правило' : 'Новое правило'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Метрика *
              </label>
              <select
                value={formData.metric}
                onChange={(e) => setFormData({ ...formData, metric: e.target.value as AlertMetric })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {Object.entries(metricLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Уровень *
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as AlertSeverity })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {Object.entries(severityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Оператор *
              </label>
              <select
                value={formData.operator}
                onChange={(e) => setFormData({ ...formData, operator: e.target.value as AlertOperator })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {Object.entries(operatorLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Порог *
              </label>
              <input
                type="number"
                value={formData.threshold}
                onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Период ожидания (минут)
            </label>
            <input
              type="number"
              value={formData.cooldown_minutes}
              onChange={(e) => setFormData({ ...formData, cooldown_minutes: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              min={1}
              max={1440}
            />
            <p className="text-xs text-gray-500 mt-1">
              Минимальный интервал между срабатываниями
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_enabled}
                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">Включено</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              {rule ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AlertRulesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | undefined>()
  const queryClient = useQueryClient()

  const { data: rules, isLoading } = useQuery({
    queryKey: ['alerts', 'rules'],
    queryFn: () => alertsApi.getRules(),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateAlertRuleDto) => alertsApi.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', 'rules'] })
      setIsModalOpen(false)
      setEditingRule(undefined)
      toast.success('Правило создано')
    },
    onError: () => {
      toast.error('Ошибка при создании правила')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateAlertRuleDto }) =>
      alertsApi.updateRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', 'rules'] })
      setIsModalOpen(false)
      setEditingRule(undefined)
      toast.success('Правило обновлено')
    },
    onError: () => {
      toast.error('Ошибка при обновлении правила')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      alertsApi.toggleRule(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', 'rules'] })
    },
    onError: () => {
      toast.error('Ошибка при переключении правила')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => alertsApi.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', 'rules'] })
      toast.success('Правило удалено')
    },
    onError: () => {
      toast.error('Ошибка при удалении правила')
    },
  })

  const handleSave = (data: CreateAlertRuleDto) => {
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Удалить это правило?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/alerts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Правила оповещений</h1>
            <p className="mt-2 text-gray-600">Настройка условий для автоматических оповещений</p>
          </div>
        </div>
        <Button onClick={() => { setEditingRule(undefined); setIsModalOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить правило
        </Button>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : rules && rules.length > 0 ? (
          rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={(id, enabled) => toggleMutation.mutate({ id, enabled })}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Settings2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Правила оповещений не настроены</p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить первое правило
            </Button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <RuleFormModal
          rule={editingRule}
          onClose={() => { setIsModalOpen(false); setEditingRule(undefined) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
