// Breadcrumb Configuration and Utilities

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: string
}

// Route to breadcrumb mapping
export const routeBreadcrumbs: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [
    { label: 'Dashboard', icon: '🏠' },
  ],
  '/dashboard/machines': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Аппараты', icon: '🎰' },
  ],
  '/dashboard/machines/[id]': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Аппараты', href: '/dashboard/machines', icon: '🎰' },
    { label: 'Детали аппарата' },
  ],
  '/dashboard/tasks': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Задачи', icon: '📋' },
  ],
  '/dashboard/tasks/[id]': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Задачи', href: '/dashboard/tasks', icon: '📋' },
    { label: 'Детали задачи' },
  ],
  '/dashboard/tasks/create': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Задачи', href: '/dashboard/tasks', icon: '📋' },
    { label: 'Новая задача' },
  ],
  '/dashboard/incidents': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Инциденты', icon: '⚠️' },
  ],
  '/dashboard/incidents/[id]': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Инциденты', href: '/dashboard/incidents', icon: '⚠️' },
    { label: 'Детали инцидента' },
  ],
  '/dashboard/incidents/create': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Инциденты', href: '/dashboard/incidents', icon: '⚠️' },
    { label: 'Новый инцидент' },
  ],
  '/dashboard/users': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Пользователи', icon: '👥' },
  ],
  '/dashboard/users/[id]': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Пользователи', href: '/dashboard/users', icon: '👥' },
    { label: 'Профиль пользователя' },
  ],
  '/dashboard/inventory': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Инвентарь', icon: '📦' },
  ],
  '/dashboard/inventory/warehouse': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Инвентарь', href: '/dashboard/inventory', icon: '📦' },
    { label: 'Склад' },
  ],
  '/dashboard/inventory/operators': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Инвентарь', href: '/dashboard/inventory', icon: '📦' },
    { label: 'Операторы' },
  ],
  '/dashboard/transactions': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Транзакции', icon: '💰' },
  ],
  '/dashboard/transactions/collections': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Транзакции', href: '/dashboard/transactions', icon: '💰' },
    { label: 'Инкассации' },
  ],
  '/dashboard/transactions/reports': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Транзакции', href: '/dashboard/transactions', icon: '💰' },
    { label: 'Отчёты' },
  ],
  '/dashboard/notifications': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Уведомления', icon: '🔔' },
  ],
  '/dashboard/settings': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Настройки', icon: '⚙️' },
  ],
  '/dashboard/profile': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Профиль', icon: '👤' },
  ],
  '/dashboard/scheduled-tasks': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Расписание', icon: '⏱️' },
  ],
  '/dashboard/reports': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Отчёты', icon: '📊' },
  ],
  '/dashboard/analytics': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Аналитика', icon: '📈' },
  ],
  '/dashboard/locations': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Локации', icon: '📍' },
  ],
  '/dashboard/locations/[id]': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Локации', href: '/dashboard/locations', icon: '📍' },
    { label: 'Детали локации' },
  ],
  '/dashboard/nomenclature': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Номенклатура', icon: '🏷️' },
  ],
  '/dashboard/equipment': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Оборудование', icon: '🔧' },
  ],
  '/dashboard/equipment/[id]': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Оборудование', href: '/dashboard/equipment', icon: '🔧' },
    { label: 'Детали оборудования' },
  ],
  '/dashboard/complaints': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Жалобы', icon: '📝' },
  ],
  '/dashboard/complaints/[id]': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Жалобы', href: '/dashboard/complaints', icon: '📝' },
    { label: 'Детали жалобы' },
  ],
  '/dashboard/routes': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Маршруты', icon: '🗺️' },
  ],
  '/dashboard/audit-log': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Журнал аудита', icon: '📜' },
  ],
  '/dashboard/alert-rules': [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Правила оповещений', icon: '🚨' },
  ],
}

// Convert dynamic route to pattern (e.g., /dashboard/machines/123 -> /dashboard/machines/[id])
export function getRoutePattern(pathname: string): string {
  // Replace UUIDs or numeric IDs with [id]
  const pattern = pathname.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/[id]'
  ).replace(
    /\/\d+/g,
    '/[id]'
  )
  return pattern
}

// Get breadcrumbs for a given pathname
export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const pattern = getRoutePattern(pathname)

  // Check for exact match
  if (routeBreadcrumbs[pattern]) {
    return routeBreadcrumbs[pattern]
  }

  // Check for partial match (for nested routes)
  const segments = pattern.split('/').filter(Boolean)
  for (let i = segments.length; i > 0; i--) {
    const partialPath = '/' + segments.slice(0, i).join('/')
    if (routeBreadcrumbs[partialPath]) {
      return routeBreadcrumbs[partialPath]
    }
  }

  // Default to dashboard
  return routeBreadcrumbs['/dashboard'] || []
}

// Get page title from breadcrumbs
export function getPageTitle(pathname: string): string {
  const breadcrumbs = getBreadcrumbs(pathname)
  if (breadcrumbs.length === 0) return 'Dashboard'
  return breadcrumbs[breadcrumbs.length - 1].label
}
