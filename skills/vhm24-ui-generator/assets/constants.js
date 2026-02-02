// VendHub OS - Constants & Localization
// Uzbekistan-specific configuration

// Currency formatting
export const formatCurrency = (amount, short = false) => {
  if (short) {
    if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + ' млрд';
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + ' млн';
    if (amount >= 1000) return (amount / 1000).toFixed(0) + ' тыс';
  }
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' сум';
};

// Date formatting
export const formatDate = (date, format = 'short') => {
  const d = new Date(date);
  const options = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    full: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  };
  return d.toLocaleDateString('ru-RU', options[format]);
};

// Machine statuses
export const MACHINE_STATUS = {
  online: { label: 'Активен', color: 'emerald', icon: 'CheckCircle' },
  offline: { label: 'Офлайн', color: 'gray', icon: 'WifiOff' },
  warning: { label: 'Внимание', color: 'amber', icon: 'AlertTriangle' },
  error: { label: 'Ошибка', color: 'red', icon: 'XCircle' },
  maintenance: { label: 'Обслуживание', color: 'blue', icon: 'Wrench' }
};

// Task types
export const TASK_TYPES = {
  refill: { label: 'Загрузка', color: 'blue', icon: 'Package' },
  collection: { label: 'Инкассация', color: 'emerald', icon: 'Banknote' },
  maintenance: { label: 'ТО', color: 'amber', icon: 'Wrench' },
  repair: { label: 'Ремонт', color: 'red', icon: 'Tool' },
  cleaning: { label: 'Уборка', color: 'purple', icon: 'Sparkles' },
  inspection: { label: 'Проверка', color: 'gray', icon: 'Eye' }
};

// Task priorities
export const TASK_PRIORITY = {
  critical: { label: 'Критический', color: 'red', order: 1 },
  high: { label: 'Высокий', color: 'orange', order: 2 },
  medium: { label: 'Средний', color: 'amber', order: 3 },
  low: { label: 'Низкий', color: 'gray', order: 4 }
};

// User roles
export const USER_ROLES = {
  admin: { label: 'Администратор', color: 'purple', permissions: ['*'] },
  manager: { label: 'Менеджер', color: 'blue', permissions: ['machines', 'tasks', 'inventory', 'reports', 'team'] },
  technician: { label: 'Техник', color: 'emerald', permissions: ['machines:view', 'tasks', 'inventory:view'] },
  operator: { label: 'Оператор', color: 'amber', permissions: ['machines:view', 'tasks:assigned', 'inventory:own'] },
  collector: { label: 'Инкассатор', color: 'green', permissions: ['machines:view', 'tasks:collection'] },
  analyst: { label: 'Аналитик', color: 'cyan', permissions: ['reports', 'analytics'] },
  viewer: { label: 'Наблюдатель', color: 'gray', permissions: ['*:view'] }
};

// Payment methods (Uzbekistan)
export const PAYMENT_METHODS = {
  cash: { label: 'Наличные', icon: 'Banknote', color: 'emerald' },
  payme: { label: 'Payme', icon: 'CreditCard', color: 'cyan' },
  click: { label: 'Click', icon: 'Zap', color: 'green' },
  uzum: { label: 'Uzum Bank', icon: 'Building', color: 'purple' },
  humo: { label: 'HUMO', icon: 'CreditCard', color: 'sky' },
  uzcard: { label: 'UZCARD', icon: 'CreditCard', color: 'blue' },
  oson: { label: 'OSON', icon: 'Smartphone', color: 'rose' },
  apelsin: { label: 'Apelsin', icon: 'Smartphone', color: 'orange' }
};

// Transaction types
export const TRANSACTION_TYPES = {
  sale: { label: 'Продажа', color: 'emerald', direction: 'in' },
  refund: { label: 'Возврат', color: 'red', direction: 'out' },
  collection: { label: 'Инкассация', color: 'blue', direction: 'internal' },
  purchase: { label: 'Закупка', color: 'amber', direction: 'out' },
  salary: { label: 'Зарплата', color: 'purple', direction: 'out' },
  rent: { label: 'Аренда', color: 'gray', direction: 'out' },
  maintenance: { label: 'Обслуживание', color: 'orange', direction: 'out' }
};

// Invoice statuses
export const INVOICE_STATUS = {
  draft: { label: 'Черновик', color: 'gray' },
  sent: { label: 'Отправлен', color: 'blue' },
  pending: { label: 'Ожидает', color: 'amber' },
  partial: { label: 'Частично', color: 'purple' },
  paid: { label: 'Оплачен', color: 'emerald' },
  overdue: { label: 'Просрочен', color: 'red' },
  cancelled: { label: 'Отменён', color: 'gray' }
};

// Product categories
export const PRODUCT_CATEGORIES = {
  coffee: { label: 'Кофе', icon: 'Coffee', color: 'amber' },
  tea: { label: 'Чай', icon: 'Leaf', color: 'green' },
  chocolate: { label: 'Какао', icon: 'Cookie', color: 'amber' },
  cold_drinks: { label: 'Холодные напитки', icon: 'Droplet', color: 'blue' },
  snacks: { label: 'Снеки', icon: 'Cookie', color: 'orange' },
  water: { label: 'Вода', icon: 'Droplets', color: 'cyan' }
};

// Bunker types
export const BUNKER_TYPES = {
  coffee: { label: 'Кофе', unit: 'г', icon: 'Coffee' },
  milk: { label: 'Молоко', unit: 'мл', icon: 'Droplet' },
  water: { label: 'Вода', unit: 'мл', icon: 'Droplets' },
  sugar: { label: 'Сахар', unit: 'г', icon: 'Candy' },
  chocolate: { label: 'Шоколад', unit: 'г', icon: 'Cookie' },
  cups: { label: 'Стаканы', unit: 'шт', icon: 'Cup' },
  lids: { label: 'Крышки', unit: 'шт', icon: 'Circle' },
  stirrers: { label: 'Размешиватели', unit: 'шт', icon: 'Minus' }
};

// Loyalty tiers
export const LOYALTY_TIERS = {
  bronze: { label: 'Бронза', minPoints: 0, multiplier: 1, color: 'amber' },
  silver: { label: 'Серебро', minPoints: 1000, multiplier: 1.5, color: 'gray' },
  gold: { label: 'Золото', minPoints: 5000, multiplier: 2, color: 'yellow' },
  platinum: { label: 'Платина', minPoints: 15000, multiplier: 3, color: 'purple' }
};

// Notification types
export const NOTIFICATION_TYPES = {
  alert: { label: 'Алерт', color: 'red', icon: 'AlertCircle' },
  warning: { label: 'Предупреждение', color: 'amber', icon: 'AlertTriangle' },
  success: { label: 'Успех', color: 'emerald', icon: 'CheckCircle' },
  info: { label: 'Информация', color: 'blue', icon: 'Info' },
  task: { label: 'Задача', color: 'purple', icon: 'ClipboardList' },
  system: { label: 'Система', color: 'gray', icon: 'Settings' }
};

// Report types
export const REPORT_TYPES = {
  sales: { label: 'Продажи', icon: 'TrendingUp' },
  inventory: { label: 'Склад', icon: 'Package' },
  collections: { label: 'Инкассации', icon: 'Banknote' },
  machines: { label: 'Автоматы', icon: 'Coffee' },
  staff: { label: 'Персонал', icon: 'Users' },
  financial: { label: 'Финансовый', icon: 'DollarSign' }
};

// Tashkent districts
export const TASHKENT_DISTRICTS = [
  { id: 'almazar', name: 'Алмазарский район' },
  { id: 'bektemir', name: 'Бектемирский район' },
  { id: 'chilanzar', name: 'Чиланзарский район' },
  { id: 'mirabad', name: 'Мирабадский район' },
  { id: 'mirzo_ulugbek', name: 'Мирзо-Улугбекский район' },
  { id: 'sergeli', name: 'Сергелийский район' },
  { id: 'shaykhontohur', name: 'Шайхонтохурский район' },
  { id: 'uchtepa', name: 'Учтепинский район' },
  { id: 'yakkasaray', name: 'Яккасарайский район' },
  { id: 'yashnabad', name: 'Яшнабадский район' },
  { id: 'yunusabad', name: 'Юнусабадский район' }
];

// Popular locations in Tashkent
export const POPULAR_LOCATIONS = [
  { name: 'ТЦ Самарканд Дарвоза', district: 'mirabad', type: 'mall' },
  { name: 'БЦ Пойтахт', district: 'yunusabad', type: 'business' },
  { name: 'Университет ИНХА', district: 'sergeli', type: 'education' },
  { name: 'IT Park Tashkent', district: 'mirzo_ulugbek', type: 'business' },
  { name: 'Аэропорт Ташкент', district: 'sergeli', type: 'transport' },
  { name: 'ТЦ Мега Планет', district: 'chilanzar', type: 'mall' },
  { name: 'Метро Чиланзар', district: 'chilanzar', type: 'transport' },
  { name: 'Национальный университет', district: 'almazar', type: 'education' }
];

// API endpoints template
export const API_ENDPOINTS = {
  machines: '/api/v1/machines',
  products: '/api/v1/products',
  inventory: '/api/v1/inventory',
  tasks: '/api/v1/tasks',
  users: '/api/v1/users',
  reports: '/api/v1/reports',
  transactions: '/api/v1/transactions',
  invoices: '/api/v1/invoices',
  integrations: '/api/v1/integrations',
  webhooks: '/api/v1/webhooks'
};

export default {
  formatCurrency,
  formatDate,
  MACHINE_STATUS,
  TASK_TYPES,
  TASK_PRIORITY,
  USER_ROLES,
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
  INVOICE_STATUS,
  PRODUCT_CATEGORIES,
  BUNKER_TYPES,
  LOYALTY_TIERS,
  NOTIFICATION_TYPES,
  REPORT_TYPES,
  TASHKENT_DISTRICTS,
  POPULAR_LOCATIONS,
  API_ENDPOINTS
};
