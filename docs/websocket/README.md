# WebSocket Module

## Overview

The WebSocket module provides real-time bidirectional communication for VendHub Manager using Socket.IO. It enables live dashboard updates, commission notifications, and queue monitoring.

## Key Features

- Real-time bidirectional communication
- JWT authentication for WebSocket connections
- Room-based subscriptions
- Rate limiting and connection throttling
- Dashboard metrics updates
- Queue job progress tracking
- Commission calculation notifications

## Gateway

**File**: `backend/src/modules/websocket/realtime.gateway.ts`

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, Socket>();
}
```

## Connection Configuration

### CORS Settings

```typescript
{
  cors: {
    origin: process.env.FRONTEND_URL,  // Allowed origin
    credentials: true,                  // Allow cookies
  },
  namespace: '/realtime',              // WebSocket namespace
}
```

### Rate Limiting

```typescript
// Connection rate limiting per IP
const MAX_CONNECTIONS_PER_IP = 10;
const CONNECTION_WINDOW_MS = 60000;  // 1 minute
```

## Authentication

### JWT Token Validation

Clients must provide JWT token on connection:

```typescript
// Extract token from multiple sources
const token =
  client.handshake.auth.token ||                           // Auth object
  client.handshake.headers.authorization?.replace('Bearer ', '') ||  // Header
  client.handshake.query.token;                            // Query param

// Verify token
const payload = this.jwtService.verify(token);
(client as AuthenticatedSocket).user = payload;
```

### Client Connection Flow

```
┌────────────────────────────────────────────────────────────┐
│                  CONNECTION FLOW                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Client initiates WebSocket connection                  │
│         │                                                  │
│         ▼                                                  │
│  2. Rate limit check (10 connections/minute per IP)        │
│         │                                                  │
│         ▼                                                  │
│  3. Extract JWT token from handshake                       │
│         │                                                  │
│         ├─── No token → Allow anonymous (limited access)   │
│         │                                                  │
│         ▼                                                  │
│  4. Verify JWT token                                       │
│         │                                                  │
│         ├─── Invalid → Disconnect with error               │
│         │                                                  │
│         ▼                                                  │
│  5. Connection successful                                  │
│         │                                                  │
│         ▼                                                  │
│  6. Emit 'connection:success' to client                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Events

### Client → Server Events

| Event | Handler | Description |
|-------|---------|-------------|
| `subscribe:dashboard` | `handleDashboardSubscribe` | Subscribe to dashboard updates |
| `unsubscribe:dashboard` | `handleDashboardUnsubscribe` | Unsubscribe from dashboard |
| `subscribe:queue` | `handleQueueSubscribe` | Subscribe to queue updates |
| `unsubscribe:queue` | `handleQueueUnsubscribe` | Unsubscribe from queue |
| `subscribe:contract` | `handleContractSubscribe` | Subscribe to specific contract |
| `unsubscribe:contract` | `handleContractUnsubscribe` | Unsubscribe from contract |

### Server → Client Events

| Event | Rooms | Description |
|-------|-------|-------------|
| `connection:success` | (direct) | Connection acknowledged |
| `commission:calculated` | dashboard, contract:* | Commission calculation done |
| `commission:updated` | dashboard, contract:* | Commission status changed |
| `queue:job-progress` | queue | Job progress update (0-100%) |
| `queue:job-completed` | queue | Job completed successfully |
| `queue:job-failed` | queue | Job failed with error |
| `queue:stats` | queue | Queue statistics update |
| `dashboard:metrics` | dashboard | Dashboard metrics update |

## Rooms

Clients can join rooms to receive specific updates:

| Room | Description |
|------|-------------|
| `dashboard` | Dashboard updates, commission notifications |
| `queue` | Queue job updates |
| `contract:{id}` | Updates for specific contract |

## Client-Side Usage

### React/TypeScript Example

```typescript
import { io, Socket } from 'socket.io-client';

const socket = io(`${API_URL}/realtime`, {
  auth: {
    token: localStorage.getItem('accessToken'),
  },
  transports: ['websocket', 'polling'],
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

socket.on('connection:success', (data) => {
  console.log('Authenticated:', data.authenticated);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

// Subscribe to dashboard
socket.emit('subscribe:dashboard');

// Listen for dashboard updates
socket.on('dashboard:metrics', (data) => {
  updateDashboardMetrics(data);
});

socket.on('commission:calculated', (data) => {
  showNotification(`New commission: ${data.commissionAmount} UZS`);
});

// Cleanup
return () => {
  socket.emit('unsubscribe:dashboard');
  socket.disconnect();
};
```

### React Hook

```typescript
function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(`${API_URL}/realtime`, {
      auth: { token: getToken() },
    });

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return { socket, isConnected };
}
```

## Server-Side Emission

### From Services

```typescript
@Injectable()
export class CommissionService {
  constructor(
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async calculateCommission(contractId: string): Promise<void> {
    const calculation = await this.performCalculation(contractId);

    // Emit real-time update
    this.realtimeGateway.emitCommissionCalculated({
      id: calculation.id,
      contractId: contractId,
      commissionAmount: calculation.commission_amount,
      totalRevenue: calculation.total_revenue,
      period: `${calculation.period_start} - ${calculation.period_end}`,
    });
  }
}
```

### Available Emission Methods

```typescript
class RealtimeGateway {
  // Commission events
  emitCommissionCalculated(data: CommissionCalculatedPayload): void;
  emitCommissionUpdated(data: CommissionUpdatedPayload): void;

  // Queue events
  emitJobProgress(data: JobProgressPayload): void;
  emitJobCompleted(data: JobCompletedPayload): void;
  emitJobFailed(data: JobFailedPayload): void;
  emitQueueStats(data: QueueStatsPayload): void;

  // Dashboard events
  emitDashboardMetrics(data: DashboardMetricsPayload): void;

  // Utility methods
  getConnectedClientsCount(): number;
  getClientsInRoom(room: string): Promise<number>;
}
```

## Event Payloads

### CommissionCalculatedPayload

```typescript
interface CommissionCalculatedPayload {
  id: string;
  contractId: string;
  commissionAmount: number;
  totalRevenue: number;
  period: string;
}
```

### JobProgressPayload

```typescript
interface JobProgressPayload {
  jobId: string;
  type: string;
  progress: number;  // 0-100
  message?: string;
}
```

### DashboardMetricsPayload

```typescript
interface DashboardMetricsPayload {
  totalRevenue: number;
  totalCommissions: number;
  pendingPayments: number;
  overduePayments: number;
  activeContracts: number;
  timestamp: string;
}
```

## Security

### Connection Throttling

```typescript
// Rate limit check
const now = Date.now();
const tracker = connectionTracker.get(clientIp);

if (tracker && now < tracker.resetTime && tracker.count >= MAX_CONNECTIONS_PER_IP) {
  client.emit('error', { message: 'Too many connections' });
  client.disconnect(true);
  return;
}
```

### Token Validation

- JWT tokens are verified on connection
- Invalid tokens result in immediate disconnect
- Anonymous connections are allowed but have limited access

## Error Handling

### Connection Errors

```typescript
// Server-side error handling
try {
  const payload = this.jwtService.verify(token);
  // ...
} catch (error) {
  this.logger.warn(`Client ${client.id} provided invalid token - disconnecting`);
  client.emit('error', { message: 'Invalid authentication token' });
  client.disconnect();
}
```

### Client-side Reconnection

```typescript
const socket = io(URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);
});
```

## Monitoring

### Get Connection Count

```typescript
// Get total connected clients
const count = this.realtimeGateway.getConnectedClientsCount();

// Get clients in specific room
const dashboardClients = await this.realtimeGateway.getClientsInRoom('dashboard');
```

### Logging

```typescript
this.logger.log(`Client connected: ${clientId} (Total: ${this.connectedClients.size})`);
this.logger.log(`Client ${client.id} subscribed to dashboard updates`);
this.logger.debug(`Emitted commission:calculated for contract ${data.contractId}`);
```

## Integration with Other Modules

### Counterparty

- Commission calculation notifications
- Contract updates

### Bull Queue

- Job progress updates
- Queue statistics

### Dashboard

- Real-time metrics updates

## Best Practices

1. **Always Authenticate**: Require JWT for sensitive data
2. **Use Rooms**: Organize clients into rooms for targeted updates
3. **Clean Up**: Unsubscribe when components unmount
4. **Handle Reconnection**: Implement client-side reconnection logic
5. **Rate Limit**: Protect against connection flooding
6. **Monitor Connections**: Track active connections for debugging

## Related Modules

- [Auth](../auth/README.md) - JWT token generation
- [Counterparty](../counterparty/README.md) - Commission events
- [Analytics](../analytics/README.md) - Dashboard metrics
- [Monitoring](../monitoring/README.md) - Connection metrics
