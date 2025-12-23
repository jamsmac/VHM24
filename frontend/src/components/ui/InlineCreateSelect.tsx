'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { ChevronDown, Plus, Check, X, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  description?: string
}

interface InlineCreateSelectProps {
  options: SelectOption[]
  value: string | null
  onChange: (value: string | null) => void
  onCreate?: (name: string) => Promise<SelectOption>
  placeholder?: string
  searchPlaceholder?: string
  createPlaceholder?: string
  label?: string
  disabled?: boolean
  loading?: boolean
  error?: string
  className?: string
  allowCreate?: boolean
}

export function InlineCreateSelect({
  options,
  value,
  onChange,
  onCreate,
  placeholder = 'Выберите...',
  searchPlaceholder = 'Поиск...',
  createPlaceholder = 'Название',
  label,
  disabled = false,
  loading = false,
  error,
  className,
  allowCreate = true,
}: InlineCreateSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createValue, setCreateValue] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const createInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Filter options based on search
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase()) ||
    option.description?.toLowerCase().includes(search.toLowerCase())
  )

  // Get selected option
  const selectedOption = options.find(o => o.value === value)

  // Check if search matches any existing option exactly
  const exactMatch = options.some(
    o => o.label.toLowerCase() === search.toLowerCase()
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
        setSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Focus create input when creating
  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus()
    }
  }, [isCreating])

  // Reset highlighted index when options change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions.length])

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && filteredOptions.length > 0) {
      const highlightedItem = listRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, filteredOptions.length])

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearch('')
    setIsCreating(false)
  }, [onChange])

  const handleCreate = useCallback(async () => {
    if (!createValue.trim() || !onCreate) return

    setCreateLoading(true)
    try {
      const newOption = await onCreate(createValue.trim())
      onChange(newOption.value)
      setIsOpen(false)
      setIsCreating(false)
      setCreateValue('')
      setSearch('')
    } catch (error) {
      console.error('Failed to create:', error)
    } finally {
      setCreateLoading(false)
    }
  }, [createValue, onCreate, onChange])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (isCreating) {
          handleCreate()
        } else if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value)
        }
        break
      case 'Escape':
        e.preventDefault()
        if (isCreating) {
          setIsCreating(false)
          setCreateValue('')
        } else {
          setIsOpen(false)
          setSearch('')
        }
        break
      case 'Tab':
        setIsOpen(false)
        setSearch('')
        break
    }
  }, [isOpen, isCreating, filteredOptions, highlightedIndex, handleSelect, handleCreate])

  const handleToggle = () => {
    if (disabled) return
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearch('')
      setIsCreating(false)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  const startCreating = () => {
    setIsCreating(true)
    setCreateValue(search)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all',
          'bg-white dark:bg-slate-800',
          error
            ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
            : 'border-gray-200 dark:border-slate-700 focus:ring-indigo-500',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-gray-300 dark:hover:border-slate-600',
          'focus:outline-none focus:ring-2 focus:ring-offset-0'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={cn(
          'truncate',
          selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'
        )}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Загрузка...
            </span>
          ) : selectedOption ? (
            selectedOption.label
          ) : (
            placeholder
          )}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
              aria-label="Очистить"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
          <ChevronDown className={cn(
            'w-4 h-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </div>
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className={cn(
                  'w-full pl-8 pr-3 py-2 text-sm rounded-md border-0',
                  'bg-gray-50 dark:bg-slate-900',
                  'text-gray-900 dark:text-white',
                  'placeholder:text-gray-400 dark:placeholder:text-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500'
                )}
              />
            </div>
          </div>

          {/* Options List */}
          {!isCreating && (
            <ul
              ref={listRef}
              className="max-h-60 overflow-y-auto py-1"
              role="listbox"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400 text-center">
                  Ничего не найдено
                </li>
              ) : (
                filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={option.value === value}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'px-3 py-2 cursor-pointer transition-colors',
                      index === highlightedIndex && 'bg-indigo-50 dark:bg-indigo-900/30',
                      option.value === value && 'bg-indigo-100 dark:bg-indigo-900/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {option.label}
                        </div>
                        {option.description && (
                          <div className="text-xs text-gray-500 dark:text-slate-400">
                            {option.description}
                          </div>
                        )}
                      </div>
                      {option.value === value && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}

          {/* Create New Section */}
          {allowCreate && onCreate && !isCreating && !exactMatch && (
            <div className="border-t border-gray-100 dark:border-slate-700 p-2">
              <button
                type="button"
                onClick={startCreating}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md',
                  'text-indigo-600 dark:text-indigo-400',
                  'hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
                  'transition-colors'
                )}
              >
                <Plus className="w-4 h-4" />
                {search ? `Создать "${search}"` : 'Создать новый'}
              </button>
            </div>
          )}

          {/* Inline Create Form */}
          {isCreating && (
            <div className="p-3 border-t border-gray-100 dark:border-slate-700">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    {createPlaceholder}
                  </label>
                  <input
                    ref={createInputRef}
                    type="text"
                    value={createValue}
                    onChange={(e) => setCreateValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={createPlaceholder}
                    className={cn(
                      'w-full px-3 py-2 text-sm rounded-md border',
                      'border-gray-200 dark:border-slate-600',
                      'bg-white dark:bg-slate-900',
                      'text-gray-900 dark:text-white',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                    )}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!createValue.trim() || createLoading}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md',
                      'bg-indigo-600 text-white',
                      'hover:bg-indigo-700',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-colors'
                    )}
                  >
                    {createLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Создать
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false)
                      setCreateValue('')
                    }}
                    className={cn(
                      'px-3 py-2 text-sm font-medium rounded-md',
                      'text-gray-600 dark:text-slate-400',
                      'hover:bg-gray-100 dark:hover:bg-slate-700',
                      'transition-colors'
                    )}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Multi-select variant
interface InlineCreateMultiSelectProps {
  options: SelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  onCreate?: (name: string) => Promise<SelectOption>
  placeholder?: string
  searchPlaceholder?: string
  createPlaceholder?: string
  label?: string
  disabled?: boolean
  loading?: boolean
  error?: string
  className?: string
  allowCreate?: boolean
  maxSelected?: number
}

export function InlineCreateMultiSelect({
  options,
  value,
  onChange,
  onCreate,
  placeholder = 'Выберите...',
  searchPlaceholder = 'Поиск...',
  createPlaceholder = 'Название',
  label,
  disabled = false,
  loading = false,
  error,
  className,
  allowCreate = true,
  maxSelected,
}: InlineCreateMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createValue, setCreateValue] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const createInputRef = useRef<HTMLInputElement>(null)

  // Filter options based on search
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase())
  )

  // Get selected options
  const selectedOptions = options.filter(o => value.includes(o.value))

  // Check if search matches any existing option exactly
  const exactMatch = options.some(
    o => o.label.toLowerCase() === search.toLowerCase()
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
        setSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Focus create input when creating
  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus()
    }
  }, [isCreating])

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      if (maxSelected && value.length >= maxSelected) return
      onChange([...value, optionValue])
    }
  }

  const handleCreate = async () => {
    if (!createValue.trim() || !onCreate) return

    setCreateLoading(true)
    try {
      const newOption = await onCreate(createValue.trim())
      onChange([...value, newOption.value])
      setIsCreating(false)
      setCreateValue('')
      setSearch('')
    } catch (error) {
      console.error('Failed to create:', error)
    } finally {
      setCreateLoading(false)
    }
  }

  const removeSelected = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter(v => v !== optionValue))
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full min-h-[42px] flex flex-wrap items-center gap-1 px-2 py-1.5 rounded-lg border text-left transition-all',
          'bg-white dark:bg-slate-800',
          error
            ? 'border-red-300 dark:border-red-700'
            : 'border-gray-200 dark:border-slate-700',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-gray-300 dark:hover:border-slate-600',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500'
        )}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-gray-400 px-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            Загрузка...
          </span>
        ) : selectedOptions.length > 0 ? (
          selectedOptions.map(option => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
            >
              {option.label}
              <button
                type="button"
                onClick={(e) => removeSelected(option.value, e)}
                className="hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-gray-400 dark:text-slate-500 px-1">{placeholder}</span>
        )}
        <ChevronDown className={cn(
          'ml-auto w-4 h-4 text-gray-400 transition-transform flex-shrink-0',
          isOpen && 'rotate-180'
        )} />
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className={cn(
                  'w-full pl-8 pr-3 py-2 text-sm rounded-md border-0',
                  'bg-gray-50 dark:bg-slate-900',
                  'text-gray-900 dark:text-white',
                  'placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500'
                )}
              />
            </div>
          </div>

          {/* Options List */}
          {!isCreating && (
            <ul className="max-h-60 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500 text-center">
                  Ничего не найдено
                </li>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value)
                  const isDisabled = !isSelected && maxSelected !== undefined && value.length >= maxSelected

                  return (
                    <li
                      key={option.value}
                      onClick={() => !isDisabled && handleToggle(option.value)}
                      className={cn(
                        'px-3 py-2 cursor-pointer transition-colors',
                        isSelected && 'bg-indigo-50 dark:bg-indigo-900/30',
                        isDisabled && 'opacity-50 cursor-not-allowed',
                        !isDisabled && 'hover:bg-gray-50 dark:hover:bg-slate-700'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {option.label}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
          )}

          {/* Create New Section */}
          {allowCreate && onCreate && !isCreating && !exactMatch && (
            <div className="border-t border-gray-100 dark:border-slate-700 p-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(true)
                  setCreateValue(search)
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md',
                  'text-indigo-600 dark:text-indigo-400',
                  'hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
                  'transition-colors'
                )}
              >
                <Plus className="w-4 h-4" />
                {search ? `Создать "${search}"` : 'Создать новый'}
              </button>
            </div>
          )}

          {/* Inline Create Form */}
          {isCreating && (
            <div className="p-3 border-t border-gray-100 dark:border-slate-700">
              <div className="space-y-3">
                <input
                  ref={createInputRef}
                  type="text"
                  value={createValue}
                  onChange={(e) => setCreateValue(e.target.value)}
                  placeholder={createPlaceholder}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-md border',
                    'border-gray-200 dark:border-slate-600',
                    'bg-white dark:bg-slate-900',
                    'text-gray-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  )}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!createValue.trim() || createLoading}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md',
                      'bg-indigo-600 text-white hover:bg-indigo-700',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Создать
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false)
                      setCreateValue('')
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
