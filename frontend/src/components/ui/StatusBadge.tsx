'use client'

import { cn } from '@/lib/utils'
import { Badge, type BadgeProps } from './badge'
import { UserRole, ROLE_CONFIG } from '@/types/users'

// Badge variant type
type BadgeVariant = NonNullable<BadgeProps['variant']>
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Pause,
  Play,
  Loader2,
  Ban,
  Wrench,
  Package,
  Truck,
  CreditCard,
  Wifi,
  WifiOff,
  LucideIcon,
} from 'lucide-react'

// Machine Status Badge
type MachineStatus = 'active' | 'low_stock' | 'error' | 'maintenance' | 'offline' | 'disabled'

const machineStatusConfig: Record<MachineStatus, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  active: { label: 'Активен', variant: 'success', icon: CheckCircle },
  low_stock: { label: 'Мало товара', variant: 'warning', icon: Package },
  error: { label: 'Ошибка', variant: 'danger', icon: XCircle },
  maintenance: { label: 'Обслуживание', variant: 'info', icon: Wrench },
  offline: { label: 'Офлайн', variant: 'default', icon: WifiOff },
  disabled: { label: 'Отключен', variant: 'default', icon: Ban },
}

export function MachineStatusBadge({
  status,
  showIcon = true,
  className,
}: {
  status: MachineStatus
  showIcon?: boolean
  className?: string
}) {
  const config = machineStatusConfig[status] || machineStatusConfig.offline
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}

// Task Status Badge
type TaskStatus = 'created' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'

const taskStatusConfig: Record<TaskStatus, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  created: { label: 'Создана', variant: 'default', icon: Clock },
  assigned: { label: 'Назначена', variant: 'info', icon: Play },
  in_progress: { label: 'В работе', variant: 'warning', icon: Loader2 },
  completed: { label: 'Выполнена', variant: 'success', icon: CheckCircle },
  cancelled: { label: 'Отменена', variant: 'default', icon: XCircle },
  overdue: { label: 'Просрочена', variant: 'danger', icon: AlertTriangle },
}

export function TaskStatusBadge({
  status,
  showIcon = true,
  className,
}: {
  status: TaskStatus
  showIcon?: boolean
  className?: string
}) {
  const config = taskStatusConfig[status] || taskStatusConfig.created
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      {showIcon && <Icon className={cn('h-3 w-3', status === 'in_progress' && 'animate-spin')} />}
      {config.label}
    </Badge>
  )
}

// Task Type Badge
type TaskType = 'refill' | 'collection' | 'maintenance' | 'inspection' | 'repair' | 'cleaning'

const taskTypeConfig: Record<TaskType, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  refill: { label: 'Пополнение', variant: 'info', icon: Package },
  collection: { label: 'Инкассация', variant: 'success', icon: CreditCard },
  maintenance: { label: 'Обслуживание', variant: 'warning', icon: Wrench },
  inspection: { label: 'Проверка', variant: 'default', icon: CheckCircle },
  repair: { label: 'Ремонт', variant: 'danger', icon: Wrench },
  cleaning: { label: 'Мойка', variant: 'info', icon: Package },
}

export function TaskTypeBadge({
  type,
  showIcon = true,
  className,
}: {
  type: TaskType
  showIcon?: boolean
  className?: string
}) {
  const config = taskTypeConfig[type] || taskTypeConfig.maintenance
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}

// Incident Priority Badge
type IncidentPriority = 'low' | 'medium' | 'high' | 'critical'

const priorityConfig: Record<IncidentPriority, { label: string; variant: BadgeVariant }> = {
  low: { label: 'Низкий', variant: 'default' },
  medium: { label: 'Средний', variant: 'warning' },
  high: { label: 'Высокий', variant: 'danger' },
  critical: { label: 'Критический', variant: 'error' },
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: IncidentPriority
  className?: string
}) {
  const config = priorityConfig[priority] || priorityConfig.medium

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}

// Incident Status Badge
type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

const incidentStatusConfig: Record<IncidentStatus, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  open: { label: 'Открыт', variant: 'danger', icon: AlertTriangle },
  in_progress: { label: 'В работе', variant: 'warning', icon: Loader2 },
  resolved: { label: 'Решён', variant: 'success', icon: CheckCircle },
  closed: { label: 'Закрыт', variant: 'default', icon: XCircle },
}

export function IncidentStatusBadge({
  status,
  showIcon = true,
  className,
}: {
  status: IncidentStatus
  showIcon?: boolean
  className?: string
}) {
  const config = incidentStatusConfig[status] || incidentStatusConfig.open
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      {showIcon && <Icon className={cn('h-3 w-3', status === 'in_progress' && 'animate-spin')} />}
      {config.label}
    </Badge>
  )
}

// User Role Badge - synced with backend
const roleVariantMap: Record<string, BadgeVariant> = {
  purple: 'info',
  red: 'danger',
  blue: 'info',
  green: 'success',
  yellow: 'warning',
  orange: 'warning',
  gray: 'default',
}

export function RoleBadge({
  role,
  className,
}: {
  role: UserRole
  className?: string
}) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG[UserRole.VIEWER]
  const variant = roleVariantMap[config.color] || 'default'

  return (
    <Badge variant={variant} className={className}>
      {config.labelRu}
    </Badge>
  )
}

// User Status Badge
type UserStatus = 'active' | 'inactive' | 'pending' | 'blocked'

const userStatusConfig: Record<UserStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Активен', variant: 'success' },
  inactive: { label: 'Неактивен', variant: 'default' },
  pending: { label: 'Ожидает', variant: 'warning' },
  blocked: { label: 'Заблокирован', variant: 'danger' },
}

export function UserStatusBadge({
  status,
  className,
}: {
  status: UserStatus
  className?: string
}) {
  const config = userStatusConfig[status] || userStatusConfig.inactive

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}

// Payment Status Badge
type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

const paymentStatusConfig: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Ожидает', variant: 'warning' },
  completed: { label: 'Оплачено', variant: 'success' },
  failed: { label: 'Ошибка', variant: 'danger' },
  refunded: { label: 'Возврат', variant: 'info' },
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus
  className?: string
}) {
  const config = paymentStatusConfig[status] || paymentStatusConfig.pending

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}

// Connection Status Badge
export function ConnectionBadge({
  isOnline,
  className,
}: {
  isOnline: boolean
  className?: string
}) {
  return (
    <Badge
      variant={isOnline ? 'success' : 'default'}
      className={cn('gap-1', className)}
    >
      {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {isOnline ? 'Онлайн' : 'Офлайн'}
    </Badge>
  )
}

// Delivery Status Badge
type DeliveryStatus = 'pending' | 'in_transit' | 'delivered' | 'returned'

const deliveryStatusConfig: Record<DeliveryStatus, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  pending: { label: 'Ожидает', variant: 'default', icon: Clock },
  in_transit: { label: 'В пути', variant: 'info', icon: Truck },
  delivered: { label: 'Доставлено', variant: 'success', icon: CheckCircle },
  returned: { label: 'Возврат', variant: 'warning', icon: Package },
}

export function DeliveryStatusBadge({
  status,
  showIcon = true,
  className,
}: {
  status: DeliveryStatus
  showIcon?: boolean
  className?: string
}) {
  const config = deliveryStatusConfig[status] || deliveryStatusConfig.pending
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}

// Count/Number Badge
export function CountBadge({
  count,
  max = 99,
  variant = 'danger',
  className,
}: {
  count: number
  max?: number
  variant?: 'primary' | 'danger' | 'warning' | 'default'
  className?: string
}) {
  if (count <= 0) return null

  const displayCount = count > max ? `${max}+` : count.toString()

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground',
    danger: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    default: 'bg-gray-500 text-white',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium rounded-full',
        variantClasses[variant],
        className
      )}
    >
      {displayCount}
    </span>
  )
}

// Dot Status Indicator
export function StatusDot({
  status,
  pulse = false,
  size = 'md',
  className,
}: {
  status: 'success' | 'warning' | 'danger' | 'info' | 'default'
  pulse?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const colorClasses = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    default: 'bg-gray-400',
  }

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  }

  return (
    <span className={cn('relative inline-flex', className)}>
      <span className={cn('rounded-full', colorClasses[status], sizeClasses[size])} />
      {pulse && (
        <span
          className={cn(
            'absolute inset-0 rounded-full animate-ping opacity-75',
            colorClasses[status]
          )}
        />
      )}
    </span>
  )
}
