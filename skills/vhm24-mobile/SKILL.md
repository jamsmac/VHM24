---
name: vhm24-mobile
description: |
  VendHub Mobile Patterns - паттерны для Telegram WebApp и мобильных интерфейсов.
  Staff Mobile App, Client Mobile App, touch-friendly UI, offline режим.
  Использовать при создании мобильных экранов или Telegram Mini App.
---

# VendHub Mobile Patterns

Паттерны для мобильных приложений VendHub: Staff App и Client App.

## Когда использовать

- Создание экранов Staff Mobile App
- Создание экранов Client Mobile App
- Telegram WebApp интеграция
- Touch-friendly интерфейсы
- Offline-first паттерны

## Telegram WebApp интеграция

### Инициализация

```typescript
// lib/telegram.ts
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      photo_url?: string;
    };
    auth_date: number;
    hash: string;
  };
  colorScheme: "light" | "dark";
  themeParams: {
    bg_color: string;
    text_color: string;
    hint_color: string;
    link_color: string;
    button_color: string;
    button_text_color: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
}

export const useTelegram = () => {
  const tg = window.Telegram?.WebApp;

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    colorScheme: tg?.colorScheme || "light",
    themeParams: tg?.themeParams,
    isReady: !!tg,
  };
};
```

### Хук аутентификации

```typescript
// hooks/useTelegramAuth.ts
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export const useTelegramAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      setIsLoading(false);
      return;
    }

    tg.ready();
    tg.expand();

    // Аутентификация через initData
    const authenticate = async () => {
      try {
        const result = await api.auth.telegram.mutate({
          initData: tg.initData,
        });
        setUser(result.user);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Telegram auth failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    authenticate();
  }, []);

  return { isAuthenticated, isLoading, user };
};
```

## Staff Mobile App паттерны

### Структура экрана

```tsx
// screens/StaffHome.tsx
import { useTelegram } from "@/lib/telegram";
import { BottomNavigation } from "@/components/mobile/BottomNavigation";

export function StaffHome() {
  const { user, tg } = useTelegram();

  // Haptic feedback при действиях
  const handleTaskComplete = () => {
    tg?.HapticFeedback.notificationOccurred("success");
    // ...
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Добро пожаловать,</p>
            <h1 className="font-semibold">{user?.first_name}</h1>
          </div>
          <DutyToggle />
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-4">
        <TasksList onComplete={handleTaskComplete} />
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation
        items={[
          { icon: Home, label: "Главная", path: "/" },
          { icon: ListTodo, label: "Задачи", path: "/tasks" },
          { icon: Map, label: "Маршрут", path: "/route" },
          { icon: User, label: "Профиль", path: "/profile" },
        ]}
      />
    </div>
  );
}
```

### Duty Toggle (смена статуса)

```tsx
function DutyToggle() {
  const [isOnDuty, setIsOnDuty] = useState(false);
  const { tg } = useTelegram();

  const toggleDuty = () => {
    tg?.HapticFeedback.impactOccurred("medium");
    setIsOnDuty(!isOnDuty);
  };

  return (
    <button
      onClick={toggleDuty}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-all",
        isOnDuty
          ? "bg-green-500 text-white"
          : "bg-gray-200 dark:bg-gray-700 text-gray-600"
      )}
    >
      {isOnDuty ? "На смене" : "Не на смене"}
    </button>
  );
}
```

### Swipeable Task Card

```tsx
function TaskCard({ task, onComplete, onSkip }: TaskCardProps) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);

  const handleTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    const diff = e.touches[0].clientX - startX.current;
    setOffset(Math.max(-100, Math.min(100, diff)));
  };

  const handleTouchEnd = () => {
    if (offset > 60) {
      onComplete(task.id);
    } else if (offset < -60) {
      onSkip(task.id);
    }
    setOffset(0);
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background actions */}
      <div className="absolute inset-y-0 left-0 w-20 bg-green-500 flex items-center justify-center">
        <Check className="w-6 h-6 text-white" />
      </div>
      <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
        <X className="w-6 h-6 text-white" />
      </div>

      {/* Card content */}
      <div
        className="relative bg-white dark:bg-gray-800 p-4 transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
      >
        <div className="flex items-center gap-3">
          <PriorityBadge priority={task.priority} />
          <div className="flex-1">
            <h3 className="font-medium">{task.title}</h3>
            <p className="text-sm text-gray-500">{task.machine.name}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
```

## Client Mobile App паттерны

### Карта с автоматами

```tsx
function NearbyMachinesMap() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const { data: machines } = api.machines.nearby.useQuery(
    { lat: userLocation?.[0], lng: userLocation?.[1], radius: 5000 },
    { enabled: !!userLocation }
  );

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.error(err)
    );
  }, []);

  return (
    <div className="relative h-[50vh]">
      <MapContainer center={userLocation || [41.2995, 69.2401]} zoom={14}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {userLocation && <Marker position={userLocation} icon={userIcon} />}

        {machines?.map((machine) => (
          <Marker
            key={machine.id}
            position={[machine.lat, machine.lng]}
            icon={machineIcon(machine.status)}
            eventHandlers={{
              click: () => openMachineSheet(machine),
            }}
          />
        ))}
      </MapContainer>

      {/* Bottom Sheet with machine list */}
      <MachineListSheet machines={machines} />
    </div>
  );
}
```

### Pull to Refresh

```tsx
function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!pulling) return;
    const diff = e.touches[0].clientY - startY.current;
    setPullDistance(Math.min(100, Math.max(0, diff)));
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60) {
      await onRefresh();
    }
    setPullDistance(0);
    setPulling(false);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="overflow-y-auto"
    >
      <div
        className="flex items-center justify-center transition-all"
        style={{ height: pullDistance }}
      >
        <Loader2 className={cn("w-6 h-6", pullDistance > 60 && "animate-spin")} />
      </div>
      {children}
    </div>
  );
}
```

## Bottom Navigation

```tsx
interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: number;
}

function BottomNavigation({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tg } = useTelegram();

  const navigate = (path: string) => {
    tg?.HapticFeedback.selectionChanged();
    router.push(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full relative",
                isActive ? "text-amber-600" : "text-gray-500"
              )}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs mt-1">{item.label}</span>
              {item.badge && (
                <span className="absolute top-2 right-1/4 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

## Safe Area для iPhone

```css
/* globals.css */
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Минимальный отступ снизу для навигации */
.pb-safe {
  padding-bottom: calc(env(safe-area-inset-bottom) + 4rem);
}
```

## Offline режим

```typescript
// hooks/useOfflineQueue.ts
import { useEffect, useState } from "react";

interface QueuedAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const addToQueue = (action: Omit<QueuedAction, "id" | "timestamp">) => {
    const newAction: QueuedAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setQueue((prev) => [...prev, newAction]);
    localStorage.setItem("offlineQueue", JSON.stringify([...queue, newAction]));
  };

  const processQueue = async () => {
    for (const action of queue) {
      try {
        await api[action.type].mutate(action.payload);
        setQueue((prev) => prev.filter((a) => a.id !== action.id));
      } catch (error) {
        console.error("Failed to process queued action:", error);
      }
    }
  };

  return { queue, addToQueue, isOnline };
}
```

## Ссылки

- `references/telegram-webapp-api.md` - Полная документация Telegram WebApp
- `references/touch-patterns.md` - Touch-friendly паттерны
