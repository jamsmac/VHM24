'use client'

import { cn } from '@/lib/utils'

type ProgressSize = 'sm' | 'md' | 'lg'
type ProgressVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

const sizeClasses: Record<ProgressSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}

const variantClasses: Record<ProgressVariant, string> = {
  default: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
}

// Enhanced Progress Bar
interface ProgressBarProps {
  value: number
  max?: number
  size?: ProgressSize
  variant?: ProgressVariant
  showLabel?: boolean
  labelPosition?: 'inside' | 'outside' | 'top'
  animated?: boolean
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  labelPosition = 'outside',
  animated = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={cn('w-full', className)}>
      {showLabel && labelPosition === 'top' && (
        <div className="flex justify-between text-sm text-muted-foreground mb-1">
          <span>Прогресс</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex-1 bg-muted rounded-full overflow-hidden',
            sizeClasses[size]
          )}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              variantClasses[variant],
              animated && 'animate-pulse'
            )}
            style={{ width: `${percentage}%` }}
          >
            {showLabel && labelPosition === 'inside' && size === 'lg' && (
              <span className="flex items-center justify-center h-full text-xs font-medium text-white">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        </div>

        {showLabel && labelPosition === 'outside' && (
          <span className="text-sm font-medium text-foreground min-w-[3rem] text-right">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    </div>
  )
}

// Circular progress
interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  variant?: ProgressVariant
  showLabel?: boolean
  label?: string
  className?: string
}

export function CircularProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  variant = 'default',
  showLabel = true,
  label,
  className,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  const colorClasses: Record<ProgressVariant, string> = {
    default: 'stroke-primary',
    success: 'stroke-green-500',
    warning: 'stroke-yellow-500',
    danger: 'stroke-red-500',
    info: 'stroke-blue-500',
  }

  return (
    <div className={cn('relative inline-flex', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-500 ease-out', colorClasses[variant])}
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-foreground">
            {Math.round(percentage)}%
          </span>
          {label && (
            <span className="text-xs text-muted-foreground">{label}</span>
          )}
        </div>
      )}
    </div>
  )
}

// Progress steps
interface ProgressStep {
  label: string
  description?: string
  completed?: boolean
  current?: boolean
}

interface ProgressStepsProps {
  steps: ProgressStep[]
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function ProgressSteps({
  steps,
  orientation = 'horizontal',
  className,
}: ProgressStepsProps) {
  const currentIndex = steps.findIndex((s) => s.current)

  if (orientation === 'vertical') {
    return (
      <div className={cn('space-y-0', className)}>
        {steps.map((step, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                  step.completed
                    ? 'bg-primary border-primary text-primary-foreground'
                    : step.current
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {step.completed ? '✓' : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 h-8',
                    index < currentIndex ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
            <div className="pb-4">
              <p
                className={cn(
                  'font-medium',
                  step.completed || step.current
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                step.completed
                  ? 'bg-primary border-primary text-primary-foreground'
                  : step.current
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-muted-foreground/30 text-muted-foreground'
              )}
            >
              {step.completed ? '✓' : index + 1}
            </div>
            <p
              className={cn(
                'text-xs mt-2 text-center max-w-[80px]',
                step.completed || step.current
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              )}
            >
              {step.label}
            </p>
          </div>

          {index < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-2',
                index < currentIndex ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// Loading progress (indeterminate)
export function LoadingProgress({
  size = 'md',
  className,
}: {
  size?: ProgressSize
  className?: string
}) {
  return (
    <div
      className={cn(
        'w-full bg-muted rounded-full overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      <div className="h-full w-1/3 bg-primary rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
    </div>
  )
}

// Upload progress
interface UploadProgressProps {
  fileName: string
  progress: number
  status?: 'uploading' | 'completed' | 'error'
  onCancel?: () => void
  onRetry?: () => void
  className?: string
}

export function UploadProgress({
  fileName,
  progress,
  status = 'uploading',
  onCancel,
  onRetry,
  className,
}: UploadProgressProps) {
  return (
    <div className={cn('p-3 bg-card rounded-lg border border-border', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
          {fileName}
        </span>
        <div className="flex items-center gap-2">
          {status === 'uploading' && (
            <span className="text-xs text-muted-foreground">{progress}%</span>
          )}
          {status === 'completed' && (
            <span className="text-xs text-green-600">Загружено</span>
          )}
          {status === 'error' && (
            <span className="text-xs text-red-600">Ошибка</span>
          )}
        </div>
      </div>

      <ProgressBar
        value={progress}
        size="sm"
        variant={
          status === 'completed'
            ? 'success'
            : status === 'error'
            ? 'danger'
            : 'default'
        }
      />

      {(onCancel || onRetry) && (
        <div className="flex justify-end gap-2 mt-2">
          {status === 'uploading' && onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Отмена
            </button>
          )}
          {status === 'error' && onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-primary hover:text-primary/80"
            >
              Повторить
            </button>
          )}
        </div>
      )}
    </div>
  )
}
