'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

type PopoverPosition = 'top' | 'bottom' | 'left' | 'right'
type PopoverAlign = 'start' | 'center' | 'end'

interface PopoverProps {
  trigger: ReactNode
  children: ReactNode
  position?: PopoverPosition
  align?: PopoverAlign
  open?: boolean
  onOpenChange?: (open: boolean) => void
  closeOnClickOutside?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  className?: string
  contentClassName?: string
}

export function Popover({
  trigger,
  children,
  position = 'bottom',
  align = 'center',
  open: controlledOpen,
  onOpenChange,
  closeOnClickOutside = true,
  closeOnEscape = true,
  showCloseButton = false,
  className,
  contentClassName,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value)
    } else {
      setInternalOpen(value)
    }
  }

  const toggle = () => setOpen(!isOpen)
  const close = () => setOpen(false)

  // Calculate position
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return

    const trigger = triggerRef.current
    const rect = trigger.getBoundingClientRect()
    const scrollX = window.scrollX
    const scrollY = window.scrollY

    let x = 0
    let y = 0

    // Position
    switch (position) {
      case 'top':
        y = rect.top + scrollY - 8
        break
      case 'bottom':
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

    // Alignment for top/bottom
    if (position === 'top' || position === 'bottom') {
      switch (align) {
        case 'start':
          x = rect.left + scrollX
          break
        case 'center':
          x = rect.left + scrollX + rect.width / 2
          break
        case 'end':
          x = rect.right + scrollX
          break
      }
    }

    // Alignment for left/right
    if (position === 'left' || position === 'right') {
      switch (align) {
        case 'start':
          y = rect.top + scrollY
          break
        case 'center':
          y = rect.top + scrollY + rect.height / 2
          break
        case 'end':
          y = rect.bottom + scrollY
          break
      }
    }

    setCoords({ x, y })
  }, [isOpen, position, align])

  // Close on click outside
  useEffect(() => {
    if (!isOpen || !closeOnClickOutside) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        contentRef.current &&
        !contentRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, closeOnClickOutside])

  // Close on escape
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape])

  const getTransformClasses = () => {
    const transforms: string[] = []

    if (position === 'top') transforms.push('-translate-y-full')
    if (position === 'left') transforms.push('-translate-x-full')

    if (position === 'top' || position === 'bottom') {
      if (align === 'center') transforms.push('-translate-x-1/2')
      if (align === 'end') transforms.push('-translate-x-full')
    }

    if (position === 'left' || position === 'right') {
      if (align === 'center') transforms.push('-translate-y-1/2')
      if (align === 'end') transforms.push('-translate-y-full')
    }

    return transforms.join(' ')
  }

  return (
    <>
      <div
        ref={triggerRef}
        onClick={toggle}
        className={cn('inline-flex cursor-pointer', className)}
      >
        {trigger}
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={contentRef}
            className={cn(
              'fixed z-50 min-w-[200px] bg-popover text-popover-foreground rounded-lg shadow-lg border border-border',
              'animate-in fade-in-0 zoom-in-95 duration-150',
              getTransformClasses(),
              contentClassName
            )}
            style={{
              left: coords.x,
              top: coords.y,
            }}
          >
            {showCloseButton && (
              <button
                onClick={close}
                className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {children}
          </div>,
          document.body
        )}
    </>
  )
}

// Popover sections
export function PopoverHeader({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('px-4 py-3 border-b border-border', className)}>
      {children}
    </div>
  )
}

export function PopoverContent({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('p-4', className)}>{children}</div>
}

export function PopoverFooter({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'px-4 py-3 border-t border-border bg-muted/30 rounded-b-lg',
        className
      )}
    >
      {children}
    </div>
  )
}

// User info popover (common pattern)
interface UserPopoverProps {
  user: {
    name: string
    email?: string
    role?: string
    avatar?: string
  }
  children: ReactNode
  className?: string
}

export function UserPopover({ user, children, className }: UserPopoverProps) {
  return (
    <Popover trigger={children} position="bottom" align="start" className={className}>
      <PopoverContent>
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">{user.name}</p>
            {user.email && (
              <p className="text-sm text-muted-foreground">{user.email}</p>
            )}
            {user.role && (
              <p className="text-xs text-muted-foreground mt-0.5">{user.role}</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Confirmation popover
interface ConfirmPopoverProps {
  trigger: ReactNode
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'danger' | 'warning' | 'default'
  className?: string
}

export function ConfirmPopover({
  trigger,
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  onConfirm,
  variant = 'default',
  className,
}: ConfirmPopoverProps) {
  const [open, setOpen] = useState(false)

  const handleConfirm = () => {
    onConfirm()
    setOpen(false)
  }

  const buttonVariants = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    default: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  }

  return (
    <Popover
      trigger={trigger}
      open={open}
      onOpenChange={setOpen}
      position="bottom"
      className={className}
    >
      <PopoverContent className="max-w-xs">
        <p className="font-medium text-foreground mb-1">{title}</p>
        {message && (
          <p className="text-sm text-muted-foreground mb-4">{message}</p>
        )}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-input rounded-md hover:bg-accent transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              buttonVariants[variant]
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
