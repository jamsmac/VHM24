'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  position?: TooltipPosition
  delay?: number
  disabled?: boolean
  className?: string
  contentClassName?: string
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  disabled = false,
  className,
  contentClassName,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showTooltip = () => {
    if (disabled) return
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  useEffect(() => {
    if (!isVisible || !triggerRef.current) return

    const trigger = triggerRef.current
    const rect = trigger.getBoundingClientRect()
    const scrollX = window.scrollX
    const scrollY = window.scrollY

    let x = 0
    let y = 0

    switch (position) {
      case 'top':
        x = rect.left + scrollX + rect.width / 2
        y = rect.top + scrollY - 8
        break
      case 'bottom':
        x = rect.left + scrollX + rect.width / 2
        y = rect.bottom + scrollY + 8
        break
      case 'left':
        x = rect.left + scrollX - 8
        y = rect.top + scrollY + rect.height / 2
        break
      case 'right':
        x = rect.right + scrollX + 8
        y = rect.top + scrollY + rect.height / 2
        break
    }

    setCoords({ x, y })
  }, [isVisible, position])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const positionClasses: Record<TooltipPosition, string> = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
    right: '-translate-y-1/2',
  }

  const arrowClasses: Record<TooltipPosition, string> = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-gray-900 dark:border-t-gray-100 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-gray-900 dark:border-b-gray-100 border-l-transparent border-r-transparent border-t-transparent',
    left: 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-l-gray-900 dark:border-l-gray-100 border-t-transparent border-b-transparent border-r-transparent',
    right: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-r-gray-900 dark:border-r-gray-100 border-t-transparent border-b-transparent border-l-transparent',
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={cn('inline-flex', className)}
      >
        {children}
      </div>

      {isVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className={cn(
              'fixed z-[100] px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded shadow-lg',
              'animate-in fade-in-0 zoom-in-95 duration-150',
              positionClasses[position],
              contentClassName
            )}
            style={{
              left: coords.x,
              top: coords.y,
            }}
          >
            {content}
            <span
              className={cn(
                'absolute w-0 h-0 border-4',
                arrowClasses[position]
              )}
            />
          </div>,
          document.body
        )}
    </>
  )
}

// Simple text tooltip wrapper
export function TooltipText({
  text,
  children,
  position = 'top',
  className,
}: {
  text: string
  children: ReactNode
  position?: TooltipPosition
  className?: string
}) {
  return (
    <Tooltip content={text} position={position} className={className}>
      {children}
    </Tooltip>
  )
}

// Info tooltip with icon
import { Info, HelpCircle } from 'lucide-react'

export function InfoTooltip({
  content,
  position = 'top',
  iconType = 'info',
  className,
}: {
  content: ReactNode
  position?: TooltipPosition
  iconType?: 'info' | 'help'
  className?: string
}) {
  const Icon = iconType === 'info' ? Info : HelpCircle

  return (
    <Tooltip content={content} position={position}>
      <Icon
        className={cn(
          'h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors',
          className
        )}
      />
    </Tooltip>
  )
}

// Truncated text with tooltip
export function TruncatedText({
  text,
  maxLength = 30,
  className,
}: {
  text: string
  maxLength?: number
  className?: string
}) {
  if (text.length <= maxLength) {
    return <span className={className}>{text}</span>
  }

  const truncated = text.slice(0, maxLength) + '...'

  return (
    <Tooltip content={text}>
      <span className={cn('cursor-default', className)}>{truncated}</span>
    </Tooltip>
  )
}

// Copy to clipboard with tooltip feedback
import { Copy, Check } from 'lucide-react'

export function CopyTooltip({
  text,
  children,
  className,
}: {
  text: string
  children?: ReactNode
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Tooltip content={copied ? 'Скопировано!' : 'Копировать'}>
      <button
        onClick={handleCopy}
        className={cn(
          'inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors',
          className
        )}
      >
        {children || text}
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </Tooltip>
  )
}
