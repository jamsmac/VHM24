'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Package } from 'lucide-react'
import { componentsApi } from '@/lib/equipment-api'
import type { EquipmentComponent, ComponentType } from '@/types/equipment'
import { ComponentLocationTypeLabels } from '@/types/equipment'

export interface TaskComponent {
  component_id: string
  role: 'old' | 'new' | 'target'
  notes?: string
}

interface TaskComponentsSelectorProps {
  taskType: string
  machineId?: string
  components: TaskComponent[]
  onChange: (components: TaskComponent[]) => void
}

export function TaskComponentsSelector({
  taskType,
  machineId,
  components,
  onChange,
}: TaskComponentsSelectorProps) {
  const [availableComponents, setAvailableComponents] = useState<EquipmentComponent[]>([])
  const [loading, setLoading] = useState(false)

  // Определяем, требуется ли выбор компонентов для данного типа задачи
  const requiresComponents = [
    'replace_hopper',
    'replace_grinder',
    'replace_brewer',
    'replace_mixer',
    'cleaning',
    'repair',
  ].includes(taskType)

  // Определяем тип компонента на основе типа задачи
  const getComponentTypeForTask = useCallback((): ComponentType | undefined => {
    if (taskType === 'replace_hopper') {return 'hopper' as ComponentType}
    if (taskType === 'replace_grinder') {return 'grinder' as ComponentType}
    if (taskType === 'replace_brewer') {return 'brewer' as ComponentType}
    if (taskType === 'replace_mixer') {return 'mixer' as ComponentType}
    return undefined
  }, [taskType])

  const fetchComponents = useCallback(async () => {
    try {
      setLoading(true)
      const componentType = getComponentTypeForTask()
      const params: { componentType?: ComponentType; machineId?: string } = {}

      if (componentType) {
        params.componentType = componentType
      }
      if (machineId && taskType.startsWith('replace_')) {
        params.machineId = machineId
      }

      const data = await componentsApi.getAll(params)
      setAvailableComponents(data)
    } catch (error) {
      console.error('Error fetching components:', error)
    } finally {
      setLoading(false)
    }
  }, [getComponentTypeForTask, machineId, taskType])

  useEffect(() => {
    if (requiresComponents) {
      fetchComponents()
    }
  }, [requiresComponents, fetchComponents])

  const addComponent = (role: 'old' | 'new' | 'target') => {
    onChange([...components, { component_id: '', role, notes: '' }])
  }

  const removeComponent = (index: number) => {
    onChange(components.filter((_, i) => i !== index))
  }

  const updateComponent = (index: number, field: keyof TaskComponent, value: string) => {
    const updated = components.map((comp, i) =>
      i === index ? { ...comp, [field]: value } : comp
    )
    onChange(updated)
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      old: 'Старый компонент (снять)',
      new: 'Новый компонент (установить)',
      target: 'Целевой компонент',
    }
    return labels[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      old: 'bg-red-50 border-red-200',
      new: 'bg-green-50 border-green-200',
      target: 'bg-blue-50 border-blue-200',
    }
    return colors[role] || 'bg-gray-50 border-gray-200'
  }

  const getFilteredComponents = (role: string) => {
    if (role === 'old') {
      // Для старых компонентов показываем только те, что в машине
      return availableComponents.filter(c => c.current_location_type === 'machine')
    } else if (role === 'new') {
      // Для новых компонентов показываем только те, что на складе
      return availableComponents.filter(c => c.current_location_type === 'warehouse')
    }
    return availableComponents
  }

  if (!requiresComponents) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" />
            Компоненты
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {taskType.startsWith('replace_')
              ? 'Выберите компоненты для замены (старый и новый)'
              : 'Выберите компоненты для обслуживания'}
          </p>
        </div>
      </div>

      {/* Component List */}
      <div className="space-y-3">
        {components.map((comp, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${getRoleColor(comp.role)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                {getRoleLabel(comp.role)}
              </span>
              <button
                type="button"
                onClick={() => removeComponent(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Component Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Компонент *
                </label>
                <select
                  required
                  value={comp.component_id}
                  onChange={(e) => updateComponent(index, 'component_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  disabled={loading}
                >
                  <option value="">
                    {loading ? 'Загрузка...' : 'Выберите компонент'}
                  </option>
                  {getFilteredComponents(comp.role).map((component) => (
                    <option key={component.id} value={component.id}>
                      {component.name} ({component.serial_number || 'No SN'}) - {ComponentLocationTypeLabels[component.current_location_type]}
                    </option>
                  ))}
                </select>
                {comp.role === 'old' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Показаны компоненты, установленные в машине
                  </p>
                )}
                {comp.role === 'new' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Показаны компоненты, находящиеся на складе
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Примечание
                </label>
                <input
                  type="text"
                  value={comp.notes || ''}
                  onChange={(e) => updateComponent(index, 'notes', e.target.value)}
                  placeholder="Например: изношен, требует замены"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Buttons */}
      <div className="flex flex-wrap gap-2">
        {taskType.startsWith('replace_') && (
          <>
            <button
              type="button"
              onClick={() => addComponent('old')}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
            >
              <Plus className="h-4 w-4" />
              Добавить старый компонент
            </button>
            <button
              type="button"
              onClick={() => addComponent('new')}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
            >
              <Plus className="h-4 w-4" />
              Добавить новый компонент
            </button>
          </>
        )}
        {(taskType === 'cleaning' || taskType === 'repair') && (
          <button
            type="button"
            onClick={() => addComponent('target')}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
          >
            <Plus className="h-4 w-4" />
            Добавить компонент
          </button>
        )}
      </div>

      {/* Validation Info */}
      {taskType.startsWith('replace_') && (
        <div>
          {components.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Для задач замены необходимо указать хотя бы один старый и один новый компонент
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex gap-4">
                  <span className={`${components.some(c => c.role === 'old') ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                    {components.some(c => c.role === 'old') ? '✅' : '⭕'} Старый компонент: {components.filter(c => c.role === 'old').length}
                  </span>
                  <span className={`${components.some(c => c.role === 'new') ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                    {components.some(c => c.role === 'new') ? '✅' : '⭕'} Новый компонент: {components.filter(c => c.role === 'new').length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(taskType === 'cleaning' || taskType === 'repair') && components.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Для задачи {taskType === 'cleaning' ? 'мойки' : 'ремонта'} необходимо указать хотя бы один компонент
          </p>
        </div>
      )}
    </div>
  )
}
