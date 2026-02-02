import { memo } from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: LucideIcon
  color?: 'amber' | 'emerald' | 'orange' | 'red' | 'blue'
}

/**
 * StatCard - Dashboard statistics card
 * Part of VendHub "Warm Brew" design system
 */
export const StatCard = memo(function StatCard({ title, value, change, icon: Icon, color = 'amber' }: StatCardProps) {
  const iconBgClasses = {
    amber: 'bg-amber-100',
    emerald: 'bg-emerald-100',
    orange: 'bg-orange-100',
    red: 'bg-red-100',
    blue: 'bg-blue-100',
  }

  const iconColorClasses = {
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 hover:shadow-lg hover:border-amber-200 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-stone-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-stone-900">{value}</h3>
          {change !== undefined && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm font-medium',
              change >= 0 ? 'text-emerald-600' : 'text-red-600'
            )}>
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{Math.abs(change)}% vs вчера</span>
            </div>
          )}
        </div>
        <div className={cn(
          'flex items-center justify-center w-14 h-14 rounded-2xl',
          iconBgClasses[color]
        )}>
          <Icon className={cn('h-7 w-7', iconColorClasses[color])} />
        </div>
      </div>
    </div>
  )
})
