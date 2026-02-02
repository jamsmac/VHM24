'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /** Label text */
  label?: string
  /** Error state */
  error?: boolean
  /** Indeterminate state */
  indeterminate?: boolean
  /** shadcn-style change handler */
  onCheckedChange?: (checked: boolean) => void
  /** Standard change handler */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

/**
 * Checkbox - Custom checkbox component
 * Part of VendHub "Warm Brew" design system
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, indeterminate, id, onCheckedChange, onChange, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const combinedRef = (node: HTMLInputElement) => {
      // Handle both refs
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
      inputRef.current = node
    }

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate ?? false
      }
    }, [indeterminate])

    const inputId = id || React.useId()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    return (
      <div className="flex items-center">
        <div className="relative">
          <input
            type="checkbox"
            ref={combinedRef}
            id={inputId}
            onChange={handleChange}
            className={cn(
              'peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border-2',
              'transition-all duration-200',
              'border-stone-300 bg-white',
              'hover:border-amber-400',
              'focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500',
              'checked:bg-amber-500 checked:border-amber-500',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus:ring-red-500/20',
              className
            )}
            {...props}
          />
          <Check
            className={cn(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'h-3.5 w-3.5 text-white pointer-events-none',
              'opacity-0 peer-checked:opacity-100 transition-opacity duration-200'
            )}
            strokeWidth={3}
          />
          {/* Indeterminate indicator */}
          <div
            className={cn(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'h-0.5 w-2.5 bg-white pointer-events-none rounded-full',
              'opacity-0 transition-opacity duration-200',
              indeterminate && !props.checked && 'opacity-100'
            )}
          />
        </div>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'ml-2 text-sm cursor-pointer select-none',
              'text-stone-700',
              props.disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {label}
          </label>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }
