import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Exception response structure from HttpException
 */
interface ExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

/**
 * Error response returned to client
 */
interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message?: string | string[] | ExceptionResponse;
  error?: string;
  stack?: string;
}

/**
 * Global HTTP Exception Filter
 *
 * Handles all exceptions in the application and returns a consistent error response.
 * Logs 5xx errors for debugging.
 * Hides sensitive information in production.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    // Log 5xx errors (server errors) but not 4xx (client errors)
    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} Error: ${JSON.stringify(message)}`,
        exception instanceof Error ? exception.stack : '',
        `${request.method} ${request.url}`,
      );
    }

    // Determine if running in production
    const isProduction = process.env.NODE_ENV === 'production';

    // Build error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Extract message from exception
    if (typeof message === 'object' && message !== null) {
      const messageObj = message as ExceptionResponse;
      errorResponse.message = messageObj.message || message;
      errorResponse.error = messageObj.error;
    } else {
      errorResponse.message = message;
    }

    // Add stack trace only in development
    if (!isProduction && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}
