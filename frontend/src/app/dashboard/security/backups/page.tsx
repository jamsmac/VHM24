'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Database, CheckCircle, XCircle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function BackupsPage() {
  const backups = [
    { id: '1', name: 'Автоматическая резервная копия', size: 245678900, status: 'completed', created_at: new Date().toISOString(), type: 'automatic' },
    { id: '2', name: 'Ручная резервная копия перед обновлением', size: 243120450, status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString(), type: 'manual' },
    { id: '3', name: 'Автоматическая резервная копия', size: 240563200, status: 'completed', created_at: new Date(Date.now() - 172800000).toISOString(), type: 'automatic' },
  ]

  const formatBytes = (bytes: number) => {
    if (bytes === 0) {return '0 Bytes'}
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Резервные копии</h1>
          <p className="mt-2 text-gray-600">Управление резервными копиями базы данных</p>
        </div>
        <Button>
          Создать резервную копию
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Всего резервных копий</p>
          <p className="text-2xl font-bold">{backups.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Последняя резервная копия</p>
          <p className="text-lg font-semibold text-green-600">Сегодня</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Общий размер</p>
          <p className="text-2xl font-bold">{formatBytes(backups.reduce((s, b) => s + b.size, 0))}</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Настройки автоматического резервного копирования</h3>
        <p className="text-sm text-blue-700">
          Автоматические резервные копии создаются ежедневно в 03:00. Хранятся последние 7 копий.
        </p>
      </div>

      <div className="space-y-3">
        {backups.map((backup) => (
          <div key={backup.id} className="bg-white rounded-lg border p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Database className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{backup.name}</h3>
                    {backup.status === 'completed' ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Успешно
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Ошибка
                      </Badge>
                    )}
                    <Badge className="bg-gray-100 text-gray-800">
                      {backup.type === 'automatic' ? 'Автоматическая' : 'Ручная'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Размер: {formatBytes(backup.size)}</p>
                    <p>Создана: {formatDateTime(backup.created_at)}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Скачать
                </Button>
                <Button variant="secondary" size="sm">
                  Восстановить
                </Button>
                <Button variant="danger" size="sm">
                  Удалить
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
