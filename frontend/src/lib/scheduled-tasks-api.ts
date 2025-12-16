// Scheduled Tasks API
// This file defines all scheduled tasks from the backend ScheduledTasksService

export enum TaskCategory {
  TASKS = 'tasks',
  INVENTORY = 'inventory',
  MACHINES = 'machines',
  NOTIFICATIONS = 'notifications',
  FINANCE = 'finance',
  MONITORING = 'monitoring',
  ALERTS = 'alerts',
  COMPLAINTS = 'complaints',
}

export enum TaskFrequency {
  EVERY_5_MINUTES = 'every_5_minutes',
  EVERY_10_MINUTES = 'every_10_minutes',
  EVERY_30_MINUTES = 'every_30_minutes',
  EVERY_HOUR = 'every_hour',
  EVERY_4_HOURS = 'every_4_hours',
  EVERY_6_HOURS = 'every_6_hours',
  DAILY = 'daily',
  MONTHLY = 'monthly',
}

export const frequencyLabels: Record<TaskFrequency, string> = {
  [TaskFrequency.EVERY_5_MINUTES]: 'Каждые 5 минут',
  [TaskFrequency.EVERY_10_MINUTES]: 'Каждые 10 минут',
  [TaskFrequency.EVERY_30_MINUTES]: 'Каждые 30 минут',
  [TaskFrequency.EVERY_HOUR]: 'Каждый час',
  [TaskFrequency.EVERY_4_HOURS]: 'Каждые 4 часа',
  [TaskFrequency.EVERY_6_HOURS]: 'Каждые 6 часов',
  [TaskFrequency.DAILY]: 'Ежедневно',
  [TaskFrequency.MONTHLY]: 'Ежемесячно',
}

export const categoryLabels: Record<TaskCategory, string> = {
  [TaskCategory.TASKS]: 'Задачи',
  [TaskCategory.INVENTORY]: 'Запасы',
  [TaskCategory.MACHINES]: 'Аппараты',
  [TaskCategory.NOTIFICATIONS]: 'Уведомления',
  [TaskCategory.FINANCE]: 'Финансы',
  [TaskCategory.MONITORING]: 'Мониторинг',
  [TaskCategory.ALERTS]: 'Оповещения',
  [TaskCategory.COMPLAINTS]: 'Жалобы',
}

export interface ScheduledTask {
  id: string
  name: string
  description: string
  category: TaskCategory
  frequency: TaskFrequency
  cronExpression: string
  scheduledTime?: string // For daily/monthly tasks with specific time
  isActive: boolean
  lastRun?: string
  nextRun?: string
  avgDuration?: number // in milliseconds
  successRate?: number // percentage
}

// All scheduled tasks from backend/src/scheduled-tasks/scheduled-tasks.service.ts
export const scheduledTasks: ScheduledTask[] = [
  // Tasks category
  {
    id: 'check-overdue-tasks',
    name: 'Проверка просроченных задач',
    description: 'Проверяет задачи с истёкшим сроком выполнения и отправляет уведомления',
    category: TaskCategory.TASKS,
    frequency: TaskFrequency.EVERY_HOUR,
    cronExpression: '0 * * * *',
    isActive: true,
  },

  // Inventory category
  {
    id: 'check-low-stock-machines',
    name: 'Проверка остатков в аппаратах',
    description: 'Проверяет низкий уровень запасов в автоматах и создаёт уведомления',
    category: TaskCategory.INVENTORY,
    frequency: TaskFrequency.EVERY_6_HOURS,
    cronExpression: '0 */6 * * *',
    isActive: true,
  },
  {
    id: 'check-low-stock-warehouse',
    name: 'Проверка складских остатков',
    description: 'Проверяет низкий уровень запасов на складах',
    category: TaskCategory.INVENTORY,
    frequency: TaskFrequency.EVERY_6_HOURS,
    cronExpression: '0 */6 * * *',
    isActive: true,
  },
  {
    id: 'check-expiring-stock',
    name: 'Проверка истекающих сроков годности',
    description: 'Проверяет товары с истекающим сроком годности',
    category: TaskCategory.INVENTORY,
    frequency: TaskFrequency.DAILY,
    cronExpression: '0 9 * * *',
    scheduledTime: '09:00',
    isActive: true,
  },
  {
    id: 'write-off-expired-stock',
    name: 'Списание просроченных товаров',
    description: 'Автоматически списывает товары с истёкшим сроком годности',
    category: TaskCategory.INVENTORY,
    frequency: TaskFrequency.DAILY,
    cronExpression: '0 3 * * *',
    scheduledTime: '03:00',
    isActive: true,
  },
  {
    id: 'monitor-inventory-thresholds',
    name: 'Мониторинг порогов запасов',
    description: 'Проверяет пороговые значения инвентаря и создаёт предупреждения',
    category: TaskCategory.INVENTORY,
    frequency: TaskFrequency.EVERY_4_HOURS,
    cronExpression: '0 */4 * * *',
    isActive: true,
  },
  {
    id: 'pre-calculate-inventory-balances',
    name: 'Пересчёт балансов инвентаря',
    description: 'Предварительный расчёт балансов инвентаря для ускорения отчётов',
    category: TaskCategory.INVENTORY,
    frequency: TaskFrequency.DAILY,
    cronExpression: '30 2 * * *',
    scheduledTime: '02:30',
    isActive: true,
  },

  // Machines category
  {
    id: 'monitor-machine-connectivity',
    name: 'Мониторинг связи с аппаратами',
    description: 'Проверяет статус подключения всех автоматов',
    category: TaskCategory.MACHINES,
    frequency: TaskFrequency.EVERY_5_MINUTES,
    cronExpression: '*/5 * * * *',
    isActive: true,
  },
  {
    id: 'create-offline-incidents',
    name: 'Создание инцидентов для офлайн-аппаратов',
    description: 'Создаёт инциденты для автоматов, которые были офлайн долгое время',
    category: TaskCategory.MACHINES,
    frequency: TaskFrequency.EVERY_30_MINUTES,
    cronExpression: '*/30 * * * *',
    isActive: true,
  },
  {
    id: 'expire-old-reservations',
    name: 'Снятие просроченных резерваций',
    description: 'Снимает резервации товаров, которые не были использованы',
    category: TaskCategory.MACHINES,
    frequency: TaskFrequency.EVERY_HOUR,
    cronExpression: '0 * * * *',
    isActive: true,
  },

  // Notifications category
  {
    id: 'retry-failed-notifications',
    name: 'Повторная отправка уведомлений',
    description: 'Повторно отправляет уведомления, которые не были доставлены',
    category: TaskCategory.NOTIFICATIONS,
    frequency: TaskFrequency.EVERY_5_MINUTES,
    cronExpression: '*/5 * * * *',
    isActive: true,
  },
  {
    id: 'cleanup-old-notifications',
    name: 'Очистка старых уведомлений',
    description: 'Удаляет прочитанные уведомления старше 30 дней',
    category: TaskCategory.NOTIFICATIONS,
    frequency: TaskFrequency.MONTHLY,
    cronExpression: '0 0 1 * *',
    scheduledTime: '00:00 (1-е число)',
    isActive: true,
  },

  // Finance category
  {
    id: 'calculate-monthly-depreciation',
    name: 'Расчёт ежемесячной амортизации',
    description: 'Рассчитывает амортизацию оборудования за прошедший месяц',
    category: TaskCategory.FINANCE,
    frequency: TaskFrequency.MONTHLY,
    cronExpression: '0 2 1 * *',
    scheduledTime: '02:00 (1-е число)',
    isActive: true,
  },
  {
    id: 'calculate-monthly-commissions',
    name: 'Расчёт комиссий за месяц',
    description: 'Рассчитывает комиссионные вознаграждения операторов',
    category: TaskCategory.FINANCE,
    frequency: TaskFrequency.MONTHLY,
    cronExpression: '0 4 2 * *',
    scheduledTime: '04:00 (2-е число)',
    isActive: true,
  },
  {
    id: 'check-overdue-commissions',
    name: 'Проверка просроченных выплат',
    description: 'Проверяет просроченные выплаты комиссий и создаёт напоминания',
    category: TaskCategory.FINANCE,
    frequency: TaskFrequency.DAILY,
    cronExpression: '0 10 * * *',
    scheduledTime: '10:00',
    isActive: true,
  },

  // Monitoring category
  {
    id: 'calculate-operator-ratings',
    name: 'Расчёт рейтингов операторов',
    description: 'Пересчитывает рейтинги операторов на основе KPI',
    category: TaskCategory.MONITORING,
    frequency: TaskFrequency.DAILY,
    cronExpression: '0 1 * * *',
    scheduledTime: '01:00',
    isActive: true,
  },

  // Alerts category
  {
    id: 'process-alert-escalations',
    name: 'Обработка эскалаций',
    description: 'Проверяет и эскалирует неподтверждённые критические оповещения',
    category: TaskCategory.ALERTS,
    frequency: TaskFrequency.EVERY_10_MINUTES,
    cronExpression: '*/10 * * * *',
    isActive: true,
  },
  {
    id: 'evaluate-alert-rules',
    name: 'Оценка правил оповещений',
    description: 'Выполняет проверку правил оповещений и создаёт алерты',
    category: TaskCategory.ALERTS,
    frequency: TaskFrequency.EVERY_HOUR,
    cronExpression: '0 * * * *',
    isActive: true,
  },

  // Complaints category
  {
    id: 'check-complaint-sla',
    name: 'Проверка SLA жалоб',
    description: 'Проверяет соблюдение SLA по обработке жалоб',
    category: TaskCategory.COMPLAINTS,
    frequency: TaskFrequency.EVERY_HOUR,
    cronExpression: '0 * * * *',
    isActive: true,
  },
]

// Helper functions
export function getTasksByCategory(category: TaskCategory): ScheduledTask[] {
  return scheduledTasks.filter((task) => task.category === category)
}

export function getTasksByFrequency(frequency: TaskFrequency): ScheduledTask[] {
  return scheduledTasks.filter((task) => task.frequency === frequency)
}

export function getCategoryColor(category: TaskCategory): string {
  switch (category) {
    case TaskCategory.TASKS:
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case TaskCategory.INVENTORY:
      return 'text-green-600 bg-green-50 border-green-200'
    case TaskCategory.MACHINES:
      return 'text-purple-600 bg-purple-50 border-purple-200'
    case TaskCategory.NOTIFICATIONS:
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case TaskCategory.FINANCE:
      return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    case TaskCategory.MONITORING:
      return 'text-cyan-600 bg-cyan-50 border-cyan-200'
    case TaskCategory.ALERTS:
      return 'text-red-600 bg-red-50 border-red-200'
    case TaskCategory.COMPLAINTS:
      return 'text-orange-600 bg-orange-50 border-orange-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function getFrequencyColor(frequency: TaskFrequency): string {
  switch (frequency) {
    case TaskFrequency.EVERY_5_MINUTES:
    case TaskFrequency.EVERY_10_MINUTES:
      return 'text-red-600 bg-red-50'
    case TaskFrequency.EVERY_30_MINUTES:
    case TaskFrequency.EVERY_HOUR:
      return 'text-orange-600 bg-orange-50'
    case TaskFrequency.EVERY_4_HOURS:
    case TaskFrequency.EVERY_6_HOURS:
      return 'text-yellow-600 bg-yellow-50'
    case TaskFrequency.DAILY:
      return 'text-blue-600 bg-blue-50'
    case TaskFrequency.MONTHLY:
      return 'text-purple-600 bg-purple-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

// Get stats about scheduled tasks
export function getScheduledTasksStats() {
  const byCategory: Record<TaskCategory, number> = {} as Record<TaskCategory, number>
  const byFrequency: Record<TaskFrequency, number> = {} as Record<TaskFrequency, number>

  for (const task of scheduledTasks) {
    byCategory[task.category] = (byCategory[task.category] || 0) + 1
    byFrequency[task.frequency] = (byFrequency[task.frequency] || 0) + 1
  }

  return {
    total: scheduledTasks.length,
    active: scheduledTasks.filter((t) => t.isActive).length,
    byCategory,
    byFrequency,
  }
}
