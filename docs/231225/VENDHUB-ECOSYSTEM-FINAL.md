# 🌐 VENDHUB ECOSYSTEM — ФИНАЛЬНЫЙ ПЛАН

> **VendHub — единая платформа для вендинга, которая работает через сайт, мобильное приложение и Telegram, объединяя покупки, обслуживание и управление бизнесом в одном понятном сервисе.**

**Дата:** 23 декабря 2025  
**Версия:** 4.0 FINAL  
**Статус:** Ready for Implementation

---

## 📋 ОГЛАВЛЕНИЕ

1. [Философия экосистемы](#1-философия-экосистемы)
2. [Архитектура платформы](#2-архитектура-платформы)
3. [Текущее состояние и GAP-анализ](#3-текущее-состояние)
4. [Sprint 0: Критические исправления](#4-sprint-0-blockers)
5. [Sprint 1: Office UX](#5-sprint-1-office-ux)
6. [Sprint 2: Клиентская зона](#6-sprint-2-клиентская-зона)
7. [Sprint 3: Telegram интеграция](#7-sprint-3-telegram)
8. [Sprint 4: Франчайзинг](#8-sprint-4-франчайзинг)
9. [Roadmap](#9-roadmap)

---

## 1. ФИЛОСОФИЯ ЭКОСИСТЕМЫ

### Один бренд — разные роли

```
┌─────────────────────────────────────────────────────────────────┐
│                        🌐 VENDHUB                               │
│                                                                 │
│    "Удобный сервис, который всегда под рукой —                 │
│     в телефоне, браузере или в Telegram"                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  👤 КЛИЕНТ          👷 СОТРУДНИК        👔 ВЛАДЕЛЕЦ            │
│  ─────────          ──────────          ─────────              │
│  • Покупки          • Задачи            • Аналитика            │
│  • Бонусы           • Отчёты            • Финансы              │
│  • История          • Инциденты         • Контроль             │
│  • Акции            • Уведомления       • Масштабирование      │
│                                                                 │
│  📱 App / 🌐 Web / 💬 Telegram                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Принципы экосистемы

| Принцип | Описание |
|---------|----------|
| **Единый вход** | Один аккаунт для всех платформ |
| **Роль определяет интерфейс** | Каждый видит только своё |
| **Канал по выбору** | Сайт, приложение или Telegram — одинаковый опыт |
| **Данные в реальном времени** | Синхронизация везде |

---

## 2. АРХИТЕКТУРА ПЛАТФОРМЫ

### Структура доменов

```
vendhub.live              — Публичный сайт для клиентов
├── /locations            — Карта автоматов
├── /menu                 — Меню и цены
├── /promotions           — Акции
├── /my                   — Личный кабинет клиента (NEW)
│   ├── /history          — История покупок
│   ├── /bonuses          — Бонусы и баллы
│   └── /settings         — Настройки
└── /cooperation          — Для партнёров

office.vendhub.live       — Панель управления (VHM24)
├── /dashboard            — Главная
├── /machines             — Автоматы
├── /tasks                — Задачи
├── /transactions         — Финансы
└── /settings             — Настройки

api.vendhub.live          — Единый API
├── /auth                 — Авторизация
├── /public               — Публичные эндпоинты
├── /customer             — API клиентов (NEW)
├── /staff                — API сотрудников
└── /admin                — API администраторов
```

### Роли и доступы

```typescript
// Полная карта ролей экосистемы
export enum UserRole {
  // Клиенты (Public)
  CUSTOMER = 'Customer',
  
  // Сотрудники (Office + Mobile + Telegram)
  OPERATOR = 'Operator',      // Пополнение
  COLLECTOR = 'Collector',    // Инкассация
  TECHNICIAN = 'Technician',  // Обслуживание
  
  // Управление (Office + Telegram)
  MANAGER = 'Manager',
  ADMIN = 'Admin',
  
  // Владельцы (Office)
  OWNER = 'Owner',
  FRANCHISEE = 'Franchisee',
}

export const ROLE_ACCESS = {
  [UserRole.CUSTOMER]: {
    platforms: ['web', 'mobile', 'telegram'],
    areas: ['public', 'customer-cabinet'],
  },
  [UserRole.OPERATOR]: {
    platforms: ['office', 'mobile', 'telegram'],
    areas: ['tasks', 'machines-view', 'inventory'],
  },
  [UserRole.COLLECTOR]: {
    platforms: ['office', 'mobile', 'telegram'],
    areas: ['collections', 'machines-view', 'finance-view'],
  },
  [UserRole.TECHNICIAN]: {
    platforms: ['office', 'mobile', 'telegram'],
    areas: ['maintenance', 'equipment', 'incidents'],
  },
  [UserRole.MANAGER]: {
    platforms: ['office', 'telegram'],
    areas: ['full-read', 'tasks-manage', 'reports'],
  },
  [UserRole.ADMIN]: {
    platforms: ['office'],
    areas: ['full-access', 'users', 'settings'],
  },
  [UserRole.OWNER]: {
    platforms: ['office'],
    areas: ['everything'],
  },
  [UserRole.FRANCHISEE]: {
    platforms: ['office'],
    areas: ['own-organization'],
  },
};
```

---

## 3. ТЕКУЩЕЕ СОСТОЯНИЕ

### ✅ Что уже реализовано в VHM24

| Компонент | Статус | Готовность |
|-----------|--------|------------|
| Office Dashboard | ✅ | 85% |
| 2FA авторизация | ✅ | 100% |
| Управление машинами | ✅ | 90% |
| Система задач | ✅ | 85% |
| Telegram интеграция | ✅ | 70% |
| Public Landing | ✅ | 60% |
| Карта локаций | ✅ | 80% |

### ❌ GAP-анализ: что нужно доработать

| Проблема | Где | Критичность |
|----------|-----|-------------|
| Role mismatch (5 vs 7 ролей) | `types/users.ts` | 🔴 BLOCKER |
| Currency RUB → UZS | `lib/utils.ts` | 🔴 BLOCKER |
| Sidebar без группировки | `components/layout/` | 🟠 HIGH |
| Нет личного кабинета клиента | `app/(public)/` | 🟠 HIGH |
| Нет бонусной системы | Backend + Frontend | 🟡 MEDIUM |
| Нет экспорта в Excel | UI компоненты | 🟡 MEDIUM |
| Нет onboarding тура | UI компоненты | 🟢 LOW |

---

## 4. SPRINT 0: BLOCKERS (День 1, 3 часа)

### 4.1 Fix Role Mismatch

**Проблема:** Frontend имеет 5 ролей (lowercase), Backend — 7 ролей (PascalCase)

**Файл:** `frontend/src/types/users.ts` — ПОЛНАЯ ЗАМЕНА

```typescript
// ============================================
// VENDHUB ECOSYSTEM - USER TYPES
// ============================================

export enum UserRole {
  // Клиенты
  CUSTOMER = 'Customer',
  
  // Сотрудники
  OPERATOR = 'Operator',
  COLLECTOR = 'Collector',
  TECHNICIAN = 'Technician',
  
  // Управление
  MANAGER = 'Manager',
  ADMIN = 'Admin',
  
  // Владельцы
  OWNER = 'Owner',
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
  [UserRole.CUSTOMER]: {
    label: 'Customer',
    labelRu: 'Клиент',
    icon: '👤',
    color: 'sky',
    bgClass: 'bg-sky-100',
    textClass: 'text-sky-800',
    description: 'Покупатель напитков',
  },
  [UserRole.OPERATOR]: {
    label: 'Operator',
    labelRu: 'Оператор',
    icon: '🔧',
    color: 'green',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    description: 'Пополнение автоматов',
  },
  [UserRole.COLLECTOR]: {
    label: 'Collector',
    labelRu: 'Инкассатор',
    icon: '💰',
    color: 'yellow',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800',
    description: 'Сбор наличных',
  },
  [UserRole.TECHNICIAN]: {
    label: 'Technician',
    labelRu: 'Техник',
    icon: '🛠️',
    color: 'orange',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800',
    description: 'Обслуживание и ремонт',
  },
  [UserRole.MANAGER]: {
    label: 'Manager',
    labelRu: 'Менеджер',
    icon: '📊',
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
    description: 'Управление операциями',
  },
  [UserRole.ADMIN]: {
    label: 'Admin',
    labelRu: 'Администратор',
    icon: '⚙️',
    color: 'red',
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    description: 'Полный доступ к системе',
  },
  [UserRole.OWNER]: {
    label: 'Owner',
    labelRu: 'Владелец',
    icon: '👑',
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-800',
    description: 'Владелец бизнеса',
  },
  [UserRole.VIEWER]: {
    label: 'Viewer',
    labelRu: 'Наблюдатель',
    icon: '👁️',
    color: 'gray',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-800',
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
  status?: 'pending' | 'active' | 'password_change_required' | 'inactive' | 'suspended';
  telegram_user_id?: string;
  is_2fa_enabled?: boolean;
  organization_id?: string; // Для франчайзи
  created_at: string;
  updated_at: string;
  last_login?: string;
}
```

---

### 4.2 Fix Currency (RUB → UZS)

**Файл:** `frontend/src/lib/utils.ts` — заменить функцию formatCurrency

```typescript
// ============================================
// VENDHUB - CURRENCY UTILITIES (UZS)
// ============================================

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
 * Короткий формат для графиков и карточек
 * @example formatCurrencyShort(15000000) → "15M"
 */
export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + 'B';
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + 'K';
  return amount.toString();
}
```

**Команда для поиска и замены:**
```bash
# Найти все места с RUB/₽
grep -rn "RUB\|₽\|руб" frontend/src --include="*.tsx" --include="*.ts"

# Заменить
sed -i 's/₽/сум/g' frontend/src/**/*.tsx
sed -i "s/'RUB'/'UZS'/g" frontend/src/**/*.ts
```

---

## 5. SPRINT 1: OFFICE UX (Неделя 1, 11 часов)

### 5.1 Collapsible Sidebar с группировкой

**Файл:** `frontend/src/components/layout/Sidebar.tsx` — ПОЛНАЯ ЗАМЕНА

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

// Навигация сгруппированная по логике экосистемы VendHub
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
    label: 'Склад и оборудование',
    icon: Wrench,
    items: [
      { name: 'Инвентарь', href: '/dashboard/inventory', icon: Package },
      { name: 'Оборудование', href: '/dashboard/equipment', icon: Wrench },
      { name: 'Импорт данных', href: '/dashboard/import', icon: FileUp },
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
];

// Hook для localStorage
function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  
  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) setValue(JSON.parse(stored));
  }, [key]);
  
  const set = (v: T) => {
    setValue(v);
    localStorage.setItem(key, JSON.stringify(v));
  };
  
  return [value, set];
}

function AlertsBadge() {
  const { count } = useActiveAlertsCount();
  if (!count) return null;
  return (
    <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useLocalStorage<string[]>(
    'vhm24-nav-expanded',
    NAVIGATION_GROUPS.filter(g => g.defaultOpen).map(g => g.id)
  );

  // Auto-expand active group
  useEffect(() => {
    const activeGroup = NAVIGATION_GROUPS.find(g =>
      g.items.some(i => pathname === i.href || pathname?.startsWith(i.href + '/'))
    );
    if (activeGroup && !expanded.includes(activeGroup.id)) {
      setExpanded([...expanded, activeGroup.id]);
    }
  }, [pathname]);

  const toggle = (id: string) => {
    setExpanded(expanded.includes(id) 
      ? expanded.filter(x => x !== id) 
      : [...expanded, id]
    );
  };

  const isActive = (href: string) => 
    pathname === href || pathname?.startsWith(href + '/');

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r h-screen">
      {/* Logo */}
      <div className="p-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-900">VendHub</div>
            <div className="text-xs text-gray-500">Office</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {NAVIGATION_GROUPS.map((group) => {
          const isOpen = expanded.includes(group.id);
          const hasActive = group.items.some(i => isActive(i.href));
          const Icon = group.icon;

          return (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => toggle(group.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition',
                  hasActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  {group.label}
                </span>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              <div className={cn(
                'overflow-hidden transition-all',
                isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              )}>
                <ul className="mt-1 ml-4 pl-3 border-l-2 border-gray-100 space-y-0.5">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = isActive(item.href);
                    
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center px-3 py-2 text-sm rounded-md transition',
                            active
                              ? 'bg-indigo-100 text-indigo-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          <ItemIcon className="mr-3 w-4 h-4" />
                          <span className="flex-1">{item.name}</span>
                          {item.badge && <AlertsBadge />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Ecosystem Links */}
      <div className="p-3 border-t space-y-1">
        <a
          href="https://vendhub.live"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
        >
          <ExternalLink className="w-4 h-4" />
          vendhub.live
        </a>
        <a
          href="https://t.me/VendHubBot"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
        >
          <Send className="w-4 h-4" />
          @VendHubBot
        </a>
        <div className="text-xs text-gray-400 text-center pt-2">
          VendHub Ecosystem v2.0
        </div>
      </div>
    </aside>
  );
}
```

---

### 5.2 Excel Export Component

**Файл:** `frontend/src/components/ui/ExportButton.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: keyof T;
  header: string;
  format?: (value: any, row: T) => string;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  filename: string;
  className?: string;
}

export function ExportButton<T extends Record<string, any>>({ 
  data, columns, filename, className 
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const exportCSV = () => {
    setLoading(true);
    setOpen(false);
    
    try {
      const headers = columns.map(c => c.header).join(',');
      const rows = data.map(row =>
        columns.map(c => {
          const val = c.format ? c.format(row[c.key], row) : row[c.key];
          const str = String(val ?? '').replace(/"/g, '""');
          return str.includes(',') ? `"${str}"` : str;
        }).join(',')
      ).join('\n');
      
      const blob = new Blob([`\uFEFF${headers}\n${rows}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    setLoading(true);
    setOpen(false);
    
    try {
      const XLSX = await import('xlsx');
      const exportData = data.map(row => {
        const obj: Record<string, any> = {};
        columns.forEach(c => {
          obj[c.header] = c.format ? c.format(row[c.key], row) : row[c.key];
        });
        return obj;
      });
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading || !data.length}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Экспорт
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-20">
            <button onClick={exportExcel} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Excel (.xlsx)
            </button>
            <button onClick={exportCSV} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 border-t">
              <FileText className="w-5 h-5 text-blue-600" />
              CSV (.csv)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

**Установка:**
```bash
cd frontend && npm install xlsx
```

---

## 6. SPRINT 2: КЛИЕНТСКАЯ ЗОНА (Неделя 2, 12 часов)

### 6.1 Структура клиентского кабинета

```
frontend/src/app/(public)/
├── page.tsx                  ✅ Landing (обновить статистику)
├── locations/page.tsx        ✅ Карта
├── menu/page.tsx             ✅ Меню
├── cooperation/page.tsx      ✅ Партнёрство
│
├── my/                       🆕 НОВОЕ - Личный кабинет
│   ├── page.tsx              🆕 Dashboard клиента
│   ├── history/page.tsx      🆕 История покупок
│   ├── bonuses/page.tsx      🆕 Бонусы и баллы
│   ├── favorites/page.tsx    🆕 Любимые напитки
│   └── settings/page.tsx     🆕 Настройки
│
└── promotions/page.tsx       🆕 Акции
```

### 6.2 Customer Dashboard

**Файл:** `frontend/src/app/(public)/my/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Coffee, Gift, History, Settings, Star, TrendingUp, Heart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface CustomerStats {
  totalPurchases: number;
  totalSpent: number;
  bonusPoints: number;
  level: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  favoriteDrink?: string;
  nextLevelProgress: number;
}

const LEVELS = {
  Bronze: { min: 0, max: 999, multiplier: 1.0, color: 'amber' },
  Silver: { min: 1000, max: 4999, multiplier: 1.2, color: 'gray' },
  Gold: { min: 5000, max: 9999, multiplier: 1.5, color: 'yellow' },
  Platinum: { min: 10000, max: Infinity, multiplier: 2.0, color: 'purple' },
};

export default function CustomerDashboard() {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customer/me/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats({
        totalPurchases: 47,
        totalSpent: 523000,
        bonusPoints: 2340,
        level: 'Silver',
        favoriteDrink: 'Капучино',
        nextLevelProgress: 68,
      }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="grid gap-6 md:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const level = stats?.level || 'Bronze';
  const levelConfig = LEVELS[level];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Мой кабинет</h1>
          <p className="text-gray-500 mt-1">Добро пожаловать в VendHub!</p>
        </div>
        <Link 
          href="/my/settings"
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <Settings className="w-6 h-6" />
        </Link>
      </div>

      {/* Level Card */}
      <div className={`bg-gradient-to-r from-${levelConfig.color}-500 to-${levelConfig.color}-600 rounded-2xl p-6 text-white mb-8`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-6 h-6" />
              <span className="text-lg font-semibold">{level} уровень</span>
            </div>
            <div className="text-sm opacity-90">
              Бонус x{levelConfig.multiplier} к начислениям
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{stats?.bonusPoints?.toLocaleString()}</div>
            <div className="text-sm opacity-90">бонусов</div>
          </div>
        </div>
        
        {/* Progress to next level */}
        {level !== 'Platinum' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1 opacity-90">
              <span>До следующего уровня</span>
              <span>{stats?.nextLevelProgress}%</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${stats?.nextLevelProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <Coffee className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.totalPurchases}</div>
              <div className="text-sm text-gray-500">Покупок</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.totalSpent || 0, { compact: true })}
              </div>
              <div className="text-sm text-gray-500">Потрачено</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Gift className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.bonusPoints?.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Бонусов</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="text-lg font-bold truncate">{stats?.favoriteDrink || '—'}</div>
              <div className="text-sm text-gray-500">Любимый напиток</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-semibold mb-4">Быстрые действия</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/my/history" className="group bg-white rounded-xl border p-6 hover:shadow-lg transition">
          <History className="w-8 h-8 text-gray-400 group-hover:text-indigo-600 mb-4 transition" />
          <h3 className="font-semibold mb-1">История покупок</h3>
          <p className="text-sm text-gray-500">Все ваши покупки и чеки</p>
        </Link>

        <Link href="/my/bonuses" className="group bg-white rounded-xl border p-6 hover:shadow-lg transition">
          <Gift className="w-8 h-8 text-gray-400 group-hover:text-yellow-500 mb-4 transition" />
          <h3 className="font-semibold mb-1">Бонусы и акции</h3>
          <p className="text-sm text-gray-500">Обменять баллы на скидки</p>
        </Link>

        <Link href="/locations" className="group bg-white rounded-xl border p-6 hover:shadow-lg transition">
          <Coffee className="w-8 h-8 text-gray-400 group-hover:text-green-600 mb-4 transition" />
          <h3 className="font-semibold mb-1">Найти автомат</h3>
          <p className="text-sm text-gray-500">Ближайшие точки на карте</p>
        </Link>
      </div>
    </div>
  );
}
```

---

## 7. SPRINT 3: TELEGRAM ИНТЕГРАЦИЯ (Неделя 3, 8 часов)

### 7.1 Команды бота

#### Для клиентов
```
/start      — Регистрация и привязка аккаунта
/menu       — Меню напитков
/locations  — Ближайшие автоматы
/balance    — Баланс бонусов
/history    — История покупок (последние 10)
/promo      — Текущие акции
/support    — Связь с поддержкой
```

#### Для сотрудников
```
/tasks      — Мои задачи на сегодня
/task_done [id] — Отметить выполнение
/report     — Отправить фото-отчёт
/incident   — Создать инцидент
/stock [машина] — Остатки в автомате
/collect    — Начать инкассацию
```

#### Для менеджеров
```
/stats      — Сводка за день
/alerts     — Активные оповещения
/staff      — Статус сотрудников
```

### 7.2 Уведомления

```typescript
// Backend: telegram-notifications.service.ts

export enum NotificationType {
  // Клиентам
  PURCHASE_COMPLETE = 'purchase_complete',
  BONUS_EARNED = 'bonus_earned',
  PROMO_NEW = 'promo_new',
  
  // Сотрудникам
  TASK_ASSIGNED = 'task_assigned',
  TASK_REMINDER = 'task_reminder',
  LOW_STOCK_ALERT = 'low_stock',
  
  // Менеджерам
  DAILY_REPORT = 'daily_report',
  TASK_OVERDUE = 'task_overdue',
  INCIDENT_CREATED = 'incident_created',
}

const TEMPLATES = {
  [NotificationType.PURCHASE_COMPLETE]: (data) => `
☕ Покупка совершена!

${data.productName}
💰 ${formatCurrency(data.amount)}
🎁 +${data.bonusEarned} бонусов

Спасибо, что выбираете VendHub!
  `,
  
  [NotificationType.TASK_ASSIGNED]: (data) => `
📋 Новая задача!

${data.taskType}: ${data.machineName}
📍 ${data.location}
⏰ До ${data.deadline}

/task_done_${data.taskId} — отметить выполнение
  `,
  
  [NotificationType.LOW_STOCK_ALERT]: (data) => `
⚠️ Низкий остаток!

Аппарат: ${data.machineName}
📍 ${data.location}
Товар: ${data.productName}
Остаток: ${data.quantity} шт.

Требуется пополнение.
  `,
};
```

---

## 8. SPRINT 4: ФРАНЧАЙЗИНГ (Неделя 4, 16 часов)

### 8.1 Multi-tenant архитектура

```sql
-- Организации
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) DEFAULT 'franchise', -- 'main' | 'franchise'
  parent_id UUID REFERENCES organizations(id),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавить organization_id к существующим таблицам
ALTER TABLE machines ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE transactions ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE tasks ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Индексы для быстрой фильтрации
CREATE INDEX idx_machines_org ON machines(organization_id);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_transactions_org ON transactions(organization_id);
```

### 8.2 Изоляция данных

```typescript
// Middleware для tenant isolation
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    
    if (!user) {
      return next();
    }
    
    // Owner/Admin видят всё
    if (user.role === UserRole.OWNER && !user.organization_id) {
      req.tenantFilter = {};
      return next();
    }
    
    // Франчайзи видят только свою организацию
    if (user.organization_id) {
      req.tenantFilter = { organization_id: user.organization_id };
    }
    
    next();
  }
}

// Применение фильтра в сервисах
@Injectable()
export class MachinesService {
  async findAll(user: User, filters: MachineFilters) {
    const query = this.machineRepo.createQueryBuilder('machine');
    
    // Применяем tenant filter
    if (user.organization_id) {
      query.andWhere('machine.organization_id = :orgId', { 
        orgId: user.organization_id 
      });
    }
    
    // ... остальные фильтры
    
    return query.getMany();
  }
}
```

---

## 9. ROADMAP

### Визуальная карта

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
│   ├── 🔄 Purchase History
│   └── 🔄 Public API
│
├── Март (Sprint 3)
│   ├── 📋 Telegram Bot v2
│   ├── 📋 Push Notifications
│   ├── 📋 PWA Improvements
│   └── 📋 Mobile Optimizations
│
└── Апрель (Sprint 4)
    ├── 📋 Multi-tenant Schema
    ├── 📋 Franchise Dashboard
    ├── 📋 Analytics per Org
    └── 📋 White-label Options
```

### Оценка времени

| Sprint | Описание | Часы | Статус |
|--------|----------|------|--------|
| **Sprint 0** | Blockers (Roles, Currency) | 3ч | 🔴 TODO |
| **Sprint 1** | Office UX | 11ч | 🔴 TODO |
| **Sprint 2** | Customer Zone | 12ч | 🔴 TODO |
| **Sprint 3** | Telegram v2 | 8ч | 🔴 TODO |
| **Sprint 4** | Franchise | 16ч | 🔴 TODO |
| **ИТОГО** | | **50ч** | |

---

## 📋 ЧЕКЛИСТ ВНЕДРЕНИЯ

### Sprint 0 (День 1)
```
□ Backup текущего кода
□ Обновить frontend/src/types/users.ts
□ Обновить frontend/src/lib/utils.ts (currency)
□ Поиск и замена ₽ → сум
□ npm run build - без ошибок
□ Тест авторизации всех ролей
```

### Sprint 1 (Неделя 1)
```
□ Заменить Sidebar.tsx
□ Создать ExportButton.tsx
□ npm install xlsx
□ Добавить экспорт на страницы: machines, transactions, tasks
□ Протестировать на реальных данных
```

### Sprint 2 (Неделя 2)
```
□ Создать структуру /my/* страниц
□ Реализовать Customer Dashboard
□ Backend API для customer stats
□ История покупок с пагинацией
□ Бонусная система (начисление)
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

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

| Метрика | Сейчас | После Sprint 4 |
|---------|--------|----------------|
| **Office UX Score** | 75/100 | 90/100 |
| **Customer Experience** | 0/100 | 80/100 |
| **Telegram Coverage** | 70% | 95% |
| **Franchise Ready** | ❌ | ✅ |
| **Mobile PWA** | Basic | Full |

---

> **VendHub — это не просто софт, это экосистема, которая делает вендинг удобным для всех.**

**Ready to build! 🚀**
