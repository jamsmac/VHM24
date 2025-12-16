'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { locationsApi, MapLocationData } from '@/lib/locations-api'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import {
  Map,
  List,
  MapPin,
  Package,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Filter,
  X,
} from 'lucide-react'
import Link from 'next/link'

// Dynamically import the map to avoid SSR issues with Leaflet
const MachineMap = dynamic(
  () => import('@/components/map/MachineMap').then((mod) => ({ default: mod.MachineMap })),
  {
    loading: () => (
      <div className="h-[calc(100vh-200px)] bg-gray-100 rounded-lg animate-pulse" />
    ),
    ssr: false,
  }
)

type FilterType = 'all' | 'active' | 'low_stock' | 'error' | 'empty'

function LocationListItem({ location }: { location: MapLocationData }) {
  const getStatusColor = () => {
    if (location.machines_error > 0) return 'border-l-red-500'
    if (location.machines_low_stock > 0) return 'border-l-orange-500'
    if (location.machine_count === 0) return 'border-l-gray-400'
    return 'border-l-green-500'
  }

  return (
    <Link
      href={`/dashboard/locations/${location.id}`}
      className={`block p-4 border-l-4 ${getStatusColor()} bg-white rounded-r-lg hover:bg-gray-50 transition-colors`}
    >
      <h3 className="font-medium text-gray-900">{location.name}</h3>
      <p className="text-sm text-gray-500 mt-0.5">{location.address}</p>

      <div className="flex items-center gap-4 mt-2 text-sm">
        <span className="flex items-center gap-1 text-gray-600">
          <Package className="h-4 w-4" />
          {location.machine_count}
        </span>
        {location.machines_active > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            {location.machines_active}
          </span>
        )}
        {location.machines_low_stock > 0 && (
          <span className="flex items-center gap-1 text-orange-600">
            <AlertTriangle className="h-4 w-4" />
            {location.machines_low_stock}
          </span>
        )}
        {location.machines_error > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <AlertCircle className="h-4 w-4" />
            {location.machines_error}
          </span>
        )}
      </div>
    </Link>
  )
}

export default function MapPage() {
  const [view, setView] = useState<'map' | 'list'>('map')
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedLocation, setSelectedLocation] = useState<MapLocationData | null>(null)

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations', 'map'],
    queryFn: () => locationsApi.getMapData(),
  })

  // Filter locations
  const filteredLocations = locations?.filter((location) => {
    switch (filter) {
      case 'active':
        return location.machines_active > 0 && location.machines_error === 0 && location.machines_low_stock === 0
      case 'low_stock':
        return location.machines_low_stock > 0
      case 'error':
        return location.machines_error > 0
      case 'empty':
        return location.machine_count === 0
      default:
        return true
    }
  }) || []

  // Stats
  const stats = {
    total: locations?.length || 0,
    withMachines: locations?.filter((l) => l.machine_count > 0).length || 0,
    withErrors: locations?.filter((l) => l.machines_error > 0).length || 0,
    lowStock: locations?.filter((l) => l.machines_low_stock > 0).length || 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Карта аппаратов</h1>
          <p className="mt-2 text-gray-600">
            Географическое расположение локаций и аппаратов
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={view === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('map')}
          >
            <Map className="h-4 w-4 mr-1" />
            Карта
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4 mr-1" />
            Список
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">Всего локаций</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-600">С аппаратами</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-green-600">{stats.withMachines}</p>
        </div>
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span className="text-sm text-orange-600">Мало товара</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-orange-600">{stats.lowStock}</p>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm text-red-600">С ошибками</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">{stats.withErrors}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium text-gray-900">Фильтры</h3>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="ml-auto text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Сбросить
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Все ({locations?.length || 0})
          </Button>
          <Button
            size="sm"
            variant={filter === 'active' ? 'default' : 'outline'}
            onClick={() => setFilter('active')}
            className={filter === 'active' ? '' : 'text-green-600 border-green-200 hover:bg-green-50'}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Активные
          </Button>
          <Button
            size="sm"
            variant={filter === 'low_stock' ? 'default' : 'outline'}
            onClick={() => setFilter('low_stock')}
            className={filter === 'low_stock' ? '' : 'text-orange-600 border-orange-200 hover:bg-orange-50'}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Мало товара ({stats.lowStock})
          </Button>
          <Button
            size="sm"
            variant={filter === 'error' ? 'default' : 'outline'}
            onClick={() => setFilter('error')}
            className={filter === 'error' ? '' : 'text-red-600 border-red-200 hover:bg-red-50'}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            С ошибками ({stats.withErrors})
          </Button>
          <Button
            size="sm"
            variant={filter === 'empty' ? 'default' : 'outline'}
            onClick={() => setFilter('empty')}
            className={filter === 'empty' ? '' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}
          >
            Без аппаратов
          </Button>
        </div>
      </div>

      {/* Map or List View */}
      {isLoading ? (
        <CardSkeleton />
      ) : view === 'map' ? (
        <MachineMap
          height="calc(100vh - 400px)"
          showLegend={true}
          onLocationClick={setSelectedLocation}
        />
      ) : (
        <div className="space-y-2">
          {filteredLocations.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Нет локаций с указанными фильтрами</p>
            </div>
          ) : (
            filteredLocations.map((location) => (
              <LocationListItem key={location.id} location={location} />
            ))
          )}
        </div>
      )}

      {/* Selected Location Panel */}
      {selectedLocation && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-[1001]">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{selectedLocation.name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{selectedLocation.address}</p>
            </div>
            <button
              onClick={() => setSelectedLocation(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1 text-gray-600">
              <Package className="h-4 w-4" />
              {selectedLocation.machine_count} аппаратов
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <Link href={`/dashboard/locations/${selectedLocation.id}`} className="flex-1">
              <Button size="sm" className="w-full">
                Открыть локацию
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
