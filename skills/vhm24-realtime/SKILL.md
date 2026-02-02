---
name: vhm24-realtime
description: |
  VendHub Realtime - паттерны реального времени.
  WebSocket, телеметрия автоматов, live карта, уведомления.
  Использовать при работе с real-time данными и WebSocket.
---

# VendHub Realtime

Паттерны для работы с данными в реальном времени.

## Когда использовать

- Телеметрия автоматов
- Live карта с обновлениями
- Real-time уведомления
- Статусы онлайн/офлайн
- Мониторинг бункеров

## WebSocket настройка

### Серверная часть

```typescript
// server/ws.ts
import { WebSocketServer, WebSocket } from "ws";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";

const pubClient = new Redis(process.env.REDIS_URL!);
const subClient = pubClient.duplicate();

export const wss = new WebSocketServer({ noServer: true });

// Комнаты для группировки
const rooms = new Map<string, Set<WebSocket>>();

wss.on("connection", (ws, req) => {
  const userId = extractUserId(req);

  // Подписка на обновления пользователя
  joinRoom(ws, `user:${userId}`);

  ws.on("message", (data) => {
    const message = JSON.parse(data.toString());
    handleMessage(ws, message);
  });

  ws.on("close", () => {
    leaveAllRooms(ws);
  });
});

function joinRoom(ws: WebSocket, room: string) {
  if (!rooms.has(room)) {
    rooms.set(room, new Set());
  }
  rooms.get(room)!.add(ws);
}

function broadcast(room: string, data: unknown) {
  const clients = rooms.get(room);
  if (!clients) return;

  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Публикация событий
export function publishMachineStatus(machineId: number, status: MachineStatus) {
  broadcast(`machine:${machineId}`, {
    type: "MACHINE_STATUS",
    payload: { machineId, status, timestamp: Date.now() },
  });

  // Также в общий канал для карты
  broadcast("machines:all", {
    type: "MACHINE_STATUS",
    payload: { machineId, status, timestamp: Date.now() },
  });
}

export function publishAlert(alert: Alert) {
  broadcast(`user:${alert.userId}`, {
    type: "ALERT",
    payload: alert,
  });
}
```

### Клиентская часть

```typescript
// lib/websocket.ts
import { create } from "zustand";

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribe: (room: string) => void;
  unsubscribe: (room: string) => void;
}

export const useWebSocket = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);

    socket.onopen = () => {
      set({ socket, isConnected: true });
    };

    socket.onclose = () => {
      set({ isConnected: false });
      // Автоматическое переподключение
      setTimeout(() => get().connect(), 3000);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  },

  disconnect: () => {
    get().socket?.close();
    set({ socket: null, isConnected: false });
  },

  subscribe: (room: string) => {
    get().socket?.send(JSON.stringify({ type: "SUBSCRIBE", room }));
  },

  unsubscribe: (room: string) => {
    get().socket?.send(JSON.stringify({ type: "UNSUBSCRIBE", room }));
  },
}));
```

### Хук подписки

```typescript
// hooks/useRealtimeSubscription.ts
import { useEffect, useCallback } from "react";
import { useWebSocket } from "@/lib/websocket";

interface UseRealtimeOptions<T> {
  room: string;
  eventType: string;
  onMessage: (data: T) => void;
}

export function useRealtimeSubscription<T>({
  room,
  eventType,
  onMessage,
}: UseRealtimeOptions<T>) {
  const { socket, isConnected, subscribe, unsubscribe } = useWebSocket();

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.type === eventType) {
        onMessage(message.payload);
      }
    },
    [eventType, onMessage]
  );

  useEffect(() => {
    if (!isConnected || !socket) return;

    subscribe(room);
    socket.addEventListener("message", handleMessage);

    return () => {
      unsubscribe(room);
      socket.removeEventListener("message", handleMessage);
    };
  }, [isConnected, socket, room, handleMessage, subscribe, unsubscribe]);

  return { isConnected };
}
```

## Телеметрия автоматов

### Типы данных

```typescript
// types/telemetry.ts
export interface MachineTelemetry {
  machineId: number;
  timestamp: Date;
  status: "online" | "offline" | "maintenance" | "error";
  temperature: number;
  humidity: number;
  bunkers: BunkerLevel[];
  errors: MachineError[];
  lastSale?: Date;
  uptime: number; // секунды
}

export interface BunkerLevel {
  bunkerId: number;
  ingredientId: number;
  ingredientName: string;
  currentLevel: number; // граммы
  maxLevel: number;
  percentage: number;
  lowLevelAlert: boolean;
}

export interface MachineError {
  code: string;
  message: string;
  severity: "warning" | "error" | "critical";
  occurredAt: Date;
}
```

### Компонент мониторинга

```tsx
// components/MachineMonitor.tsx
function MachineMonitor({ machineId }: { machineId: number }) {
  const [telemetry, setTelemetry] = useState<MachineTelemetry | null>(null);

  useRealtimeSubscription({
    room: `machine:${machineId}`,
    eventType: "TELEMETRY",
    onMessage: (data: MachineTelemetry) => {
      setTelemetry(data);
    },
  });

  // Начальная загрузка
  const { data: initialData } = api.machines.getTelemetry.useQuery({ machineId });

  useEffect(() => {
    if (initialData && !telemetry) {
      setTelemetry(initialData);
    }
  }, [initialData, telemetry]);

  if (!telemetry) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Статус */}
      <div className="flex items-center gap-4">
        <StatusIndicator status={telemetry.status} />
        <div>
          <p className="text-sm text-gray-500">Последнее обновление</p>
          <p className="font-medium">{formatRelative(telemetry.timestamp)}</p>
        </div>
      </div>

      {/* Датчики */}
      <div className="grid grid-cols-2 gap-4">
        <SensorCard
          icon={<Thermometer />}
          label="Температура"
          value={`${telemetry.temperature}°C`}
          status={telemetry.temperature > 30 ? "warning" : "normal"}
        />
        <SensorCard
          icon={<Droplets />}
          label="Влажность"
          value={`${telemetry.humidity}%`}
          status={telemetry.humidity > 80 ? "warning" : "normal"}
        />
      </div>

      {/* Бункеры */}
      <Card>
        <CardHeader>
          <CardTitle>Уровень ингредиентов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {telemetry.bunkers.map((bunker) => (
            <BunkerLevelBar key={bunker.bunkerId} bunker={bunker} />
          ))}
        </CardContent>
      </Card>

      {/* Ошибки */}
      {telemetry.errors.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-600">Ошибки</CardTitle>
          </CardHeader>
          <CardContent>
            {telemetry.errors.map((error, index) => (
              <ErrorAlert key={index} error={error} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Индикатор уровня бункера

```tsx
function BunkerLevelBar({ bunker }: { bunker: BunkerLevel }) {
  const getColor = (percentage: number) => {
    if (percentage < 20) return "bg-red-500";
    if (percentage < 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{bunker.ingredientName}</span>
        <span className={bunker.lowLevelAlert ? "text-red-600 font-medium" : ""}>
          {bunker.percentage.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", getColor(bunker.percentage))}
          style={{ width: `${bunker.percentage}%` }}
        />
      </div>
      {bunker.lowLevelAlert && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Низкий уровень
        </p>
      )}
    </div>
  );
}
```

## Live карта

```tsx
// components/RealtimeMap.tsx
function RealtimeMap() {
  const [machines, setMachines] = useState<Map<number, MachineMarker>>(new Map());

  // Начальная загрузка
  const { data: initialMachines } = api.machines.listWithLocation.useQuery();

  useEffect(() => {
    if (initialMachines) {
      const map = new Map(
        initialMachines.map((m) => [m.id, m])
      );
      setMachines(map);
    }
  }, [initialMachines]);

  // Real-time обновления
  useRealtimeSubscription({
    room: "machines:all",
    eventType: "MACHINE_STATUS",
    onMessage: (update: { machineId: number; status: string }) => {
      setMachines((prev) => {
        const machine = prev.get(update.machineId);
        if (!machine) return prev;

        const next = new Map(prev);
        next.set(update.machineId, { ...machine, status: update.status });
        return next;
      });
    },
  });

  return (
    <MapContainer center={[41.2995, 69.2401]} zoom={12} className="h-full w-full">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {Array.from(machines.values()).map((machine) => (
        <Marker
          key={machine.id}
          position={[machine.lat, machine.lng]}
          icon={getMarkerIcon(machine.status)}
        >
          <Popup>
            <MachinePopup machine={machine} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function getMarkerIcon(status: string) {
  const colors = {
    online: "#10b981",
    offline: "#ef4444",
    maintenance: "#f59e0b",
    error: "#dc2626",
  };

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${colors[status] || colors.offline};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}
```

## Уведомления

```tsx
// components/NotificationCenter.tsx
function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  useRealtimeSubscription({
    room: `user:${user?.id}`,
    eventType: "NOTIFICATION",
    onMessage: (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);

      // Toast для важных уведомлений
      if (notification.priority === "high") {
        toast({
          title: notification.title,
          description: notification.message,
          variant: notification.type === "error" ? "destructive" : "default",
        });
      }
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {notifications.filter((n) => !n.read).length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {notifications.filter((n) => !n.read).length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Уведомления</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
          {notifications.length === 0 && (
            <p className="p-4 text-center text-gray-500">Нет уведомлений</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

## Ссылки

- `references/websocket-events.md` - Типы событий WebSocket
- `references/telemetry-protocol.md` - Протокол телеметрии
