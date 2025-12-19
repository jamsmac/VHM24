'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Search, Navigation, Coffee } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { clientApi } from '@/lib/client-api'
import { PublicLocation } from '@/types/client'

export default function LocationsPage() {
  const [search, setSearch] = useState('')
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  const { data: cities = [] } = useQuery({
    queryKey: ['public-cities'],
    queryFn: () => clientApi.getCities(),
  })

  const { data: locationsData, isLoading } = useQuery({
    queryKey: ['public-locations', search, selectedCity, userLocation],
    queryFn: () =>
      clientApi.getLocations({
        search: search || undefined,
        city: selectedCity !== 'all' ? selectedCity : undefined,
        lat: userLocation?.lat,
        lng: userLocation?.lng,
      }),
  })

  const locations = locationsData?.data || []

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Наши локации</h1>
        <p className="text-muted-foreground">
          Найдите ближайший автомат VendHub
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или адресу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Город" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все города</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleGetLocation}>
          <Navigation className="mr-2 h-4 w-4" />
          Мое местоположение
        </Button>
      </div>

      {/* Map placeholder */}
      <div className="mb-8 h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-2" />
          <p>Карта с локациями</p>
          <p className="text-sm">Интеграция с Leaflet/OpenStreetMap</p>
        </div>
      </div>

      {/* Locations list */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          // Skeleton loading
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))
        ) : locations.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Локации не найдены</p>
            <p className="text-muted-foreground">
              Попробуйте изменить параметры поиска
            </p>
          </div>
        ) : (
          locations.map((location: PublicLocation) => (
            <Card key={location.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span>{location.name}</span>
                  {location.distance_km !== undefined && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {location.distance_km} км
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {location.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{location.address}</span>
                    </div>
                  )}
                  {location.city && (
                    <div className="text-muted-foreground">{location.city}</div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Coffee className="h-4 w-4 text-primary" />
                    <span>
                      {location.machine_count}{' '}
                      {location.machine_count === 1
                        ? 'автомат'
                        : location.machine_count < 5
                          ? 'автомата'
                          : 'автоматов'}
                    </span>
                  </div>
                  {location.working_hours && (
                    <div className="text-muted-foreground">
                      {location.working_hours}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
