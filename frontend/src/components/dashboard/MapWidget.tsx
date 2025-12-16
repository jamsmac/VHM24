'use client'

import dynamic from 'next/dynamic'
import { Map } from 'lucide-react'
import Link from 'next/link'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'

// Dynamically import the map to avoid SSR issues with Leaflet
const MachineMap = dynamic(
  () => import('@/components/map/MachineMap').then((mod) => ({ default: mod.MachineMap })),
  {
    loading: () => <CardSkeleton />,
    ssr: false,
  }
)

export function MapWidget() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Map className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Карта аппаратов</h2>
        </div>
        <Link
          href="/dashboard/map"
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Открыть карту →
        </Link>
      </div>

      <MachineMap height="300px" showLegend={false} />
    </div>
  )
}
