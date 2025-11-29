import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Mock Factory
 *
 * Provides factory functions for creating mock services
 * commonly used in tests
 */

/**
 * Create a mock JwtService
 */
export function createMockJwtService(): Partial<JwtService> {
  return {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue({ userId: 'test-user-id' }),
    decode: jest.fn().mockReturnValue({ userId: 'test-user-id' }),
  };
}

/**
 * Create a mock ConfigService
 */
export function createMockConfigService(config: Record<string, any> = {}): Partial<ConfigService> {
  const defaultConfig: Record<string, any> = {
    JWT_SECRET: 'test-secret',
    JWT_ACCESS_EXPIRATION: '15m',
    JWT_REFRESH_EXPIRATION: '7d',
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: 5432,
    ENCRYPTION_KEY: '0'.repeat(64),
    BRUTE_FORCE_MAX_ATTEMPTS: 5,
    BRUTE_FORCE_LOCKOUT_MINUTES: 15,
    ...config,
  };

  return {
    get: jest.fn((key: string, defaultValue?: any) => {
      return key in defaultConfig ? defaultConfig[key] : defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (!(key in defaultConfig)) {
        throw new Error(`Config key "${key}" not found`);
      }
      return defaultConfig[key];
    }),
  };
}

/**
 * Create a mock FilesService
 */
export function createMockFilesService() {
  return {
    uploadFile: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByEntity: jest.fn(),
    remove: jest.fn(),
    validateTaskPhotos: jest.fn().mockResolvedValue({
      hasPhotosBefore: true,
      hasPhotosAfter: true,
      isValid: true,
    }),
    getStats: jest.fn(),
  };
}

/**
 * Create a mock InventoryService
 */
export function createMockInventoryService() {
  return {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByLocation: jest.fn(),
    findByUser: jest.fn(),
    findByMachine: jest.fn(),
    transferWarehouseToOperator: jest.fn(),
    transferOperatorToMachine: jest.fn(),
    updateAfterRefill: jest.fn(),
    checkLowStock: jest.fn(),
  };
}

/**
 * Create a mock NotificationsService
 */
export function createMockNotificationsService() {
  return {
    sendNotification: jest.fn(),
    sendEmail: jest.fn(),
    sendPush: jest.fn(),
    sendTelegram: jest.fn(),
    sendLowStockAlert: jest.fn(),
    sendTaskAssignmentNotification: jest.fn(),
  };
}

/**
 * Create a mock TransactionsService
 */
export function createMockTransactionsService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByMachine: jest.fn(),
    findByTask: jest.fn(),
    getStats: jest.fn(),
    getRevenue: jest.fn(),
    recordCollectionTransaction: jest.fn(),
  };
}

/**
 * Create a mock UsersService
 */
export function createMockUsersService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateRefreshToken: jest.fn(),
    findByTelegramId: jest.fn(),
  };
}

/**
 * Create a mock MachinesService
 */
export function createMockMachinesService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByNumber: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateStatus: jest.fn(),
    findLowStock: jest.fn(),
    generateQrCode: jest.fn(),
  };
}

/**
 * Create a mock TasksService
 */
export function createMockTasksService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByMachine: jest.fn(),
    findByUser: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    startTask: jest.fn(),
    completeTask: jest.fn(),
    cancelTask: jest.fn(),
    assignTask: jest.fn(),
  };
}

/**
 * Create a mock EventEmitter
 */
export function createMockEventEmitter() {
  return {
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  };
}

/**
 * Create a mock BullQueue
 */
export function createMockBullQueue() {
  return {
    add: jest.fn(),
    process: jest.fn(),
    getJob: jest.fn(),
    getJobs: jest.fn(),
    clean: jest.fn(),
    close: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
  };
}

/**
 * Create a mock Logger
 */
export function createMockLogger() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };
}

/**
 * Create a mock Express Request
 */
export function createMockRequest(overrides?: any) {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    user: null,
    ip: '127.0.0.1',
    method: 'GET',
    path: '/',
    ...overrides,
  };
}

/**
 * Create a mock Express Response
 */
export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Create a mock Express Next function
 */
export function createMockNext() {
  return jest.fn();
}
