'use client'

import { ColumnMapping } from '@/lib/intelligent-import-api'
import { ArrowRight, Check, AlertTriangle, HelpCircle } from 'lucide-react'

interface ColumnMappingPreviewProps {
  mapping: ColumnMapping
  dataTypes: Record<string, string>
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'text-green-600'
  if (confidence >= 0.7) return 'text-yellow-600'
  return 'text-red-600'
}

function getConfidenceBg(confidence: number): string {
  if (confidence >= 0.9) return 'bg-green-50 border-green-200'
  if (confidence >= 0.7) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

function getDataTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    string: 'Текст',
    number: 'Число',
    integer: 'Целое число',
    decimal: 'Дробное',
    date: 'Дата',
    datetime: 'Дата/время',
    boolean: 'Да/Нет',
    email: 'Email',
    phone: 'Телефон',
    uuid: 'UUID',
    currency: 'Валюта',
  }
  return labels[type] || type
}

export function ColumnMappingPreview({ mapping, dataTypes }: ColumnMappingPreviewProps) {
  const entries = Object.entries(mapping)

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Нет данных о маппинге колонок
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <Check className="h-4 w-4 text-green-500" />
          Высокая уверенность (≥90%)
        </span>
        <span className="flex items-center gap-1 ml-4">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          Средняя (70-90%)
        </span>
        <span className="flex items-center gap-1 ml-4">
          <HelpCircle className="h-4 w-4 text-red-500" />
          Низкая (&lt;70%)
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Колонка в файле
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Маппинг
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Поле в системе
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Тип данных
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Уверенность
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map(([fileColumn, info]) => (
              <tr key={fileColumn} className={`${getConfidenceBg(info.confidence)} border-l-4`}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900">{fileColumn}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <ArrowRight className="h-4 w-4 text-gray-400 mx-auto" />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {info.field ? (
                    <span className="font-medium text-indigo-600">{info.field}</span>
                  ) : (
                    <span className="text-gray-400 italic">Не определено</span>
                  )}
                  {info.transform && (
                    <span className="ml-2 text-xs text-gray-500">
                      (преобразование: {info.transform})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {info.field && dataTypes[info.field] ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {getDataTypeLabel(dataTypes[info.field])}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className={`font-medium ${getConfidenceColor(info.confidence)}`}>
                      {Math.round(info.confidence * 100)}%
                    </span>
                    {info.confidence >= 0.9 ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : info.confidence >= 0.7 ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <HelpCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-500">
        Всего колонок: {entries.length} |
        Сопоставлено: {entries.filter(([, info]) => info.field).length}
      </div>
    </div>
  )
}
