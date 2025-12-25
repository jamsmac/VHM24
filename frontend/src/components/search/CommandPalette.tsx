'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  searchCommands,
} from '@/lib/search-api'
import {
  Search,
  X,
  ArrowRight,
  Command,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const results = searchCommands(query)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % results.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [results, selectedIndex, onClose]
  )

  const handleSelect = (item: (typeof results)[0]) => {
    if (item.url) {
      router.push(item.url)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
        <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center px-4 border-b border-gray-200">
            <Search className="h-5 w-5 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Поиск команд и страниц..."
              className="flex-1 px-3 py-4 text-base text-gray-900 placeholder-gray-400 outline-none bg-transparent"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="ml-2 flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
              <span>Esc</span>
            </div>
          </div>

          {/* Results */}
          <div ref={resultsRef} className="max-h-[400px] overflow-y-auto p-2">
            {results.length > 0 ? (
              <div className="space-y-1">
                {/* Navigation Section */}
                {results.filter((r) => r.category === 'navigation').length > 0 && (
                  <div>
                    <p className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Навигация
                    </p>
                    {results
                      .filter((r) => r.category === 'navigation')
                      .map((item) => {
                        const globalIndex = results.findIndex((r) => r.id === item.id)
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                              selectedIndex === globalIndex
                                ? 'bg-indigo-50 text-indigo-900'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-lg">{item.icon}</span>
                            <div className="flex-1 text-left">
                              <p className="font-medium">{item.title}</p>
                              <p className="text-sm text-gray-500">{item.description}</p>
                            </div>
                            {selectedIndex === globalIndex && (
                              <ArrowRight className="h-4 w-4 text-indigo-500" />
                            )}
                          </button>
                        )
                      })}
                  </div>
                )}

                {/* Actions Section */}
                {results.filter((r) => r.category === 'action').length > 0 && (
                  <div>
                    <p className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider mt-2">
                      Быстрые действия
                    </p>
                    {results
                      .filter((r) => r.category === 'action')
                      .map((item) => {
                        const globalIndex = results.findIndex((r) => r.id === item.id)
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                              selectedIndex === globalIndex
                                ? 'bg-indigo-50 text-indigo-900'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-lg">{item.icon}</span>
                            <div className="flex-1 text-left">
                              <p className="font-medium">{item.title}</p>
                              <p className="text-sm text-gray-500">{item.description}</p>
                            </div>
                            {item.shortcut && (
                              <kbd className="px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded">
                                {item.shortcut}
                              </kbd>
                            )}
                            {selectedIndex === globalIndex && (
                              <ArrowRight className="h-4 w-4 text-indigo-500" />
                            )}
                          </button>
                        )
                      })}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Ничего не найдено</p>
                <p className="text-sm text-gray-400 mt-1">Попробуйте другой запрос</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                <span>навигация</span>
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" />
                <span>выбрать</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px]">Esc</kbd>
                <span>закрыть</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Command className="h-3 w-3" />
              <span>VendHub</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Hook for opening command palette with keyboard shortcut
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      // / to open (when not in input)
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }
}

// Search trigger button component
export function SearchTrigger({ onClick }: { onClick: () => void }) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
    >
      <Search className="h-4 w-4" />
      <span className="hidden md:inline">Поиск...</span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-white rounded border border-gray-300">
        {isMac ? '⌘' : 'Ctrl'}K
      </kbd>
    </button>
  )
}
