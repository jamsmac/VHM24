import { Test, TestingModule } from '@nestjs/testing';
import { TelegramSessionService, ConversationState, UserSession } from './telegram-session.service';

// Mock redis client
const mockRedisClient = {
  isOpen: true,
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  setEx: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  scanIterator: jest.fn(),
  ping: jest.fn().mockResolvedValue('PONG'),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

describe('TelegramSessionService', () => {
  let service: TelegramSessionService;

  const mockSession: UserSession = {
    userId: 'user-uuid',
    chatId: '123456789',
    telegramId: '987654321',
    state: ConversationState.IDLE,
    context: {},
    createdAt: new Date().toISOString(),
    lastInteractionAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mockRedisClient state
    mockRedisClient.isOpen = true;
    mockRedisClient.get.mockReset();
    mockRedisClient.setEx.mockReset();
    mockRedisClient.del.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramSessionService],
    }).compile();

    service = module.get<TelegramSessionService>(TelegramSessionService);

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('onModuleInit', () => {
    it('should initialize Redis client', async () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should handle Redis error event', async () => {
      // Get the error handler that was registered
      const errorHandler = mockRedisClient.on.mock.calls.find(
        (call) => call[0] === 'error',
      )?.[1];

      expect(errorHandler).toBeDefined();
      // Call the error handler - should not throw
      expect(() => errorHandler(new Error('Redis connection error'))).not.toThrow();
    });

    it('should handle Redis connect event', async () => {
      // Get the connect handler that was registered
      const connectHandler = mockRedisClient.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];

      expect(connectHandler).toBeDefined();
      // Call the connect handler - should not throw
      expect(() => connectHandler()).not.toThrow();
    });

    it('should handle Redis connection failure gracefully', async () => {
      // Create a new service instance with failing connect
      const failingRedisClient = {
        ...mockRedisClient,
        connect: jest.fn().mockRejectedValue(new Error('Connection refused')),
      };

      jest.resetModules();
      jest.doMock('redis', () => ({
        createClient: jest.fn(() => failingRedisClient),
      }));

      const { TelegramSessionService: FreshService } = await import(
        './telegram-session.service'
      );
      const freshService = new FreshService();

      // Should not throw, just log warning
      await expect(freshService.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('getSession', () => {
    it('should return session when found in Redis', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await service.getSession('user-uuid');

      expect(result).toEqual(mockSession);
      expect(mockRedisClient.get).toHaveBeenCalledWith('telegram:session:user-uuid');
    });

    it('should return null when session not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.getSession('user-uuid');

      expect(result).toBeNull();
    });

    it('should return null and delete session when expired', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(expiredSession));

      const result = await service.getSession('user-uuid');

      expect(result).toBeNull();
      expect(mockRedisClient.del).toHaveBeenCalledWith('telegram:session:user-uuid');
    });

    it('should return null when Redis is not available', async () => {
      mockRedisClient.isOpen = false;

      const result = await service.getSession('user-uuid');

      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should return null and log error when Redis throws', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.getSession('user-uuid');

      expect(result).toBeNull();
    });
  });

  describe('saveSession', () => {
    it('should save new session to Redis', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await service.saveSession('user-uuid', {
        chatId: '123456789',
        telegramId: '987654321',
        state: ConversationState.IDLE,
      });

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'telegram:session:user-uuid',
        3600,
        expect.any(String),
      );
    });

    it('should merge with existing session', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      await service.saveSession('user-uuid', {
        state: ConversationState.AWAITING_PHOTO_BEFORE,
      });

      expect(mockRedisClient.setEx).toHaveBeenCalled();
      const savedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
      expect(savedData.state).toBe(ConversationState.AWAITING_PHOTO_BEFORE);
      expect(savedData.chatId).toBe('123456789'); // Original data preserved
    });

    it('should not save when Redis is not available', async () => {
      mockRedisClient.isOpen = false;

      await service.saveSession('user-uuid', {
        chatId: '123456789',
        telegramId: '987654321',
        state: ConversationState.IDLE,
      });

      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should handle save error gracefully', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));
      mockRedisClient.setEx.mockRejectedValueOnce(new Error('Redis write error'));

      // Should not throw
      await expect(
        service.saveSession('user-uuid', {
          state: ConversationState.AWAITING_PHOTO_BEFORE,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('updateState', () => {
    it('should update session state', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      await service.updateState('user-uuid', ConversationState.AWAITING_PHOTO_AFTER);

      expect(mockRedisClient.setEx).toHaveBeenCalled();
      const savedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
      expect(savedData.state).toBe(ConversationState.AWAITING_PHOTO_AFTER);
    });

    it('should update state with context', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      await service.updateState('user-uuid', ConversationState.IN_TASK_EXECUTION, {
        activeTaskId: 'task-123',
      });

      expect(mockRedisClient.setEx).toHaveBeenCalled();
      const savedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
      expect(savedData.state).toBe(ConversationState.IN_TASK_EXECUTION);
      expect(savedData.context.activeTaskId).toBe('task-123');
    });

    it('should not update when session not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await service.updateState('user-uuid', ConversationState.AWAITING_PHOTO_AFTER);

      // setEx should not be called as getSession returns null first
      // and then saveSession gets null again
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });
  });

  describe('setActiveTask', () => {
    it('should set active task and change state to IN_TASK_EXECUTION', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      await service.setActiveTask('user-uuid', 'task-uuid');

      expect(mockRedisClient.setEx).toHaveBeenCalled();
      const savedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
      expect(savedData.state).toBe(ConversationState.IN_TASK_EXECUTION);
      expect(savedData.context.activeTaskId).toBe('task-uuid');
    });
  });

  describe('requestPhoto', () => {
    it('should set state to AWAITING_PHOTO_BEFORE', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      await service.requestPhoto('user-uuid', 'task-uuid', 'before');

      expect(mockRedisClient.setEx).toHaveBeenCalled();
      const savedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
      expect(savedData.state).toBe(ConversationState.AWAITING_PHOTO_BEFORE);
      expect(savedData.context.activeTaskId).toBe('task-uuid');
      expect(savedData.context.awaitingPhotoType).toBe('before');
    });

    it('should set state to AWAITING_PHOTO_AFTER', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      await service.requestPhoto('user-uuid', 'task-uuid', 'after');

      expect(mockRedisClient.setEx).toHaveBeenCalled();
      const savedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
      expect(savedData.state).toBe(ConversationState.AWAITING_PHOTO_AFTER);
      expect(savedData.context.awaitingPhotoType).toBe('after');
    });
  });

  describe('clearActiveTask', () => {
    it('should reset state to IDLE and clear task context', async () => {
      const sessionWithTask = {
        ...mockSession,
        state: ConversationState.IN_TASK_EXECUTION,
        context: { activeTaskId: 'task-123', awaitingPhotoType: 'before' as const },
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionWithTask));

      await service.clearActiveTask('user-uuid');

      expect(mockRedisClient.setEx).toHaveBeenCalled();
      const savedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
      expect(savedData.state).toBe(ConversationState.IDLE);
      expect(savedData.context.activeTaskId).toBeUndefined();
      expect(savedData.context.awaitingPhotoType).toBeUndefined();
    });
  });

  describe('deleteSession', () => {
    it('should delete session from Redis', async () => {
      await service.deleteSession('user-uuid');

      expect(mockRedisClient.del).toHaveBeenCalledWith('telegram:session:user-uuid');
    });

    it('should not delete when Redis is not available', async () => {
      mockRedisClient.isOpen = false;

      await service.deleteSession('user-uuid');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle delete error gracefully', async () => {
      mockRedisClient.del.mockRejectedValueOnce(new Error('Redis delete error'));

      // Should not throw
      await expect(service.deleteSession('user-uuid')).resolves.not.toThrow();
    });
  });

  describe('isInState', () => {
    it('should return true when session is in specified state', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await service.isInState('user-uuid', ConversationState.IDLE);

      expect(result).toBe(true);
    });

    it('should return false when session is in different state', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await service.isInState('user-uuid', ConversationState.IN_TASK_EXECUTION);

      expect(result).toBe(false);
    });

    it('should return false when session not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.isInState('user-uuid', ConversationState.IDLE);

      expect(result).toBe(false);
    });
  });

  describe('getActiveTaskId', () => {
    it('should return active task ID when present', async () => {
      const sessionWithTask = {
        ...mockSession,
        context: { activeTaskId: 'task-123' },
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionWithTask));

      const result = await service.getActiveTaskId('user-uuid');

      expect(result).toBe('task-123');
    });

    it('should return null when no active task', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await service.getActiveTaskId('user-uuid');

      expect(result).toBeNull();
    });

    it('should return null when session not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.getActiveTaskId('user-uuid');

      expect(result).toBeNull();
    });
  });

  describe('getSessionData', () => {
    it('should return tempData from session context', async () => {
      const sessionWithTempData = {
        ...mockSession,
        context: {
          tempData: { machineId: 'machine-123', step: 2 },
        },
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionWithTempData));

      const result = await service.getSessionData('user-uuid');

      expect(result).toEqual({ machineId: 'machine-123', step: 2 });
    });

    it('should return null when session not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.getSessionData('user-uuid');

      expect(result).toBeNull();
    });

    it('should return null when tempData not present', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await service.getSessionData('user-uuid');

      expect(result).toBeNull();
    });
  });

  describe('setSessionData', () => {
    it('should set tempData in existing session', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      await service.setSessionData('user-uuid', { cartItems: [1, 2, 3] });

      expect(mockRedisClient.setEx).toHaveBeenCalled();
      const savedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
      expect(savedData.context.tempData).toEqual({ cartItems: [1, 2, 3] });
    });

    it('should create new session with tempData when session not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await service.setSessionData('user-uuid', { newData: 'value' });

      expect(mockRedisClient.setEx).toHaveBeenCalled();
      const savedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
      expect(savedData.state).toBe(ConversationState.IDLE);
      expect(savedData.chatId).toBe('user-uuid');
      expect(savedData.telegramId).toBe('user-uuid');
      expect(savedData.context.tempData).toEqual({ newData: 'value' });
    });

    it('should preserve existing context when adding tempData', async () => {
      const sessionWithContext = {
        ...mockSession,
        context: {
          activeTaskId: 'task-123',
          awaitingPhotoType: 'before' as const,
        },
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionWithContext));

      await service.setSessionData('user-uuid', { key: 'value' });

      expect(mockRedisClient.setEx).toHaveBeenCalled();
      const savedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
      expect(savedData.context.activeTaskId).toBe('task-123');
      expect(savedData.context.awaitingPhotoType).toBe('before');
      expect(savedData.context.tempData).toEqual({ key: 'value' });
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      // Mock scanIterator
      mockRedisClient.scanIterator = jest.fn().mockReturnValue(
        (async function* () {
          yield 'telegram:session:user1';
          yield 'telegram:session:user2';
        })(),
      );

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(expiredSession)) // user1 - expired
        .mockResolvedValueOnce(JSON.stringify(mockSession)); // user2 - not expired

      await service.cleanupExpiredSessions();

      expect(mockRedisClient.del).toHaveBeenCalledWith('telegram:session:user1');
      expect(mockRedisClient.del).not.toHaveBeenCalledWith('telegram:session:user2');
    });

    it('should not run when Redis is not available', async () => {
      mockRedisClient.isOpen = false;

      await service.cleanupExpiredSessions();

      expect(mockRedisClient.scanIterator).not.toHaveBeenCalled();
    });

    it('should handle scanIterator returning arrays', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      // Mock scanIterator returning arrays (as per Redis SCAN behavior)
      mockRedisClient.scanIterator = jest.fn().mockReturnValue(
        (async function* () {
          yield ['telegram:session:user1', 'telegram:session:user2'];
          yield ['telegram:session:user3'];
        })(),
      );

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(expiredSession)) // user1 - expired
        .mockResolvedValueOnce(JSON.stringify(mockSession)) // user2 - not expired
        .mockResolvedValueOnce(JSON.stringify(expiredSession)); // user3 - expired

      await service.cleanupExpiredSessions();

      expect(mockRedisClient.del).toHaveBeenCalledWith('telegram:session:user1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('telegram:session:user3');
      expect(mockRedisClient.del).not.toHaveBeenCalledWith('telegram:session:user2');
    });

    it('should handle cleanup error gracefully', async () => {
      mockRedisClient.scanIterator = jest.fn().mockImplementation(() => {
        throw new Error('Scan error');
      });

      // Should not throw
      await expect(service.cleanupExpiredSessions()).resolves.not.toThrow();
    });

    it('should handle null data for session keys', async () => {
      mockRedisClient.scanIterator = jest.fn().mockReturnValue(
        (async function* () {
          yield 'telegram:session:user1';
        })(),
      );

      mockRedisClient.get.mockResolvedValueOnce(null); // Session data is null

      await service.cleanupExpiredSessions();

      // Should not call del since there's no data
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when Redis is connected with low latency', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockRedisClient.scanIterator = jest.fn().mockReturnValue(
        (async function* () {
          yield 'telegram:session:user1';
          yield 'telegram:session:user2';
        })(),
      );

      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.connected).toBe(true);
      expect(result.latencyMs).toBeDefined();
      expect(result.latencyMs).toBeLessThan(100);
      expect(result.sessionCount).toBe(2);
    });

    it('should return degraded status when latency is high', async () => {
      // Mock high latency by delaying ping
      mockRedisClient.ping.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('PONG'), 150)),
      );
      mockRedisClient.scanIterator = jest.fn().mockReturnValue((async function* () {})());

      const result = await service.healthCheck();

      expect(result.status).toBe('degraded');
      expect(result.connected).toBe(true);
      expect(result.latencyMs).toBeGreaterThan(100);
    });

    it('should return unhealthy when Redis client is not initialized', async () => {
      // Create a fresh service without initialization
      const freshService = Object.create(TelegramSessionService.prototype);
      // @ts-expect-error - accessing private property for testing
      freshService.redisClient = null;

      const result = await freshService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.connected).toBe(false);
      expect(result.error).toBe('Redis client not initialized');
    });

    it('should return unhealthy when Redis connection is closed', async () => {
      mockRedisClient.isOpen = false;

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.connected).toBe(false);
      expect(result.error).toBe('Redis connection closed');
    });

    it('should return unhealthy when ping fails', async () => {
      mockRedisClient.isOpen = true;
      mockRedisClient.ping.mockRejectedValue(new Error('Connection refused'));

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.connected).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should continue health check even if session count fails', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockRedisClient.scanIterator = jest.fn().mockImplementation(() => {
        throw new Error('Scan failed');
      });

      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.connected).toBe(true);
      expect(result.sessionCount).toBeUndefined();
    });
  });

  describe('isHealthy', () => {
    it('should return true when Redis is connected', () => {
      mockRedisClient.isOpen = true;

      const result = service.isHealthy();

      expect(result).toBe(true);
    });

    it('should return false when Redis is not connected', () => {
      mockRedisClient.isOpen = false;

      const result = service.isHealthy();

      expect(result).toBe(false);
    });

    it('should return false when Redis client is null', () => {
      // Create a fresh service without initialization
      const freshService = Object.create(TelegramSessionService.prototype);
      // @ts-expect-error - accessing private property for testing
      freshService.redisClient = null;

      const result = freshService.isHealthy();

      expect(result).toBe(false);
    });
  });
});
