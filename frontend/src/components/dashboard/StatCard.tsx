import { memo } from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple'
}

export const StatCard = memo(function StatCard({ title, value, change, icon: Icon, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    orange: 'from-orange-500 to-red-500',
    red: 'from-red-500 to-pink-500',
    purple: 'from-purple-500 to-pink-500',
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
          {change !== undefined && (
            <p className={cn(
              'text-sm mt-2 font-medium',
              change >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs вчера
            </p>
          )}
        </div>
        <div className={cn(
          'flex items-center justify-center w-12 h-12 rounded-full',
          `bg-gradient-to-br ${colorClasses[color]}`
        )}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )
})
