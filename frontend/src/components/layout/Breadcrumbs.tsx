'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { getBreadcrumbs, BreadcrumbItem } from '@/lib/breadcrumbs'

interface BreadcrumbsProps {
  className?: string
}

export function Breadcrumbs({ className = '' }: BreadcrumbsProps) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)

  // Don't show breadcrumbs on dashboard home
  if (pathname === '/dashboard' || breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center text-sm ${className}`}
    >
      <ol className="flex items-center space-x-1">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1
          const isFirst = index === 0

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight
                  className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <span
                  className="text-foreground font-medium truncate max-w-[200px]"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isFirst && (
                    <Home className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span className="truncate max-w-[150px]">{item.label}</span>
                </Link>
              ) : (
                <span className="flex items-center text-muted-foreground">
                  {isFirst && (
                    <Home className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span className="truncate max-w-[150px]">{item.label}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Compact version for mobile
export function BreadcrumbsCompact({ className = '' }: BreadcrumbsProps) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)

  if (pathname === '/dashboard' || breadcrumbs.length <= 1) {
    return null
  }

  // Show only parent and current
  const parent = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null
  const current = breadcrumbs[breadcrumbs.length - 1]

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center text-sm ${className}`}
    >
      {parent?.href && (
        <>
          <Link
            href={parent.href}
            className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[100px]"
          >
            {parent.label}
          </Link>
          <ChevronRight
            className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0"
            aria-hidden="true"
          />
        </>
      )}
      <span
        className="text-foreground font-medium truncate max-w-[150px]"
        aria-current="page"
      >
        {current.label}
      </span>
    </nav>
  )
}
