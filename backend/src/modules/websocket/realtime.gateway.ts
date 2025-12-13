import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Connection rate limiting
const connectionTracker = new Map<string, { count: number; resetTime: number }>();
const MAX_CONNECTIONS_PER_IP = 10;
const CONNECTION_WINDOW_MS = 60000; // 1 minute

/**
 * Realtime Gateway
 *
 * WebSocket server for real-time updates using Socket.IO
 *
 * Events emitted to clients:
 * - commission:calculated - New commission calculation completed
 * - commission:updated - Commission status updated
 * - queue:job-progress - Job progress update (0-100%)
 * - queue:job-completed - Job completed successfully
 * - queue:job-failed - Job failed with error
 * - queue:stats - Queue statistics update
 * - dashboard:metrics - Dashboard metrics update
 *
 * Events received from clients:
 * - subscribe:dashboard - Subscribe to dashboard updates
 * - subscribe:queue - Subscribe to queue updates
 * - unsubscribe:dashboard - Unsubscribe from dashboard
 * - unsubscribe:queue - Unsubscribe from queue
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('RealtimeGateway');
  private connectedClients = new Map<string, Socket>();

  constructor(private jwtService: JwtService) {}

  /**
   * Gateway initialized
   */
  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway initialized on /realtime namespace');
  }

  /**
   * Client connected
   *
   * Validates JWT token from handshake auth or query
   * Implements rate limiting to prevent connection flood attacks
   */
  async handleConnection(client: Socket) {
    const clientIp = client.handshake.address || 'unknown';

    // Rate limit connections per IP
    const now = Date.now();
    const tracker = connectionTracker.get(clientIp);

    if (tracker) {
      if (now < tracker.resetTime) {
        if (tracker.count >= MAX_CONNECTIONS_PER_IP) {
          this.logger.warn(`Rate limit exceeded for IP ${clientIp} - disconnecting`);
          client.emit('error', { message: 'Too many connections' });
          client.disconnect(true);
          return;
        }
        tracker.count++;
      } else {
        connectionTracker.set(clientIp, { count: 1, resetTime: now + CONNECTION_WINDOW_MS });
      }
    } else {
      connectionTracker.set(clientIp, { count: 1, resetTime: now + CONNECTION_WINDOW_MS });
    }

    try {
      // Extract token from handshake auth or query params
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '') ||
        client.handshake.query.token;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token - allowing anonymous access`);
        // Allow anonymous connections but mark them
        (client as any).user = null;
      } else {
        // Verify JWT token
        try {
          const payload = this.jwtService.verify(token as string);
          (client as any).user = payload;
          this.logger.log(`Client ${client.id} authenticated as user ${payload.sub}`);
        } catch (error) {
          this.logger.warn(`Client ${client.id} provided invalid token - disconnecting`);
          client.emit('error', { message: 'Invalid authentication token' });
          client.disconnect();
          return;
        }
      }

      const clientId = client.id;
      this.connectedClients.set(clientId, client);
      this.logger.log(`Client connected: ${clientId} (Total: ${this.connectedClients.size})`);

      // Send welcome message
      client.emit('connection:success', {
        message: 'Connected to VendHub realtime server',
        clientId,
        authenticated: !!(client as any).user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error during client connection: ${error.message}`, error.stack);
      client.disconnect();
    }
  }

  /**
   * Client disconnected
   */
  handleDisconnect(client: Socket) {
    const clientId = client.id;
    this.connectedClients.delete(clientId);
    this.logger.log(`Client disconnected: ${clientId} (Total: ${this.connectedClients.size})`);
  }

  /**
   * Subscribe to dashboard updates
   */
  @SubscribeMessage('subscribe:dashboard')
  handleDashboardSubscribe(client: Socket) {
    client.join('dashboard');
    this.logger.log(`Client ${client.id} subscribed to dashboard updates`);
    return { event: 'subscribed', room: 'dashboard' };
  }

  /**
   * Unsubscribe from dashboard updates
   */
  @SubscribeMessage('unsubscribe:dashboard')
  handleDashboardUnsubscribe(client: Socket) {
    client.leave('dashboard');
    this.logger.log(`Client ${client.id} unsubscribed from dashboard updates`);
    return { event: 'unsubscribed', room: 'dashboard' };
  }

  /**
   * Subscribe to queue updates
   */
  @SubscribeMessage('subscribe:queue')
  handleQueueSubscribe(client: Socket) {
    client.join('queue');
    this.logger.log(`Client ${client.id} subscribed to queue updates`);
    return { event: 'subscribed', room: 'queue' };
  }

  /**
   * Unsubscribe from queue updates
   */
  @SubscribeMessage('unsubscribe:queue')
  handleQueueUnsubscribe(client: Socket) {
    client.leave('queue');
    this.logger.log(`Client ${client.id} unsubscribed from queue updates`);
    return { event: 'unsubscribed', room: 'queue' };
  }

  /**
   * Subscribe to specific contract updates
   */
  @SubscribeMessage('subscribe:contract')
  handleContractSubscribe(client: Socket, contractId: string) {
    const room = `contract:${contractId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to contract ${contractId}`);
    return { event: 'subscribed', room };
  }

  /**
   * Unsubscribe from contract updates
   */
  @SubscribeMessage('unsubscribe:contract')
  handleContractUnsubscribe(client: Socket, contractId: string) {
    const room = `contract:${contractId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from contract ${contractId}`);
    return { event: 'unsubscribed', room };
  }

  // ========================================
  // Server-side emit methods (called by services)
  // ========================================

  /**
   * Emit commission calculation completed
   */
  emitCommissionCalculated(data: {
    id: string;
    contractId: string;
    commissionAmount: number;
    totalRevenue: number;
    period: string;
  }) {
    this.server.to('dashboard').emit('commission:calculated', data);
    this.server.to(`contract:${data.contractId}`).emit('commission:calculated', data);
    this.logger.debug(`Emitted commission:calculated for contract ${data.contractId}`);
  }

  /**
   * Emit commission status updated
   */
  emitCommissionUpdated(data: {
    id: string;
    contractId: string;
    status: string;
    previousStatus?: string;
  }) {
    this.server.to('dashboard').emit('commission:updated', data);
    this.server.to(`contract:${data.contractId}`).emit('commission:updated', data);
    this.logger.debug(`Emitted commission:updated for commission ${data.id}`);
  }

  /**
   * Emit job progress update
   */
  emitJobProgress(data: {
    jobId: string;
    type: string;
    progress: number; // 0-100
    message?: string;
  }) {
    this.server.to('queue').emit('queue:job-progress', data);
    this.logger.debug(`Emitted job progress: ${data.jobId} - ${data.progress}%`);
  }

  /**
   * Emit job completed
   */
  emitJobCompleted(data: { jobId: string; type: string; result: any; duration?: number }) {
    this.server.to('queue').emit('queue:job-completed', data);
    this.logger.debug(`Emitted job completed: ${data.jobId}`);
  }

  /**
   * Emit job failed
   */
  emitJobFailed(data: { jobId: string; type: string; error: string; stack?: string }) {
    this.server.to('queue').emit('queue:job-failed', data);
    this.logger.warn(`Emitted job failed: ${data.jobId} - ${data.error}`);
  }

  /**
   * Emit queue statistics update
   */
  emitQueueStats(data: {
    queueName: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }) {
    this.server.to('queue').emit('queue:stats', data);
    this.logger.debug(`Emitted queue stats: ${data.queueName}`);
  }

  /**
   * Emit dashboard metrics update
   */
  emitDashboardMetrics(data: {
    totalRevenue: number;
    totalCommissions: number;
    pendingPayments: number;
    overduePayments: number;
    activeContracts: number;
    timestamp: string;
  }) {
    this.server.to('dashboard').emit('dashboard:metrics', data);
    this.logger.debug('Emitted dashboard metrics update');
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get clients in room
   */
  async getClientsInRoom(room: string): Promise<number> {
    const sockets = await this.server.in(room).fetchSockets();
    return sockets.length;
  }
}
