/**
 * Accessibility Utilities
 *
 * This module provides utilities for improving accessibility in the application.
 * Follows WCAG 2.1 AA guidelines.
 */

// Re-export hooks
export { useAnnounce, announceToScreenReader } from '@/hooks/useAnnounce'

// Re-export components
export { VisuallyHidden } from '@/components/ui/visually-hidden'
export { LiveRegion, useLiveRegion } from '@/components/ui/live-region'

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-contrast: more)').matches
}

/**
 * Generate a unique ID for ARIA relationships
 */
export function generateAriaId(prefix = 'aria'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Trap focus within an element (useful for modals)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  // Focus first element
  firstElement?.focus()

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ]

  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors.join(', '))
  ).filter((el) => {
    // Additional check for visibility
    const style = window.getComputedStyle(el)
    return style.display !== 'none' && style.visibility !== 'hidden'
  })
}

/**
 * Move focus to an element and scroll it into view
 */
export function focusElement(
  element: HTMLElement | null,
  options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' }
): void {
  if (!element) return

  element.focus({ preventScroll: true })
  element.scrollIntoView(options)
}

/**
 * ARIA label helpers
 */
export const ariaLabels = {
  // Navigation
  mainNavigation: 'Главная навигация',
  skipToMain: 'Перейти к основному содержимому',
  breadcrumbs: 'Навигационная цепочка',

  // Actions
  close: 'Закрыть',
  open: 'Открыть',
  toggle: 'Переключить',
  expand: 'Развернуть',
  collapse: 'Свернуть',
  edit: 'Редактировать',
  delete: 'Удалить',
  save: 'Сохранить',
  cancel: 'Отмена',
  submit: 'Отправить',
  search: 'Поиск',
  filter: 'Фильтр',
  sort: 'Сортировка',

  // States
  loading: 'Загрузка...',
  error: 'Ошибка',
  success: 'Успешно',
  required: 'Обязательное поле',
  optional: 'Необязательное поле',

  // Data
  noData: 'Нет данных',
  emptyList: 'Список пуст',
  page: 'Страница',
  of: 'из',
  items: 'элементов',

  // Forms
  showPassword: 'Показать пароль',
  hidePassword: 'Скрыть пароль',
  clearInput: 'Очистить поле',
  selectDate: 'Выбрать дату',
  selectTime: 'Выбрать время',

  // Tables
  sortAscending: 'Сортировать по возрастанию',
  sortDescending: 'Сортировать по убыванию',
  selectAll: 'Выбрать все',
  selectRow: 'Выбрать строку',
} as const

/**
 * Status messages for screen reader announcements
 */
export const statusMessages = {
  // Loading states
  loading: 'Загрузка данных...',
  loadingComplete: 'Загрузка завершена',
  loadingError: 'Ошибка загрузки данных',

  // Form states
  formSubmitting: 'Отправка формы...',
  formSubmitted: 'Форма отправлена успешно',
  formError: 'Ошибка при отправке формы',
  validationError: (count: number) =>
    `Обнаружено ${count} ${count === 1 ? 'ошибка' : count < 5 ? 'ошибки' : 'ошибок'} валидации`,

  // Data operations
  itemCreated: 'Элемент создан',
  itemUpdated: 'Элемент обновлен',
  itemDeleted: 'Элемент удален',
  itemsLoaded: (count: number) => `Загружено ${count} элементов`,

  // Pagination
  pageChanged: (page: number, total: number) => `Страница ${page} из ${total}`,

  // Filtering/Sorting
  filtersApplied: 'Фильтры применены',
  filtersCleared: 'Фильтры сброшены',
  sortChanged: (column: string, direction: string) =>
    `Сортировка по ${column}, ${direction === 'asc' ? 'по возрастанию' : 'по убыванию'}`,
} as const
