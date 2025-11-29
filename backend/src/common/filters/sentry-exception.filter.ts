import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const correlationId = request.correlationId;

    // Add correlation ID to Sentry context using current API
    Sentry.withScope((scope) => {
      scope.setTag('correlationId', correlationId);
      scope.setUser({
        id: request.user?.id,
        username: request.user?.username,
      });
      scope.setContext('request', {
        method: request.method,
        url: request.url,
        headers: request.headers,
        query: request.query,
        body: request.body,
      });

      // Capture exception in Sentry
      if (exception instanceof HttpException) {
        const status = exception.getStatus();

        // Only report 5xx errors to Sentry
        if (status >= 500) {
          Sentry.captureException(exception);
        }
      } else {
        // Non-HTTP exceptions are always errors
        Sentry.captureException(exception);
      }
    });

    // Let NestJS handle the response
    super.catch(exception, host);
  }
}
