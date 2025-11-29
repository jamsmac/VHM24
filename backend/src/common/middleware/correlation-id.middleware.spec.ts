import { CorrelationIdMiddleware, CORRELATION_ID_HEADER } from './correlation-id.middleware';
import { Request, Response, NextFunction } from 'express';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('generated-uuid-1234'),
}));

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should use existing correlation ID from request header', () => {
      const existingCorrelationId = 'existing-correlation-id-5678';
      mockRequest.headers = {
        'x-correlation-id': existingCorrelationId,
      };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.correlationId).toBe(existingCorrelationId);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,
        existingCorrelationId,
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate new correlation ID when not provided', () => {
      mockRequest.headers = {};

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.correlationId).toBe('generated-uuid-1234');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,
        'generated-uuid-1234',
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() to continue middleware chain', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should set correlation ID in response header', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', expect.any(String));
    });

    it('should store correlation ID in request object', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest).toHaveProperty('correlationId');
      expect(typeof mockRequest.correlationId).toBe('string');
    });

    it('should handle lowercase header name', () => {
      const correlationId = 'lowercase-header-id';
      mockRequest.headers = {
        'x-correlation-id': correlationId,
      };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.correlationId).toBe(correlationId);
    });

    it('should export CORRELATION_ID_HEADER constant', () => {
      expect(CORRELATION_ID_HEADER).toBe('X-Correlation-ID');
    });
  });
});
