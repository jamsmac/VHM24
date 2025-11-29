import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { ArgumentsHost } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = { status: mockStatus };
    mockRequest = {
      url: '/test/endpoint',
      method: 'GET',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    // Mock Logger
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('catch', () => {
    it('should handle HttpException and return correct status', () => {
      const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          path: '/test/endpoint',
          method: 'GET',
        }),
      );
    });

    it('should handle unknown exceptions with 500 status', () => {
      const exception = new Error('Unknown error');

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        }),
      );
    });

    it('should log 5xx errors', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      const exception = new HttpException('Server Error', HttpStatus.INTERNAL_SERVER_ERROR);

      filter.catch(exception, mockHost);

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should not log 4xx errors', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should handle HttpException with object message', () => {
      const exception = new HttpException(
        { message: 'Validation failed', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation failed',
          error: 'Bad Request',
        }),
      );
    });

    it('should handle HttpException with string message', () => {
      const exception = new HttpException('Simple error message', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Simple error message',
        }),
      );
    });

    it('should include stack trace in development', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const exception = new Error('Dev error');
      exception.stack = 'Error stack trace';

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: 'Error stack trace',
        }),
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should not include stack trace in production', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const exception = new Error('Prod error');
      exception.stack = 'Error stack trace';

      filter.catch(exception, mockHost);

      const calledWith = mockJson.mock.calls[0][0];
      expect(calledWith.stack).toBeUndefined();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should include timestamp in response', () => {
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const calledWith = mockJson.mock.calls[0][0];
      expect(calledWith.timestamp).toBeDefined();
      expect(new Date(calledWith.timestamp)).toBeInstanceOf(Date);
    });

    it('should handle non-Error exceptions gracefully', () => {
      const exception = 'Just a string exception';

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        }),
      );
    });

    it('should handle HttpException with object without message property', () => {
      const exception = new HttpException(
        { error: 'Custom error', details: 'Some details' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      const calledWith = mockJson.mock.calls[0][0];
      expect(calledWith.message).toEqual(
        expect.objectContaining({
          error: 'Custom error',
          details: 'Some details',
        }),
      );
    });

    it('should log error with stack trace for 5xx exceptions', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      const exception = new Error('Server Error');
      exception.stack = 'Error: Server Error\n    at Test';

      // Force 5xx by throwing unknown error
      filter.catch(exception, mockHost);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('500'),
        expect.stringContaining('Error: Server Error'),
        expect.stringContaining('GET /test/endpoint'),
      );
    });
  });
});
