'use client'

import { cn } from '@/lib/utils'
import {
  AlertCircle,
  WifiOff,
  ServerCrash,
  ShieldX,
  Clock,
  RefreshCw,
  Home,
  ArrowLeft,
} from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  onGoHome?: () => void
  onGoBack?: () => void
  className?: string
  variant?: 'default' | 'network' | 'server' | 'forbidden' | 'notFound' | 'timeout'
}

const variants = {
  default: {
    icon: AlertCircle,
    title: 'Произошла ошибка',
    message: 'Что-то пошло не так. Попробуйте обновить страницу.',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/20',
  },
  network: {
    icon: WifiOff,
    title: 'Нет подключения',
    message: 'Проверьте подключение к интернету и попробуйте снова.',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/20',
  },
  server: {
    icon: ServerCrash,
    title: 'Ошибка сервера',
    message: 'Сервер временно недоступен. Попробуйте позже.',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/20',
  },
  forbidden: {
    icon: ShieldX,
    title: 'Доступ запрещён',
    message: 'У вас нет прав для просмотра этой страницы.',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
  },
  notFound: {
    icon: AlertCircle,
    title: 'Страница не найдена',
    message: 'Запрашиваемая страница не существует или была удалена.',
    color: 'text-gray-500',
    bg: 'bg-gray-50 dark:bg-gray-900/50',
  },
  timeout: {
    icon: Clock,
    title: 'Время ожидания истекло',
    message: 'Запрос занял слишком много времени. Попробуйте снова.',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/20',
  },
}

export function ErrorState({
  title,
  message,
  onRetry,
  onGoHome,
  onGoBack,
  className,
  variant = 'default',
}: ErrorStateProps) {
  const config = variants[variant]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
    >
      <div className={cn('rounded-full p-4 mb-4', config.bg)}>
        <Icon className={cn('h-12 w-12', config.color)} />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title || config.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {message || config.message}
      </p>
      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Повторить
          </button>
        )}
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="inline-flex items-center gap-2 px-4 py-2 border border-input bg-background text-foreground rounded-md text-sm font-medium hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </button>
        )}
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="inline-flex items-center gap-2 px-4 py-2 border border-input bg-background text-foreground rounded-md text-sm font-medium hover:bg-accent transition-colors"
          >
            <Home className="h-4 w-4" />
            На главную
          </button>
        )}
      </div>
    </div>
  )
}

// Inline error for forms or small areas
interface InlineErrorProps {
  message: string
  onRetry?: () => void
  className?: string
}

export function InlineError({ message, onRetry, className }: InlineErrorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg',
        className
      )}
    >
      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-700 dark:text-red-400 flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
        >
          Повторить
        </button>
      )}
    </div>
  )
}

// Card error state
interface CardErrorProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function CardError({
  title = 'Ошибка загрузки',
  message = 'Не удалось загрузить данные',
  onRetry,
  className,
}: CardErrorProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-lg border border-border p-6 flex flex-col items-center justify-center text-center',
        className
      )}
    >
      <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
      <h4 className="font-medium text-foreground mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Повторить
        </button>
      )}
    </div>
  )
}

// Full page error
export function PageError({
  variant = 'default',
  onRetry,
  onGoHome,
}: {
  variant?: 'default' | 'network' | 'server' | 'forbidden' | 'notFound' | 'timeout'
  onRetry?: () => void
  onGoHome?: () => void
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <ErrorState variant={variant} onRetry={onRetry} onGoHome={onGoHome} />
    </div>
  )
}

// 404 Page
export function NotFoundPage({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <ErrorState
        variant="notFound"
        title="404 - Страница не найдена"
        message="К сожалению, запрашиваемая страница не существует или была перемещена."
        onGoHome={onGoHome}
      />
    </div>
  )
}

// 403 Forbidden Page
export function ForbiddenPage({ onGoHome, onGoBack }: { onGoHome?: () => void; onGoBack?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <ErrorState
        variant="forbidden"
        title="403 - Доступ запрещён"
        message="У вас недостаточно прав для просмотра этой страницы. Обратитесь к администратору."
        onGoHome={onGoHome}
        onGoBack={onGoBack}
      />
    </div>
  )
}

// 500 Server Error Page
export function ServerErrorPage({ onRetry, onGoHome }: { onRetry?: () => void; onGoHome?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <ErrorState
        variant="server"
        title="500 - Ошибка сервера"
        message="Внутренняя ошибка сервера. Наши специалисты уже работают над решением проблемы."
        onRetry={onRetry}
        onGoHome={onGoHome}
      />
    </div>
  )
}
