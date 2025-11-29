'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Key, Copy } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function APIKeysPage() {
  const apiKeys = [
    { id: '1', name: 'Mobile App', key: 'vnd_sk_live_***************abc123', created_at: new Date().toISOString(), last_used: new Date().toISOString(), is_active: true },
    { id: '2', name: 'Integration Server', key: 'vnd_sk_live_***************xyz789', created_at: new Date(Date.now() - 86400000).toISOString(), last_used: new Date(Date.now() - 3600000).toISOString(), is_active: true },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API ключи</h1>
          <p className="mt-2 text-gray-600">Управление ключами доступа к API</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Создать ключ
        </Button>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-sm text-orange-700">
          ⚠️ API ключи предоставляют доступ к вашим данным. Храните их в безопасности и не публикуйте в открытом доступе.
        </p>
      </div>

      <div className="space-y-4">
        {apiKeys.map((apiKey) => (
          <div key={apiKey.id} className="bg-white rounded-lg border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Key className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{apiKey.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{apiKey.key}</code>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <Badge className={apiKey.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {apiKey.is_active ? 'Активен' : 'Отключен'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Создан</p>
                <p className="font-medium">{formatDateTime(apiKey.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-600">Последнее использование</p>
                <p className="font-medium">{formatDateTime(apiKey.last_used)}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" size="sm">Отключить</Button>
              <Button variant="danger" size="sm">Удалить</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
