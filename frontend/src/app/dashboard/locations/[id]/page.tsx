'use client'

import { useQuery } from '@tanstack/react-query'
import { locationsApi } from '@/lib/locations-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MachineCard } from '@/components/machines/MachineCard'
import { Machine } from '@/types/machines'
import { ArrowLeft, MapPin, Building2, Users, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'

interface LocationDetailPageProps {
  params: {
    id: string
  }
}

export default function LocationDetailPage({ params }: LocationDetailPageProps) {
  const { data: location, isLoading } = useQuery({
    queryKey: ['locations', params.id],
    queryFn: () => locationsApi.getById(params.id),
  })

  const { data: machines } = useQuery({
    queryKey: ['locations', params.id, 'machines'],
    queryFn: () => locationsApi.getMachines(params.id),
  })

  const { data: stats } = useQuery({
    queryKey: ['locations', params.id, 'stats'],
    queryFn: () => locationsApi.getStats(params.id),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    )
  }

  if (!location) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Локация не найдена</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/locations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{location.name}</h1>
            <p className="mt-2 text-gray-600">{location.address}</p>
          </div>
        </div>
        {location.is_active ? (
          <Badge className="bg-green-100 text-green-800">Активна</Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-800">Неактивна</Badge>
        )}
      </div>

      {/* Main Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Информация о локации</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Адрес</p>
              <p className="text-lg font-semibold text-gray-900">{location.address}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Тип локации</p>
              <p className="text-lg font-semibold text-gray-900">{location.location_type || '-'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Проходимость</p>
              <p className="text-lg font-semibold text-gray-900">{location.foot_traffic || 0}</p>
            </div>
          </div>

          {location.contact_person && (
            <div>
              <p className="text-sm text-gray-600">Контактное лицо</p>
              <p className="font-semibold text-gray-900">{location.contact_person}</p>
              {location.contact_phone && (
                <p className="text-sm text-gray-500">{location.contact_phone}</p>
              )}
            </div>
          )}
        </div>

        {location.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600 mb-2">Примечания</p>
            <p className="text-gray-900">{location.notes}</p>
          </div>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Аппаратов</p>
            <p className="text-2xl font-bold text-gray-900">{stats.machine_count || 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Выручка сегодня</p>
            <p className="text-2xl font-bold text-green-600">
              {(stats.revenue_today || 0).toLocaleString('ru-RU')} сўм
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Выручка за месяц</p>
            <p className="text-2xl font-bold text-indigo-600">
              {(stats.revenue_month || 0).toLocaleString('ru-RU')} сўм
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Активных инцидентов</p>
            <p className="text-2xl font-bold text-orange-600">{stats.active_incidents || 0}</p>
          </div>
        </div>
      )}

      {/* Machines */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Аппараты на локации</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines && machines.length > 0 ? (
            machines.map((machine: Machine) => <MachineCard key={machine.id} machine={machine} />)
          ) : (
            <div className="col-span-full bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">На данной локации нет аппаратов</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
