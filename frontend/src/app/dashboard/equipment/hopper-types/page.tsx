'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Filter, Trash2, Edit, Tag } from 'lucide-react'
import { hopperTypesApi } from '@/lib/equipment-api'
import type { HopperType } from '@/types/equipment'
import { HopperCategoryLabels } from '@/types/equipment'

export default function HopperTypesPage() {
  const [hopperTypes, setHopperTypes] = useState<HopperType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<HopperType | null>(null)

  useEffect(() => {
    fetchHopperTypes()
  }, [filterCategory])

  const fetchHopperTypes = async () => {
    try {
      setLoading(true)
      const data = await hopperTypesApi.getAll({
        category: filterCategory || undefined,
      })
      setHopperTypes(data)
    } catch (error) {
      console.error('Error fetching hopper types:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTypes = hopperTypes.filter(type =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот тип бункера?')) {return}

    try {
      await hopperTypesApi.delete(id)
      fetchHopperTypes()
    } catch (error) {
      console.error('Error deleting hopper type:', error)
      alert('Ошибка при удалении типа бункера')
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      coffee: 'bg-amber-100 text-amber-800',
      milk: 'bg-blue-100 text-blue-800',
      sugar: 'bg-pink-100 text-pink-800',
      cocoa: 'bg-brown-100 text-brown-800',
      water: 'bg-cyan-100 text-cyan-800',
      syrup: 'bg-purple-100 text-purple-800',
      powder: 'bg-gray-100 text-gray-800',
      other: 'bg-gray-100 text-gray-600',
    }
    return colors[category] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            Типы Бункеров
          </h1>
          <p className="mt-2 text-gray-600">
            Классификация бункеров по типам ингредиентов
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedType(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="h-5 w-5" />
          Добавить тип
        </button>
      </div>

      {/* Filters */}
      <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-4 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию или коду..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Все категории</option>
            {Object.entries(HopperCategoryLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Types Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
            <p className="mt-4 text-gray-600">Загрузка типов бункеров...</p>
          </div>
        </div>
      ) : (
        <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Код
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Категория
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Емкость (кг)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Интервал мойки
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200">
                {filteredTypes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Типы бункеров не найдены
                    </td>
                  </tr>
                ) : (
                  filteredTypes.map((type) => (
                    <tr key={type.id} className="hover:bg-white/70 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-mono font-medium text-gray-900">
                            {type.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {type.name}
                          </div>
                          {type.description && (
                            <div className="text-sm text-gray-500 mt-1">
                              {type.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryColor(type.category)}`}>
                          {HopperCategoryLabels[type.category] || type.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {type.typical_capacity_kg ? `${type.typical_capacity_kg} кг` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {type.cleaning_interval_days ? `${type.cleaning_interval_days} дней` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedType(type)
                            setIsModalOpen(true)
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          <Edit className="h-4 w-4 inline" />
                        </button>
                        <button
                          onClick={() => handleDelete(type.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Results Count */}
          <div className="bg-gray-50/80 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-700">
              Показано <span className="font-medium">{filteredTypes.length}</span> из{' '}
              <span className="font-medium">{hopperTypes.length}</span> типов
            </p>
          </div>
        </div>
      )}

      {/* Modal - простая версия, в production создать отдельный компонент */}
      {isModalOpen && (
        <HopperTypeFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedType(null)
          }}
          hopperType={selectedType}
          onSuccess={() => {
            fetchHopperTypes()
            setIsModalOpen(false)
            setSelectedType(null)
          }}
        />
      )}
    </div>
  )
}

// Simple inline modal component
function HopperTypeFormModal({
  isOpen,
  onClose,
  hopperType,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  hopperType: HopperType | null
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'coffee',
    description: '',
    typical_capacity_kg: '',
    cleaning_interval_days: '',
    notes: '',
  })

  useEffect(() => {
    if (hopperType) {
      setFormData({
        code: hopperType.code,
        name: hopperType.name,
        category: hopperType.category,
        description: hopperType.description || '',
        typical_capacity_kg: hopperType.typical_capacity_kg?.toString() || '',
        cleaning_interval_days: hopperType.cleaning_interval_days?.toString() || '',
        notes: hopperType.notes || '',
      })
    }
  }, [hopperType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        code: formData.code,
        name: formData.name,
        category: formData.category,
        description: formData.description || undefined,
        typical_capacity_kg: formData.typical_capacity_kg ? parseFloat(formData.typical_capacity_kg) : undefined,
        cleaning_interval_days: formData.cleaning_interval_days ? parseInt(formData.cleaning_interval_days) : undefined,
        notes: formData.notes || undefined,
      }

      if (hopperType) {
        await hopperTypesApi.update(hopperType.id, data)
      } else {
        await hopperTypesApi.create(data)
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving hopper type:', error)
      alert('Ошибка при сохранении типа бункера')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {return null}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {hopperType ? 'Редактировать тип бункера' : 'Добавить тип бункера'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Код *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="BUN-COFFEE-01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Категория *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {Object.entries(HopperCategoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Бункер для зернового кофе"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Краткое описание..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Типичная емкость (кг)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.typical_capacity_kg}
                onChange={(e) => setFormData({ ...formData, typical_capacity_kg: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="1.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Интервал мойки (дней)
              </label>
              <input
                type="number"
                value={formData.cleaning_interval_days}
                onChange={(e) => setFormData({ ...formData, cleaning_interval_days: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="14"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Примечания
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Дополнительные примечания..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
