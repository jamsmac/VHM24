'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TourStep {
  target: string // CSS selector for the target element
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  spotlightPadding?: number
}

interface ProductTourProps {
  steps: TourStep[]
  tourId: string // Unique ID to track if user has seen this tour
  onComplete?: () => void
  onSkip?: () => void
}

interface TooltipPosition {
  top: number
  left: number
  placement: 'top' | 'bottom' | 'left' | 'right'
}

export function ProductTour({ steps, tourId, onComplete, onSkip }: ProductTourProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null)
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const storageKey = `vhm24-tour-${tourId}-completed`

  // Check if tour was already completed
  useEffect(() => {
    const completed = localStorage.getItem(storageKey)
    if (!completed) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => setIsOpen(true), 500)
      return () => clearTimeout(timer)
    }
  }, [storageKey])

  // Calculate tooltip position
  const calculatePosition = useCallback((step: TourStep): TooltipPosition | null => {
    const targetEl = document.querySelector(step.target)
    if (!targetEl) return null

    const rect = targetEl.getBoundingClientRect()
    const padding = step.spotlightPadding ?? 8

    // Store spotlight rect
    setSpotlightRect(rect)

    const tooltipWidth = 320
    const tooltipHeight = 180
    const margin = 16

    let placement = step.placement || 'bottom'
    let top = 0
    let left = 0

    // Check available space and adjust placement if needed
    const spaceTop = rect.top
    const spaceBottom = window.innerHeight - rect.bottom
    const _spaceLeft = rect.left
    const _spaceRight = window.innerWidth - rect.right

    if (placement === 'bottom' && spaceBottom < tooltipHeight + margin) {
      placement = spaceTop > spaceBottom ? 'top' : 'bottom'
    } else if (placement === 'top' && spaceTop < tooltipHeight + margin) {
      placement = spaceBottom > spaceTop ? 'bottom' : 'top'
    }

    switch (placement) {
      case 'top':
        top = rect.top - tooltipHeight - margin - padding
        left = rect.left + rect.width / 2 - tooltipWidth / 2
        break
      case 'bottom':
        top = rect.bottom + margin + padding
        left = rect.left + rect.width / 2 - tooltipWidth / 2
        break
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2
        left = rect.left - tooltipWidth - margin - padding
        break
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2
        left = rect.right + margin + padding
        break
    }

    // Clamp to viewport
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin))
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipHeight - margin))

    return { top, left, placement }
  }, [])

  // Update position when step changes
  useEffect(() => {
    if (!isOpen || !steps[currentStep]) return

    const updatePosition = () => {
      const pos = calculatePosition(steps[currentStep])
      setTooltipPosition(pos)
    }

    updatePosition()

    // Scroll target into view
    const targetEl = document.querySelector(steps[currentStep].target)
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // Update on resize
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [isOpen, currentStep, steps, calculatePosition])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true')
    setIsOpen(false)
    onComplete?.()
  }

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'true')
    setIsOpen(false)
    onSkip?.()
  }

  if (!isOpen || typeof window === 'undefined') return null

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* Backdrop with spotlight */}
      <div className="absolute inset-0 bg-black/60 transition-opacity">
        {spotlightRect && (
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect
                  x={spotlightRect.left - 8}
                  y={spotlightRect.top - 8}
                  width={spotlightRect.width + 16}
                  height={spotlightRect.height + 16}
                  rx="8"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.6)"
              mask="url(#spotlight-mask)"
            />
          </svg>
        )}
      </div>

      {/* Tooltip */}
      {tooltipPosition && (
        <div
          ref={tooltipRef}
          className={cn(
            'absolute w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl',
            'border border-gray-200 dark:border-slate-700',
            'transform transition-all duration-300 ease-out',
            'animate-in fade-in-0 zoom-in-95'
          )}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
                Шаг {currentStep + 1} из {steps.length}
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Пропустить обзор"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
              {step.content}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 pb-3">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === currentStep
                    ? 'bg-indigo-600 w-6'
                    : index < currentStep
                    ? 'bg-indigo-400'
                    : 'bg-gray-200 dark:bg-slate-600'
                )}
                aria-label={`Перейти к шагу ${index + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-b-xl border-t border-gray-100 dark:border-slate-700">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Пропустить
            </button>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </button>
              )}
              <button
                onClick={handleNext}
                className={cn(
                  'flex items-center gap-1 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  'bg-indigo-600 text-white hover:bg-indigo-700'
                )}
              >
                {isLastStep ? (
                  <>
                    Готово
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Далее
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}

// Welcome modal for first-time users
interface WelcomeModalProps {
  tourId: string
  onStartTour: () => void
  onSkip: () => void
}

export function WelcomeModal({ tourId, onStartTour, onSkip }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const storageKey = `vhm24-welcome-${tourId}-shown`

  useEffect(() => {
    const shown = localStorage.getItem(storageKey)
    if (!shown) {
      setIsOpen(true)
    }
  }, [storageKey])

  const handleStartTour = () => {
    localStorage.setItem(storageKey, 'true')
    setIsOpen(false)
    onStartTour()
  }

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'true')
    setIsOpen(false)
    onSkip()
  }

  if (!isOpen || typeof window === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Gradient header */}
        <div className="h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Добро пожаловать в VendHub!
          </h2>
          <p className="text-gray-600 dark:text-slate-300 mb-6">
            Хотите пройти краткий обзор основных функций системы управления вендинговыми автоматами?
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleStartTour}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Начать обзор
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-3 px-4 text-gray-600 dark:text-slate-400 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              Пропустить
            </button>
          </div>

          <label className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 dark:border-slate-600"
              onChange={(e) => {
                if (e.target.checked) {
                  localStorage.setItem(`vhm24-tour-dashboard-completed`, 'true')
                }
              }}
            />
            Больше не показывать
          </label>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Hook for managing tour state
export function useProductTour(tourId: string) {
  const [showTour, setShowTour] = useState(false)
  const storageKey = `vhm24-tour-${tourId}-completed`

  const startTour = useCallback(() => {
    setShowTour(true)
  }, [])

  const resetTour = useCallback(() => {
    localStorage.removeItem(storageKey)
    localStorage.removeItem(`vhm24-welcome-${tourId}-shown`)
  }, [storageKey, tourId])

  const isTourCompleted = useCallback(() => {
    return localStorage.getItem(storageKey) === 'true'
  }, [storageKey])

  return {
    showTour,
    setShowTour,
    startTour,
    resetTour,
    isTourCompleted,
  }
}
