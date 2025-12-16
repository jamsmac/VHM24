'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  showTooltip?: boolean
}

export function ThemeToggle({ className, showTooltip = true }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className={cn(
          'rounded-md p-2 text-muted-foreground',
          className
        )}
        disabled
      >
        <Sun className="h-5 w-5" />
      </button>
    )
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'rounded-md p-2 hover:bg-accent transition-colors text-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
      aria-label={resolvedTheme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={showTooltip ? (resolvedTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема') : undefined}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  )
}

// Extended theme selector for settings pages
interface ThemeSelectorProps {
  className?: string
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className={cn('h-10', className)} />
  }

  const options = [
    { value: 'light', label: 'Светлая', icon: Sun, description: 'Светлый фон, тёмный текст' },
    { value: 'dark', label: 'Тёмная', icon: Moon, description: 'Тёмный фон, светлый текст' },
    { value: 'system', label: 'Системная', icon: Monitor, description: 'Следовать настройкам ОС' },
  ] as const

  return (
    <div className={cn('space-y-2', className)}>
      {options.map(({ value, label, icon: Icon, description }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'w-full flex items-center gap-4 p-3 rounded-lg border transition-all text-left',
            theme === value
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50 hover:bg-accent/50'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-center h-10 w-10 rounded-lg',
              theme === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className={cn(
              'font-medium',
              theme === value ? 'text-primary' : 'text-foreground'
            )}>
              {label}
            </p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {theme === value && (
            <div className="h-2 w-2 rounded-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  )
}

// Compact inline selector
export function ThemeSelectorCompact({ className }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className={cn('h-10', className)} />
  }

  const options = [
    { value: 'light', label: 'Светлая', icon: Sun },
    { value: 'dark', label: 'Тёмная', icon: Moon },
    { value: 'system', label: 'Авто', icon: Monitor },
  ] as const

  return (
    <div className={cn('inline-flex rounded-lg border border-border p-1 bg-muted/50', className)}>
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
