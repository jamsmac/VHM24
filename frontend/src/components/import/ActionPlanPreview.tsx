'use client'

import { ActionPlan } from '@/lib/intelligent-import-api'
import {
  Plus,
  RefreshCw,
  GitMerge,
  SkipForward,
  Trash2,
  AlertTriangle,
  Clock,
} from 'lucide-react'

interface ActionPlanPreviewProps {
  plan: ActionPlan
}

export function ActionPlanPreview({ plan }: ActionPlanPreviewProps) {
  const { summary, estimatedDuration, risks } = plan

  const totalActions =
    summary.insertCount +
    summary.updateCount +
    summary.mergeCount +
    summary.skipCount +
    summary.deleteCount

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds} сек`
    if (seconds < 3600) return `${Math.round(seconds / 60)} мин`
    return `${Math.round(seconds / 3600)} ч`
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {summary.insertCount > 0 && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-700">Создание</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-green-600">{summary.insertCount}</p>
          </div>
        )}

        {summary.updateCount > 0 && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-blue-700">Обновление</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-blue-600">{summary.updateCount}</p>
          </div>
        )}

        {summary.mergeCount > 0 && (
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
            <div className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-purple-700">Слияние</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-purple-600">{summary.mergeCount}</p>
          </div>
        )}

        {summary.skipCount > 0 && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <SkipForward className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-700">Пропуск</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-600">{summary.skipCount}</p>
          </div>
        )}

        {summary.deleteCount > 0 && (
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-700">Удаление</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-600">{summary.deleteCount}</p>
          </div>
        )}
      </div>

      {/* Total and Duration */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-sm text-gray-600">Всего действий: </span>
            <span className="font-bold text-gray-900">{totalActions}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Примерное время: </span>
            <span className="font-medium text-gray-900">{formatDuration(estimatedDuration)}</span>
          </div>
        </div>
      </div>

      {/* Risks */}
      {risks && risks.length > 0 && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h3 className="font-medium text-yellow-800">Возможные риски</h3>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {risks.map((risk, index) => (
              <li key={index} className="text-sm text-yellow-700">
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Details Preview */}
      {plan.actions && plan.actions.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            Показать детали действий ({plan.actions.length})
          </summary>
          <div className="mt-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Действие
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Таблица
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Данные
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plan.actions.slice(0, 20).map((action, index) => (
                  <tr key={index} className="text-sm">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={`
                          inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${action.type === 'insert' ? 'bg-green-100 text-green-700' : ''}
                          ${action.type === 'update' ? 'bg-blue-100 text-blue-700' : ''}
                          ${action.type === 'merge' ? 'bg-purple-100 text-purple-700' : ''}
                          ${action.type === 'skip' ? 'bg-gray-100 text-gray-700' : ''}
                          ${action.type === 'delete' ? 'bg-red-100 text-red-700' : ''}
                        `}
                      >
                        {action.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                      {action.table}
                    </td>
                    <td className="px-4 py-2 text-gray-500 truncate max-w-xs">
                      {JSON.stringify(action.data).slice(0, 100)}
                      {JSON.stringify(action.data).length > 100 && '...'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {plan.actions.length > 20 && (
              <div className="text-center py-2 text-sm text-gray-500 bg-gray-50">
                ...и ещё {plan.actions.length - 20} действий
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  )
}
