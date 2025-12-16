'use client'

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface TagProps {
  children: React.ReactNode
  color?: 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink'
  size?: 'sm' | 'md' | 'lg'
  removable?: boolean
  onRemove?: () => void
  onClick?: () => void
  selected?: boolean
  disabled?: boolean
  className?: string
}

const colorClasses: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
  red: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50',
  yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50',
  green: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50',
  blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50',
  indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50',
  purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50',
  pink: 'bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:hover:bg-pink-900/50',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-sm',
}

export function Tag({
  children,
  color = 'gray',
  size = 'md',
  removable = false,
  onRemove,
  onClick,
  selected = false,
  disabled = false,
  className,
}: TagProps) {
  const isClickable = onClick && !disabled

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        colorClasses[color],
        sizeClasses[size],
        isClickable && 'cursor-pointer',
        selected && 'ring-2 ring-offset-1 ring-primary',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {children}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          disabled={disabled}
          className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
          aria-label="Удалить тег"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

// Tag Group
interface TagGroupProps {
  children: React.ReactNode
  className?: string
}

export function TagGroup({ children, className }: TagGroupProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {children}
    </div>
  )
}

// Tag Input (for adding tags)
interface TagInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  color?: 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink'
  disabled?: boolean
  className?: string
}

export function TagInput({
  tags,
  onTagsChange,
  placeholder = 'Добавить тег...',
  maxTags,
  color = 'blue',
  disabled = false,
  className,
}: TagInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const input = e.currentTarget
      const value = input.value.trim()

      if (value && !tags.includes(value)) {
        if (!maxTags || tags.length < maxTags) {
          onTagsChange([...tags, value])
          input.value = ''
        }
      }
    }

    if (e.key === 'Backspace' && !e.currentTarget.value && tags.length > 0) {
      onTagsChange(tags.slice(0, -1))
    }
  }

  const handleRemove = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove))
  }

  const canAddMore = !maxTags || tags.length < maxTags

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 p-2 border border-input rounded-md bg-background min-h-[42px]',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {tags.map((tag) => (
        <Tag
          key={tag}
          color={color}
          size="sm"
          removable
          onRemove={() => handleRemove(tag)}
          disabled={disabled}
        >
          {tag}
        </Tag>
      ))}
      {canAddMore && (
        <input
          type="text"
          placeholder={tags.length === 0 ? placeholder : ''}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
        />
      )}
    </div>
  )
}

// Selectable Tag Group (for filter options)
interface SelectableTagGroupProps {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  multiple?: boolean
  color?: 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink'
  className?: string
}

export function SelectableTagGroup({
  options,
  selected,
  onChange,
  multiple = true,
  color = 'blue',
  className,
}: SelectableTagGroupProps) {
  const handleSelect = (value: string) => {
    if (multiple) {
      if (selected.includes(value)) {
        onChange(selected.filter((v) => v !== value))
      } else {
        onChange([...selected, value])
      }
    } else {
      onChange(selected.includes(value) ? [] : [value])
    }
  }

  return (
    <TagGroup className={className}>
      {options.map((option) => (
        <Tag
          key={option.value}
          color={selected.includes(option.value) ? color : 'gray'}
          onClick={() => handleSelect(option.value)}
          selected={selected.includes(option.value)}
        >
          {option.label}
        </Tag>
      ))}
    </TagGroup>
  )
}
