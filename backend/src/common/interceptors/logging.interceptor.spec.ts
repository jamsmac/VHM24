import { Logger, ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();

    mockRequest = {
      method: 'GET',
      url: '/test/endpoint',
      body: { data: 'test' },
      correlationId: 'test-correlation-id',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
    };

    mockResponse = {
      statusCode: 200,
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ result: 'success' })),
    };

    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('intercept', () => {
    it('should log incoming GET request without body', (done) => {
      mockRequest.method = 'GET';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Incoming request',
              method: 'GET',
              url: '/test/endpoint',
              correlationId: 'test-correlation-id',
              body: undefined,
            }),
          );
          done();
        },
      });
    });

    it('should log incoming POST request with body', (done) => {
      mockRequest.method = 'POST';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Incoming request',
              method: 'POST',
              body: { data: 'test' },
            }),
          );
          done();
        },
      });
    });

    it('should log successful request completion', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Request completed',
              method: 'GET',
              url: '/test/endpoint',
              statusCode: 200,
              correlationId: 'test-correlation-id',
            }),
          );
          done();
        },
      });
    });

    it('should include response time in completion log', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const completionCall = logSpy.mock.calls.find(
            (call) => call[0]?.message === 'Request completed',
          );
          expect(completionCall).toBeDefined();
          expect(completionCall[0].responseTime).toMatch(/^\d+ms$/);
          done();
        },
      });
    });

    it('should log error when request fails', (done) => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Request failed',
              method: 'GET',
              url: '/test/endpoint',
              error: 'Test error',
              stack: 'Error stack trace',
              correlationId: 'test-correlation-id',
            }),
          );
          done();
        },
      });
    });

    it('should handle missing user-agent', (done) => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              userAgent: '',
            }),
          );
          done();
        },
      });
    });

    it('should pass through response data unchanged', (done) => {
      const responseData = { result: 'test data' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual(responseData);
        },
        complete: done,
      });
    });

    it('should log PUT request with body', (done) => {
      mockRequest.method = 'PUT';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'PUT',
              body: { data: 'test' },
            }),
          );
          done();
        },
      });
    });

    it('should log DELETE request with body', (done) => {
      mockRequest.method = 'DELETE';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'DELETE',
              body: { data: 'test' },
            }),
          );
          done();
        },
      });
    });

    it('should log IP address in incoming request', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              ip: '127.0.0.1',
            }),
          );
          done();
        },
      });
    });
  });
});
