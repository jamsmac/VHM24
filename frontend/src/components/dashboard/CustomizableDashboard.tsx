'use client'

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  DragEvent,
  ReactNode,
} from 'react'
import {
  GripVertical,
  Settings,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  LayoutGrid,
  TrendingUp,
  ClipboardList,
  Briefcase,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Widget configuration
export interface DashboardWidget {
  id: string
  title: string
  type: string
  size: 'small' | 'medium' | 'large' | 'full'
  order: number
  visible: boolean
}

export interface DashboardLayout {
  id: string
  name: string
  description: string
  icon: ReactNode
  widgets: DashboardWidget[]
}

// Preset layouts
const PRESET_LAYOUTS: DashboardLayout[] = [
  {
    id: 'sales',
    name: 'Продажи',
    description: 'Фокус на выручке и транзакциях',
    icon: <TrendingUp className="w-5 h-5" />,
    widgets: [
      { id: 'revenue', title: 'Выручка', type: 'kpi', size: 'small', order: 0, visible: true },
      { id: 'transactions', title: 'Транзакции', type: 'kpi', size: 'small', order: 1, visible: true },
      { id: 'avg-check', title: 'Средний чек', type: 'kpi', size: 'small', order: 2, visible: true },
      { id: 'top-products', title: 'Топ продукты', type: 'kpi', size: 'small', order: 3, visible: true },
      { id: 'sales-chart', title: 'График продаж', type: 'chart', size: 'large', order: 4, visible: true },
      { id: 'revenue-trend', title: 'Тренд выручки', type: 'chart', size: 'medium', order: 5, visible: true },
      { id: 'top-machines', title: 'Топ автоматы', type: 'table', size: 'medium', order: 6, visible: true },
    ],
  },
  {
    id: 'operations',
    name: 'Операции',
    description: 'Задачи и обслуживание',
    icon: <ClipboardList className="w-5 h-5" />,
    widgets: [
      { id: 'active-tasks', title: 'Активные задачи', type: 'kpi', size: 'small', order: 0, visible: true },
      { id: 'pending-tasks', title: 'Ожидающие', type: 'kpi', size: 'small', order: 1, visible: true },
      { id: 'incidents', title: 'Инциденты', type: 'kpi', size: 'small', order: 2, visible: true },
      { id: 'machine-status', title: 'Статус машин', type: 'kpi', size: 'small', order: 3, visible: true },
      { id: 'task-list', title: 'Список задач', type: 'table', size: 'large', order: 4, visible: true },
      { id: 'machine-map', title: 'Карта автоматов', type: 'map', size: 'medium', order: 5, visible: true },
      { id: 'alerts', title: 'Оповещения', type: 'list', size: 'medium', order: 6, visible: true },
    ],
  },
  {
    id: 'executive',
    name: 'Руководитель',
    description: 'Общий обзор бизнеса',
    icon: <Briefcase className="w-5 h-5" />,
    widgets: [
      { id: 'revenue', title: 'Выручка', type: 'kpi', size: 'small', order: 0, visible: true },
      { id: 'machines-online', title: 'Онлайн', type: 'kpi', size: 'small', order: 1, visible: true },
      { id: 'efficiency', title: 'Эффективность', type: 'kpi', size: 'small', order: 2, visible: true },
      { id: 'profit-margin', title: 'Маржа', type: 'kpi', size: 'small', order: 3, visible: true },
      { id: 'revenue-trend', title: 'Тренд выручки', type: 'chart', size: 'large', order: 4, visible: true },
      { id: 'machine-performance', title: 'Производительность', type: 'chart', size: 'full', order: 5, visible: true },
    ],
  },
]

const DEFAULT_LAYOUT = PRESET_LAYOUTS[0]

// Size to grid span mapping
const SIZE_CLASSES = {
  small: 'col-span-1',
  medium: 'col-span-2',
  large: 'col-span-3',
  full: 'col-span-4',
}

interface CustomizableDashboardProps {
  children: (widget: DashboardWidget) => ReactNode
  storageKey?: string
}

export function CustomizableDashboard({
  children,
  storageKey = 'vhm24-dashboard-layout',
}: CustomizableDashboardProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_LAYOUT.widgets)
  const [isEditing, setIsEditing] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>('sales')
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load layout from localStorage
  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem(storageKey)
      if (savedLayout) {
        const parsed = JSON.parse(savedLayout)
        setWidgets(parsed.widgets)
        setActivePreset(parsed.presetId || null)
      }
    } catch (error) {
      console.warn('Failed to load dashboard layout:', error)
    }
  }, [storageKey])

  // Save layout to localStorage
  const saveLayout = useCallback(
    (newWidgets: DashboardWidget[], presetId: string | null = null) => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ widgets: newWidgets, presetId })
        )
      } catch (error) {
        console.warn('Failed to save dashboard layout:', error)
      }
    },
    [storageKey]
  )

  // Apply preset layout
  const applyPreset = useCallback(
    (preset: DashboardLayout) => {
      setWidgets([...preset.widgets])
      setActivePreset(preset.id)
      saveLayout(preset.widgets, preset.id)
      setShowPresets(false)
    },
    [saveLayout]
  )

  // Reset to default layout
  const resetLayout = useCallback(() => {
    setWidgets([...DEFAULT_LAYOUT.widgets])
    setActivePreset('sales')
    saveLayout(DEFAULT_LAYOUT.widgets, 'sales')
  }, [saveLayout])

  // Toggle widget visibility
  const toggleWidgetVisibility = useCallback(
    (widgetId: string) => {
      setWidgets((prev) => {
        const updated = prev.map((w) =>
          w.id === widgetId ? { ...w, visible: !w.visible } : w
        )
        saveLayout(updated, null)
        setActivePreset(null)
        return updated
      })
    },
    [saveLayout]
  )

  // Change widget size
  const changeWidgetSize = useCallback(
    (widgetId: string, size: DashboardWidget['size']) => {
      setWidgets((prev) => {
        const updated = prev.map((w) =>
          w.id === widgetId ? { ...w, size } : w
        )
        saveLayout(updated, null)
        setActivePreset(null)
        return updated
      })
    },
    [saveLayout]
  )

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, widgetId: string) => {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', widgetId)
      setDraggedWidget(widgetId)
    },
    []
  )

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, widgetId: string) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (widgetId !== draggedWidget) {
        setDragOverWidget(widgetId)
      }
    },
    [draggedWidget]
  )

  const handleDragLeave = useCallback(() => {
    setDragOverWidget(null)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetId: string) => {
      e.preventDefault()
      const sourceId = e.dataTransfer.getData('text/plain')

      if (sourceId === targetId) {
        setDraggedWidget(null)
        setDragOverWidget(null)
        return
      }

      setWidgets((prev) => {
        const sourceIndex = prev.findIndex((w) => w.id === sourceId)
        const targetIndex = prev.findIndex((w) => w.id === targetId)

        if (sourceIndex === -1 || targetIndex === -1) return prev

        const updated = [...prev]
        const [removed] = updated.splice(sourceIndex, 1)
        updated.splice(targetIndex, 0, removed)

        // Update order numbers
        const withOrder = updated.map((w, i) => ({ ...w, order: i }))
        saveLayout(withOrder, null)
        setActivePreset(null)
        return withOrder
      })

      setDraggedWidget(null)
      setDragOverWidget(null)
    },
    [saveLayout]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null)
    setDragOverWidget(null)
  }, [])

  const visibleWidgets = widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Preset selector */}
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700',
                'hover:bg-gray-50 dark:hover:bg-slate-700'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>
                {activePreset
                  ? PRESET_LAYOUTS.find((p) => p.id === activePreset)?.name || 'Свой макет'
                  : 'Свой макет'}
              </span>
            </button>

            {showPresets && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowPresets(false)}
                />
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                  <div className="p-2 border-b border-gray-100 dark:border-slate-700">
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400 px-2">
                      Выберите макет
                    </p>
                  </div>
                  <div className="p-2 space-y-1">
                    {PRESET_LAYOUTS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                          activePreset === preset.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                        )}
                      >
                        <div
                          className={cn(
                            'p-2 rounded-lg',
                            activePreset === preset.id
                              ? 'bg-indigo-100 dark:bg-indigo-900/50'
                              : 'bg-gray-100 dark:bg-slate-700'
                          )}
                        >
                          {preset.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {preset.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {preset.description}
                          </p>
                        </div>
                        {activePreset === preset.id && (
                          <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetLayout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Сбросить
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              isEditing
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
            )}
          >
            <Settings className="w-4 h-4" />
            {isEditing ? 'Готово' : 'Настроить'}
          </button>
        </div>
      </div>

      {/* Widget visibility controls (when editing) */}
      {isEditing && (
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
            Виджеты (перетащите для изменения порядка)
          </p>
          <div className="flex flex-wrap gap-2">
            {widgets.map((widget) => (
              <button
                key={widget.id}
                onClick={() => toggleWidgetVisibility(widget.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors',
                  widget.visible
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400'
                    : 'bg-white border-gray-200 text-gray-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                )}
              >
                {widget.visible ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <X className="w-3 h-3" />
                )}
                {widget.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div
        ref={containerRef}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {visibleWidgets.map((widget) => (
          <div
            key={widget.id}
            draggable={isEditing}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              SIZE_CLASSES[widget.size],
              'relative group transition-all',
              isEditing && 'cursor-move',
              draggedWidget === widget.id && 'opacity-50',
              dragOverWidget === widget.id &&
                'ring-2 ring-indigo-500 ring-offset-2 rounded-lg'
            )}
          >
            {/* Edit overlay */}
            {isEditing && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 px-2 py-1 pointer-events-auto">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </div>

                <div className="absolute top-2 right-2 flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden pointer-events-auto">
                  <button
                    onClick={() =>
                      changeWidgetSize(
                        widget.id,
                        widget.size === 'small'
                          ? 'medium'
                          : widget.size === 'medium'
                          ? 'large'
                          : widget.size === 'large'
                          ? 'full'
                          : 'small'
                      )
                    }
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    title="Изменить размер"
                  >
                    {widget.size === 'full' ? (
                      <Minimize2 className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleWidgetVisibility(widget.id)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                    title="Скрыть"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Widget content */}
            {children(widget)}
          </div>
        ))}
      </div>

      {visibleWidgets.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-300 dark:border-slate-700">
          <LayoutGrid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">
            Нет видимых виджетов
          </p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
            Нажмите "Настроить" чтобы добавить виджеты
          </p>
        </div>
      )}
    </div>
  )
}

// Widget wrapper component for consistent styling
interface WidgetCardProps {
  title: string
  children: ReactNode
  className?: string
  actions?: ReactNode
}

export function WidgetCard({ title, children, className, actions }: WidgetCardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden h-full',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
