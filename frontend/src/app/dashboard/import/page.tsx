'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  intelligentImportApi,
  ImportSession,
  ImportSessionStatus,
  statusLabels,
  domainLabels,
  getStatusColor,
} from '@/lib/intelligent-import-api'
import { Button } from '@/components/ui/button'
import { ImportWizard } from '@/components/import/ImportWizard'
import {
  Upload,
  History,
  FileText,
  Trash2,
  Eye,
  Loader2,
  Clock,
  User,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { toast } from 'sonner'

type Tab = 'import' | 'history'

function SessionCard({ session, onView, onDelete }: {
  session: ImportSession
  onView: () => void
  onDelete: () => void
}) {
  const statusColor = getStatusColor(session.status)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <FileText className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {session.file_metadata?.filename || 'Неизвестный файл'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColor}`}>
                {statusLabels[session.status]}
              </span>
              <span className="text-xs text-gray-500">
                {domainLabels[session.domain]}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onView}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatDistanceToNow(new Date(session.created_at), {
            addSuffix: true,
            locale: ru,
          })}
        </span>
        {session.uploaded_by && (
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {session.uploaded_by.first_name} {session.uploaded_by.last_name}
          </span>
        )}
        {session.file_metadata?.rowCount && (
          <span>{session.file_metadata.rowCount} строк</span>
        )}
      </div>

      {session.execution_result && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4">
          <span className="text-sm text-green-600">
            Успешно: {session.execution_result.successCount}
          </span>
          {session.execution_result.failureCount > 0 && (
            <span className="text-sm text-red-600">
              Ошибок: {session.execution_result.failureCount}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function SessionDetail({ session, onClose }: {
  session: ImportSession
  onClose: () => void
}) {
  const statusColor = getStatusColor(session.status)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {session.file_metadata?.filename || 'Детали импорта'}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColor}`}>
                  {statusLabels[session.status]}
                </span>
                <span className="text-sm text-gray-500">
                  {domainLabels[session.domain]}
                </span>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* File Metadata */}
          {session.file_metadata && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Информация о файле</h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                <div>
                  <span className="text-sm text-gray-500">Размер</span>
                  <p className="font-medium">
                    {(session.file_metadata.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Строк</span>
                  <p className="font-medium">{session.file_metadata.rowCount}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Колонок</span>
                  <p className="font-medium">{session.file_metadata.columnCount}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Тип</span>
                  <p className="font-medium">{session.file_metadata.mimetype}</p>
                </div>
              </div>
            </div>
          )}

          {/* Classification Result */}
          {session.classification_result && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Результат классификации</h3>
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-700">
                    Определён тип: <strong>{domainLabels[session.classification_result.domain]}</strong>
                  </span>
                  <span className="text-sm text-indigo-600">
                    Уверенность: {Math.round(session.classification_result.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Validation Report */}
          {session.validation_report && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Результаты валидации</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {session.validation_report.totalRows - session.validation_report.errorCount}
                  </p>
                  <p className="text-sm text-green-700">Валидных</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${session.validation_report.errorCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className={`text-2xl font-bold ${session.validation_report.errorCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {session.validation_report.errorCount}
                  </p>
                  <p className="text-sm text-gray-600">Ошибок</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${session.validation_report.warningCount > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                  <p className={`text-2xl font-bold ${session.validation_report.warningCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                    {session.validation_report.warningCount}
                  </p>
                  <p className="text-sm text-gray-600">Предупреждений</p>
                </div>
              </div>
            </div>
          )}

          {/* Execution Result */}
          {session.execution_result && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Результат выполнения</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {session.execution_result.successCount}
                  </p>
                  <p className="text-sm text-green-700">Успешно</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${session.execution_result.failureCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className={`text-2xl font-bold ${session.execution_result.failureCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {session.execution_result.failureCount}
                  </p>
                  <p className="text-sm text-gray-600">Ошибок</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {(session.execution_result.duration / 1000).toFixed(1)}с
                  </p>
                  <p className="text-sm text-gray-600">Время</p>
                </div>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-sm text-gray-500 pt-4 border-t border-gray-200">
            <div className="flex justify-between">
              <span>Создано: {format(new Date(session.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}</span>
              {session.completed_at && (
                <span>Завершено: {format(new Date(session.completed_at), 'dd.MM.yyyy HH:mm', { locale: ru })}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<Tab>('import')
  const [selectedSession, setSelectedSession] = useState<ImportSession | null>(null)
  const queryClient = useQueryClient()

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['import-sessions'],
    queryFn: () => intelligentImportApi.getSessions(),
    enabled: activeTab === 'history',
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => intelligentImportApi.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-sessions'] })
      toast.success('Сессия удалена')
    },
    onError: () => {
      toast.error('Ошибка при удалении')
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Импорт данных</h1>
        <p className="mt-2 text-gray-600">
          Интеллектуальный импорт с автоматическим определением типа данных
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('import')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'import'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Upload className="h-4 w-4" />
            Новый импорт
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'history'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <History className="h-4 w-4" />
            История импортов
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'import' ? (
        <ImportWizard onComplete={() => setActiveTab('history')} />
      ) : (
        <div className="space-y-4">
          {sessionsLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
              <p className="text-gray-500 mt-2">Загрузка истории...</p>
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onView={() => setSelectedSession(session)}
                  onDelete={() => {
                    if (confirm('Удалить эту сессию импорта?')) {
                      deleteMutation.mutate(session.id)
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">История импортов пуста</p>
              <Button
                variant="outline"
                onClick={() => setActiveTab('import')}
                className="mt-4"
              >
                Создать первый импорт
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetail
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  )
}
