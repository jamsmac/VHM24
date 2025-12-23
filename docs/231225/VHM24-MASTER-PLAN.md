# 🎯 VHM24 MASTER OPTIMIZATION PLAN

**Единый комплексный план доработок VendHub Manager 2024**

**Версия:** 1.1  
**Дата:** 23 декабря 2025  
**Репозиторий:** https://github.com/jamsmac/VHM24 (источник истины)  
**Основан на:** UI/UX Audit 75/100, Technical Audit 82/100

---

> **VHM24** — единственный основной репозиторий. Все доработки идут сюда.
> 
> Донорские репозитории (VendHub, vendhub-showcase, vendify-menu-maps, vendhub-bot) — 
> предыдущие наработки, из которых берём полезные решения, отсутствующие в VHM24.

---

## 📋 СОДЕРЖАНИЕ

1. [Верифицированное текущее состояние](#1-верифицированное-текущее-состояние)
2. [Sprint 0: Критические баги (BLOCKER)](#2-sprint-0-критические-баги)
3. [Sprint 1: Office UX](#3-sprint-1-office-ux)
4. [Sprint 2: Клиентская зона](#4-sprint-2-клиентская-зона)
5. [Sprint 3: Telegram интеграция](#5-sprint-3-telegram-интеграция)
6. [Sprint 4: Franchise System](#6-sprint-4-franchise-system)
7. [Донорские репозитории](#7-донорские-репозитории)
8. [Roadmap и оценка времени](#8-roadmap-и-оценка-времени)
9. [Чеклист внедрения](#9-чеклист-внедрения)

---

## 1. ВЕРИФИЦИРОВАННОЕ ТЕКУЩЕЕ СОСТОЯНИЕ

### 1.1 Технический стек (Подтверждено)

| Компонент | Версия | Статус |
|-----------|--------|--------|
| **Next.js** | 16.1.0 | ✅ Актуально |
| **React** | 19.2.3 | ✅ Актуально |
| **NestJS** | 10.x | ✅ Актуально |
| **TypeORM** | + PostgreSQL | ✅ Работает |
| **Tailwind CSS** | 3.4.19 | ✅ Актуально |
| **React Query** | 5.90.12 | ✅ Актуально |
| **Zustand** | 5.0.9 | ✅ Актуально |
| **Recharts** | 3.6.0 | ✅ Актуально |

### 1.2 Структура проекта (Подтверждено)

```
VHM24/
├── backend/              # 11M - NestJS API
│   └── src/modules/      # 28 entities, 220+ endpoints
├── frontend/             # 4.2M - Next.js Dashboard  
│   ├── src/app/          # 87 страниц dashboard
│   ├── src/components/   # 30+ UI компонентов
│   ├── src/lib/          # 50+ API файлов
│   ├── src/hooks/        # 8 хуков
│   └── src/types/        # 14 файлов типов
├── mobile/               # 918K - React Native + Expo
├── docs/                 # 4.3M - 90+ файлов документации
└── monitoring/           # 101K - Prometheus + Grafana
```

### 1.3 Критические проблемы (Подтверждено)

| Проблема | Локация | Критичность |
|----------|---------|-------------|
| **Role Mismatch** | `frontend/src/types/users.ts` vs `backend/.../user.entity.ts` | 🔴 BLOCKER |
| **Currency RUB→UZS** | `frontend/src/lib/utils.ts:26-31` | 🔴 BLOCKER |
| **Sidebar 25 items** | `frontend/src/components/layout/Sidebar.tsx:34-60` | 🟠 HIGH |
| **No Excel Export** | Отсутствует | 🟡 MEDIUM |
| **No Product Tour** | Отсутствует | 🟡 MEDIUM |
| **No Customer Cabinet** | Отсутствует | 🟡 MEDIUM |

### 1.4 Подтверждённые существующие компоненты

✅ **Реализовано:**
- 2FA авторизация (TOTP)
- Setup Wizard (первичная настройка)
- Command Palette (Ctrl+K поиск)
- Система задач
- QR жалобы
- Telegram модуль (базовый)
- Web Push (VAPID)
- Offline режим в mobile
- 3-уровневый инвентарь

❌ **НЕ реализовано:**
- Группировка sidebar
- Экспорт в Excel/CSV
- Product Tour / Onboarding
- Inline Create Select
- Клиентский кабинет (/my/*)
- Бонусная система
- Франчайзинг / Multi-tenant

---

## 2. SPRINT 0: КРИТИЧЕСКИЕ БАГИ

**Срок:** День 1 (3 часа)  
**Приоритет:** 🔴 BLOCKER

### 2.1 TASK B.1: Исправление несоответствия ролей

**Проблема:**  
- Frontend: 5 ролей (Admin, Manager, Operator, Viewer, Accountant) - PascalCase  
- Backend: 7 ролей (Owner, Admin, Manager, Operator, Collector, Technician, Viewer) - PascalCase  
- Несовпадение: Frontend нет Owner, Collector, Technician; Backend нет Accountant

**Файл для изменения:** `frontend/src/types/users.ts`

**Полный код замены:**

```typescript
// frontend/src/types/users.ts - ПОЛНАЯ ЗАМЕНА

export enum UserRole {
  OWNER = 'Owner',
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  OPERATOR = 'Operator',
  COLLECTOR = 'Collector',
  TECHNICIAN = 'Technician',
  VIEWER = 'Viewer',
}

export const ROLE_CONFIG: Record<UserRole, {
  label: string;
  labelRu: string;
  icon: string;
  color: string;
  bgClass: string;
  textClass: string;
  description: string;
}> = {
  [UserRole.OWNER]: {
    label: 'Owner',
    labelRu: 'Владелец',
    icon: '👑',
    color: 'purple',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-800 dark:text-purple-400',
    description: 'Владелец бизнеса',
  },
  [UserRole.ADMIN]: {
    label: 'Admin',
    labelRu: 'Администратор',
    icon: '⚙️',
    color: 'red',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-800 dark:text-red-400',
    description: 'Полный доступ к системе',
  },
  [UserRole.MANAGER]: {
    label: 'Manager',
    labelRu: 'Менеджер',
    icon: '📊',
    color: 'blue',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-800 dark:text-blue-400',
    description: 'Управление операциями',
  },
  [UserRole.OPERATOR]: {
    label: 'Operator',
    labelRu: 'Оператор',
    icon: '🔧',
    color: 'green',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-800 dark:text-green-400',
    description: 'Пополнение автоматов',
  },
  [UserRole.COLLECTOR]: {
    label: 'Collector',
    labelRu: 'Инкассатор',
    icon: '💰',
    color: 'yellow',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-800 dark:text-yellow-400',
    description: 'Сбор наличных',
  },
  [UserRole.TECHNICIAN]: {
    label: 'Technician',
    labelRu: 'Техник',
    icon: '🛠️',
    color: 'orange',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-800 dark:text-orange-400',
    description: 'Обслуживание и ремонт',
  },
  [UserRole.VIEWER]: {
    label: 'Viewer',
    labelRu: 'Наблюдатель',
    icon: '👁️',
    color: 'gray',
    bgClass: 'bg-gray-100 dark:bg-gray-900/30',
    textClass: 'text-gray-800 dark:text-gray-400',
    description: 'Только просмотр',
  },
};

export function getRoleConfig(role: UserRole | string) {
  return ROLE_CONFIG[role as UserRole] || ROLE_CONFIG[UserRole.VIEWER];
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
  telegram_user_id?: string;
  organization_id?: string;
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

**Дополнительные действия:**
```bash
# Поиск и замена во всех файлах
grep -rn "Accountant" frontend/src --include="*.tsx" --include="*.ts"
# Удалить все ссылки на Accountant

grep -rn "'admin'\|'manager'\|'operator'\|'viewer'" frontend/src --include="*.tsx" --include="*.ts"
# Заменить на UserRole.ADMIN, UserRole.MANAGER и т.д.
```

---

### 2.2 TASK B.2: Исправление валюты (RUB → UZS)

**Проблема:** Функция `formatCurrency` использует RUB вместо UZS

**Файл:** `frontend/src/lib/utils.ts` (строки 26-31)

**Полный код замены:**

```typescript
// frontend/src/lib/utils.ts - ЗАМЕНА функции formatCurrency

export const CURRENCY = {
  code: 'UZS',
  symbol: 'сўм',
  symbolShort: 'сум',
  locale: 'uz-UZ',
} as const;

/**
 * Форматирование суммы в узбекских сумах
 * @example formatCurrency(1500000) → "1 500 000 сум"
 * @example formatCurrency(1500000, { compact: true }) → "1.5 млн"
 */
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
    const abs = Math.abs(amount);
    if (abs >= 1_000_000_000) {
      formatted = (amount / 1_000_000_000).toFixed(1).replace('.0', '') + ' млрд';
    } else if (abs >= 1_000_000) {
      formatted = (amount / 1_000_000).toFixed(1).replace('.0', '') + ' млн';
    } else if (abs >= 1_000) {
      formatted = (amount / 1_000).toFixed(1).replace('.0', '') + ' тыс';
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

/**
 * Короткий формат для осей графиков
 */
export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + 'B';
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + 'K';
  return amount.toString();
}
```

**Дополнительные действия:**
```bash
# Поиск всех упоминаний RUB и ₽
grep -rn "₽\|RUB\|руб\." frontend/src --include="*.tsx" --include="*.ts"

# Замены:
# ₽ → сум
# RUB → UZS
# 'руб.' → 'сум'
```

---

## 3. SPRINT 1: OFFICE UX

**Срок:** Неделя 1 (11 часов)  
**Приоритет:** 🟠 HIGH

### 3.1 TASK 1.1: Collapsible Sidebar с группировкой (3ч)

**Файл:** `frontend/src/components/layout/Sidebar.tsx` - ПОЛНАЯ ЗАМЕНА

**Группы навигации:**
```
📊 Обзор
   └─ Dashboard

☕ Автоматы
   ├─ Список машин
   ├─ Доступ
   ├─ Карта
   └─ Мониторинг

📋 Операции
   ├─ Задачи
   ├─ Расписание
   ├─ Инциденты
   └─ Жалобы

📦 Склад
   ├─ Инвентарь
   ├─ Оборудование
   └─ Импорт

💰 Финансы
   ├─ Транзакции
   ├─ Комиссии
   ├─ Договоры
   ├─ Контрагенты
   └─ Отчёты

🔔 Уведомления
   ├─ Уведомления
   └─ Оповещения

⚙️ Администрирование
   ├─ Пользователи
   ├─ Локации
   ├─ Telegram
   ├─ Аудит
   ├─ Безопасность
   └─ Настройки
```

**Полный код:**

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ClipboardList, AlertTriangle,
  MessageSquare, DollarSign, Users, MapPin, Map, Settings,
  Shield, Bell, BellRing, BarChart3, Wrench, Send, Building2,
  FileText, Receipt, FileUp, Activity, ScrollText, Timer,
  KeyRound, ChevronDown, ChevronRight, Coffee, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActiveAlertsCount } from '@/hooks/useActiveAlertsCount'

const NAVIGATION_GROUPS = [
  {
    id: 'overview',
    label: 'Обзор',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    id: 'machines',
    label: 'Автоматы',
    icon: Coffee,
    defaultOpen: true,
    items: [
      { name: 'Все аппараты', href: '/dashboard/machines', icon: Package },
      { name: 'Доступ', href: '/dashboard/machines/access', icon: KeyRound },
      { name: 'Карта', href: '/dashboard/map', icon: Map },
      { name: 'Мониторинг', href: '/dashboard/monitoring', icon: Activity },
    ]
  },
  {
    id: 'operations',
    label: 'Операции',
    icon: ClipboardList,
    defaultOpen: true,
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
      { name: 'Отчёты', href: '/dashboard/reports', icon: BarChart3 },
    ]
  },
  {
    id: 'notifications',
    label: 'Уведомления',
    icon: Bell,
    items: [
      { name: 'Уведомления', href: '/dashboard/notifications', icon: Bell },
      { name: 'Оповещения', href: '/dashboard/alerts', icon: BellRing, badge: true },
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

function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial)
  
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) setValue(JSON.parse(stored))
    } catch {}
  }, [key])
  
  const set = (v: T) => {
    setValue(v)
    try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
  }
  
  return [value, set]
}

function AlertsBadge() {
  const { count } = useActiveAlertsCount()
  if (!count) return null
  return (
    <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useLocalStorage<string[]>(
    'vhm24-nav-expanded',
    NAVIGATION_GROUPS.filter(g => g.defaultOpen).map(g => g.id)
  )

  useEffect(() => {
    const activeGroup = NAVIGATION_GROUPS.find(g =>
      g.items.some(i => pathname === i.href || pathname?.startsWith(i.href + '/'))
    )
    if (activeGroup && !expanded.includes(activeGroup.id)) {
      setExpanded([...expanded, activeGroup.id])
    }
  }, [pathname])

  const toggle = (id: string) => {
    setExpanded(expanded.includes(id) 
      ? expanded.filter(x => x !== id) 
      : [...expanded, id])
  }

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 h-screen" data-tour="sidebar">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white">VendHub</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Manager</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {NAVIGATION_GROUPS.map((group) => {
          const isOpen = expanded.includes(group.id)
          const hasActive = group.items.some(i => isActive(i.href))
          const Icon = group.icon

          return (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => toggle(group.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition',
                  hasActive 
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-800'
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  {group.label}
                </span>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              <div className={cn(
                'overflow-hidden transition-all duration-200',
                isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              )}>
                <ul className="mt-1 ml-4 pl-3 border-l-2 border-gray-100 dark:border-slate-700 space-y-0.5">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon
                    const active = isActive(item.href)
                    
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          data-tour={item.name.toLowerCase().replace(/\s+/g, '-')}
                          className={cn(
                            'flex items-center px-3 py-2 text-sm rounded-md transition',
                            active
                              ? 'bg-indigo-100 text-indigo-700 font-medium dark:bg-indigo-900/40 dark:text-indigo-300'
                              : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-800'
                          )}
                        >
                          <ItemIcon className="mr-3 w-4 h-4" />
                          <span className="flex-1">{item.name}</span>
                          {item.badge && <AlertsBadge />}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )
        })}
      </nav>

      {/* Ecosystem Links */}
      <div className="p-3 border-t border-gray-100 dark:border-slate-800 space-y-1">
        <a
          href="https://vendhub.live"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition"
        >
          <ExternalLink className="w-4 h-4" />
          vendhub.live
        </a>
        <a
          href="https://t.me/VendHubBot"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition"
        >
          <Send className="w-4 h-4" />
          @VendHubBot
        </a>
        <div className="text-xs text-gray-400 text-center pt-2">
          VendHub v2.0
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
```

---

### 3.2 TASK 1.2: Excel Export Component (2ч)

**Новый файл:** `frontend/src/components/ui/ExportButton.tsx`

**Зависимость:** `npm install xlsx`

```typescript
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
      const headers = columns.map(col => col.header).join(',')
      const rows = data.map(row =>
        columns.map(col => {
          const value = col.format ? col.format(row[col.key], row) : row[col.key]
          const escaped = String(value ?? '').replace(/"/g, '""')
          return escaped.includes(',') || escaped.includes('\n') 
            ? `"${escaped}"` 
            : escaped
        }).join(',')
      ).join('\n')

      const csv = `\uFEFF${headers}\n${rows}`
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
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
      const XLSX = await import('xlsx')
      const exportData = data.map(row => {
        const exportRow: Record<string, any> = {}
        columns.forEach(col => {
          exportRow[col.header] = col.format ? col.format(row[col.key], row) : row[col.key]
        })
        return exportRow
      })

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      
      const colWidths = columns.map(col => ({
        wch: Math.max(
          col.header.length,
          ...exportData.map(row => String(row[col.header] || '').length)
        ) + 2
      }))
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, 'Data')
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
          'bg-white border-gray-300 text-gray-700 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200',
          'hover:bg-gray-50 dark:hover:bg-slate-700',
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
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-20 overflow-hidden">
            <button
              onClick={exportToExcel}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            >
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium">Excel (.xlsx)</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{data.length} записей</div>
              </div>
            </button>
            <button
              onClick={exportToCSV}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition border-t border-gray-100 dark:border-slate-700"
            >
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium">CSV (.csv)</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{data.length} записей</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

**Использование на страницах:**

```typescript
// frontend/src/app/dashboard/machines/page.tsx
import { ExportButton } from '@/components/ui/ExportButton'
import { formatCurrency } from '@/lib/utils'

const exportColumns = [
  { key: 'name', header: 'Название' },
  { key: 'serialNumber', header: 'Серийный номер' },
  { key: 'location', header: 'Локация', format: (v) => v?.name || '—' },
  { key: 'status', header: 'Статус' },
  { key: 'revenue', header: 'Выручка', format: (v) => formatCurrency(v, { showSymbol: false }) },
]

// В JSX:
<ExportButton
  data={machines}
  columns={exportColumns}
  filename="vendhub-machines"
/>
```

---

### 3.3 TASK 1.3: InlineCreateSelect Component (3ч)

**Новый файл:** `frontend/src/components/ui/InlineCreateSelect.tsx`

*(Полный код см. в документе VHM24-UI-OPTIMIZATION-PLAN.md, раздел 7)*

---

### 3.4 TASK 1.4: Product Tour Component (3ч)

**Новый файл:** `frontend/src/components/onboarding/ProductTour.tsx`

*(Полный код см. в документе VHM24-UI-OPTIMIZATION-PLAN.md, раздел 3)*

**Шаги тура:**
1. Sidebar навигация
2. Машины список
3. Система задач
4. Отчёты и аналитика
5. Быстрый поиск (Ctrl+K)

---

## 4. SPRINT 2: КЛИЕНТСКАЯ ЗОНА

**Срок:** Неделя 2 (12 часов)  
**Приоритет:** 🟡 MEDIUM

### 4.1 Структура клиентского кабинета

```
frontend/src/app/(public)/
├── page.tsx                  ✅ Landing (обновить)
├── locations/page.tsx        ✅ Карта
├── menu/page.tsx             ✅ Меню
├── cooperation/page.tsx      ✅ Партнёрство
│
├── my/                       🆕 НОВОЕ
│   ├── page.tsx              🆕 Dashboard клиента
│   ├── history/page.tsx      🆕 История покупок
│   ├── bonuses/page.tsx      🆕 Бонусы и баллы
│   ├── favorites/page.tsx    🆕 Любимые напитки
│   └── settings/page.tsx     🆕 Настройки
│
└── promotions/page.tsx       🆕 Акции
```

### 4.2 Backend API для клиентов

```typescript
// Необходимые эндпоинты:
GET  /api/customer/me/stats       // Статистика клиента
GET  /api/customer/me/history     // История покупок (pagination)
GET  /api/customer/me/bonuses     // Бонусные баллы
POST /api/customer/bonuses/redeem // Списание бонусов
GET  /api/customer/me/favorites   // Любимые напитки
```

---

## 5. SPRINT 3: TELEGRAM ИНТЕГРАЦИЯ

**Срок:** Неделя 3 (8 часов)  
**Приоритет:** 🟡 MEDIUM

### 5.1 Команды бота

**Для клиентов:**
```
/start      — Регистрация
/menu       — Меню напитков
/locations  — Ближайшие автоматы
/balance    — Баланс бонусов
/history    — История покупок
/promo      — Акции
```

**Для сотрудников:**
```
/tasks      — Мои задачи
/task_done [id] — Выполнить задачу
/report     — Фото-отчёт
/incident   — Создать инцидент
/stock [машина] — Остатки
```

**Для менеджеров:**
```
/stats      — Дневная сводка
/alerts     — Активные алерты
/staff      — Статус сотрудников
```

---

## 6. SPRINT 4: FRANCHISE SYSTEM

**Срок:** Неделя 4 (16 часов)  
**Приоритет:** 🟢 LOW

### 6.1 Multi-tenant схема

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) DEFAULT 'franchise',
  parent_id UUID REFERENCES organizations(id),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE machines ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE transactions ADD COLUMN organization_id UUID REFERENCES organizations(id);

CREATE INDEX idx_machines_org ON machines(organization_id);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_transactions_org ON transactions(organization_id);
```

---

## 7. ДОНОРСКИЕ РЕПОЗИТОРИИ

> **VHM24 — единственный источник истины.** Все доработки идут в VHM24.
> Остальные репозитории — предыдущие наработки, из которых берём полезные решения, отсутствующие в VHM24.

### 7.1 Архитектура репозиториев

```
🎯 VHM24 (ОСНОВНОЙ) ← все доработки сюда
│
├── 📦 VendHub (397 commits) — legacy backend наработки
│   └── Полезное: MoneyHelper, DataParser, Reports PDF
│
├── 📦 vendhub-showcase (96 commits) — UI демо
│   └── Полезное: Kanban DnD, Machine карточки, Recharts примеры
│
├── 📦 vendify-menu-maps (83 commits) — публичная карта
│   └── Полезное: Yandex/Google Maps интеграция, Menu Grid
│
└── 📦 vendhub-bot — Telegram бот
    └── Полезное: Telegram команды, inline keyboards
```

### 7.2 Что брать из донорских репозиториев

**Из VendHub (legacy backend):**

| Компонент | Есть в VHM24? | Действие |
|-----------|---------------|----------|
| MoneyHelper (UZS форматирование) | ❓ Проверить | Скопировать если нет |
| Data Parser Framework | ❓ Проверить | Скопировать паттерны |
| PDF Reports генерация | ❓ Проверить | Скопировать если нет |
| Excel Import логика | ❓ Проверить | Скопировать если нет |

**Из vendhub-showcase (UI):**

| Компонент | Есть в VHM24? | Действие |
|-----------|---------------|----------|
| Kanban Board (@dnd-kit) | ❌ Нет | Адаптировать для /tasks |
| Machine Map карточки | ❓ Проверить | Улучшить дизайн |
| Recharts конфиги | Частично | Взять лучшие практики |

**Из vendify-menu-maps:**

| Компонент | Есть в VHM24? | Действие |
|-----------|---------------|----------|
| Location Map (Yandex) | ❓ Проверить | Использовать для /locations |
| Menu Grid | ❓ Проверить | Использовать для /menu |
| Location Search | ❓ Проверить | Интегрировать |

### 7.3 Процесс интеграции

```bash
# 1. Клонировать донорский репозиторий
git clone https://github.com/jamsmac/VendHub.git /tmp/VendHub

# 2. Найти нужный компонент
find /tmp/VendHub -name "*.ts" | xargs grep -l "MoneyHelper"

# 3. Скопировать в VHM24 с адаптацией
cp /tmp/VendHub/src/helpers/money.helper.ts \
   VHM24/backend/src/common/helpers/

# 4. Адаптировать импорты и типы под VHM24
```

### 7.4 Потенциальная экономия времени

| Компонент | Писать с нуля | Адаптировать |
|-----------|---------------|--------------|
| Kanban Board | 16ч | 3ч |
| Location Map | 12ч | 2ч |
| Menu Grid | 6ч | 1ч |
| PDF Reports | 12ч | 2ч |
| **ИТОГО** | **46ч** | **8ч** |

**Экономия: ~38 часов** при условии что компонентов нет в VHM24

---

## 8. ROADMAP И ОЦЕНКА ВРЕМЕНИ

### 8.1 Сводная таблица

| Sprint | Описание | Часы | Статус |
|--------|----------|------|--------|
| **Sprint 0** | Blockers (Roles, Currency) | 3ч | 🔴 TODO |
| **Sprint 1** | Office UX (Sidebar, Export, Inline, Tour) | 11ч | 🔴 TODO |
| **Sprint 2** | Customer Zone | 12ч | 🔴 TODO |
| **Sprint 3** | Telegram v2 | 8ч | 🔴 TODO |
| **Sprint 4** | Franchise System | 16ч | 🔴 TODO |
| **ИТОГО** | | **50ч** | |

### 8.2 Визуальный roadmap

```
2025
├── Январь (Sprint 0-1)
│   ├── ✅ Fix Roles & Currency
│   ├── ✅ Collapsible Sidebar
│   ├── ✅ Export Button
│   └── ✅ Product Tour
│
├── Февраль (Sprint 2)
│   ├── 🔄 Customer Cabinet
│   ├── 🔄 Bonus System
│   └── 🔄 Public API
│
├── Март (Sprint 3)
│   ├── 📋 Telegram Bot v2
│   ├── 📋 Push Notifications
│   └── 📋 Mobile PWA
│
└── Апрель (Sprint 4)
    ├── 📋 Multi-tenant Schema
    ├── 📋 Franchise Dashboard
    └── 📋 White-label Options
```

---

## 9. ЧЕКЛИСТ ВНЕДРЕНИЯ

### Sprint 0 (День 1)
```
□ Backup текущего кода
□ Обновить frontend/src/types/users.ts
□ Поиск и замена ACCOUNTANT
□ Обновить frontend/src/lib/utils.ts (currency)
□ Поиск и замена ₽ → сум, RUB → UZS
□ npm run build - без ошибок
□ npm run test - тесты проходят
□ Тест авторизации всех 7 ролей
```

### Sprint 1 (Неделя 1)
```
□ Заменить Sidebar.tsx
□ Добавить data-tour атрибуты
□ npm install xlsx
□ Создать ExportButton.tsx
□ Добавить экспорт на machines, transactions, tasks
□ Создать InlineCreateSelect.tsx
□ Интегрировать в формы machines, products
□ Создать ProductTour.tsx
□ Добавить в dashboard layout
□ Тестирование всех новых компонентов
```

### Sprint 2 (Неделя 2)
```
□ Создать структуру /my/* страниц
□ Реализовать Customer Dashboard
□ Backend API для customer stats
□ История покупок с пагинацией
□ Бонусная система (начисление)
□ Тестирование customer flow
```

### Sprint 3 (Неделя 3)
```
□ Расширить Telegram бота
□ Добавить команды для клиентов
□ Настроить уведомления
□ Тестирование end-to-end
```

### Sprint 4 (Неделя 4)
```
□ Миграция БД для organizations
□ Tenant middleware
□ UI для выбора организации
□ Тестирование изоляции данных
```

---

## 🎯 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

| Метрика | Сейчас | После Sprint 4 |
|---------|--------|----------------|
| **UI/UX Score** | 75/100 | 90/100 |
| **Technical Score** | 82/100 | 92/100 |
| **Customer Experience** | 0/100 | 80/100 |
| **Telegram Coverage** | 70% | 95% |
| **Franchise Ready** | ❌ | ✅ |

---

## 📎 ПРИЛОЖЕНИЯ

### A. Связанные документы
- VHM24-UI-OPTIMIZATION-PLAN.md
- VHM24-LIQUID-ETHER-INTEGRATION.md
- VENDHUB-ECOSYSTEM-FINAL.md

### B. Архитектура репозиториев

```
🎯 ОСНОВНОЙ (все доработки сюда):
   └── https://github.com/jamsmac/VHM24

📦 ДОНОРСКИЕ (брать полезные наработки):
   ├── https://github.com/jamsmac/VendHub (legacy backend)
   ├── https://github.com/jamsmac/vendhub-showcase (UI демо)
   ├── https://github.com/jamsmac/vendify-menu-maps (публичная карта)
   └── https://github.com/jamsmac/vendhub-bot (Telegram)
```

---

**Документ создан:** 23 декабря 2025  
**Статус:** ✅ Готов к реализации  
**Общее время:** ~50 часов (+ возможная экономия ~38ч из донорских репозиториев)

---

> **VendHub — единая платформа для вендинга, которая работает через сайт, мобильное приложение и Telegram, объединяя покупки, обслуживание и управление бизнесом в одном понятном сервисе.**
