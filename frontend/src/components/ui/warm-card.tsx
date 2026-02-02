'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface WarmCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Enable hover effects */
  hover?: boolean
  /** Status determines border/background color */
  status?: 'normal' | 'warning' | 'critical' | 'success'
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** Make the card clickable with cursor pointer */
  clickable?: boolean
}

/**
 * WarmCard - Card component in "Warm Brew" design system
 * Features: rounded-2xl corners, subtle shadows, status-based borders
 */
const WarmCard = React.forwardRef<HTMLDivElement, WarmCardProps>(
  (
    {
      className,
      hover = true,
      status = 'normal',
      padding = 'md',
      clickable = false,
      children,
      ...props
    },
    ref
  ) => {
    const statusClasses = {
      normal: 'border-stone-200 bg-white',
      warning: 'border-amber-300 bg-amber-50/50',
      critical: 'border-red-300 bg-red-50/50',
      success: 'border-emerald-300 bg-emerald-50/50',
    }

    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    }

    const hoverClasses = hover
      ? 'hover:border-amber-300 hover:shadow-lg transition-all duration-200'
      : ''

    const clickableClasses = clickable ? 'cursor-pointer' : ''

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border shadow-sm',
          statusClasses[status],
          paddingClasses[padding],
          hoverClasses,
          clickableClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

WarmCard.displayName = 'WarmCard'

/**
 * WarmCardHeader - Header section for WarmCard
 */
const WarmCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-between mb-4', className)}
    {...props}
  />
))

WarmCardHeader.displayName = 'WarmCardHeader'

/**
 * WarmCardTitle - Title for WarmCard
 */
const WarmCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-semibold text-stone-800', className)}
    {...props}
  />
))

WarmCardTitle.displayName = 'WarmCardTitle'

/**
 * WarmCardDescription - Description text for WarmCard
 */
const WarmCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-stone-500', className)}
    {...props}
  />
))

WarmCardDescription.displayName = 'WarmCardDescription'

/**
 * WarmCardContent - Main content area of WarmCard
 */
const WarmCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
))

WarmCardContent.displayName = 'WarmCardContent'

/**
 * WarmCardFooter - Footer section for WarmCard
 */
const WarmCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-between pt-4 border-t border-stone-100 mt-4', className)}
    {...props}
  />
))

WarmCardFooter.displayName = 'WarmCardFooter'

export {
  WarmCard,
  WarmCardHeader,
  WarmCardTitle,
  WarmCardDescription,
  WarmCardContent,
  WarmCardFooter,
}

export default WarmCard
