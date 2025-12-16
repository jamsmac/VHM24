// Keyboard Shortcuts Configuration

export interface KeyboardShortcut {
  id: string
  keys: string[]
  description: string
  category: ShortcutCategory
  action?: () => void
}

export enum ShortcutCategory {
  NAVIGATION = 'navigation',
  ACTIONS = 'actions',
  GENERAL = 'general',
  EDITING = 'editing',
}

export const categoryLabels: Record<ShortcutCategory, string> = {
  [ShortcutCategory.NAVIGATION]: 'Навигация',
  [ShortcutCategory.ACTIONS]: 'Действия',
  [ShortcutCategory.GENERAL]: 'Общие',
  [ShortcutCategory.EDITING]: 'Редактирование',
}

export const categoryIcons: Record<ShortcutCategory, string> = {
  [ShortcutCategory.NAVIGATION]: '🧭',
  [ShortcutCategory.ACTIONS]: '⚡',
  [ShortcutCategory.GENERAL]: '⌨️',
  [ShortcutCategory.EDITING]: '✏️',
}

// All keyboard shortcuts
export const keyboardShortcuts: KeyboardShortcut[] = [
  // General
  {
    id: 'command-palette',
    keys: ['⌘', 'K'],
    description: 'Открыть командную панель',
    category: ShortcutCategory.GENERAL,
  },
  {
    id: 'search',
    keys: ['/'],
    description: 'Фокус на поиск',
    category: ShortcutCategory.GENERAL,
  },
  {
    id: 'help',
    keys: ['?'],
    description: 'Показать справку',
    category: ShortcutCategory.GENERAL,
  },
  {
    id: 'escape',
    keys: ['Esc'],
    description: 'Закрыть диалог / Отмена',
    category: ShortcutCategory.GENERAL,
  },

  // Navigation
  {
    id: 'go-dashboard',
    keys: ['G', 'D'],
    description: 'Перейти на Dashboard',
    category: ShortcutCategory.NAVIGATION,
  },
  {
    id: 'go-tasks',
    keys: ['G', 'T'],
    description: 'Перейти к задачам',
    category: ShortcutCategory.NAVIGATION,
  },
  {
    id: 'go-machines',
    keys: ['G', 'M'],
    description: 'Перейти к аппаратам',
    category: ShortcutCategory.NAVIGATION,
  },
  {
    id: 'go-incidents',
    keys: ['G', 'I'],
    description: 'Перейти к инцидентам',
    category: ShortcutCategory.NAVIGATION,
  },
  {
    id: 'go-users',
    keys: ['G', 'U'],
    description: 'Перейти к пользователям',
    category: ShortcutCategory.NAVIGATION,
  },
  {
    id: 'go-notifications',
    keys: ['G', 'N'],
    description: 'Перейти к уведомлениям',
    category: ShortcutCategory.NAVIGATION,
  },
  {
    id: 'go-settings',
    keys: ['G', 'S'],
    description: 'Перейти к настройкам',
    category: ShortcutCategory.NAVIGATION,
  },
  {
    id: 'go-back',
    keys: ['⌘', '←'],
    description: 'Назад',
    category: ShortcutCategory.NAVIGATION,
  },

  // Actions
  {
    id: 'create-new',
    keys: ['C'],
    description: 'Создать новый элемент',
    category: ShortcutCategory.ACTIONS,
  },
  {
    id: 'refresh',
    keys: ['R'],
    description: 'Обновить данные',
    category: ShortcutCategory.ACTIONS,
  },
  {
    id: 'save',
    keys: ['⌘', 'S'],
    description: 'Сохранить',
    category: ShortcutCategory.ACTIONS,
  },
  {
    id: 'delete',
    keys: ['Del'],
    description: 'Удалить выбранное',
    category: ShortcutCategory.ACTIONS,
  },
  {
    id: 'select-all',
    keys: ['⌘', 'A'],
    description: 'Выбрать все',
    category: ShortcutCategory.ACTIONS,
  },

  // Editing
  {
    id: 'undo',
    keys: ['⌘', 'Z'],
    description: 'Отменить',
    category: ShortcutCategory.EDITING,
  },
  {
    id: 'redo',
    keys: ['⌘', '⇧', 'Z'],
    description: 'Повторить',
    category: ShortcutCategory.EDITING,
  },
  {
    id: 'copy',
    keys: ['⌘', 'C'],
    description: 'Копировать',
    category: ShortcutCategory.EDITING,
  },
  {
    id: 'paste',
    keys: ['⌘', 'V'],
    description: 'Вставить',
    category: ShortcutCategory.EDITING,
  },
]

// Get shortcuts by category
export function getShortcutsByCategory(category: ShortcutCategory): KeyboardShortcut[] {
  return keyboardShortcuts.filter((s) => s.category === category)
}

// Format keys for display (replace ⌘ with Ctrl on Windows)
export function formatKeys(keys: string[], isMac: boolean = true): string[] {
  return keys.map((key) => {
    if (!isMac) {
      if (key === '⌘') return 'Ctrl'
      if (key === '⌥') return 'Alt'
      if (key === '⇧') return 'Shift'
    }
    return key
  })
}

// Check if current platform is Mac
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0
}

// Help topics
export interface HelpTopic {
  id: string
  title: string
  description: string
  icon: string
  content: string[]
}

export const helpTopics: HelpTopic[] = [
  {
    id: 'getting-started',
    title: 'Начало работы',
    description: 'Основы использования системы',
    icon: '🚀',
    content: [
      'Добро пожаловать в VendHub Manager!',
      'Используйте боковое меню для навигации между разделами.',
      'Нажмите ⌘K для быстрого поиска и навигации.',
      'Нажмите ? для просмотра клавиатурных сокращений.',
    ],
  },
  {
    id: 'machines',
    title: 'Управление аппаратами',
    description: 'Работа с торговыми автоматами',
    icon: '🎰',
    content: [
      'Раздел "Аппараты" содержит список всех торговых автоматов.',
      'Используйте фильтры для поиска по статусу или локации.',
      'Кликните на аппарат для просмотра деталей.',
      'QR-код аппарата можно использовать для быстрого доступа.',
    ],
  },
  {
    id: 'tasks',
    title: 'Управление задачами',
    description: 'Создание и выполнение задач',
    icon: '📋',
    content: [
      'Задачи назначаются операторам для выполнения.',
      'Типы задач: пополнение, инкассация, ремонт, обслуживание.',
      'Фото до и после обязательны для завершения задачи.',
      'Просроченные задачи автоматически создают уведомления.',
    ],
  },
  {
    id: 'incidents',
    title: 'Инциденты',
    description: 'Регистрация и обработка проблем',
    icon: '⚠️',
    content: [
      'Инциденты регистрируются при возникновении проблем.',
      'Приоритеты: низкий, средний, высокий, критический.',
      'Инциденты могут быть связаны с конкретным аппаратом.',
      'История инцидентов сохраняется для анализа.',
    ],
  },
  {
    id: 'notifications',
    title: 'Уведомления',
    description: 'Настройка и управление уведомлениями',
    icon: '🔔',
    content: [
      'Уведомления приходят при важных событиях в системе.',
      'Настройте каналы: в приложении, email, Telegram.',
      'Выберите типы уведомлений в профиле.',
      'Срочные уведомления выделяются красным цветом.',
    ],
  },
  {
    id: 'reports',
    title: 'Отчёты',
    description: 'Аналитика и отчётность',
    icon: '📊',
    content: [
      'Отчёты доступны в разделе "Отчёты".',
      'Финансовые, операционные и инвентарные отчёты.',
      'Фильтруйте по периоду и другим параметрам.',
      'Отчёты можно экспортировать в Excel и PDF.',
    ],
  },
]

// Get help topic by ID
export function getHelpTopic(id: string): HelpTopic | undefined {
  return helpTopics.find((t) => t.id === id)
}
