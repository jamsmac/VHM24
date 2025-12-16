import * as React from 'react'
import { cn } from '@/lib/utils'

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The content to hide visually but keep accessible to screen readers */
  children: React.ReactNode
  /** Optional: render as a different element */
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label'
  /** When true, content becomes visible on focus (for skip links) */
  focusable?: boolean
}

/**
 * VisuallyHidden component hides content from visual users but keeps it
 * accessible to screen readers. Essential for accessibility.
 *
 * @example
 * // Hide icon label for screen readers
 * <button>
 *   <Icon aria-hidden="true" />
 *   <VisuallyHidden>Закрыть меню</VisuallyHidden>
 * </button>
 *
 * @example
 * // Focusable skip link
 * <VisuallyHidden as="a" href="#main" focusable>
 *   Перейти к основному содержимому
 * </VisuallyHidden>
 */
export const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ children, className, as: Component = 'span', focusable = false, ...props }, ref) => {
    return (
      <Component
        // @ts-expect-error - Dynamic element type requires flexible ref handling
        ref={ref}
        className={cn(
          // Base sr-only styles
          'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
          // Clip to hide
          '[clip:rect(0,0,0,0)]',
          // If focusable, show on focus
          focusable && [
            'focus:relative focus:w-auto focus:h-auto focus:m-0 focus:overflow-visible',
            'focus:whitespace-normal focus:[clip:auto]',
            'focus:z-50 focus:bg-primary focus:text-primary-foreground',
            'focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg',
          ],
          className
        )}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

VisuallyHidden.displayName = 'VisuallyHidden'

export default VisuallyHidden
