# 🎯 VHM24 UI/UX OPTIMIZATION - FINAL PLAN

**Оптимизированный план на основе реальной структуры проекта**

**Дата:** 23 декабря 2025  
**Версия:** 2.0 (Optimized)  
**Аудит:** UI/UX 75/100 → Target 90/100

---

## 📊 АНАЛИЗ ТЕКУЩЕГО СОСТОЯНИЯ

### Структура проекта
```
frontend/src/
├── app/
│   ├── (auth)/login/         # ✅ Есть 2FA
│   └── dashboard/            # 20+ страниц
├── components/
│   ├── ui/                   # 30+ компонентов
│   ├── layout/               # Sidebar, Header, Breadcrumbs
│   ├── charts/               # Графики
│   └── ...                   # 22 папки компонентов
├── hooks/                    # 8 хуков
├── lib/                      # 50+ API файлов
└── types/                    # 14 файлов типов
```

### 🔴 Найденные критические проблемы

| Проблема | Файл | Описание |
|----------|------|----------|
| **Role Mismatch** | `types/users.ts` vs `backend/.../user.entity.ts` | Frontend: 5 ролей (lowercase), Backend: 7 ролей (PascalCase) |
| **Currency** | `lib/utils.ts:26-31` | Использует RUB вместо UZS |
| **Sidebar** | `components/layout/Sidebar.tsx` | 25 пунктов без группировки |
| **Light Theme Only** | Весь проект | Нет dark mode поддержки |

---

## 🔧 ПЛАН ОПТИМИЗАЦИИ

### Sprint 0: BLOCKERS (День 1, 3 часа)

#### TASK B.1: Fix Role Mismatch

**Файлы для изменения:**
- `frontend/src/types/users.ts`
- Все компоненты с role checks

```typescript
// frontend/src/types/users.ts - REPLACE ENTIRE FILE

export enum UserRole {
  OWNER = 'Owner',
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  OPERATOR = 'Operator',
  COLLECTOR = 'Collector',
  TECHNICIAN = 'Technician',
  VIEWER = 'Viewer',
}

// Role display configuration
export const ROLE_CONFIG: Record<UserRole, {
  label: string;
  labelRu: string;
  color: string;
  bgClass: string;
  textClass: string;
}> = {
  [UserRole.OWNER]: {
    label: 'Owner',
    labelRu: 'Владелец',
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-800'
  },
  [UserRole.ADMIN]: {
    label: 'Admin',
    labelRu: 'Администратор',
    color: 'red',
    bgClass: 'bg-red-100',
    textClass: 'text-red-800'
  },
  [UserRole.MANAGER]: {
    label: 'Manager',
    labelRu: 'Менеджер',
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800'
  },
  [UserRole.OPERATOR]: {
    label: 'Operator',
    labelRu: 'Оператор',
    color: 'green',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800'
  },
  [UserRole.COLLECTOR]: {
    label: 'Collector',
    labelRu: 'Инкассатор',
    color: 'yellow',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800'
  },
  [UserRole.TECHNICIAN]: {
    label: 'Technician',
    labelRu: 'Техник',
    color: 'orange',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800'
  },
  [UserRole.VIEWER]: {
    label: 'Viewer',
    labelRu: 'Наблюдатель',
    color: 'gray',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-800'
  }
};

// Helper function
export function getRoleConfig(role: UserRole) {
  return ROLE_CONFIG[role] || ROLE_CONFIG[UserRole.VIEWER];
}

export interface User {
  id: string;
  email: string;
  username?: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  status?: 'pending' | 'active' | 'password_change_required' | 'inactive' | 'suspended' | 'rejected';
  is_2fa_enabled?: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  stats?: {
    total_tasks?: number;
    completed_tasks?: number;
    pending_tasks?: number;
    active_tasks?: number;
    resolved_incidents?: number;
  };
}

export interface CreateUserDto {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  username?: string;
}

export interface UpdateUserDto {
  email?: string;
  full_name?: string;
  role?: UserRole;
  phone?: string;
  is_active?: boolean;
}
```

**Prompt для Claude Code:**
```
Fix role mismatch in VHM24:

1. Replace frontend/src/types/users.ts with the new version above

2. Search and update all role references:
   grep -r "UserRole\." frontend/src --include="*.tsx" --include="*.ts"
   
   Replace patterns:
   - UserRole.ADMIN → UserRole.ADMIN (no change, already correct case)
   - 'admin' → UserRole.ADMIN
   - 'Admin' → UserRole.ADMIN
   
3. Update role badge displays to use getRoleConfig()

4. Remove ACCOUNTANT role references (doesn't exist in backend)

5. Add missing roles: OWNER, COLLECTOR, TECHNICIAN
```

---

#### TASK B.2: Fix Currency (RUB → UZS)

**Файл:** `frontend/src/lib/utils.ts`

```typescript
// REPLACE formatCurrency function (lines 26-31)

export const CURRENCY = {
  code: 'UZS',
  symbol: 'сўм',
  symbolShort: 'сум',
  locale: 'uz-UZ',
} as const;

export function formatCurrency(
  amount: number | null | undefined,
  options?: {
    showSymbol?: boolean;
    compact?: boolean;
    decimals?: number;
  }
): string {
  if (amount === null || amount === undefined) return '—';
  
  const { showSymbol = true, compact = false, decimals = 0 } = options || {};
  
  let formatted: string;
  
  if (compact) {
    if (Math.abs(amount) >= 1_000_000_000) {
      formatted = (amount / 1_000_000_000).toFixed(1) + ' млрд';
    } else if (Math.abs(amount) >= 1_000_000) {
      formatted = (amount / 1_000_000).toFixed(1) + ' млн';
    } else if (Math.abs(amount) >= 1_000) {
      formatted = (amount / 1_000).toFixed(1) + ' тыс';
    } else {
      formatted = amount.toFixed(decimals);
    }
  } else {
    formatted = new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  }
  
  return showSymbol ? `${formatted} ${CURRENCY.symbolShort}` : formatted;
}

// Backward compatibility
export function formatMoney(amount: number): string {
  return formatCurrency(amount);
}
```

**Prompt для Claude Code:**
```
Fix currency in VHM24 from RUB to UZS:

1. Update frontend/src/lib/utils.ts - replace formatCurrency function

2. Search for hardcoded currency symbols:
   grep -rn "₽\|RUB\|руб\." frontend/src --include="*.tsx" --include="*.ts"
   
3. Replace all occurrences:
   - '₽' → 'сум'
   - 'RUB' → 'UZS'  
   - 'руб.' → 'сум'
   - '.toLocaleString()...₽' → formatCurrency(amount)

4. Update chart tooltips and axis labels to use formatCurrency

5. Test: npm run build - ensure no TypeScript errors
```

---

### Sprint 1: P0 Features (Неделя 1, 11 часов)

#### TASK 1.1: Collapsible Sidebar (3ч)

**Файл:** `frontend/src/components/layout/Sidebar.tsx` - ПОЛНАЯ ЗАМЕНА

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  AlertTriangle,
  MessageSquare,
  DollarSign,
  Users,
  MapPin,
  Map,
  Settings,
  Shield,
  Bell,
  BellRing,
  BarChart3,
  Wrench,
  Send,
  Building2,
  FileText,
  Receipt,
  FileUp,
  Activity,
  ScrollText,
  Timer,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Coffee,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActiveAlertsCount } from '@/hooks/useActiveAlertsCount'

// Grouped navigation structure
const NAVIGATION_GROUPS = [
  {
    id: 'overview',
    label: 'Обзор',
    icon: LayoutDashboard,
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    id: 'machines',
    label: 'Автоматы',
    icon: Package,
    items: [
      { name: 'Аппараты', href: '/dashboard/machines', icon: Package },
      { name: 'Доступ', href: '/dashboard/machines/access', icon: KeyRound },
      { name: 'Карта', href: '/dashboard/map', icon: Map },
      { name: 'Мониторинг', href: '/dashboard/monitoring', icon: Activity },
    ]
  },
  {
    id: 'operations',
    label: 'Операции',
    icon: ClipboardList,
    items: [
      { name: 'Задачи', href: '/dashboard/tasks', icon: ClipboardList },
      { name: 'Расписание', href: '/dashboard/scheduled-tasks', icon: Timer },
      { name: 'Инциденты', href: '/dashboard/incidents', icon: AlertTriangle },
      { name: 'Жалобы', href: '/dashboard/complaints', icon: MessageSquare },
    ]
  },
  {
    id: 'inventory',
    label: 'Склад',
    icon: Wrench,
    items: [
      { name: 'Инвентарь', href: '/dashboard/inventory', icon: Package },
      { name: 'Оборудование', href: '/dashboard/equipment', icon: Wrench },
      { name: 'Импорт', href: '/dashboard/import', icon: FileUp },
    ]
  },
  {
    id: 'finance',
    label: 'Финансы',
    icon: DollarSign,
    items: [
      { name: 'Транзакции', href: '/dashboard/transactions', icon: DollarSign },
      { name: 'Комиссии', href: '/dashboard/commissions', icon: Receipt },
      { name: 'Договоры', href: '/dashboard/contracts', icon: FileText },
      { name: 'Контрагенты', href: '/dashboard/counterparties', icon: Building2 },
      { name: 'Отчеты', href: '/dashboard/reports', icon: BarChart3 },
    ]
  },
  {
    id: 'notifications',
    label: 'Уведомления',
    icon: Bell,
    items: [
      { name: 'Уведомления', href: '/dashboard/notifications', icon: Bell },
      { name: 'Оповещения', href: '/dashboard/alerts', icon: BellRing, showBadge: true },
    ]
  },
  {
    id: 'admin',
    label: 'Администрирование',
    icon: Settings,
    items: [
      { name: 'Пользователи', href: '/dashboard/users', icon: Users },
      { name: 'Локации', href: '/dashboard/locations', icon: MapPin },
      { name: 'Telegram', href: '/dashboard/telegram', icon: Send },
      { name: 'Аудит', href: '/dashboard/audit', icon: ScrollText },
      { name: 'Безопасность', href: '/dashboard/security', icon: Shield },
      { name: 'Настройки', href: '/dashboard/settings', icon: Settings },
    ]
  },
]

function AlertsBadge() {
  const { count } = useActiveAlertsCount()
  if (count === 0) return null
  return (
    <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
      {count > 99 ? '99+' : count}
    </span>
  )
}

// Custom hook for localStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) setStoredValue(JSON.parse(item))
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
    }
  }, [key])

  const setValue = (value: T) => {
    try {
      setStoredValue(value)
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}

export function Sidebar() {
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useLocalStorage<string[]>(
    'vhm24-sidebar-expanded',
    ['overview', 'machines', 'operations']
  )

  // Auto-expand group containing current path
  useEffect(() => {
    const currentGroup = NAVIGATION_GROUPS.find(group =>
      group.items.some(item => 
        pathname === item.href || pathname?.startsWith(item.href + '/')
      )
    )
    if (currentGroup && !expandedGroups.includes(currentGroup.id)) {
      setExpandedGroups([...expandedGroups, currentGroup.id])
    }
  }, [pathname])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(
      expandedGroups.includes(groupId)
        ? expandedGroups.filter(id => id !== groupId)
        : [...expandedGroups, groupId]
    )
  }

  const isActiveItem = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  const isActiveGroup = (group: typeof NAVIGATION_GROUPS[0]) => {
    return group.items.some(item => isActiveItem(item.href))
  }

  return (
    <aside 
      className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200 h-screen"
      role="navigation" 
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center space-x-3" aria-label="VendHub Home">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900">VendHub</span>
            <span className="block text-xs text-gray-500">Manager</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Primary">
        <div className="space-y-1">
          {NAVIGATION_GROUPS.map((group) => {
            const isExpanded = expandedGroups.includes(group.id)
            const isActive = isActiveGroup(group)
            const GroupIcon = group.icon

            return (
              <div key={group.id} className="mb-1">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3">
                    <GroupIcon className="w-5 h-5" aria-hidden="true" />
                    <span>{group.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {/* Group Items */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200 ease-in-out',
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <ul className="mt-1 ml-4 space-y-0.5 border-l-2 border-gray-100 pl-3">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon
                      const isItemActive = isActiveItem(item.href)

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              'flex items-center px-3 py-2 text-sm rounded-md transition-colors',
                              isItemActive
                                ? 'bg-indigo-100 text-indigo-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                            aria-current={isItemActive ? 'page' : undefined}
                          >
                            <ItemIcon className="mr-3 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                            <span className="flex-1">{item.name}</span>
                            {item.showBadge && <AlertsBadge />}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="text-xs text-gray-400 text-center">
          VendHub v2.0
        </div>
      </div>
    </aside>
  )
}
```

---

#### TASK 1.2: Excel Export Component (2ч)

**Новый файл:** `frontend/src/components/ui/ExportButton.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: keyof T
  header: string
  format?: (value: any, row: T) => string
}

interface ExportButtonProps<T> {
  data: T[]
  columns: Column<T>[]
  filename: string
  className?: string
  disabled?: boolean
}

export function ExportButton<T extends Record<string, any>>({
  data,
  columns,
  filename,
  className,
  disabled = false
}: ExportButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const exportToCSV = async () => {
    setIsExporting(true)
    setIsOpen(false)

    try {
      // Headers
      const headers = columns.map(col => col.header).join(',')

      // Rows
      const rows = data.map(row =>
        columns.map(col => {
          const value = col.format 
            ? col.format(row[col.key], row) 
            : row[col.key]
          const escaped = String(value ?? '').replace(/"/g, '""')
          return escaped.includes(',') || escaped.includes('\n') 
            ? `"${escaped}"` 
            : escaped
        }).join(',')
      ).join('\n')

      const csv = `\uFEFF${headers}\n${rows}` // BOM for Excel UTF-8
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      
      // Download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToExcel = async () => {
    setIsExporting(true)
    setIsOpen(false)

    try {
      // Dynamic import xlsx
      const XLSX = await import('xlsx')
      
      // Prepare data
      const exportData = data.map(row => {
        const exportRow: Record<string, any> = {}
        columns.forEach(col => {
          exportRow[col.header] = col.format 
            ? col.format(row[col.key], row) 
            : row[col.key]
        })
        return exportRow
      })

      // Create workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)

      // Auto-size columns
      const colWidths = columns.map(col => ({
        wch: Math.max(
          col.header.length,
          ...exportData.map(row => String(row[col.header] || '').length)
        ) + 2
      }))
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, 'Data')

      // Download
      XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting || data.length === 0}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
          'bg-white border-gray-300 text-gray-700',
          'hover:bg-gray-50 hover:border-gray-400',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>Экспорт</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
            <button
              onClick={exportToExcel}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium">Excel (.xlsx)</div>
                <div className="text-xs text-gray-500">{data.length} записей</div>
              </div>
            </button>
            <button
              onClick={exportToCSV}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition border-t border-gray-100"
            >
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium">CSV (.csv)</div>
                <div className="text-xs text-gray-500">{data.length} записей</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

**Установка зависимости:**
```bash
cd frontend && npm install xlsx
```

---

#### TASK 1.3: Inline Create Select (3ч)

**Новый файл:** `frontend/src/components/ui/InlineCreateSelect.tsx`

```tsx
'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { Check, ChevronDown, Plus, X, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
  description?: string
}

interface InlineCreateSelectProps<T extends Option> {
  value: string | null
  onChange: (value: string) => void
  options: T[]
  
  label?: string
  placeholder?: string
  searchPlaceholder?: string
  createLabel?: string
  createTitle: string
  createFields: ReactNode
  onCreateSubmit: (formData: FormData) => Promise<T>
  
  canCreate?: boolean
  isLoading?: boolean
  error?: string
  className?: string
}

export function InlineCreateSelect<T extends Option>({
  value,
  onChange,
  options,
  label,
  placeholder = 'Выберите...',
  searchPlaceholder = 'Поиск...',
  createLabel = 'Добавить',
  createTitle,
  createFields,
  onCreateSubmit,
  canCreate = true,
  isLoading = false,
  error,
  className
}: InlineCreateSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 10)
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setCreateError(null)

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const newOption = await onCreateSubmit(formData)
      
      onChange(newOption.value)
      setIsCreateOpen(false)
      setIsOpen(false)
      setSearchQuery('')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Ошибка создания')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 text-left',
          'bg-white border rounded-lg transition-all',
          error 
            ? 'border-red-300 focus:ring-red-500' 
            : 'border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className={cn('text-sm', selectedOption ? 'text-gray-900' : 'text-gray-500')}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Загрузка...
            </span>
          ) : selectedOption ? (
            <span>
              {selectedOption.label}
              {selectedOption.description && (
                <span className="text-gray-500 ml-1">— {selectedOption.description}</span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {searchQuery ? 'Ничего не найдено' : 'Нет вариантов'}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-gray-50',
                    value === option.value && 'bg-indigo-50'
                  )}
                >
                  <div>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-gray-500">{option.description}</div>
                    )}
                  </div>
                  {value === option.value && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
              ))
            )}
          </div>

          {/* Create Button */}
          {canCreate && (
            <div className="p-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition"
              >
                <Plus className="w-4 h-4" />
                {createLabel}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isCreating && setIsCreateOpen(false)} />
          
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{createTitle}</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="p-4 space-y-4">
                {createFields}
                
                {createError && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                    {createError}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Создание...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Создать
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

#### TASK 1.4: Product Tour (3ч)

**Новый файл:** `frontend/src/components/onboarding/ProductTour.tsx`

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, Check, Coffee } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TourStep {
  target: string
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    title: '👋 Добро пожаловать в VendHub!',
    content: 'Это боковое меню. Здесь находятся все разделы системы, сгруппированные по категориям.',
    position: 'right'
  },
  {
    target: '[data-tour="machines"]',
    title: '☕ Управление автоматами',
    content: 'Список всех ваших кофейных машин. Статусы, остатки, выручка — всё в одном месте.',
    position: 'right'
  },
  {
    target: '[data-tour="tasks"]',
    title: '📋 Система задач',
    content: 'Создавайте задачи для операторов: пополнение, инкассация, обслуживание.',
    position: 'right'
  },
  {
    target: '[data-tour="reports"]',
    title: '📊 Отчёты и аналитика',
    content: 'Детальные отчёты по продажам, популярным товарам, эффективности локаций.',
    position: 'right'
  },
  {
    target: '[data-tour="header-search"]',
    title: '🔍 Быстрый поиск',
    content: 'Используйте Ctrl+K для быстрого поиска по всей системе.',
    position: 'bottom'
  }
]

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) setStoredValue(JSON.parse(item))
    } catch (e) {}
  }, [key])

  const setValue = (value: T) => {
    setStoredValue(value)
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {}
  }

  return [storedValue, setValue]
}

export function ProductTour() {
  const [hasSeenTour, setHasSeenTour] = useLocalStorage('vhm24-tour-completed', false)
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!hasSeenTour) {
      const timer = setTimeout(() => setIsOpen(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [hasSeenTour])

  useEffect(() => {
    if (!isOpen || !mounted) return

    const step = TOUR_STEPS[currentStep]
    const target = document.querySelector(step.target)
    
    if (target) {
      const rect = target.getBoundingClientRect()
      const padding = 16
      
      let style: React.CSSProperties = {}
      
      switch (step.position) {
        case 'right':
          style = { top: rect.top, left: rect.right + padding }
          break
        case 'bottom':
          style = { top: rect.bottom + padding, left: rect.left }
          break
        case 'left':
          style = { top: rect.top, right: window.innerWidth - rect.left + padding }
          break
        default:
          style = { bottom: window.innerHeight - rect.top + padding, left: rect.left }
      }
      
      setTooltipStyle(style)
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentStep, isOpen, mounted])

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    setIsOpen(false)
    setHasSeenTour(true)
  }

  if (!mounted || !isOpen) return null

  const step = TOUR_STEPS[currentStep]

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Tooltip */}
      <div
        className="absolute w-80 bg-white rounded-xl shadow-2xl p-5 z-10"
        style={tooltipStyle}
      >
        <button
          onClick={handleComplete}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full',
                i <= currentStep ? 'bg-indigo-600' : 'bg-gray-200'
              )}
            />
          ))}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
        <p className="text-gray-600 text-sm mb-4">{step.content}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </button>

          <span className="text-xs text-gray-400">
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            {currentStep === TOUR_STEPS.length - 1 ? (
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
    </div>,
    document.body
  )
}

// Hook to manually trigger tour
export function useTour() {
  const reset = () => {
    localStorage.removeItem('vhm24-tour-completed')
    window.location.reload()
  }
  return { resetTour: reset }
}
```

---

### Sprint 2: P1 Features (Неделя 2)

#### TASK 2.1: Global Search (Cmd+K)

**Новый файл:** `frontend/src/components/search/GlobalSearch.tsx`

*(Код опущен для краткости - аналогичная структура с модальным окном и keyboard shortcuts)*

---

### Sprint 3: P2 Features (Неделя 3)

#### TASK 3.1: LiquidEther Background (опционально)

*(См. отдельный документ VHM24-LIQUID-ETHER-INTEGRATION.md)*

---

## 📊 ФИНАЛЬНАЯ СВОДКА

| # | Задача | Приоритет | Время | Файлы |
|---|--------|-----------|-------|-------|
| B.1 | Fix Role Mismatch | 🔴 BLOCKER | 2ч | `types/users.ts` |
| B.2 | Fix Currency | 🔴 BLOCKER | 1ч | `lib/utils.ts` |
| 1.1 | Collapsible Sidebar | 🟠 P0 | 3ч | `components/layout/Sidebar.tsx` |
| 1.2 | Excel Export | 🟠 P0 | 2ч | `components/ui/ExportButton.tsx` |
| 1.3 | Inline Create | 🟠 P0 | 3ч | `components/ui/InlineCreateSelect.tsx` |
| 1.4 | Product Tour | 🟠 P0 | 3ч | `components/onboarding/ProductTour.tsx` |
| 2.1 | Global Search | 🟡 P1 | 3ч | `components/search/GlobalSearch.tsx` |
| 2.2 | Notifications | 🟡 P1 | 2ч | `components/notifications/` |
| 3.1 | LiquidEther | 🟢 P2 | 2ч | `components/effects/` |

**Общее время:** ~21 час

---

## ✅ ЧЕКЛИСТ ВНЕДРЕНИЯ

### Sprint 0 (День 1)
```
□ B.1: Обновить types/users.ts
□ B.1: Обновить все компоненты с ролями
□ B.2: Обновить formatCurrency в lib/utils.ts
□ B.2: Заменить все ₽ на сум
□ npm run build - без ошибок
□ npm run test - тесты проходят
```

### Sprint 1 (Неделя 1)
```
□ 1.1: Заменить Sidebar.tsx
□ 1.1: Добавить data-tour атрибуты
□ 1.2: Создать ExportButton.tsx
□ 1.2: npm install xlsx
□ 1.2: Добавить экспорт на страницы machines, transactions
□ 1.3: Создать InlineCreateSelect.tsx
□ 1.3: Интегрировать в формы machines, products
□ 1.4: Создать ProductTour.tsx
□ 1.4: Добавить в dashboard layout
```

### Sprint 2 (Неделя 2)
```
□ 2.1: Создать GlobalSearch.tsx
□ 2.1: Добавить Ctrl+K shortcut
□ 2.2: Создать NotificationCenter.tsx
□ 2.2: Заменить в Header.tsx
```

### Sprint 3 (Неделя 3)
```
□ 3.1: Создать LiquidEther.tsx (опционально)
□ 3.1: Добавить на login page
□ Финальное тестирование
□ Performance audit
```

---

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

```
ТЕКУЩИЙ СКОР:     75/100
ПОСЛЕ BLOCKERS:   78/100
ПОСЛЕ SPRINT 1:   85/100
ПОСЛЕ SPRINT 2:   88/100
ПОСЛЕ SPRINT 3:   90/100
```

---

**Готово к внедрению! 🚀**
