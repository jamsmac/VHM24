'use client'

import { useEffect, useState } from 'react'
import { Droplet, Plus, Calendar } from 'lucide-react'
import { washingSchedulesApi } from '@/lib/equipment-api'
import type { WashingSchedule } from '@/types/equipment'
import { WashingFrequencyLabels } from '@/types/equipment'

export default function WashingSchedulesPage() {
  const [schedules, setSchedules] = useState<WashingSchedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    try {
      const data = await washingSchedulesApi.getAll()
      setSchedules(data)
    } catch (error) {
      console.error('Error fetching washing schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const isOverdue = (schedule: WashingSchedule) =>
    new Date(schedule.next_wash_date) < new Date()

  const daysUntil = (date: Date) => {
    const diff = new Date(date).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            Графики Мойки
          </h1>
          <p className="mt-2 text-gray-600">
            Автоматизированные графики мойки компонентов
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all">
          <Plus className="h-5 w-5" />
          Добавить график
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => {
            const overdue = isOverdue(schedule)
            const days = daysUntil(schedule.next_wash_date)

            return (
              <div
                key={schedule.id}
                className={`backdrop-blur-md bg-white/80 border ${
                  overdue ? 'border-red-300' : 'border-white/20'
                } rounded-xl p-6 shadow-lg hover:shadow-xl transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Droplet className={`h-6 w-6 ${overdue ? 'text-red-500' : 'text-purple-500'}`} />
                      <h3 className="text-lg font-semibold text-gray-900">{schedule.name}</h3>
                      {!schedule.is_active && (
                        <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full">
                          Неактивен
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500">Частота</p>
                        <p className="text-sm font-medium text-gray-900">
                          {WashingFrequencyLabels[schedule.frequency]}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Последняя мойка</p>
                        <p className="text-sm font-medium text-gray-900">
                          {schedule.last_wash_date
                            ? new Date(schedule.last_wash_date).toLocaleDateString('ru-RU')
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Следующая мойка</p>
                        <p className={`text-sm font-semibold ${overdue ? 'text-red-600' : 'text-purple-600'}`}>
                          {new Date(schedule.next_wash_date).toLocaleDateString('ru-RU')}
                          {overdue && ' (просрочено)'}
                          {!overdue && days <= 3 && ` (через ${days} дн)`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Длительность</p>
                        <p className="text-sm font-medium text-gray-900">
                          {schedule.estimated_duration_minutes || '—'} мин
                        </p>
                      </div>
                    </div>

                    {schedule.component_types && schedule.component_types.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2">Компоненты для мойки:</p>
                        <div className="flex flex-wrap gap-2">
                          {schedule.component_types.slice(0, 5).map((type, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
                            >
                              {type}
                            </span>
                          ))}
                          {schedule.component_types.length > 5 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                              +{schedule.component_types.length - 5} еще
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">
                      Выполнить
                    </button>
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                      Изменить
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {schedules.length === 0 && (
            <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Графики мойки не найдены</p>
              <p className="text-sm text-gray-500 mt-2">Создайте первый график мойки</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
