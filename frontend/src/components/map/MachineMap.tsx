'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { locationsApi, MapLocationData } from '@/lib/locations-api'
import { MapPin, Loader2 } from 'lucide-react'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'

// Default center (Tashkent, Uzbekistan)
const DEFAULT_CENTER: [number, number] = [41.2995, 69.2401]
const DEFAULT_ZOOM = 12

interface MachineMapProps {
  height?: string
  showLegend?: boolean
  onLocationClick?: (location: MapLocationData) => void
}

// Marker colors based on machine status
function getMarkerColor(location: MapLocationData): string {
  if (location.machines_error > 0) return '#ef4444' // red
  if (location.machines_low_stock > 0) return '#f97316' // orange
  if (location.machine_count === 0) return '#9ca3af' // gray
  return '#22c55e' // green
}

function getMarkerIcon(location: MapLocationData): string {
  const color = getMarkerColor(location)
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="${color}" stroke="#fff" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `)}`
}

function _LocationPopup({ location }: { location: MapLocationData }) {
  return (
    <div className="min-w-[200px]">
      <h3 className="font-semibold text-gray-900 mb-1">{location.name}</h3>
      <p className="text-sm text-gray-600 mb-2">{location.address}</p>

      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Всего аппаратов:</span>
          <span className="font-medium">{location.machine_count}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-green-600">Активных:</span>
          <span className="font-medium text-green-600">{location.machines_active}</span>
        </div>
        {location.machines_low_stock > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-orange-600">Мало товара:</span>
            <span className="font-medium text-orange-600">{location.machines_low_stock}</span>
          </div>
        )}
        {location.machines_error > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-red-600">С ошибками:</span>
            <span className="font-medium text-red-600">{location.machines_error}</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100">
        <a
          href={`/dashboard/locations/${location.id}`}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Подробнее →
        </a>
      </div>
    </div>
  )
}

function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
      <h4 className="text-xs font-semibold text-gray-700 mb-2">Легенда</h4>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">Все аппараты активны</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-xs text-gray-600">Мало товара</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-gray-600">Есть ошибки</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-xs text-gray-600">Нет аппаратов</span>
        </div>
      </div>
    </div>
  )
}

export function MachineMap({ height = '500px', showLegend = true, onLocationClick }: MachineMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<LeafletMarker[]>([])
  const [isMapReady, setIsMapReady] = useState(false)

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations', 'map'],
    queryFn: () => locationsApi.getMapData(),
    refetchInterval: 60000, // Refresh every minute
  })

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || mapInstanceRef.current) return

    // Dynamically import Leaflet (CSS is loaded globally in dashboard/layout.tsx)
    const initMap = async () => {
      const L = (await import('leaflet')).default

      // Create map
      const map = L.map(mapRef.current!, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      })

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map
      setIsMapReady(true)
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update markers when data changes
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !locations) return

    const updateMarkers = async () => {
      const L = (await import('leaflet')).default
      const map = mapInstanceRef.current
      if (!map) return

      // Remove existing markers
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      if (locations.length === 0) return

      // Add new markers
      const bounds: [number, number][] = []

      locations.forEach((location) => {
        const icon = L.icon({
          iconUrl: getMarkerIcon(location),
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        })

        const marker = L.marker([location.latitude, location.longitude], { icon })
          .addTo(map)
          .bindPopup(() => {
            const container = document.createElement('div')
            container.innerHTML = `
              <div class="min-w-[200px]">
                <h3 class="font-semibold text-gray-900 mb-1">${location.name}</h3>
                <p class="text-sm text-gray-600 mb-2">${location.address}</p>

                <div class="space-y-1 text-sm">
                  <div class="flex items-center justify-between">
                    <span class="text-gray-500">Всего аппаратов:</span>
                    <span class="font-medium">${location.machine_count}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-green-600">Активных:</span>
                    <span class="font-medium text-green-600">${location.machines_active}</span>
                  </div>
                  ${location.machines_low_stock > 0 ? `
                    <div class="flex items-center justify-between">
                      <span class="text-orange-600">Мало товара:</span>
                      <span class="font-medium text-orange-600">${location.machines_low_stock}</span>
                    </div>
                  ` : ''}
                  ${location.machines_error > 0 ? `
                    <div class="flex items-center justify-between">
                      <span class="text-red-600">С ошибками:</span>
                      <span class="font-medium text-red-600">${location.machines_error}</span>
                    </div>
                  ` : ''}
                </div>

                <div class="mt-3 pt-2 border-t border-gray-100">
                  <a
                    href="/dashboard/locations/${location.id}"
                    class="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Подробнее →
                  </a>
                </div>
              </div>
            `
            return container
          })

        if (onLocationClick) {
          marker.on('click', () => onLocationClick(location))
        }

        markersRef.current.push(marker)
        bounds.push([location.latitude, location.longitude])
      })

      // Fit map to show all markers
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }

    updateMarkers()
  }, [isMapReady, locations, onLocationClick])

  if (isLoading) {
    return (
      <div
        className="bg-gray-100 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-500">Загрузка карты...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-200" style={{ height }}>
      <div ref={mapRef} className="w-full h-full" />
      {showLegend && <MapLegend />}

      {locations && locations.length === 0 && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[1000]">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Нет локаций с координатами</p>
            <p className="text-sm text-gray-400 mt-1">
              Добавьте координаты к локациям для отображения на карте
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
