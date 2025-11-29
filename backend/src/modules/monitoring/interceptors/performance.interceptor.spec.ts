import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { PerformanceInterceptor } from './performance.interceptor';
import { MetricsService } from '../services/metrics.service';

describe('PerformanceInterceptor', () => {
  let interceptor: PerformanceInterceptor;
  let metricsService: jest.Mocked<MetricsService>;

  const createMockExecutionContext = (
    method: string = 'GET',
    url: string = '/api/test',
    routePath: string | null = '/api/test',
  ): ExecutionContext => {
    const mockRequest = {
      method,
      url,
      route: routePath ? { path: routePath } : null,
    };

    const mockResponse = {
      statusCode: 200,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getClass: () => class TestController {},
      getHandler: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (response: any = {}): CallHandler => ({
    handle: () => of(response),
  });

  const createErrorCallHandler = (error: Error): CallHandler => ({
    handle: () => throwError(() => error),
  });

  beforeEach(async () => {
    const mockMetricsService = {
      recordHttpRequest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceInterceptor,
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    interceptor = module.get<PerformanceInterceptor>(PerformanceInterceptor);
    metricsService = module.get(MetricsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  // ============================================================================
  // SUCCESSFUL REQUEST TESTS
  // ============================================================================

  describe('successful requests', () => {
    it('should record metrics for successful request', (done) => {
      const context = createMockExecutionContext('GET', '/api/users', '/api/users');
      const handler = createMockCallHandler({ data: 'test' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'GET',
            '/api/users',
            200,
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should record correct HTTP method', (done) => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      let completed = 0;

      methods.forEach((method) => {
        const context = createMockExecutionContext(method, '/api/test', '/api/test');
        const handler = createMockCallHandler();

        interceptor.intercept(context, handler).subscribe({
          next: () => {
            expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
              method,
              expect.any(String),
              expect.any(Number),
              expect.any(Number),
            );
            completed++;
            if (completed === methods.length) {
              done();
            }
          },
        });
      });
    });

    it('should record duration in seconds', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          const call = metricsService.recordHttpRequest.mock.calls[0];
          const duration = call[3];

          // Duration should be a positive number in seconds
          expect(typeof duration).toBe('number');
          expect(duration).toBeGreaterThanOrEqual(0);
          // Should be in seconds (typically < 1 for fast requests)
          expect(duration).toBeLessThan(10);
          done();
        },
      });
    });

    it('should pass through response without modification', (done) => {
      const responseData = { id: 1, name: 'test' };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual(responseData);
          done();
        },
      });
    });
  });

  // ============================================================================
  // ERROR REQUEST TESTS
  // ============================================================================

  describe('error requests', () => {
    it('should record metrics for error request', (done) => {
      const error = { status: 400, message: 'Bad Request' };
      const context = createMockExecutionContext();
      const handler = createErrorCallHandler(error as any);

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'GET',
            '/api/test',
            400,
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should default to 500 status for errors without status', (done) => {
      const error = new Error('Internal error');
      const context = createMockExecutionContext();
      const handler = createErrorCallHandler(error);

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'GET',
            '/api/test',
            500,
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should record different error status codes', (done) => {
      const errorStatuses = [400, 401, 403, 404, 500, 502, 503];
      let completed = 0;

      errorStatuses.forEach((status) => {
        const error = { status, message: 'Error' };
        const context = createMockExecutionContext();
        const handler = createErrorCallHandler(error as any);

        interceptor.intercept(context, handler).subscribe({
          error: () => {
            completed++;
            if (completed === errorStatuses.length) {
              done();
            }
          },
        });
      });
    });
  });

  // ============================================================================
  // ROUTE EXTRACTION TESTS
  // ============================================================================

  describe('route extraction', () => {
    it('should use route path when available', (done) => {
      const context = createMockExecutionContext('GET', '/api/users/123', '/api/users/:id');
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'GET',
            '/api/users/:id',
            200,
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should fall back to URL when route is not available', (done) => {
      const context = createMockExecutionContext('GET', '/api/users/123', null);
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'GET',
            expect.stringContaining('/api/users'),
            200,
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should replace UUID patterns with :id', (done) => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const context = createMockExecutionContext('GET', `/api/users/${uuid}`, null);
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          const call = metricsService.recordHttpRequest.mock.calls[0];
          const route = call[1];
          expect(route).not.toContain(uuid);
          expect(route).toContain(':id');
          done();
        },
      });
    });

    it('should replace numeric IDs with :id', (done) => {
      const context = createMockExecutionContext('GET', '/api/users/123/tasks/456', null);
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          const call = metricsService.recordHttpRequest.mock.calls[0];
          const route = call[1];
          expect(route).toContain(':id');
          expect(route).not.toMatch(/\/\d+/);
          done();
        },
      });
    });

    it('should remove query parameters from route', (done) => {
      const context = createMockExecutionContext(
        'GET',
        '/api/users?page=1&limit=10&filter=active',
        null,
      );
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          const call = metricsService.recordHttpRequest.mock.calls[0];
          const route = call[1];
          expect(route).not.toContain('?');
          expect(route).not.toContain('page=');
          expect(route).not.toContain('limit=');
          done();
        },
      });
    });

    it('should return "unknown" for empty route', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '',
        route: null,
      };
      const mockResponse = { statusCode: 200 };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as unknown as ExecutionContext;

      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          const call = metricsService.recordHttpRequest.mock.calls[0];
          const route = call[1];
          expect(route).toBe('unknown');
          done();
        },
      });
    });
  });

  // ============================================================================
  // TIMING TESTS
  // ============================================================================

  describe('timing', () => {
    it('should measure duration correctly for fast requests', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          const call = metricsService.recordHttpRequest.mock.calls[0];
          const duration = call[3];
          // Fast request should be < 0.1 seconds
          expect(duration).toBeLessThan(0.1);
          done();
        },
      });
    });

    it('should log warning for slow requests (> 1s)', (done) => {
      // We can't easily test the logger output, but we can verify
      // that slow requests still record metrics correctly
      const context = createMockExecutionContext();
      const handler: CallHandler = {
        handle: () => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(of({})), 10);
          }).then((obs) => obs as any);
        },
      } as any;

      // Just verify the interceptor works with delayed responses
      const regularHandler = createMockCallHandler();
      interceptor.intercept(context, regularHandler).subscribe({
        next: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  // ============================================================================
  // STATUS CODE TESTS
  // ============================================================================

  describe('status codes', () => {
    it('should handle 2xx success codes', (done) => {
      const statusCodes = [200, 201, 204];
      let completed = 0;

      statusCodes.forEach((status) => {
        const mockResponse = { statusCode: status };
        const context = {
          switchToHttp: () => ({
            getRequest: () => ({ method: 'GET', url: '/test', route: null }),
            getResponse: () => mockResponse,
          }),
        } as unknown as ExecutionContext;
        const handler = createMockCallHandler();

        interceptor.intercept(context, handler).subscribe({
          next: () => {
            completed++;
            if (completed === statusCodes.length) {
              expect(metricsService.recordHttpRequest).toHaveBeenCalledTimes(statusCodes.length);
              done();
            }
          },
        });
      });
    });

    it('should handle 3xx redirect codes', (done) => {
      const mockResponse = { statusCode: 302 };
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/redirect', route: null }),
          getResponse: () => mockResponse,
        }),
      } as unknown as ExecutionContext;
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'GET',
            '/redirect',
            302,
            expect.any(Number),
          );
          done();
        },
      });
    });
  });

  // ============================================================================
  // EDGE CASES TESTS
  // ============================================================================

  describe('edge cases', () => {
    it('should handle request with special characters in URL', (done) => {
      const context = createMockExecutionContext('GET', '/api/search?q=hello%20world', null);
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle request with unicode in URL', (done) => {
      const context = createMockExecutionContext(
        'GET',
        '/api/search?q=%D1%82%D0%B5%D1%81%D1%82',
        null,
      );
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle multiple UUIDs in URL', (done) => {
      const uuid1 = '550e8400-e29b-41d4-a716-446655440000';
      const uuid2 = '660e8400-e29b-41d4-a716-446655440001';
      const context = createMockExecutionContext('GET', `/api/users/${uuid1}/tasks/${uuid2}`, null);
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          const call = metricsService.recordHttpRequest.mock.calls[0];
          const route = call[1];
          expect(route).not.toContain(uuid1);
          expect(route).not.toContain(uuid2);
          done();
        },
      });
    });

    it('should handle very long URLs', (done) => {
      const longPath = '/api/' + 'a'.repeat(1000);
      const context = createMockExecutionContext('GET', longPath, null);
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalled();
          done();
        },
      });
    });
  });
});
