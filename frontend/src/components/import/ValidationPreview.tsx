'use client'

import { useState } from 'react'
import { ValidationReport, ValidationError, ValidationSeverity } from '@/lib/intelligent-import-api'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface ValidationPreviewProps {
  report: ValidationReport
}

function SeverityIcon({ severity }: { severity: ValidationSeverity }) {
  switch (severity) {
    case ValidationSeverity.ERROR:
      return <XCircle className="h-4 w-4 text-red-500" />
    case ValidationSeverity.WARNING:
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case ValidationSeverity.INFO:
      return <Info className="h-4 w-4 text-blue-500" />
  }
}

function ValidationItem({ error }: { error: ValidationError }) {
  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg
        ${error.severity === ValidationSeverity.ERROR ? 'bg-red-50' : ''}
        ${error.severity === ValidationSeverity.WARNING ? 'bg-yellow-50' : ''}
        ${error.severity === ValidationSeverity.INFO ? 'bg-blue-50' : ''}
      `}
    >
      <SeverityIcon severity={error.severity} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            Строка {error.rowIndex + 1}
          </span>
          <span className="text-sm text-gray-500">•</span>
          <span className="text-sm text-gray-600">{error.field}</span>
        </div>
        <p className="text-sm text-gray-700 mt-1">{error.message}</p>
        {error.value !== undefined && error.value !== null && (
          <p className="text-xs text-gray-500 mt-1">
            Значение: <code className="bg-gray-100 px-1 rounded">{String(error.value)}</code>
          </p>
        )}
      </div>
    </div>
  )
}

function ValidationSection({
  title,
  items,
  severity,
  defaultOpen = false,
}: {
  title: string
  items: ValidationError[]
  severity: ValidationSeverity
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (items.length === 0) return null

  const bgColor =
    severity === ValidationSeverity.ERROR
      ? 'bg-red-100'
      : severity === ValidationSeverity.WARNING
        ? 'bg-yellow-100'
        : 'bg-blue-100'

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 ${bgColor}`}
      >
        <div className="flex items-center gap-2">
          <SeverityIcon severity={severity} />
          <span className="font-medium text-gray-900">{title}</span>
          <span className="text-sm text-gray-600">({items.length})</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
          {items.slice(0, 50).map((error, index) => (
            <ValidationItem key={index} error={error} />
          ))}
          {items.length > 50 && (
            <p className="text-sm text-gray-500 text-center py-2">
              ...и ещё {items.length - 50} записей
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function ValidationPreview({ report }: ValidationPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Всего строк</div>
          <div className="text-2xl font-bold text-gray-900">{report.totalRows}</div>
        </div>

        <div className={`rounded-lg border p-4 ${report.errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2">
            <XCircle className={`h-4 w-4 ${report.errorCount > 0 ? 'text-red-500' : 'text-green-500'}`} />
            <span className="text-sm text-gray-600">Ошибки</span>
          </div>
          <div className={`text-2xl font-bold ${report.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {report.errorCount}
          </div>
        </div>

        <div className={`rounded-lg border p-4 ${report.warningCount > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${report.warningCount > 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-600">Предупреждения</span>
          </div>
          <div className={`text-2xl font-bold ${report.warningCount > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
            {report.warningCount}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-600">Информация</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{report.infoCount}</div>
        </div>
      </div>

      {/* Status */}
      <div
        className={`
          flex items-center gap-3 p-4 rounded-lg
          ${report.isValid ? 'bg-green-50 border border-green-200' : ''}
          ${!report.isValid && report.canProceed ? 'bg-yellow-50 border border-yellow-200' : ''}
          ${!report.isValid && !report.canProceed ? 'bg-red-50 border border-red-200' : ''}
        `}
      >
        {report.isValid ? (
          <>
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium text-green-800">Данные прошли проверку</p>
              <p className="text-sm text-green-600">Все строки корректны, можно продолжить импорт</p>
            </div>
          </>
        ) : report.canProceed ? (
          <>
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-800">Найдены предупреждения</p>
              <p className="text-sm text-yellow-600">
                Импорт возможен, но рекомендуется проверить данные
              </p>
            </div>
          </>
        ) : (
          <>
            <XCircle className="h-6 w-6 text-red-500" />
            <div>
              <p className="font-medium text-red-800">Обнаружены критические ошибки</p>
              <p className="text-sm text-red-600">
                Необходимо исправить ошибки перед импортом
              </p>
            </div>
          </>
        )}
      </div>

      {/* Error/Warning Sections */}
      <div className="space-y-3">
        <ValidationSection
          title="Ошибки"
          items={report.errors}
          severity={ValidationSeverity.ERROR}
          defaultOpen={report.errors.length > 0 && report.errors.length <= 10}
        />

        <ValidationSection
          title="Предупреждения"
          items={report.warnings}
          severity={ValidationSeverity.WARNING}
          defaultOpen={report.warnings.length > 0 && report.warnings.length <= 5}
        />

        <ValidationSection
          title="Информация"
          items={report.info}
          severity={ValidationSeverity.INFO}
        />
      </div>
    </div>
  )
}
