import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ImportSessionStatus } from './interfaces/common.interface';

/**
 * Intelligent Import WebSocket Gateway
 *
 * Provides real-time progress updates for import sessions
 */
@WebSocketGateway({
  namespace: '/intelligent-import',
  cors: {
    origin: '*', // Configure properly in production
  },
})
export class IntelligentImportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(IntelligentImportGateway.name);
  private sessionSubscriptions: Map<string, Set<string>> = new Map(); // sessionId -> Set<socketId>

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Handle client connection
   */
  async handleConnection(client: Socket) {
    try {
      // Extract JWT token
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '') ||
        client.handshake.query.token;

      if (token) {
        const payload = this.jwtService.verify(token as string);
        (client as Socket & { user: unknown }).user = payload;
        this.logger.debug(
          `Client ${client.id} connected (user: ${(payload as { sub: string }).sub})`,
        );
      } else {
        (client as Socket & { user: null }).user = null;
        this.logger.debug(`Client ${client.id} connected (anonymous)`);
      }

      client.emit('connection:success', {
        message: 'Connected to Intelligent Import WebSocket',
        clientId: client.id,
        authenticated: !!(client as Socket & { user: unknown }).user,
      });
    } catch (error) {
      this.logger.error(`Auth failed for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(client: Socket) {
    this.logger.debug(`Client ${client.id} disconnected`);

    // Remove from all session subscriptions
    for (const [sessionId, subscribers] of this.sessionSubscriptions.entries()) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.sessionSubscriptions.delete(sessionId);
      }
    }
  }

  /**
   * Subscribe to import session updates
   */
  @SubscribeMessage('subscribe:session')
  handleSubscribeSession(client: Socket, sessionId: string): void {
    this.logger.debug(`Client ${client.id} subscribed to session ${sessionId}`);

    if (!this.sessionSubscriptions.has(sessionId)) {
      this.sessionSubscriptions.set(sessionId, new Set());
    }

    this.sessionSubscriptions.get(sessionId)!.add(client.id);

    client.emit('subscribed', { sessionId });
  }

  /**
   * Unsubscribe from import session updates
   */
  @SubscribeMessage('unsubscribe:session')
  handleUnsubscribeSession(client: Socket, sessionId: string): void {
    this.logger.debug(`Client ${client.id} unsubscribed from session ${sessionId}`);

    const subscribers = this.sessionSubscriptions.get(sessionId);
    if (subscribers) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.sessionSubscriptions.delete(sessionId);
      }
    }

    client.emit('unsubscribed', { sessionId });
  }

  /**
   * Emit progress update to all subscribers
   */
  emitProgress(
    sessionId: string,
    status: ImportSessionStatus,
    progress: number,
    message: string,
  ): void {
    const subscribers = this.sessionSubscriptions.get(sessionId);

    if (subscribers && subscribers.size > 0) {
      this.logger.debug(
        `Emitting progress for session ${sessionId} to ${subscribers.size} client(s)`,
      );

      for (const socketId of subscribers) {
        this.server.to(socketId).emit('session:progress', {
          sessionId,
          status,
          progress,
          message,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Emit approval request
   */
  emitApprovalRequest(sessionId: string, data: Record<string, unknown>): void {
    const subscribers = this.sessionSubscriptions.get(sessionId);

    if (subscribers && subscribers.size > 0) {
      this.logger.debug(`Emitting approval request for session ${sessionId}`);

      for (const socketId of subscribers) {
        this.server.to(socketId).emit('session:approval-request', {
          sessionId,
          ...data,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Emit completion
   */
  emitCompleted(sessionId: string, result: Record<string, unknown>): void {
    const subscribers = this.sessionSubscriptions.get(sessionId);

    if (subscribers && subscribers.size > 0) {
      this.logger.debug(`Emitting completion for session ${sessionId}`);

      for (const socketId of subscribers) {
        this.server.to(socketId).emit('session:completed', {
          sessionId,
          result,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Emit error
   */
  emitError(sessionId: string, error: Error): void {
    const subscribers = this.sessionSubscriptions.get(sessionId);

    if (subscribers && subscribers.size > 0) {
      this.logger.debug(`Emitting error for session ${sessionId}`);

      for (const socketId of subscribers) {
        this.server.to(socketId).emit('session:error', {
          sessionId,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}
