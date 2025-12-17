import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../services/metrics.service';

/**
 * Performance Interceptor
 *
 * Intercepts all HTTP requests and tracks:
 * - Request/response duration
 * - HTTP method and route
 * - Response status codes
 * - Error rates
 *
 * Sends metrics to Prometheus via MetricsService
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    // Extract route information
    const method = request.method;
    const route = this.extractRoute(request);

    // Record start time
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          // Success response
          const duration = (Date.now() - startTime) / 1000; // Convert to seconds
          const status = response.statusCode;

          this.metricsService.recordHttpRequest(method, route, status, duration);

          // Log performance for slow requests
          if (duration > 1) {
            this.logger.warn(
              `Slow request detected: ${method} ${route} took ${duration.toFixed(2)}s`,
            );
          }
        },
        error: (error) => {
          // Error response
          const duration = (Date.now() - startTime) / 1000;
          const status = error.status || 500;

          this.metricsService.recordHttpRequest(method, route, status, duration);
        },
      }),
    );
  }

  /**
   * Extract the route pattern from the request
   * Replaces dynamic segments with placeholders
   */
  private extractRoute(request: { route?: { path?: string }; url: string }): string {
    // Get the route from the matched route
    const route = request.route?.path || request.url;

    // Replace UUID patterns with :id
    let cleanRoute = route.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id',
    );

    // Replace numeric IDs with :id
    cleanRoute = cleanRoute.replace(/\/\d+/g, '/:id');

    // Remove query parameters
    cleanRoute = cleanRoute.split('?')[0];

    return cleanRoute || 'unknown';
  }
}
