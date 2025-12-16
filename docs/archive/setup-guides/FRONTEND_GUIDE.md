# VendHub Manager - Frontend Development Guide

## 🎨 Next.js 14 Dashboard with LiquidEther Background

Complete guide to building the VendHub Manager frontend with stunning animated background.

---

## 🚀 Quick Start

```bash
# Create Next.js 14 app
cd VendHub
npx create-next-app@latest frontend-dashboard --typescript --tailwind --app --no-src-dir --import-alias "@/*"

cd frontend-dashboard

# Install dependencies
npm install @tanstack/react-query axios recharts lucide-react date-fns
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select
npm install framer-motion clsx tailwind-merge

# Install shadcn/ui
npx shadcn@latest init

# Add LiquidEther background
npx shadcn@latest add @react-bits/LiquidEther-JS-CSS
```

---

## 📁 Project Structure

```
frontend-dashboard/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── machines/
│   │   ├── tasks/
│   │   ├── inventory/
│   │   ├── reports/
│   │   ├── incidents/
│   │   ├── complaints/
│   │   ├── notifications/
│   │   └── layout.tsx (with LiquidEther background)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/ (shadcn components)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── LiquidBackground.tsx
│   ├── dashboard/
│   │   ├── StatCard.tsx
│   │   ├── RevenueChart.tsx
│   │   └── TasksOverview.tsx
│   ├── machines/
│   ├── tasks/
│   └── notifications/
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useDashboard.ts
│   └── useNotifications.ts
└── types/
    └── index.ts
```

---

## 🎨 LiquidEther Background Implementation

### 1. Create Background Component

```tsx
// components/layout/LiquidBackground.tsx
'use client'

import { useEffect, useRef } from 'react'

export function LiquidBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // LiquidEther configuration
    const config = {
      colors: ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B'],
      size: 300,
      speed: 0.5,
      blur: 150,
    }

    // Initialize LiquidEther (implementation depends on the package)
    // This is a placeholder - adjust based on actual package API

    return () => {
      // Cleanup
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <div className="liquid-ether-container w-full h-full" />
    </div>
  )
}
```

### 2. Dashboard Layout with Background

```tsx
// app/(dashboard)/layout.tsx
import { LiquidBackground } from '@/components/layout/LiquidBackground'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen relative">
      <LiquidBackground />

      <div className="relative z-10">
        <Header />

        <div className="flex">
          <Sidebar />

          <main className="flex-1 p-8">
            <div className="backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
```

---

## 📊 Dashboard Components

### 1. Stats Cards with Glass Morphism

```tsx
// components/dashboard/StatCard.tsx
interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange'
}

export function StatCard({ title, value, change, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    orange: 'from-orange-500 to-red-500',
  }

  return (
    <div className="relative overflow-hidden rounded-xl backdrop-blur-md bg-white/10 border border-white/20 p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color]} opacity-20 rounded-full blur-3xl`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-200">{title}</p>
            <h3 className="text-3xl font-bold text-white mt-2">{value}</h3>
            {change !== undefined && (
              <p className={`text-sm mt-2 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
              </p>
            )}
          </div>
          <div className={`p-4 rounded-full bg-gradient-to-br ${colorClasses[color]} text-white`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 2. Revenue Chart Component

```tsx
// components/dashboard/RevenueChart.tsx
'use client'

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface RevenueChartProps {
  data: Array<{ date: string; revenue: number; expenses: number }>
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Revenue & Expenses</h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            stroke="#fff"
            strokeOpacity={0.5}
          />
          <YAxis stroke="#fff" strokeOpacity={0.5} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="#ef4444"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

## 🔐 Authentication Setup

```typescript
// lib/auth.ts
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function login(email: string, password: string) {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email,
    password,
  })

  localStorage.setItem('access_token', response.data.access_token)
  localStorage.setItem('refresh_token', response.data.refresh_token)

  return response.data
}

export async function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export function getAccessToken() {
  return localStorage.getItem('access_token')
}

export function isAuthenticated() {
  return !!getAccessToken()
}
```

```typescript
// lib/api.ts
import axios from 'axios'
import { getAccessToken } from './auth'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
```

---

## 📱 Web Push Notifications Setup

```typescript
// lib/notifications.ts
export async function subscribeToWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')

    // Get VAPID public key from backend
    const response = await fetch(`${API_URL}/web-push/public-key`)
    const { publicKey } = await response.json()

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    // Send subscription to backend
    await fetch(`${API_URL}/web-push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessToken()}`,
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
        },
        user_agent: navigator.userAgent,
      }),
    })

    return subscription
  } catch (error) {
    console.error('Failed to subscribe:', error)
    return null
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}
```

---

## 🎯 Key Features to Implement

### 1. **Dashboard Page**
- Real-time stats cards (revenue, tasks, incidents, machines)
- Revenue/Expenses chart (Recharts)
- Recent tasks list
- Active incidents
- Quick actions

### 2. **Machines Management**
- Grid/List view of all machines
- Status indicators (active, maintenance, offline)
- Click to view machine details
- Real-time inventory levels
- Task history per machine

### 3. **Tasks Management**
- Kanban board (Pending, In Progress, Completed)
- Task creation with photo upload
- Photo validation before completion
- Assign to operators
- Priority indicators

### 4. **Inventory Management**
- 3-level view (Warehouse, Operator, Machine)
- Low stock alerts
- Transfer inventory between levels
- Stock movement history

### 5. **Reports**
- Dashboard overview
- Machine-specific reports
- User performance reports
- PDF export buttons
- Date range filters

### 6. **Notifications Center**
- Real-time notification bell icon
- Unread count badge
- Mark as read functionality
- Notification settings
- Web push permission prompt

---

## 🎨 Color Scheme

```css
/* Primary Colors */
--primary-blue: #4F46E5;
--primary-purple: #7C3AED;
--primary-pink: #EC4899;
--primary-orange: #F59E0B;

/* Status Colors */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;

/* Glass Morphism */
--glass-bg: rgba(255, 255, 255, 0.1);
--glass-border: rgba(255, 255, 255, 0.2);
--glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
```

---

## 🚀 Deployment

```bash
# Build for production
npm run build

# Start production server
npm start

# Or deploy to Vercel
vercel deploy --prod
```

---

## 📚 Recommended Packages

- **UI Components**: shadcn/ui, Radix UI
- **Charts**: Recharts, Chart.js
- **State Management**: Zustand, React Query
- **Forms**: React Hook Form, Zod
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Date**: date-fns
- **HTTP**: Axios, SWR

---

## 🔥 Next Steps

1. Set up Next.js 14 project structure
2. Implement authentication flow
3. Create reusable UI components
4. Build dashboard with LiquidEther background
5. Integrate API endpoints
6. Add Web Push notifications
7. Implement real-time updates (WebSockets/Polling)
8. Add offline support (PWA)
9. Optimize performance
10. Deploy to production

---

## 💡 Tips

- Use Server Components where possible for better performance
- Implement loading states and skeletons
- Add error boundaries for graceful error handling
- Use React Query for data fetching and caching
- Implement optimistic updates for better UX
- Add keyboard shortcuts for power users
- Make it fully responsive (mobile-first)
- Implement dark mode toggle
- Add accessibility features (ARIA labels, keyboard navigation)
- Use TypeScript strictly for type safety

---

**Built with ❤️ for VendHub Manager**
