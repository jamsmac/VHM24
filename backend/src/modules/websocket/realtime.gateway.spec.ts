import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { RealtimeGateway } from './realtime.gateway';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let jwtService: jest.Mocked<JwtService>;
  let mockServer: jest.Mocked<Partial<Server>>;
  let mockSocket: jest.Mocked<Partial<Socket>>;

  beforeEach(async () => {
    const mockJwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;

    // Mock Server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      fetchSockets: jest.fn().mockResolvedValue([]),
    } as any;

    gateway.server = mockServer as Server;

    // Mock Socket
    mockSocket = {
      id: 'test-socket-id',
      handshake: {
        auth: {},
        headers: {},
        query: {},
      } as any,
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('afterInit', () => {
    it('should log gateway initialization', () => {
      const loggerSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.afterInit(mockServer as Server);

      expect(loggerSpy).toHaveBeenCalledWith(
        'WebSocket Gateway initialized on /realtime namespace',
      );
    });
  });

  // ============================================================================
  // CONNECTION TESTS
  // ============================================================================

  describe('handleConnection', () => {
    it('should allow anonymous connection without token', async () => {
      const loggerSpy = jest.spyOn(gateway['logger'], 'warn');

      await gateway.handleConnection(mockSocket as Socket);

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('connected without token'));
      expect(mockSocket.emit).toHaveBeenCalledWith('connection:success', {
        message: 'Connected to VendHub realtime server',
        clientId: 'test-socket-id',
        authenticated: false,
        timestamp: expect.any(String),
      });
      expect(gateway.getConnectedClientsCount()).toBe(1);
    });

    it('should authenticate connection with valid token from auth', async () => {
      const mockPayload = { sub: 'user-123', email: 'test@example.com' };
      mockSocket.handshake!.auth.token = 'valid-jwt-token';
      jwtService.verify.mockReturnValue(mockPayload);

      const loggerSpy = jest.spyOn(gateway['logger'], 'log');

      await gateway.handleConnection(mockSocket as Socket);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-jwt-token');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('authenticated as user user-123'),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('connection:success', {
        message: 'Connected to VendHub realtime server',
        clientId: 'test-socket-id',
        authenticated: true,
        timestamp: expect.any(String),
      });
    });

    it('should authenticate connection with valid token from Authorization header', async () => {
      const mockPayload = { sub: 'user-456', email: 'test2@example.com' };
      mockSocket.handshake!.headers.authorization = 'Bearer valid-jwt-token';
      jwtService.verify.mockReturnValue(mockPayload);

      await gateway.handleConnection(mockSocket as Socket);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-jwt-token');
      expect(mockSocket.emit).toHaveBeenCalledWith('connection:success', {
        message: 'Connected to VendHub realtime server',
        clientId: 'test-socket-id',
        authenticated: true,
        timestamp: expect.any(String),
      });
    });

    it('should authenticate connection with valid token from query params', async () => {
      const mockPayload = { sub: 'user-789', email: 'test3@example.com' };
      mockSocket.handshake!.query.token = 'valid-jwt-token';
      jwtService.verify.mockReturnValue(mockPayload);

      await gateway.handleConnection(mockSocket as Socket);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-jwt-token');
      expect(mockSocket.emit).toHaveBeenCalledWith('connection:success', {
        message: 'Connected to VendHub realtime server',
        clientId: 'test-socket-id',
        authenticated: true,
        timestamp: expect.any(String),
      });
    });

    it('should disconnect client with invalid token', async () => {
      mockSocket.handshake!.auth.token = 'invalid-token';
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const loggerSpy = jest.spyOn(gateway['logger'], 'warn');

      await gateway.handleConnection(mockSocket as Socket);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid token - disconnecting'),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid authentication token',
      });
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(gateway.getConnectedClientsCount()).toBe(0);
    });

    it('should disconnect client on connection error', async () => {
      mockSocket.handshake!.auth.token = 'some-token';
      jwtService.verify.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client when rate limit exceeded', async () => {
      // Create a mock socket with specific IP address
      const rateLimitedSocket = {
        ...mockSocket,
        id: 'rate-limited-socket',
        handshake: {
          ...mockSocket.handshake,
          address: '192.168.1.100',
        },
      } as any;

      // We need to access the connectionTracker which is module-scoped
      // To test rate limiting, we need to make multiple connections from the same IP
      // First, let's make 10 connections to trigger the rate limit
      for (let i = 0; i < 11; i++) {
        const socket = {
          id: `socket-${i}`,
          handshake: {
            auth: {},
            headers: {},
            query: {},
            address: '192.168.1.100',
          },
          emit: jest.fn(),
          disconnect: jest.fn(),
          join: jest.fn(),
          leave: jest.fn(),
        } as any;

        await gateway.handleConnection(socket);

        // The 11th connection should be rate limited
        if (i === 10) {
          expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Too many connections' });
          expect(socket.disconnect).toHaveBeenCalledWith(true);
        }
      }
    });

    it('should reset rate limit tracker after time window expires', async () => {
      // Use a unique IP for this test
      const testIp = '192.168.2.200';

      // Mock Date.now to control time
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      // First connection from this IP
      const socket1 = {
        id: 'socket-time-1',
        handshake: {
          auth: {},
          headers: {},
          query: {},
          address: testIp,
        },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
      } as any;

      await gateway.handleConnection(socket1);
      expect(socket1.emit).toHaveBeenCalledWith('connection:success', expect.any(Object));

      // Advance time past the 60 second window (CONNECTION_WINDOW_MS = 60000)
      currentTime = 1000000 + 70000; // 70 seconds later

      // Second connection should reset the tracker
      const socket2 = {
        id: 'socket-time-2',
        handshake: {
          auth: {},
          headers: {},
          query: {},
          address: testIp,
        },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
      } as any;

      await gateway.handleConnection(socket2);
      expect(socket2.emit).toHaveBeenCalledWith('connection:success', expect.any(Object));

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should handle unexpected error in connection handler', async () => {
      // Mock socket that throws an error when accessing emit in the outer try
      const errorSocket = {
        id: 'error-socket',
        handshake: {
          auth: { token: 'valid-token' },
          headers: {},
          query: {},
          address: '192.168.3.1',
        },
        emit: jest.fn().mockImplementation((event: string) => {
          // Throw on connection:success (in the outer try block)
          if (event === 'connection:success') {
            throw new Error('Socket emit failed');
          }
        }),
        disconnect: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
      } as any;

      const mockPayload = { sub: 'user-error', email: 'error@example.com' };
      jwtService.verify.mockReturnValue(mockPayload);

      const errorSpy = jest.spyOn(gateway['logger'], 'error');

      await gateway.handleConnection(errorSocket);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error during client connection'),
        expect.any(String),
      );
      expect(errorSocket.disconnect).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // DISCONNECTION TESTS
  // ============================================================================

  describe('handleDisconnect', () => {
    it('should remove client from connected clients map', async () => {
      await gateway.handleConnection(mockSocket as Socket);
      expect(gateway.getConnectedClientsCount()).toBe(1);

      gateway.handleDisconnect(mockSocket as Socket);

      expect(gateway.getConnectedClientsCount()).toBe(0);
    });

    it('should log disconnection', () => {
      const loggerSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleDisconnect(mockSocket as Socket);

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Client disconnected'));
    });
  });

  // ============================================================================
  // SUBSCRIPTION TESTS
  // ============================================================================

  describe('handleDashboardSubscribe', () => {
    it('should subscribe client to dashboard room', () => {
      const result = gateway.handleDashboardSubscribe(mockSocket as Socket);

      expect(mockSocket.join).toHaveBeenCalledWith('dashboard');
      expect(result).toEqual({ event: 'subscribed', room: 'dashboard' });
    });
  });

  describe('handleDashboardUnsubscribe', () => {
    it('should unsubscribe client from dashboard room', () => {
      const result = gateway.handleDashboardUnsubscribe(mockSocket as Socket);

      expect(mockSocket.leave).toHaveBeenCalledWith('dashboard');
      expect(result).toEqual({ event: 'unsubscribed', room: 'dashboard' });
    });
  });

  describe('handleQueueSubscribe', () => {
    it('should subscribe client to queue room', () => {
      const result = gateway.handleQueueSubscribe(mockSocket as Socket);

      expect(mockSocket.join).toHaveBeenCalledWith('queue');
      expect(result).toEqual({ event: 'subscribed', room: 'queue' });
    });
  });

  describe('handleQueueUnsubscribe', () => {
    it('should unsubscribe client from queue room', () => {
      const result = gateway.handleQueueUnsubscribe(mockSocket as Socket);

      expect(mockSocket.leave).toHaveBeenCalledWith('queue');
      expect(result).toEqual({ event: 'unsubscribed', room: 'queue' });
    });
  });

  describe('handleContractSubscribe', () => {
    it('should subscribe client to specific contract room', () => {
      const contractId = 'contract-123';
      const result = gateway.handleContractSubscribe(mockSocket as Socket, contractId);

      expect(mockSocket.join).toHaveBeenCalledWith(`contract:${contractId}`);
      expect(result).toEqual({ event: 'subscribed', room: `contract:${contractId}` });
    });
  });

  describe('handleContractUnsubscribe', () => {
    it('should unsubscribe client from contract room', () => {
      const contractId = 'contract-123';
      const result = gateway.handleContractUnsubscribe(mockSocket as Socket, contractId);

      expect(mockSocket.leave).toHaveBeenCalledWith(`contract:${contractId}`);
      expect(result).toEqual({ event: 'unsubscribed', room: `contract:${contractId}` });
    });
  });

  // ============================================================================
  // SERVER EMIT TESTS
  // ============================================================================

  describe('emitCommissionCalculated', () => {
    it('should emit commission calculated event to dashboard and contract room', () => {
      const data = {
        id: 'commission-1',
        contractId: 'contract-123',
        commissionAmount: 1500,
        totalRevenue: 10000,
        period: '2024-01',
      };

      gateway.emitCommissionCalculated(data);

      expect(mockServer.to).toHaveBeenCalledWith('dashboard');
      expect(mockServer.to).toHaveBeenCalledWith('contract:contract-123');
      expect(mockServer.emit).toHaveBeenCalledWith('commission:calculated', data);
    });
  });

  describe('emitCommissionUpdated', () => {
    it('should emit commission updated event', () => {
      const data = {
        id: 'commission-1',
        contractId: 'contract-123',
        status: 'paid',
        previousStatus: 'pending',
      };

      gateway.emitCommissionUpdated(data);

      expect(mockServer.to).toHaveBeenCalled();
      expect(mockServer.emit).toHaveBeenCalledWith('commission:updated', data);
    });
  });

  describe('emitJobProgress', () => {
    it('should emit job progress event to queue room', () => {
      const data = {
        jobId: 'job-123',
        type: 'sales-import',
        progress: 50,
        message: 'Processing rows...',
      };

      gateway.emitJobProgress(data);

      expect(mockServer.to).toHaveBeenCalledWith('queue');
      expect(mockServer.emit).toHaveBeenCalledWith('queue:job-progress', data);
    });
  });

  describe('emitJobCompleted', () => {
    it('should emit job completed event', () => {
      const data = {
        jobId: 'job-123',
        type: 'sales-import',
        result: { imported: 100, errors: 0 },
        duration: 5000,
      };

      gateway.emitJobCompleted(data);

      expect(mockServer.to).toHaveBeenCalledWith('queue');
      expect(mockServer.emit).toHaveBeenCalledWith('queue:job-completed', data);
    });
  });

  describe('emitJobFailed', () => {
    it('should emit job failed event', () => {
      const data = {
        jobId: 'job-123',
        type: 'sales-import',
        error: 'File parsing error',
        stack: 'Error stack trace...',
      };

      gateway.emitJobFailed(data);

      expect(mockServer.to).toHaveBeenCalledWith('queue');
      expect(mockServer.emit).toHaveBeenCalledWith('queue:job-failed', data);
    });
  });

  describe('emitQueueStats', () => {
    it('should emit queue statistics', () => {
      const data = {
        queueName: 'sales-import',
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      };

      gateway.emitQueueStats(data);

      expect(mockServer.to).toHaveBeenCalledWith('queue');
      expect(mockServer.emit).toHaveBeenCalledWith('queue:stats', data);
    });
  });

  describe('emitDashboardMetrics', () => {
    it('should emit dashboard metrics update', () => {
      const data = {
        totalRevenue: 100000,
        totalCommissions: 15000,
        pendingPayments: 5000,
        overduePayments: 2000,
        activeContracts: 25,
        timestamp: new Date().toISOString(),
      };

      gateway.emitDashboardMetrics(data);

      expect(mockServer.to).toHaveBeenCalledWith('dashboard');
      expect(mockServer.emit).toHaveBeenCalledWith('dashboard:metrics', data);
    });
  });

  // ============================================================================
  // UTILITY METHODS TESTS
  // ============================================================================

  describe('getConnectedClientsCount', () => {
    it('should return 0 when no clients connected', () => {
      expect(gateway.getConnectedClientsCount()).toBe(0);
    });

    it('should return correct count after connections', async () => {
      await gateway.handleConnection(mockSocket as Socket);
      expect(gateway.getConnectedClientsCount()).toBe(1);

      const mockSocket2 = { ...mockSocket, id: 'socket-2' } as any;
      await gateway.handleConnection(mockSocket2);
      expect(gateway.getConnectedClientsCount()).toBe(2);
    });
  });

  describe('getClientsInRoom', () => {
    it('should return number of clients in room', async () => {
      const mockSockets = [{}, {}, {}];
      mockServer.fetchSockets = jest.fn().mockResolvedValue(mockSockets);

      const count = await gateway.getClientsInRoom('dashboard');

      expect(count).toBe(3);
      expect(mockServer.in).toHaveBeenCalledWith('dashboard');
    });

    it('should return 0 for empty room', async () => {
      mockServer.fetchSockets = jest.fn().mockResolvedValue([]);

      const count = await gateway.getClientsInRoom('queue');

      expect(count).toBe(0);
    });
  });
});
