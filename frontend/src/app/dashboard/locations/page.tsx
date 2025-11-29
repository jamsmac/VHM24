'use client'

import { useQuery } from '@tanstack/react-query'
import { locationsApi } from '@/lib/locations-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MapPin, Building2 } from 'lucide-react'
import Link from 'next/link'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'

export default function LocationsPage() {
  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll(),
  })

  const locationsList = locations || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Локации</h1>
          <p className="mt-2 text-gray-600">Управление точками размещения аппаратов</p>
        </div>
        <Link href="/locations/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Добавить локацию
          </Button>
        </Link>
      </div>

      {/* Statistics */}
      {locationsList.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Всего локаций</p>
            <p className="text-2xl font-bold text-gray-900">{locationsList.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Активных</p>
            <p className="text-2xl font-bold text-green-600">
              {locationsList.filter((l) => l.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Всего аппаратов</p>
            <p className="text-2xl font-bold text-indigo-600">
              {locationsList.reduce((sum, l) => sum + (l.machine_count || 0), 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Средняя проходимость</p>
            <p className="text-2xl font-bold text-blue-600">
              {locationsList.length > 0 ? Math.round(locationsList.reduce((sum, l) => sum + (typeof l.foot_traffic === 'number' ? l.foot_traffic : 0), 0) / locationsList.length) : 0}
            </p>
          </div>
        </div>
      )}

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : locationsList.length > 0 ? (
          locationsList.map((location) => (
            <Link key={location.id} href={`/locations/${location.id}`}>
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <Building2 className="h-6 w-6 text-indigo-600" />
                  </div>
                  {location.is_active ? (
                    <Badge className="bg-green-100 text-green-800">Активна</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">Неактивна</Badge>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {location.name}
                </h3>

                <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>{location.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <p className="text-xs text-gray-600">Аппаратов</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {location.machine_count || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Проходимость</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {location.foot_traffic || 0}
                    </p>
                  </div>
                </div>

                {location.location_type && (
                  <div className="mt-3">
                    <Badge className="bg-blue-100 text-blue-800">
                      {location.location_type}
                    </Badge>
                  </div>
                )}
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full">
            <p className="text-gray-500 text-center py-12">Локации не найдены</p>
          </div>
        )}
      </div>
    </div>
  )
}
