'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  intelligentImportApi,
  ImportSessionStatus,
  statusLabels,
  domainLabels,
  getStatusProgress,
} from '@/lib/intelligent-import-api'
import { Button } from '@/components/ui/button'
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Columns,
  ShieldCheck,
  Play,
  Check,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'
import { ColumnMappingPreview } from './ColumnMappingPreview'
import { ValidationPreview } from './ValidationPreview'
import { ActionPlanPreview } from './ActionPlanPreview'

type WizardStep = 'upload' | 'processing' | 'mapping' | 'validation' | 'approval' | 'executing' | 'complete'

interface ImportWizardProps {
  onComplete?: () => void
}

export function ImportWizard({ onComplete }: ImportWizardProps) {
  const [file, setFile] = useState<File | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const queryClient = useQueryClient()

  // Fetch session data
  const { data: session } = useQuery({
    queryKey: ['import-session', sessionId],
    queryFn: () => intelligentImportApi.getSession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      // Stop polling when session is complete or needs approval
      const data = query.state.data
      if (!data) return 2000
      const status = data.status
      if (
        status === ImportSessionStatus.AWAITING_APPROVAL ||
        status === ImportSessionStatus.COMPLETED ||
        status === ImportSessionStatus.FAILED ||
        status === ImportSessionStatus.REJECTED ||
        status === ImportSessionStatus.CANCELLED
      ) {
        return false
      }
      return 2000 // Poll every 2 seconds while processing
    },
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => intelligentImportApi.upload(file),
    onSuccess: (data) => {
      setSessionId(data.sessionId)
      toast.success('Файл загружен, начинается обработка...')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при загрузке файла'))
    },
  })

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: () => intelligentImportApi.approve(sessionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-session', sessionId] })
      toast.success('Импорт подтвержден, выполняется...')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при подтверждении'))
    },
  })

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => intelligentImportApi.reject(sessionId!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-session', sessionId] })
      toast.info('Импорт отклонен')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при отклонении'))
    },
  })

  // Determine current step
  const getCurrentStep = (): WizardStep => {
    if (!sessionId || !session) return 'upload'

    switch (session.status) {
      case ImportSessionStatus.PENDING:
      case ImportSessionStatus.PARSING:
      case ImportSessionStatus.PARSED:
      case ImportSessionStatus.CLASSIFYING:
        return 'processing'
      case ImportSessionStatus.CLASSIFIED:
        return 'mapping'
      case ImportSessionStatus.VALIDATING:
      case ImportSessionStatus.VALIDATED:
      case ImportSessionStatus.SUGGESTING:
        return 'validation'
      case ImportSessionStatus.AWAITING_APPROVAL:
        return 'approval'
      case ImportSessionStatus.APPROVED:
      case ImportSessionStatus.EXECUTING:
      case ImportSessionStatus.RECONCILING:
        return 'executing'
      case ImportSessionStatus.COMPLETED:
        return 'complete'
      case ImportSessionStatus.FAILED:
      case ImportSessionStatus.REJECTED:
      case ImportSessionStatus.CANCELLED:
        return 'complete'
      default:
        return 'processing'
    }
  }

  const currentStep = getCurrentStep()
  const progress = session ? getStatusProgress(session.status) : 0

  // Handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (isValidFile(droppedFile)) {
        setFile(droppedFile)
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (isValidFile(selectedFile)) {
        setFile(selectedFile)
      }
    }
  }

  const isValidFile = (file: File): boolean => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'text/xml',
      'application/xml',
    ]
    const validExtensions = ['.csv', '.xlsx', '.xls', '.json', '.xml']

    if (
      !validTypes.includes(file.type) &&
      !validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    ) {
      toast.error('Неверный формат файла. Поддерживаются: CSV, Excel, JSON, XML')
      return false
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимальный размер: 10 MB')
      return false
    }

    return true
  }

  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  const handleReset = () => {
    setFile(null)
    setSessionId(null)
  }

  // Steps configuration
  const steps = [
    { id: 'upload', label: 'Загрузка', icon: Upload },
    { id: 'processing', label: 'Обработка', icon: Loader2 },
    { id: 'mapping', label: 'Маппинг', icon: Columns },
    { id: 'validation', label: 'Проверка', icon: ShieldCheck },
    { id: 'approval', label: 'Подтверждение', icon: Check },
    { id: 'complete', label: 'Готово', icon: CheckCircle2 },
  ]

  const getStepStatus = (stepId: string) => {
    const stepOrder = steps.findIndex((s) => s.id === stepId)
    const currentOrder = steps.findIndex((s) => s.id === currentStep)

    if (stepOrder < currentOrder) return 'completed'
    if (stepOrder === currentOrder) return 'current'
    return 'upcoming'
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id)
            const Icon = step.icon

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${status === 'completed' ? 'bg-green-500 text-white' : ''}
                      ${status === 'current' ? 'bg-indigo-500 text-white' : ''}
                      ${status === 'upcoming' ? 'bg-gray-200 text-gray-500' : ''}
                    `}
                  >
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : status === 'current' && currentStep === 'processing' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      status === 'current' ? 'text-indigo-600' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-0.5 mx-2 ${
                      getStepStatus(steps[index + 1].id) !== 'upcoming'
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Progress Bar */}
        {session && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">{statusLabels[session.status]}</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Upload Step */}
        {currentStep === 'upload' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Загрузка файла</h2>
              <p className="text-gray-600 mt-1">
                Выберите файл для импорта. Система автоматически определит тип данных.
              </p>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}
              `}
            >
              {file ? (
                <div>
                  <FileText className="mx-auto h-12 w-12 text-green-500" />
                  <p className="mt-2 text-lg font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <Button variant="outline" onClick={() => setFile(null)} className="mt-4">
                    Выбрать другой файл
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-indigo-600 hover:text-indigo-700 font-medium">
                        Выберите файл
                      </span>
                      <input
                        id="file-upload"
                        type="file"
                        accept=".csv,.xlsx,.xls,.json,.xml"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    <span className="text-gray-600"> или перетащите сюда</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    CSV, Excel, JSON, XML до 10 MB
                  </p>
                </div>
              )}
            </div>

            {file && (
              <div className="flex justify-end">
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      Начать импорт
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Processing Step */}
        {currentStep === 'processing' && session && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mx-auto" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              {statusLabels[session.status]}
            </h2>
            <p className="text-gray-600 mt-2">
              {session.file_metadata?.filename && (
                <span>Файл: {session.file_metadata.filename}</span>
              )}
            </p>
          </div>
        )}

        {/* Mapping Step */}
        {currentStep === 'mapping' && session?.classification_result && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Маппинг колонок</h2>
              <p className="text-gray-600 mt-1">
                Система определила тип данных:{' '}
                <span className="font-medium text-indigo-600">
                  {domainLabels[session.classification_result.domain]}
                </span>
                <span className="text-sm ml-2">
                  (уверенность: {Math.round(session.classification_result.confidence * 100)}%)
                </span>
              </p>
            </div>

            <ColumnMappingPreview
              mapping={session.classification_result.columnMapping}
              dataTypes={session.classification_result.dataTypes}
            />
          </div>
        )}

        {/* Validation Step */}
        {currentStep === 'validation' && session && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Проверка данных</h2>
              <p className="text-gray-600 mt-1">
                Выполняется валидация данных...
              </p>
            </div>

            {session.validation_report ? (
              <ValidationPreview report={session.validation_report} />
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto" />
                <p className="text-gray-600 mt-2">Проверка данных...</p>
              </div>
            )}
          </div>
        )}

        {/* Approval Step */}
        {currentStep === 'approval' && session && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Подтверждение импорта</h2>
              <p className="text-gray-600 mt-1">
                Проверьте план действий и подтвердите импорт.
              </p>
            </div>

            {session.action_plan && (
              <ActionPlanPreview plan={session.action_plan} />
            )}

            {session.validation_report && (
              <ValidationPreview report={session.validation_report} />
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => rejectMutation.mutate('Отклонено пользователем')}
                disabled={rejectMutation.isPending || approveMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Отклонить
              </Button>
              <Button
                onClick={() => approveMutation.mutate()}
                disabled={rejectMutation.isPending || approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Подтвердить импорт
              </Button>
            </div>
          </div>
        )}

        {/* Executing Step */}
        {currentStep === 'executing' && session && (
          <div className="text-center py-12">
            <Play className="h-12 w-12 text-indigo-500 mx-auto animate-pulse" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Выполняется импорт...
            </h2>
            <p className="text-gray-600 mt-2">{statusLabels[session.status]}</p>
          </div>
        )}

        {/* Complete Step */}
        {currentStep === 'complete' && session && (
          <div className="text-center py-12">
            {session.status === ImportSessionStatus.COMPLETED ? (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Импорт завершен успешно!
                </h2>
                {session.execution_result && (
                  <div className="mt-4 inline-flex gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {session.execution_result.successCount}
                      </p>
                      <p className="text-sm text-gray-500">Успешно</p>
                    </div>
                    {session.execution_result.failureCount > 0 && (
                      <div className="text-center">
                        <p className="text-3xl font-bold text-red-600">
                          {session.execution_result.failureCount}
                        </p>
                        <p className="text-sm text-gray-500">Ошибок</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : session.status === ImportSessionStatus.FAILED ? (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Импорт завершился с ошибкой
                </h2>
                {session.message && (
                  <p className="text-red-600 mt-2">{session.message}</p>
                )}
              </>
            ) : (
              <>
                <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  {statusLabels[session.status]}
                </h2>
                {session.message && (
                  <p className="text-gray-600 mt-2">{session.message}</p>
                )}
              </>
            )}

            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Новый импорт
              </Button>
              {onComplete && (
                <Button onClick={onComplete}>
                  Готово
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
