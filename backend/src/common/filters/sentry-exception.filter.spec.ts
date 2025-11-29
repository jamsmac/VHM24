import {
  ArgumentsHost,
  HttpException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { SentryExceptionFilter } from './sentry-exception.filter';
import * as Sentry from '@sentry/node';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  withScope: jest.fn((callback) => {
    const mockScope = {
      setTag: jest.fn(),
      setUser: jest.fn(),
      setContext: jest.fn(),
    };
    callback(mockScope);
    return mockScope;
  }),
  captureException: jest.fn(),
}));

describe('SentryExceptionFilter', () => {
  let filter: SentryExceptionFilter;
  let mockHttpAdapter: any;

  beforeEach(() => {
    mockHttpAdapter = {
      reply: jest.fn(),
      getRequestUrl: jest.fn(),
    };

    filter = new SentryExceptionFilter(mockHttpAdapter);

    jest.clearAllMocks();
  });

  const createMockArgumentsHost = (
    correlationId: string = 'test-correlation-id',
    user?: { id: string; username: string },
  ): ArgumentsHost => {
    const mockRequest = {
      correlationId,
      user,
      method: 'GET',
      url: '/test/endpoint',
      headers: { 'content-type': 'application/json' },
      query: { page: '1' },
      body: { data: 'test' },
    };

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getType: () => 'http',
      getArgs: () => [mockRequest, mockResponse],
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ArgumentsHost;
  };

  describe('catch', () => {
    it('should set correlation ID in Sentry scope', () => {
      const host = createMockArgumentsHost('test-correlation-123');
      const exception = new InternalServerErrorException('Test error');

      try {
        filter.catch(exception, host);
      } catch {
        // Expected to throw
      }

      expect(Sentry.withScope).toHaveBeenCalled();
      const scopeCallback = (Sentry.withScope as jest.Mock).mock.calls[0][0];
      const mockScope = {
        setTag: jest.fn(),
        setUser: jest.fn(),
        setContext: jest.fn(),
      };
      scopeCallback(mockScope);

      expect(mockScope.setTag).toHaveBeenCalledWith('correlationId', 'test-correlation-123');
    });

    it('should set user information in Sentry scope', () => {
      const host = createMockArgumentsHost('test-id', {
        id: 'user-123',
        username: 'testuser',
      });
      const exception = new InternalServerErrorException('Test error');

      try {
        filter.catch(exception, host);
      } catch {
        // Expected to throw
      }

      const scopeCallback = (Sentry.withScope as jest.Mock).mock.calls[0][0];
      const mockScope = {
        setTag: jest.fn(),
        setUser: jest.fn(),
        setContext: jest.fn(),
      };
      scopeCallback(mockScope);

      expect(mockScope.setUser).toHaveBeenCalledWith({
        id: 'user-123',
        username: 'testuser',
      });
    });

    it('should set request context in Sentry scope', () => {
      const host = createMockArgumentsHost();
      const exception = new InternalServerErrorException('Test error');

      try {
        filter.catch(exception, host);
      } catch {
        // Expected to throw
      }

      const scopeCallback = (Sentry.withScope as jest.Mock).mock.calls[0][0];
      const mockScope = {
        setTag: jest.fn(),
        setUser: jest.fn(),
        setContext: jest.fn(),
      };
      scopeCallback(mockScope);

      expect(mockScope.setContext).toHaveBeenCalledWith('request', {
        method: 'GET',
        url: '/test/endpoint',
        headers: { 'content-type': 'application/json' },
        query: { page: '1' },
        body: { data: 'test' },
      });
    });

    it('should capture 5xx HTTP exceptions in Sentry', () => {
      const host = createMockArgumentsHost();
      const exception = new InternalServerErrorException('Server error');

      try {
        filter.catch(exception, host);
      } catch {
        // Expected to throw
      }

      expect(Sentry.captureException).toHaveBeenCalledWith(exception);
    });

    it('should not capture 4xx HTTP exceptions in Sentry', () => {
      const host = createMockArgumentsHost();
      const exception = new BadRequestException('Bad request');

      try {
        filter.catch(exception, host);
      } catch {
        // Expected to throw
      }

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should capture non-HTTP exceptions in Sentry', () => {
      const host = createMockArgumentsHost();
      const exception = new Error('Unexpected error');

      try {
        filter.catch(exception, host);
      } catch {
        // Expected to throw
      }

      expect(Sentry.captureException).toHaveBeenCalledWith(exception);
    });

    it('should handle user being undefined', () => {
      const host = createMockArgumentsHost('test-id', undefined);
      const exception = new InternalServerErrorException('Test error');

      try {
        filter.catch(exception, host);
      } catch {
        // Expected to throw
      }

      const scopeCallback = (Sentry.withScope as jest.Mock).mock.calls[0][0];
      const mockScope = {
        setTag: jest.fn(),
        setUser: jest.fn(),
        setContext: jest.fn(),
      };
      scopeCallback(mockScope);

      expect(mockScope.setUser).toHaveBeenCalledWith({
        id: undefined,
        username: undefined,
      });
    });

    it('should capture 503 Service Unavailable in Sentry', () => {
      const host = createMockArgumentsHost();
      const exception = new HttpException('Service Unavailable', 503);

      try {
        filter.catch(exception, host);
      } catch {
        // Expected to throw
      }

      expect(Sentry.captureException).toHaveBeenCalledWith(exception);
    });

    it('should not capture 404 Not Found in Sentry', () => {
      const host = createMockArgumentsHost();
      const exception = new HttpException('Not Found', 404);

      try {
        filter.catch(exception, host);
      } catch {
        // Expected to throw
      }

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });
});
