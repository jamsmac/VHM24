'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Wrench,
  Package,
  Droplet,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Calendar,
  DollarSign,
  MapPin,
  MoveRight
} from 'lucide-react'
import {
  componentsApi,
  sparePartsApi,
  washingSchedulesApi,
  maintenanceApi
} from '@/lib/equipment-api'
import type {
  ComponentStats,
  SparePartStats,
  WashingStats,
  MaintenanceStats,
  EquipmentComponent,
  ComponentLocationType,
} from '@/types/equipment'
import { ComponentLocationTypeLabels } from '@/types/equipment'

export default function EquipmentDashboard() {
  const [componentStats, setComponentStats] = useState<ComponentStats | null>(null)
  const [sparePartStats, setSparePartStats] = useState<SparePartStats | null>(null)
  const [washingStats, setWashingStats] = useState<WashingStats | null>(null)
  const [maintenanceStats, setMaintenanceStats] = useState<MaintenanceStats | null>(null)
  const [allComponents, setAllComponents] = useState<EquipmentComponent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [components, spareParts, washing, maintenance, allComps] = await Promise.all([
          componentsApi.getStats(),
          sparePartsApi.getStats(),
          washingSchedulesApi.getStats(),
          maintenanceApi.getStats(),
          componentsApi.getAll({}),
        ])
        setComponentStats(components)
        setSparePartStats(spareParts)
        setWashingStats(washing)
        setMaintenanceStats(maintenance)
        setAllComponents(allComps)
      } catch (error) {
        console.error('Error fetching equipment stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Calculate components by location
  const componentsByLocation = allComponents.reduce((acc, component) => {
    const location = component.current_location_type
    acc[location] = (acc[location] || 0) + 1
    return acc
  }, {} as Record<ComponentLocationType, number>)

  const locationData = Object.entries(componentsByLocation).map(([location, count]) => ({
    location: location as ComponentLocationType,
    count,
    label: ComponentLocationTypeLabels[location as ComponentLocationType],
  }))

  // Get max count for bar chart scaling
  const maxLocationCount = Math.max(...Object.values(componentsByLocation), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Загрузка статистики оборудования...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
          🔧 Управление Оборудованием
        </h1>
        <p className="mt-2 text-gray-600">
          Компоненты, запчасти, графики мойки и история обслуживания
        </p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/equipment/components">
          <StatCard
            title="Компоненты"
            value={componentStats?.total || 0}
            subtitle={`${componentStats?.needing_maintenance || 0} требуют обслуживания`}
            icon={<Wrench className="h-8 w-8" />}
            color="blue"
            alert={componentStats ? componentStats.needing_maintenance > 0 : undefined}
          />
        </Link>

        <Link href="/equipment/spare-parts">
          <StatCard
            title="Запасные части"
            value={sparePartStats?.total || 0}
            subtitle={`${sparePartStats?.low_stock_count || 0} низкий остаток`}
            icon={<Package className="h-8 w-8" />}
            color="green"
            alert={sparePartStats ? sparePartStats.low_stock_count > 0 : undefined}
          />
        </Link>

        <Link href="/equipment/washing">
          <StatCard
            title="Графики мойки"
            value={washingStats?.active || 0}
            subtitle={`${washingStats?.overdue || 0} просрочено`}
            icon={<Droplet className="h-8 w-8" />}
            color="purple"
            alert={washingStats ? washingStats.overdue > 0 : undefined}
          />
        </Link>

        <Link href="/equipment/maintenance">
          <StatCard
            title="Обслуживание"
            value={maintenanceStats?.total || 0}
            subtitle={`${maintenanceStats?.success_rate?.toFixed(0) || 0}% успешно`}
            icon={<ClipboardList className="h-8 w-8" />}
            color="orange"
          />
        </Link>
      </div>

      {/* Alerts Section */}
      {(componentStats?.needing_maintenance || 0) > 0 ||
       (componentStats?.nearing_lifetime || 0) > 0 ||
       (sparePartStats?.low_stock_count || 0) > 0 ||
       (washingStats?.overdue || 0) > 0 ? (
        <div className="backdrop-blur-md bg-red-50/80 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-red-900">Требуют внимания</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {componentStats && componentStats.needing_maintenance > 0 && (
              <AlertItem
                count={componentStats.needing_maintenance}
                label="Компонентов требуют обслуживания"
                link="/equipment/components?status=needs_maintenance"
              />
            )}
            {componentStats && componentStats.nearing_lifetime > 0 && (
              <AlertItem
                count={componentStats.nearing_lifetime}
                label="Компонентов близки к выработке"
                link="/equipment/components?nearing_lifetime=true"
              />
            )}
            {sparePartStats && sparePartStats.low_stock_count > 0 && (
              <AlertItem
                count={sparePartStats.low_stock_count}
                label="Запчастей с низким остатком"
                link="/equipment/spare-parts?lowStock=true"
              />
            )}
            {washingStats && washingStats.overdue > 0 && (
              <AlertItem
                count={washingStats.overdue}
                label="Просроченных моек"
                link="/equipment/washing?status=overdue"
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Components by Type */}
        {componentStats && (
          <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-600" />
              Компоненты по типам
            </h3>
            <div className="space-y-3">
              {componentStats.by_type.slice(0, 5).map((item) => (
                <div key={item.component_type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.component_type}</span>
                  <span className="font-semibold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Maintenance Stats */}
        {maintenanceStats && (
          <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Статистика обслуживания
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Всего работ</span>
                <span className="font-semibold text-gray-900">{maintenanceStats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Успешность</span>
                <span className="font-semibold text-green-600">
                  {maintenanceStats.success_rate.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Средняя длительность</span>
                <span className="font-semibold text-gray-900">
                  {Math.round(maintenanceStats.avg_duration_minutes)} мин
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Общие затраты</span>
                <span className="font-semibold text-gray-900">
                  {maintenanceStats.total_cost.toLocaleString()} ₽
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Spare Parts Value */}
        {sparePartStats && (
          <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Инвентарь запчастей
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Всего позиций</span>
                <span className="font-semibold text-gray-900">{sparePartStats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Общая стоимость</span>
                <span className="font-semibold text-green-600">
                  {sparePartStats.total_inventory_value.toLocaleString()} ₽
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Низкий остаток</span>
                <span className={`font-semibold ${sparePartStats.low_stock_count > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {sparePartStats.low_stock_count}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Washing Schedule Info */}
        {washingStats && (
          <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Графики мойки
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Всего графиков</span>
                <span className="font-semibold text-gray-900">{washingStats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Активных</span>
                <span className="font-semibold text-green-600">{washingStats.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Просрочено</span>
                <span className={`font-semibold ${washingStats.overdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {washingStats.overdue}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Предстоящие (7 дн)</span>
                <span className="font-semibold text-blue-600">{washingStats.upcoming_7_days}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Component Location Dashboard */}
      {locationData.length > 0 && (
        <div className="backdrop-blur-md bg-white/80 border border-white/20 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-600" />
            Компоненты по местоположению
          </h3>
          <div className="space-y-4">
            {locationData.map(({ location, count, label }) => {
              const percentage = (count / maxLocationCount) * 100
              const colorClass =
                location === 'machine' ? 'bg-blue-500' :
                location === 'warehouse' ? 'bg-green-500' :
                location === 'washing' ? 'bg-purple-500' :
                location === 'drying' ? 'bg-yellow-500' :
                'bg-orange-500' // repair

              return (
                <div key={location} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{label}</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 ${colorClass} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Всего компонентов</span>
              <span className="text-lg font-bold text-gray-900">{allComponents.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  title: string
  value: number
  subtitle: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange'
  alert?: boolean
}

function StatCard({ title, value, subtitle, icon, color, alert }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    orange: 'from-orange-500 to-red-500',
  }

  return (
    <div className="relative overflow-hidden rounded-xl backdrop-blur-md bg-white/10 border border-white/20 p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color]} opacity-20 rounded-full blur-3xl`} />

      {alert && (
        <div className="absolute top-2 right-2">
          <div className="animate-pulse bg-red-500 rounded-full h-3 w-3" />
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-2">{value}</h3>
            <p className={`text-sm mt-2 ${alert ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
              {subtitle}
            </p>
          </div>
          <div className={`p-4 rounded-full bg-gradient-to-br ${colorClasses[color]} text-white`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  )
}

// Alert Item Component
interface AlertItemProps {
  count: number
  label: string
  link: string
}

function AlertItem({ count, label, link }: AlertItemProps) {
  return (
    <Link href={link}>
      <div className="bg-white/50 rounded-lg p-4 hover:bg-white/70 transition-colors cursor-pointer">
        <p className="text-2xl font-bold text-red-600">{count}</p>
        <p className="text-sm text-gray-700 mt-1">{label}</p>
      </div>
    </Link>
  )
}
