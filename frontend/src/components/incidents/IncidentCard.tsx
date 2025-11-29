import { memo } from 'react'
import Link from 'next/link'
import { Incident } from '@/types/incidents'
import type { ActiveIncident } from '@/lib/dashboard-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { MapPin, User, AlertTriangle } from 'lucide-react'

// Support both full Incident and simplified ActiveIncident from dashboard
type IncidentCardData = Incident | ActiveIncident

// Type guard to check if incident is full Incident type
function isFullIncident(incident: IncidentCardData): incident is Incident {
  return 'incident_type' in incident
}

// Type for cash discrepancy metadata
interface CashDiscrepancyMetadata {
  expected_amount?: number
  actual_amount?: number
  discrepancy_percent?: number
  task_id?: string
}

interface IncidentCardProps {
  incident: IncidentCardData
}

export const IncidentCard = memo(function IncidentCard({ incident }: IncidentCardProps) {
  const fullIncident = isFullIncident(incident) ? incident : null

  const statusColors: Record<string, string> = {
    open: 'bg-red-100 text-red-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  const priorityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  }

  const isCashDiscrepancy = fullIncident?.incident_type === 'cash_discrepancy'
  const metadata = fullIncident?.metadata as CashDiscrepancyMetadata | undefined

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{incident.title}</h3>
            {fullIncident && (
              <Badge className={statusColors[fullIncident.status] || 'bg-gray-100 text-gray-800'}>
                {fullIncident.status}
              </Badge>
            )}
            <Badge className={priorityColors[incident.priority] || 'bg-gray-100 text-gray-800'}>
              {incident.priority}
            </Badge>
          </div>
          {fullIncident?.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{fullIncident.description}</p>
          )}
        </div>
      </div>

      {isCashDiscrepancy && metadata && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
          <h4 className="font-semibold text-orange-900 text-sm mb-2 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Расхождение в инкассации
          </h4>
          <dl className="space-y-1 text-sm">
            {metadata.expected_amount !== undefined && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Ожидалось:</dt>
                <dd className="font-medium">{formatCurrency(metadata.expected_amount)}</dd>
              </div>
            )}
            {metadata.actual_amount !== undefined && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Собрано:</dt>
                <dd className="font-medium">{formatCurrency(metadata.actual_amount)}</dd>
              </div>
            )}
            {metadata.discrepancy_percent !== undefined && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Разница:</dt>
                <dd className="font-medium text-orange-700">
                  {metadata.discrepancy_percent.toFixed(1)}%
                </dd>
              </div>
            )}
          </dl>
          {metadata.task_id && (
            <Link href={`/dashboard/tasks/${metadata.task_id}`}>
              <Button variant="secondary" size="sm" className="mt-2 w-full">
                Посмотреть задачу инкассации
              </Button>
            </Link>
          )}
        </div>
      )}

      <div className="space-y-2 text-sm text-gray-600">
        {/* Show machine info - support both full and simplified incident */}
        {fullIncident?.machine ? (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{fullIncident.machine.machine_number}</span>
            {fullIncident.machine.location && (
              <span className="text-gray-400">• {fullIncident.machine.location.name}</span>
            )}
          </div>
        ) : 'machine_number' in incident && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{incident.machine_number}</span>
          </div>
        )}

        {fullIncident?.assigned_to && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{fullIncident.assigned_to.full_name}</span>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Создан: {formatDateTime(fullIncident?.reported_at || incident.reported_at)}
        </p>
      </div>

      <Link href={`/dashboard/incidents/${incident.id}`}>
        <Button variant="ghost" size="sm" className="mt-3 w-full">
          Подробнее
        </Button>
      </Link>
    </div>
  )
})
