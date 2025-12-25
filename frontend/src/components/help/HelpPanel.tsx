'use client'

import { useState, useEffect } from 'react'
import {
  ShortcutCategory,
  categoryLabels,
  categoryIcons,
  getShortcutsByCategory,
  formatKeys,
  isMacPlatform,
  helpTopics,
  HelpTopic,
} from '@/lib/keyboard-shortcuts'
import {
  X,
  Keyboard,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react'

interface HelpPanelProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'shortcuts' | 'help'

export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('shortcuts')
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null)
  const isMac = isMacPlatform()

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Справка</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab('shortcuts')
              setSelectedTopic(null)
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'shortcuts'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Keyboard className="h-4 w-4" />
            Горячие клавиши
          </button>
          <button
            onClick={() => {
              setActiveTab('help')
              setSelectedTopic(null)
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'help'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            Помощь
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'shortcuts' && (
            <KeyboardShortcutsContent isMac={isMac} />
          )}

          {activeTab === 'help' && !selectedTopic && (
            <HelpTopicsContent onSelectTopic={setSelectedTopic} />
          )}

          {activeTab === 'help' && selectedTopic && (
            <HelpTopicDetail
              topic={selectedTopic}
              onBack={() => setSelectedTopic(null)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>Нажмите <kbd className="px-1.5 py-0.5 bg-gray-200 rounded">?</kbd> чтобы открыть справку</span>
            <span>VendHub Manager</span>
          </div>
        </div>
      </div>
    </>
  )
}

// Keyboard Shortcuts Content
function KeyboardShortcutsContent({ isMac }: { isMac: boolean }) {
  const categories = Object.values(ShortcutCategory)

  return (
    <div className="p-6 space-y-6">
      {categories.map((category) => {
        const shortcuts = getShortcutsByCategory(category)
        if (shortcuts.length === 0) return null

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{categoryIcons[category]}</span>
              <h3 className="font-medium text-gray-900">{categoryLabels[category]}</h3>
            </div>
            <div className="space-y-2">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm text-gray-700">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {formatKeys(shortcut.keys, isMac).map((key, index) => (
                      <kbd
                        key={index}
                        className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded shadow-sm min-w-[24px] text-center"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Совет:</strong> Используйте <kbd className="px-1.5 py-0.5 bg-blue-100 rounded text-xs">{isMac ? '⌘' : 'Ctrl'}K</kbd> для
          быстрого доступа к любой странице или действию через командную панель.
        </p>
      </div>
    </div>
  )
}

// Help Topics Content
function HelpTopicsContent({ onSelectTopic }: { onSelectTopic: (topic: HelpTopic) => void }) {
  return (
    <div className="p-6">
      <p className="text-sm text-gray-500 mb-4">
        Выберите тему для получения справки
      </p>
      <div className="space-y-2">
        {helpTopics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelectTopic(topic)}
            className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left group"
          >
            <span className="text-2xl">{topic.icon}</span>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{topic.title}</h4>
              <p className="text-sm text-gray-500">{topic.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Нужна дополнительная помощь?</h4>
        <p className="text-sm text-gray-600 mb-3">
          Свяжитесь с технической поддержкой для получения помощи.
        </p>
        <a
          href="mailto:support@vendhub.ru"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          support@vendhub.ru
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}

// Help Topic Detail
function HelpTopicDetail({ topic, onBack }: { topic: HelpTopic; onBack: () => void }) {
  return (
    <div className="p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к темам
      </button>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{topic.icon}</span>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{topic.title}</h3>
          <p className="text-sm text-gray-500">{topic.description}</p>
        </div>
      </div>

      <div className="space-y-3">
        {topic.content.map((paragraph, index) => (
          <p key={index} className="text-gray-700 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  )
}

// Hook for opening help panel with keyboard shortcut
export function useHelpPanel() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ? to open help (when not in input)
      if (
        e.key === '?' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) &&
        !(e.target as HTMLElement).isContentEditable
      ) {
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
    toggle: () => setIsOpen((prev) => !prev),
  }
}
