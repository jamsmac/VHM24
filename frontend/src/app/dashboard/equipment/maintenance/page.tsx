'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Plus, Download } from 'lucide-react'
import { maintenanceApi } from '@/lib/equipment-api'
import { exportMaintenanceToPDF } from '@/lib/pdf-export'
import type { ComponentMaintenance } from '@/types/equipment'
import { MaintenanceTypeLabels } from '@/types/equipment'

export default function MaintenancePage() {
  const [maintenance, setMaintenance] = useState<ComponentMaintenance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMaintenance()
  }, [])

  const fetchMaintenance = async () => {
    try {
      const data = await maintenanceApi.getAll()
      setMaintenance(data)
    } catch (error) {
      console.error('Error fetching maintenance:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    exportMaintenanceToPDF(maintenance)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
            История Обслуживания
          </h1>
          <p className="mt-2 text-gray-600">
            Записи всех выполненных работ по обслуживанию компонентов
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            disabled={maintenance.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-5 w-5" />
            Экспорт PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:shadow-lg transition-all">
            <Plus className="h-5 w-5" />
            Добавить запись
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
        </div>
      ) : (
        <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Тип работ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Описание
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Длительность
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Стоимость
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200">
                {maintenance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p>Записи обслуживания не найдены</p>
                    </td>
                  </tr>
                ) : (
                  maintenance.map((record) => (
                    <tr key={record.id} className="hover:bg-white/70 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.performed_at).toLocaleDateString('ru-RU')}
                        <div className="text-xs text-gray-500">
                          {new Date(record.performed_at).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                          {MaintenanceTypeLabels[record.maintenance_type]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md truncate">
                          {record.description}
                        </div>
                        {record.spare_parts_used && record.spare_parts_used.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Запчастей: {record.spare_parts_used.length}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record.duration_minutes ? `${record.duration_minutes} мин` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {record.total_cost.toLocaleString()} ₽
                        </div>
                        <div className="text-xs text-gray-500">
                          Работы: {record.labor_cost} ₽<br />
                          Запчасти: {record.parts_cost} ₽
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.is_successful ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            ✓ Успешно
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                            ✗ Неуспешно
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
