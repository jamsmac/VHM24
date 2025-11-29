'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Monitor, Smartphone, Tablet } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function SessionsPage() {
  const sessions = [
    { id: '1', device: 'Chrome на Windows', device_type: 'desktop', ip: '192.168.1.100', location: 'Москва, Россия', is_current: true, last_activity: new Date().toISOString() },
    { id: '2', device: 'Safari на iPhone', device_type: 'mobile', ip: '192.168.1.101', location: 'Москва, Россия', is_current: false, last_activity: new Date(Date.now() - 3600000).toISOString() },
  ]

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="h-5 w-5 text-blue-600" />
      case 'tablet': return <Tablet className="h-5 w-5 text-purple-600" />
      default: return <Monitor className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Активные сеансы</h1>
          <p className="mt-2 text-gray-600">Управление активными входами</p>
        </div>
        <Button variant="danger">Завершить все сеансы</Button>
      </div>

      <div className="space-y-4">
        {sessions.map((session) => (
          <div key={session.id} className="bg-white rounded-lg border p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 ${session.device_type === 'mobile' ? 'bg-blue-100' : 'bg-gray-100'} rounded-lg`}>
                  {getDeviceIcon(session.device_type)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{session.device}</h3>
                    {session.is_current && (
                      <Badge className="bg-green-100 text-green-800">Текущий сеанс</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>IP: {session.ip}</p>
                    <p>Локация: {session.location}</p>
                    <p>Последняя активность: {formatDateTime(session.last_activity)}</p>
                  </div>
                </div>
              </div>
              {!session.is_current && (
                <Button variant="danger" size="sm">
                  Завершить
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
