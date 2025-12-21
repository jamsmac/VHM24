# Frontend Documentation

## Overview

VendHub Manager Frontend is a Next.js 16 application with React 19, providing a comprehensive dashboard for vending machine fleet management.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework (App Router) |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| TailwindCSS | 3.x | Styling |
| Radix UI | latest | Accessible UI primitives |
| TanStack Query | 5.x | Server state management |
| TanStack Table | 8.x | Data tables |
| Zustand | 5.x | Client state management |
| React Hook Form | 7.x | Form handling |
| Zod | 4.x | Schema validation |
| Recharts | 2.x | Charts and analytics |
| Leaflet | 1.x | Maps |
| Storybook | 8.x | Component development |

## Project Structure

```
frontend/src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth pages (login, password reset)
│   ├── (public)/             # Public pages (menu, locations)
│   └── dashboard/            # Protected dashboard pages
│       ├── access-requests/
│       ├── alerts/
│       ├── analytics/
│       ├── audit/
│       ├── commissions/
│       ├── complaints/
│       ├── contracts/
│       ├── counterparties/
│       ├── equipment/
│       ├── import/
│       ├── incidents/
│       ├── inventory/
│       ├── locations/
│       ├── machines/
│       ├── map/
│       ├── monitoring/
│       ├── notifications/
│       ├── opening-balances/
│       ├── products/
│       ├── profile/
│       ├── purchases/
│       ├── recipes/
│       ├── reports/
│       ├── scan/
│       ├── scheduled-tasks/
│       ├── security/
│       ├── settings/
│       ├── setup-wizard/
│       ├── tasks/
│       ├── telegram/
│       ├── transactions/
│       └── users/
├── components/               # React components
│   ├── ui/                   # Base UI components (50+ components)
│   ├── layout/               # Layout components
│   ├── dashboard/            # Dashboard widgets
│   ├── charts/               # Chart components
│   ├── tasks/                # Task components
│   ├── machines/             # Machine components
│   ├── machine-access/       # Access control components
│   ├── inventory/            # Inventory components
│   ├── equipment/            # Equipment components
│   ├── incidents/            # Incident components
│   ├── security/             # Security components
│   ├── monitoring/           # Monitoring widgets
│   ├── realtime/             # Real-time components
│   ├── notifications/        # Notification UI
│   ├── audit/                # Audit log viewer
│   ├── import/               # Data import UI
│   ├── search/               # Search components
│   ├── map/                  # Map components
│   └── help/                 # Help components
├── hooks/                    # Custom React hooks
├── lib/                      # Utilities and API clients
├── providers/                # Context providers
├── types/                    # TypeScript type definitions
├── i18n/                     # Internationalization
├── stories/                  # Storybook stories
└── test/                     # Test utilities
```

## Authentication

### Security Architecture (SEC-1)

The frontend uses httpOnly cookies for secure token storage:

```typescript
// lib/axios.ts
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,  // Essential for httpOnly cookies
})
```

- **Access tokens**: httpOnly cookies (XSS immune)
- **Refresh tokens**: httpOnly cookies (XSS immune)
- **No tokens in JavaScript** - Browser handles cookies automatically
- **Automatic refresh** - 401 triggers /auth/refresh

### useAuth Hook

```typescript
import { useAuth } from '@/hooks/useAuth'

function MyComponent() {
  const { user, loading, isAuthenticated, login, logout } = useAuth()

  if (loading) return <Spinner />
  if (!isAuthenticated) return <Redirect to="/login" />

  return <div>Welcome, {user.full_name}!</div>
}
```

## API Clients

All API clients are in `lib/` directory:

| File | Purpose |
|------|---------|
| `axios.ts` | Base axios instance with auth |
| `auth-api.ts` | Authentication endpoints |
| `machines-api.ts` | Machine management |
| `tasks-api.ts` | Task management |
| `inventory-api.ts` | Inventory operations |
| `users-api.ts` | User management |
| `incidents-api.ts` | Incident management |
| `equipment-api.ts` | Equipment management |
| `transactions-api.ts` | Financial transactions |
| `reports-api.ts` | Reports generation |
| `analytics-api.ts` | Analytics data |
| `monitoring-api.ts` | System monitoring |
| `security-api.ts` | Security features |
| `audit-log-api.ts` | Audit logs |
| `files-api.ts` | File uploads |
| `notifications-api.ts` | Notifications |
| `telegram-api.ts` | Telegram integration |
| `client-api.ts` | Client platform API |

### API Client Pattern

```typescript
// lib/machines-api.ts
import { apiClient } from './axios'
import { Machine, CreateMachineDto } from '@/types/machines'

export const machinesApi = {
  getAll: async (params?: MachineQueryParams) => {
    const { data } = await apiClient.get<Machine[]>('/machines', { params })
    return data
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<Machine>(`/machines/${id}`)
    return data
  },

  create: async (dto: CreateMachineDto) => {
    const { data } = await apiClient.post<Machine>('/machines', dto)
    return data
  },

  update: async (id: string, dto: UpdateMachineDto) => {
    const { data } = await apiClient.patch<Machine>(`/machines/${id}`, dto)
    return data
  },

  delete: async (id: string) => {
    await apiClient.delete(`/machines/${id}`)
  },
}
```

## State Management

### TanStack Query (Server State)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { machinesApi } from '@/lib/machines-api'

// Fetch machines
function useMachines() {
  return useQuery({
    queryKey: ['machines'],
    queryFn: machinesApi.getAll,
  })
}

// Create machine with cache invalidation
function useCreateMachine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: machinesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
    },
  })
}
```

### Zustand (Client State)

For local UI state that doesn't need server sync.

## Providers

Located in `providers/`:

| Provider | Purpose |
|----------|---------|
| `QueryProvider` | TanStack Query client |
| `ThemeProvider` | Dark/light theme |
| `I18nProvider` | Internationalization |
| `HelpProvider` | Help system |
| `CommandPaletteProvider` | Command palette (Cmd+K) |

### Provider Setup

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider>
          <I18nProvider>
            <QueryProvider>
              <HelpProvider>
                <CommandPaletteProvider>
                  {children}
                </CommandPaletteProvider>
              </HelpProvider>
            </QueryProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useAuth` | Authentication state |
| `useAuthEvents` | Auth event subscription |
| `useWebSocket` | WebSocket connection |
| `useActiveAlertsCount` | Alert count badge |
| `useConfirm` | Confirmation dialogs |
| `useAnnounce` | Screen reader announcements |
| `useAbortController` | Request cancellation |

## UI Components

### Base Components (ui/)

50+ components including:
- Button, Input, Label, Checkbox
- Dialog, Sheet, Popover, Tooltip
- Table, Card, Badge, Avatar
- Select, Combobox, DatePicker
- Tabs, Accordion, Collapsible
- Toast, Alert, Progress
- Form components with validation

### Component Usage

```tsx
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

function MyForm() {
  return (
    <Card>
      <CardHeader>Create Machine</CardHeader>
      <CardContent>
        <Input placeholder="Machine number" />
        <Button type="submit">Create</Button>
      </CardContent>
    </Card>
  )
}
```

## Forms

Using React Hook Form with Zod validation:

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const machineSchema = z.object({
  machine_number: z.string().min(1, 'Required'),
  name: z.string().min(2, 'Min 2 characters'),
  location_id: z.string().uuid(),
})

function MachineForm() {
  const form = useForm({
    resolver: zodResolver(machineSchema),
    defaultValues: { machine_number: '', name: '', location_id: '' },
  })

  const onSubmit = (data) => {
    // Handle submit
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('machine_number')} />
      {form.formState.errors.machine_number && (
        <span>{form.formState.errors.machine_number.message}</span>
      )}
      <Button type="submit">Submit</Button>
    </form>
  )
}
```

## Types

TypeScript types in `types/`:

| File | Types |
|------|-------|
| `machines.ts` | Machine, MachineStatus |
| `tasks.ts` | Task, TaskStatus, TaskType |
| `users.ts` | User, UserRole |
| `inventory.ts` | InventoryItem, Transfer |
| `incidents.ts` | Incident, IncidentStatus |
| `equipment.ts` | Equipment, Component |
| `transactions.ts` | Transaction, TransactionType |
| `contracts.ts` | Contract, Commission |
| `counterparty.ts` | Counterparty |
| `machine-access.ts` | MachineAccess, AccessRole |
| `client.ts` | Client platform types |
| `common.ts` | Shared types |

## Dashboard Routes

### Main Sections

| Route | Purpose |
|-------|---------|
| `/dashboard` | Main dashboard |
| `/dashboard/machines` | Machine management |
| `/dashboard/tasks` | Task management |
| `/dashboard/inventory/*` | Inventory (warehouse/operator/machine) |
| `/dashboard/users` | User management |
| `/dashboard/incidents` | Incident tracking |
| `/dashboard/equipment` | Equipment management |
| `/dashboard/transactions` | Financial transactions |
| `/dashboard/reports/*` | Reports (sales, inventory, financial) |
| `/dashboard/analytics` | Analytics dashboard |
| `/dashboard/monitoring` | System monitoring |
| `/dashboard/security/*` | Security settings |
| `/dashboard/settings` | System settings |

### Public Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/menu` | Public machine menu |
| `/locations` | Machine locations |
| `/cooperation` | Partnership info |
| `/login` | Login page |
| `/change-password` | Password reset |

## Internationalization

Using next-intl with Russian and English:

```typescript
// i18n/messages/ru.json
{
  "common": {
    "save": "Сохранить",
    "cancel": "Отмена",
    "delete": "Удалить"
  },
  "machines": {
    "title": "Автоматы",
    "create": "Создать автомат"
  }
}
```

```tsx
import { useTranslations } from 'next-intl'

function MyComponent() {
  const t = useTranslations('machines')
  return <h1>{t('title')}</h1>  // "Автоматы"
}
```

## Testing

Using Vitest with React Testing Library:

```bash
npm run test           # Run tests
npm run test:ui        # Interactive UI
npm run test:coverage  # Coverage report
npm run test:watch     # Watch mode
```

```typescript
// Example test
import { render, screen } from '@testing-library/react'
import { MachineCard } from './MachineCard'

test('displays machine number', () => {
  render(<MachineCard machine={{ machine_number: 'M-001', name: 'Test' }} />)
  expect(screen.getByText('M-001')).toBeInTheDocument()
})
```

## Storybook

Component development and documentation:

```bash
npm run storybook       # Start Storybook (port 6006)
npm run build-storybook # Build static Storybook
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Build
npm run build
npm run start
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_APP_NAME=VendHub Manager
```

## Related Documentation

- [Auth Module](../auth/README.md) - Backend authentication
- [API Documentation](../API_DOCUMENTATION.md) - API reference
- [Architecture](../ARCHITECTURE.md) - System architecture
