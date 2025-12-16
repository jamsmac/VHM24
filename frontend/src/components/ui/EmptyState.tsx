'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import {
  Package,
  ClipboardList,
  AlertTriangle,
  Users,
  Bell,
  Search,
  FileX,
  Inbox,
  Calendar,
  MapPin,
  Settings,
  BarChart3,
  MessageSquare,
  Wrench,
} from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'h-10 w-10',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'h-12 w-12',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'h-16 w-16',
      title: 'text-xl',
      description: 'text-base',
    },
  }

  const sizes = sizeClasses[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className={cn('text-muted-foreground', sizes.icon)} />
      </div>
      <h3 className={cn('font-semibold text-foreground mb-1', sizes.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-muted-foreground max-w-sm mb-4', sizes.description)}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="inline-flex items-center justify-center px-4 py-2 border border-input bg-background text-foreground rounded-md text-sm font-medium hover:bg-accent transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Pre-configured empty states for common entities

export function EmptyMachines({
  onAdd,
  className,
}: {
  onAdd?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon={Package}
      title="Нет аппаратов"
      description="Добавьте первый торговый аппарат для начала работы"
      action={onAdd ? { label: 'Добавить аппарат', onClick: onAdd } : undefined}
      className={className}
    />
  )
}

export function EmptyTasks({
  onAdd,
  className,
}: {
  onAdd?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon={ClipboardList}
      title="Нет задач"
      description="Все задачи выполнены или ещё не созданы"
      action={onAdd ? { label: 'Создать задачу', onClick: onAdd } : undefined}
      className={className}
    />
  )
}

export function EmptyIncidents({
  onAdd,
  className,
}: {
  onAdd?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Нет инцидентов"
      description="Отлично! На данный момент инцидентов не зарегистрировано"
      action={onAdd ? { label: 'Создать инцидент', onClick: onAdd } : undefined}
      className={className}
    />
  )
}

export function EmptyUsers({
  onAdd,
  className,
}: {
  onAdd?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon={Users}
      title="Нет пользователей"
      description="Пригласите пользователей для работы в системе"
      action={onAdd ? { label: 'Пригласить пользователя', onClick: onAdd } : undefined}
      className={className}
    />
  )
}

export function EmptyNotifications({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Bell}
      title="Нет уведомлений"
      description="У вас пока нет новых уведомлений"
      className={className}
      size="sm"
    />
  )
}

export function EmptySearchResults({
  query,
  onClear,
  className,
}: {
  query?: string
  onClear?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon={Search}
      title="Ничего не найдено"
      description={
        query
          ? `По запросу "${query}" ничего не найдено. Попробуйте изменить параметры поиска.`
          : 'Попробуйте изменить параметры поиска'
      }
      action={onClear ? { label: 'Сбросить фильтры', onClick: onClear } : undefined}
      className={className}
    />
  )
}

export function EmptyFilterResults({
  onClear,
  className,
}: {
  onClear?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon={FileX}
      title="Нет результатов"
      description="По выбранным фильтрам ничего не найдено"
      action={onClear ? { label: 'Сбросить фильтры', onClick: onClear } : undefined}
      className={className}
    />
  )
}

export function EmptyScheduledTasks({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Calendar}
      title="Нет запланированных задач"
      description="Запланированные задачи будут отображаться здесь"
      className={className}
    />
  )
}

export function EmptyLocations({
  onAdd,
  className,
}: {
  onAdd?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon={MapPin}
      title="Нет локаций"
      description="Добавьте локации для размещения аппаратов"
      action={onAdd ? { label: 'Добавить локацию', onClick: onAdd } : undefined}
      className={className}
    />
  )
}

export function EmptyReports({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={BarChart3}
      title="Нет данных для отчёта"
      description="Данные для отчёта за выбранный период отсутствуют"
      className={className}
    />
  )
}

export function EmptyComplaints({
  onAdd,
  className,
}: {
  onAdd?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="Нет жалоб"
      description="Жалобы от клиентов будут отображаться здесь"
      action={onAdd ? { label: 'Добавить жалобу', onClick: onAdd } : undefined}
      className={className}
    />
  )
}

export function EmptyEquipment({
  onAdd,
  className,
}: {
  onAdd?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon={Wrench}
      title="Нет оборудования"
      description="Добавьте оборудование для учёта"
      action={onAdd ? { label: 'Добавить оборудование', onClick: onAdd } : undefined}
      className={className}
    />
  )
}

export function EmptyActivity({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Inbox}
      title="Нет активности"
      description="История действий будет отображаться здесь"
      className={className}
      size="sm"
    />
  )
}

export function EmptyComingSoon({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Settings}
      title="Скоро появится"
      description="Эта функция находится в разработке"
      className={className}
    />
  )
}
