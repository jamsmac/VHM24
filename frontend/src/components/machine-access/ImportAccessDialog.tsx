'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, Download, FileSpreadsheet } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { machineAccessApi } from '@/lib/machine-access-api'
import { ImportMachineAccessResult } from '@/types/machine-access'

interface ImportAccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportAccessDialog({ open, onOpenChange }: ImportAccessDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportMachineAccessResult | null>(null)

  const importMutation = useMutation({
    mutationFn: (file: File) => machineAccessApi.importFromFile(file),
    onSuccess: (data) => {
      setResult(data)
      if (data.applied_count > 0 || data.updated_count > 0) {
        toast.success(`Импорт завершён: ${data.applied_count} добавлено, ${data.updated_count} обновлено`)
        queryClient.invalidateQueries({ queryKey: ['machine-access'] })
      }
      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} ошибок при импорте`)
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Ошибка при импорте')
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setResult(null)
    }
  }

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setResult(null)
    onOpenChange(false)
  }

  const downloadTemplate = () => {
    const csvContent = `machine_number,user_email,role
M-001,user@example.com,operator
M-002,admin@example.com,admin
M-003,tech@example.com,technician`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'machine_access_template.csv'
    link.click()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Импорт доступов из файла</DialogTitle>
          <DialogDescription>
            Загрузите CSV или Excel файл с данными о доступах к аппаратам
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Скачать шаблон CSV
            </Button>
          </div>

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Выбрать другой файл
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Перетащите файл или нажмите для выбора
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Выбрать файл
                </Button>
              </div>
            )}
          </div>

          {importMutation.isPending && (
            <div className="space-y-2">
              <Progress value={50} />
              <p className="text-sm text-muted-foreground text-center">
                Обработка файла...
              </p>
            </div>
          )}

          {result && (
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-medium">Результат импорта:</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-bold text-green-700">{result.applied_count}</div>
                  <div className="text-green-600">Добавлено</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-bold text-blue-700">{result.updated_count}</div>
                  <div className="text-blue-600">Обновлено</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-bold text-gray-700">{result.skipped_count}</div>
                  <div className="text-gray-600">Пропущено</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-2">
                  <h5 className="text-sm font-medium text-destructive">Ошибки:</h5>
                  <ul className="text-sm text-destructive max-h-32 overflow-auto">
                    {result.errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Формат файла:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Колонка <code>machine_number</code> или <code>machine_code</code></li>
              <li>Колонка <code>user_email</code>, <code>username</code> или <code>user_id</code></li>
              <li>Колонка <code>role</code>: owner, admin, manager, operator, technician, viewer</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Закрыть
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || importMutation.isPending}
          >
            {importMutation.isPending ? 'Импорт...' : 'Импортировать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
