'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'circular' | 'rounded'
  animation?: 'pulse' | 'shimmer' | 'none'
  style?: React.CSSProperties
}

export function Skeleton({
  className,
  variant = 'default',
  animation = 'pulse',
  style,
}: SkeletonProps) {
  const variantClasses = {
    default: 'rounded',
    circular: 'rounded-full',
    rounded: 'rounded-lg',
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    shimmer: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]',
    none: '',
  }

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
    />
  )
}

// Text skeleton with multiple lines
interface TextSkeletonProps {
  lines?: number
  className?: string
  lastLineWidth?: string
}

export function TextSkeleton({
  lines = 3,
  className,
  lastLineWidth = '60%',
}: TextSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            'h-4',
            index === lines - 1 ? `w-[${lastLineWidth}]` : 'w-full'
          )}
          style={index === lines - 1 ? { width: lastLineWidth } : undefined}
        />
      ))}
    </div>
  )
}

// Avatar skeleton
interface AvatarSkeletonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function AvatarSkeleton({ size = 'md', className }: AvatarSkeletonProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }

  return (
    <Skeleton
      variant="circular"
      className={cn(sizeClasses[size], className)}
    />
  )
}

// Button skeleton
interface ButtonSkeletonProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ButtonSkeleton({ size = 'md', className }: ButtonSkeletonProps) {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  }

  return (
    <Skeleton
      variant="rounded"
      className={cn(sizeClasses[size], className)}
    />
  )
}

// Input skeleton
export function InputSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton
      variant="rounded"
      className={cn('h-10 w-full', className)}
    />
  )
}

// Badge skeleton
export function BadgeSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton
      variant="rounded"
      className={cn('h-6 w-16', className)}
    />
  )
}
