import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, correlationId } = request;
    const userAgent = request.get('user-agent') || '';
    const ip = request.ip;

    const now = Date.now();

    this.logger.log({
      message: 'Incoming request',
      method,
      url,
      correlationId,
      userAgent,
      ip,
      body: method !== 'GET' ? body : undefined,
    });

    return next.handle().pipe(
      tap({
        next: (_data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const responseTime = Date.now() - now;

          this.logger.log({
            message: 'Request completed',
            method,
            url,
            statusCode,
            responseTime: `${responseTime}ms`,
            correlationId,
          });
        },
        error: (error) => {
          const responseTime = Date.now() - now;

          this.logger.error({
            message: 'Request failed',
            method,
            url,
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`,
            correlationId,
          });
        },
      }),
    );
  }
}
