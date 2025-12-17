'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, MapPin } from 'lucide-react'
import Link from 'next/link'
import { componentsApi } from '@/lib/equipment-api'
import { ComponentModal } from '@/components/equipment/ComponentModal'
import {
  EquipmentComponent,
  ComponentType,
  ComponentStatus,
  ComponentTypeLabels,
  ComponentStatusLabels,
  ComponentLocationTypeLabels,
} from '@/types/equipment'

export default function ComponentsPage() {
  const [components, setComponents] = useState<EquipmentComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<ComponentType | ''>('')
  const [filterStatus, setFilterStatus] = useState<ComponentStatus | ''>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<EquipmentComponent | null>(null)

  const fetchComponents = useCallback(async () => {
    try {
      setLoading(true)
      const data = await componentsApi.getAll({
        componentType: filterType || undefined,
        status: filterStatus || undefined,
      })
      setComponents(data)
    } catch (error) {
      console.error('Error fetching components:', error)
    } finally {
      setLoading(false)
    }
  }, [filterType, filterStatus])

  useEffect(() => {
    fetchComponents()
  }, [fetchComponents])

  const filteredComponents = components.filter(component =>
    component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    component.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: ComponentStatus) => {
    const colors: Record<ComponentStatus, string> = {
      [ComponentStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [ComponentStatus.NEEDS_MAINTENANCE]: 'bg-yellow-100 text-yellow-800',
      [ComponentStatus.NEEDS_REPLACEMENT]: 'bg-orange-100 text-orange-800',
      [ComponentStatus.REPLACED]: 'bg-gray-100 text-gray-800',
      [ComponentStatus.BROKEN]: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getLifetimePercentage = (component: EquipmentComponent) => {
    if (!component.expected_lifetime_hours) {return null}
    return Math.round((component.working_hours / component.expected_lifetime_hours) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            Компоненты Оборудования
          </h1>
          <p className="mt-2 text-gray-600">
            Управление компонентами аппаратов и отслеживание их жизненного цикла
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedComponent(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="h-5 w-5" />
          Добавить компонент
        </button>
      </div>

      {/* Filters */}
      <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-4 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию или серийному номеру..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ComponentType | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Все типы</option>
            {Object.entries(ComponentTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ComponentStatus | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Все статусы</option>
            {Object.entries(ComponentStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Components Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
            <p className="mt-4 text-gray-600">Загрузка компонентов...</p>
          </div>
        </div>
      ) : (
        <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Компонент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Местоположение
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Часы работы
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Следующее ТО
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200">
                {filteredComponents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Компоненты не найдены
                    </td>
                  </tr>
                ) : (
                  filteredComponents.map((component) => {
                    const lifetimePercent = getLifetimePercentage(component)
                    return (
                      <tr key={component.id} className="hover:bg-white/70 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {component.name}
                            </div>
                            {component.serial_number && (
                              <div className="text-sm text-gray-500">
                                SN: {component.serial_number}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700">
                            {ComponentTypeLabels[component.component_type]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{ComponentLocationTypeLabels[component.current_location_type]}</span>
                          </div>
                          {component.current_location_ref && (
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {component.current_location_ref.slice(0, 8)}...
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(component.status)}`}>
                            {ComponentStatusLabels[component.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{component.working_hours} ч</div>
                          {lifetimePercent !== null && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${
                                  lifetimePercent >= 90
                                    ? 'bg-red-500'
                                    : lifetimePercent >= 70
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(lifetimePercent, 100)}%` }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {component.next_maintenance_date
                            ? new Date(component.next_maintenance_date).toLocaleDateString('ru-RU')
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/equipment/components/${component.id}`}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            Просмотр
                          </Link>
                          <button
                            onClick={() => {
                              setSelectedComponent(component)
                              setIsModalOpen(true)
                            }}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Изменить
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Results Count */}
          <div className="bg-gray-50/80 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-700">
              Показано <span className="font-medium">{filteredComponents.length}</span> из{' '}
              <span className="font-medium">{components.length}</span> компонентов
            </p>
          </div>
        </div>
      )}

      {/* Component Modal */}
      <ComponentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedComponent(null)
        }}
        onSuccess={() => {
          fetchComponents()
        }}
        component={selectedComponent}
      />
    </div>
  )
}
