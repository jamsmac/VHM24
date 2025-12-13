'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Clock, Wrench, Package, Calendar, MoveRight, Download, Upload } from 'lucide-react'
import { componentsApi } from '@/lib/equipment-api'
import { ComponentMovementModal } from '@/components/equipment/ComponentMovementModal'
import type {
  EquipmentComponent,
  ComponentMovement,
} from '@/types/equipment'
import {
  ComponentTypeLabels,
  ComponentStatusLabels,
  ComponentLocationTypeLabels,
  MovementTypeLabels,
} from '@/types/equipment'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

type MovementAction = 'move' | 'install' | 'remove' | null

export default function ComponentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const componentId = params.id as string

  const [component, setComponent] = useState<EquipmentComponent | null>(null)
  const [movements, setMovements] = useState<ComponentMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [movementAction, setMovementAction] = useState<MovementAction>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [componentData, movementsData] = await Promise.all([
        componentsApi.getById(componentId),
        componentsApi.getMovements(componentId),
      ])
      setComponent(componentData)
      setMovements(movementsData)
    } catch (error) {
      console.error('Error fetching component:', error)
    } finally {
      setLoading(false)
    }
  }, [componentId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!component) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600">Компонент не найден</p>
          <button
            onClick={() => router.push('/dashboard/equipment/components')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      needs_maintenance: 'bg-yellow-100 text-yellow-800',
      needs_replacement: 'bg-orange-100 text-orange-800',
      replaced: 'bg-gray-100 text-gray-800',
      broken: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getLocationColor = (location: string) => {
    const colors: Record<string, string> = {
      machine: 'bg-blue-100 text-blue-800',
      warehouse: 'bg-gray-100 text-gray-800',
      washing: 'bg-cyan-100 text-cyan-800',
      drying: 'bg-purple-100 text-purple-800',
      repair: 'bg-orange-100 text-orange-800',
    }
    return colors[location] || 'bg-gray-100 text-gray-800'
  }

  const getMovementIcon = (movement: ComponentMovement) => {
    if (movement.movement_type.includes('install')) {return '⬇️'}
    if (movement.movement_type.includes('remove')) {return '⬆️'}
    if (movement.movement_type.includes('wash')) {return '🧼'}
    if (movement.movement_type.includes('repair')) {return '🔧'}
    return '📦'
  }

  const lifetimePercentage = component.expected_lifetime_hours
    ? Math.round((component.working_hours / component.expected_lifetime_hours) * 100)
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              {component.name}
            </h1>
            <p className="mt-1 text-gray-600">
              {ComponentTypeLabels[component.component_type]} • {component.serial_number || 'Без серийного номера'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setMovementAction('move')}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              title="Переместить компонент"
            >
              <MoveRight className="h-4 w-4" />
              <span className="hidden sm:inline">Переместить</span>
            </button>

            {component.current_location_type !== 'machine' && (
              <button
                onClick={() => setMovementAction('install')}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                title="Установить в машину"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Установить</span>
              </button>
            )}

            {component.current_location_type === 'machine' && (
              <button
                onClick={() => setMovementAction('remove')}
                className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                title="Снять с машины"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Снять</span>
              </button>
            )}
          </div>

          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(component.status)}`}>
            {ComponentStatusLabels[component.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Основная информация</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Производитель</p>
                <p className="text-gray-900 font-medium">{component.manufacturer || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Модель</p>
                <p className="text-gray-900 font-medium">{component.model || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Дата установки</p>
                <p className="text-gray-900 font-medium">
                  {component.installation_date
                    ? format(new Date(component.installation_date), 'dd MMMM yyyy', { locale: ru })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Гарантия до</p>
                <p className="text-gray-900 font-medium">
                  {component.warranty_expiration_date
                    ? format(new Date(component.warranty_expiration_date), 'dd MMMM yyyy', { locale: ru })
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Current Location */}
          <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-800">Текущее местоположение</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getLocationColor(component.current_location_type)}`}>
                {ComponentLocationTypeLabels[component.current_location_type]}
              </span>
              {component.machine && (
                <div className="text-gray-600">
                  <span className="text-sm">Аппарат: </span>
                  <span className="font-medium">{component.machine.machine_number || component.machine.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Movement History Timeline */}
          <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-800">История перемещений</h2>
            </div>

            {movements.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Нет записей о перемещениях</p>
            ) : (
              <div className="space-y-4">
                {movements.map((movement, index) => (
                  <div key={movement.id} className="relative pl-8">
                    {/* Timeline line */}
                    {index !== movements.length - 1 && (
                      <div className="absolute left-3 top-8 w-0.5 h-full bg-gray-200" />
                    )}

                    {/* Timeline dot */}
                    <div className="absolute left-0 top-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs">
                      {getMovementIcon(movement)}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {MovementTypeLabels[movement.movement_type]}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {ComponentLocationTypeLabels[movement.from_location_type]} → {ComponentLocationTypeLabels[movement.to_location_type]}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(movement.moved_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                        </span>
                      </div>

                      {movement.comment && (
                        <p className="text-sm text-gray-600 mt-2 bg-white p-2 rounded border border-gray-200">
                          💬 {movement.comment}
                        </p>
                      )}

                      {movement.task && (
                        <p className="text-xs text-indigo-600 mt-2">
                          📋 Связано с задачей #{movement.task.id?.slice(0, 8)}
                        </p>
                      )}

                      {movement.performed_by && (
                        <p className="text-xs text-gray-500 mt-1">
                          👤 {movement.performed_by.full_name || movement.performed_by.username}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Maintenance Info */}
          <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-800">Обслуживание</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Последнее</p>
                <p className="text-gray-900 font-medium">
                  {component.last_maintenance_date
                    ? format(new Date(component.last_maintenance_date), 'dd MMM yyyy', { locale: ru })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Следующее</p>
                <p className="text-gray-900 font-medium">
                  {component.next_maintenance_date
                    ? format(new Date(component.next_maintenance_date), 'dd MMM yyyy', { locale: ru })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Интервал</p>
                <p className="text-gray-900 font-medium">
                  {component.maintenance_interval_days
                    ? `${component.maintenance_interval_days} дней`
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Lifetime Info */}
          {lifetimePercentage !== null && (
            <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-800">Ресурс</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-500">Отработано</span>
                    <span className="text-sm font-medium text-gray-900">{lifetimePercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        lifetimePercentage > 90
                          ? 'bg-red-600'
                          : lifetimePercentage > 70
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(lifetimePercentage, 100)}%` }}
                     />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Отработано</p>
                    <p className="font-medium text-gray-900">{component.working_hours} ч</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ожидаемый срок</p>
                    <p className="font-medium text-gray-900">{component.expected_lifetime_hours} ч</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Replacement Info */}
          {component.replaced_by_component_id && (
            <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-800">Замена</h2>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Компонент был заменён
                  {component.replacement_date && (
                    <span className="block font-medium text-gray-900 mt-1">
                      {format(new Date(component.replacement_date), 'dd MMMM yyyy', { locale: ru })}
                    </span>
                  )}
                </p>
                <p className="text-xs text-indigo-600">
                  Заменён на: {component.replaced_by_component_id.slice(0, 8)}...
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {component.notes && (
            <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Примечания</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{component.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Movement Modal */}
      {movementAction && (
        <ComponentMovementModal
          isOpen={!!movementAction}
          onClose={() => setMovementAction(null)}
          component={component}
          action={movementAction}
          onSuccess={() => {
            fetchData()
            setMovementAction(null)
          }}
        />
      )}
    </div>
  )
}
