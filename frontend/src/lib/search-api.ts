// Global Search API
// Provides unified search across all entities

export enum SearchCategory {
  ALL = 'all',
  MACHINES = 'machines',
  TASKS = 'tasks',
  USERS = 'users',
  INCIDENTS = 'incidents',
  LOCATIONS = 'locations',
  PRODUCTS = 'products',
  CONTRACTS = 'contracts',
}

export const categoryLabels: Record<SearchCategory, string> = {
  [SearchCategory.ALL]: 'Все',
  [SearchCategory.MACHINES]: 'Аппараты',
  [SearchCategory.TASKS]: 'Задачи',
  [SearchCategory.USERS]: 'Пользователи',
  [SearchCategory.INCIDENTS]: 'Инциденты',
  [SearchCategory.LOCATIONS]: 'Локации',
  [SearchCategory.PRODUCTS]: 'Товары',
  [SearchCategory.CONTRACTS]: 'Договоры',
}

export const categoryIcons: Record<SearchCategory, string> = {
  [SearchCategory.ALL]: '🔍',
  [SearchCategory.MACHINES]: '🎰',
  [SearchCategory.TASKS]: '📋',
  [SearchCategory.USERS]: '👤',
  [SearchCategory.INCIDENTS]: '⚠️',
  [SearchCategory.LOCATIONS]: '📍',
  [SearchCategory.PRODUCTS]: '📦',
  [SearchCategory.CONTRACTS]: '📄',
}

export interface SearchResult {
  id: string
  title: string
  subtitle?: string
  category: SearchCategory
  url: string
  icon?: string
  metadata?: Record<string, unknown>
}

export interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  shortcut?: string
  action: () => void
  category: 'navigation' | 'action' | 'settings'
}

// Navigation items for command palette
export const navigationItems: Omit<QuickAction, 'action'>[] = [
  // Main navigation
  { id: 'nav-dashboard', title: 'Dashboard', description: 'Главная панель', icon: '🏠', category: 'navigation' },
  { id: 'nav-machines', title: 'Аппараты', description: 'Управление автоматами', icon: '🎰', category: 'navigation' },
  { id: 'nav-tasks', title: 'Задачи', description: 'Список задач', icon: '📋', category: 'navigation' },
  { id: 'nav-incidents', title: 'Инциденты', description: 'Управление инцидентами', icon: '⚠️', category: 'navigation' },
  { id: 'nav-complaints', title: 'Жалобы', description: 'Жалобы клиентов', icon: '💬', category: 'navigation' },
  { id: 'nav-transactions', title: 'Транзакции', description: 'Финансовые операции', icon: '💰', category: 'navigation' },
  { id: 'nav-inventory', title: 'Инвентарь', description: 'Управление запасами', icon: '📦', category: 'navigation' },
  { id: 'nav-users', title: 'Пользователи', description: 'Управление персоналом', icon: '👥', category: 'navigation' },
  { id: 'nav-locations', title: 'Локации', description: 'Точки размещения', icon: '📍', category: 'navigation' },
  { id: 'nav-map', title: 'Карта', description: 'Карта аппаратов', icon: '🗺️', category: 'navigation' },
  { id: 'nav-reports', title: 'Отчеты', description: 'Аналитика и отчёты', icon: '📊', category: 'navigation' },
  { id: 'nav-alerts', title: 'Оповещения', description: 'Системные оповещения', icon: '🔔', category: 'navigation' },
  { id: 'nav-notifications', title: 'Уведомления', description: 'Центр уведомлений', icon: '📬', category: 'navigation' },
  { id: 'nav-monitoring', title: 'Мониторинг', description: 'Состояние системы', icon: '📈', category: 'navigation' },
  { id: 'nav-audit', title: 'Аудит', description: 'Журнал событий', icon: '📜', category: 'navigation' },
  { id: 'nav-scheduled', title: 'Расписание', description: 'Запланированные задачи', icon: '⏰', category: 'navigation' },
  { id: 'nav-profile', title: 'Профиль', description: 'Настройки профиля', icon: '👤', category: 'navigation' },
  { id: 'nav-settings', title: 'Настройки', description: 'Настройки системы', icon: '⚙️', category: 'navigation' },
]

// Quick action items
export const quickActionItems: Omit<QuickAction, 'action'>[] = [
  { id: 'action-create-task', title: 'Создать задачу', description: 'Новая задача для оператора', icon: '➕', shortcut: 'T', category: 'action' },
  { id: 'action-create-incident', title: 'Создать инцидент', description: 'Зарегистрировать проблему', icon: '🚨', shortcut: 'I', category: 'action' },
  { id: 'action-add-machine', title: 'Добавить аппарат', description: 'Новый торговый автомат', icon: '🎰', shortcut: 'M', category: 'action' },
  { id: 'action-add-user', title: 'Добавить пользователя', description: 'Новый сотрудник', icon: '👤', shortcut: 'U', category: 'action' },
  { id: 'action-add-location', title: 'Добавить локацию', description: 'Новая точка размещения', icon: '📍', shortcut: 'L', category: 'action' },
  { id: 'action-import', title: 'Импорт данных', description: 'Загрузить из файла', icon: '📥', category: 'action' },
  { id: 'action-scan-qr', title: 'Сканировать QR', description: 'Быстрый доступ к аппарату', icon: '📷', category: 'action' },
]

// URL mappings for navigation
export const navigationUrls: Record<string, string> = {
  'nav-dashboard': '/dashboard',
  'nav-machines': '/dashboard/machines',
  'nav-tasks': '/dashboard/tasks',
  'nav-incidents': '/dashboard/incidents',
  'nav-complaints': '/dashboard/complaints',
  'nav-transactions': '/dashboard/transactions',
  'nav-inventory': '/dashboard/inventory',
  'nav-users': '/dashboard/users',
  'nav-locations': '/dashboard/locations',
  'nav-map': '/dashboard/map',
  'nav-reports': '/dashboard/reports',
  'nav-alerts': '/dashboard/alerts',
  'nav-notifications': '/dashboard/notifications',
  'nav-monitoring': '/dashboard/monitoring',
  'nav-audit': '/dashboard/audit',
  'nav-scheduled': '/dashboard/scheduled-tasks',
  'nav-profile': '/dashboard/profile',
  'nav-settings': '/dashboard/settings',
  'action-create-task': '/dashboard/tasks/create',
  'action-create-incident': '/dashboard/incidents/create',
  'action-add-machine': '/dashboard/machines/create',
  'action-add-user': '/dashboard/users/create',
  'action-add-location': '/dashboard/locations/create',
  'action-import': '/dashboard/import',
  'action-scan-qr': '/dashboard/scan',
}

// Search function that filters navigation and actions
export function searchCommands(query: string): (Omit<QuickAction, 'action'> & { url: string })[] {
  if (!query.trim()) {
    return [...navigationItems, ...quickActionItems]
      .slice(0, 10)
      .map((item) => ({ ...item, url: navigationUrls[item.id] || '#' }))
  }

  const normalizedQuery = query.toLowerCase().trim()
  const allItems = [...navigationItems, ...quickActionItems]

  return allItems
    .filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(normalizedQuery)
      const descMatch = item.description.toLowerCase().includes(normalizedQuery)
      return titleMatch || descMatch
    })
    .map((item) => ({ ...item, url: navigationUrls[item.id] || '#' }))
    .slice(0, 10)
}

// Mock search results (in real app, this would call the API)
export function searchEntities(query: string, _category: SearchCategory = SearchCategory.ALL): SearchResult[] {
  if (!query.trim() || query.length < 2) return []

  // This would normally be an API call
  // For now, return empty array - the actual search would be implemented on backend
  return []
}

// Keyboard shortcut definitions
export const keyboardShortcuts = {
  openCommandPalette: { key: 'k', modifier: 'meta' }, // Cmd+K or Ctrl+K
  openSearch: { key: '/', modifier: null },
  goToDashboard: { key: 'd', modifier: 'meta+shift' },
  goToTasks: { key: 't', modifier: 'meta+shift' },
  goToMachines: { key: 'm', modifier: 'meta+shift' },
  createTask: { key: 'n', modifier: 'meta' },
  escape: { key: 'Escape', modifier: null },
}

export function formatShortcut(shortcut: { key: string; modifier: string | null }): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  if (!shortcut.modifier) {
    return shortcut.key === 'Escape' ? 'Esc' : shortcut.key.toUpperCase()
  }

  const modifiers = shortcut.modifier.split('+')
  const modifierSymbols = modifiers.map((mod) => {
    switch (mod) {
      case 'meta':
        return isMac ? '⌘' : 'Ctrl'
      case 'shift':
        return isMac ? '⇧' : 'Shift'
      case 'alt':
        return isMac ? '⌥' : 'Alt'
      case 'ctrl':
        return 'Ctrl'
      default:
        return mod
    }
  })

  return [...modifierSymbols, shortcut.key.toUpperCase()].join(isMac ? '' : '+')
}
