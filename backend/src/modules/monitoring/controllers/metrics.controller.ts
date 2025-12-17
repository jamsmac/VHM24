import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { MetricsService } from '../services/metrics.service';

/**
 * Health check response
 */
interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  environment: string | undefined;
}

/**
 * Readiness check response
 */
interface ReadinessResponse {
  status: string;
  timestamp: string;
  checks: {
    database: string;
    cache: string;
    queue: string;
  };
}

/**
 * Liveness check response
 */
interface LivenessResponse {
  status: string;
  timestamp: string;
}

/**
 * Metrics collection response
 */
interface CollectMetricsResponse {
  message: string;
  timestamp: string;
}

/**
 * Metrics Controller
 *
 * Provides endpoints for metrics collection and health checks
 * Note: /metrics endpoint is automatically provided by PrometheusModule
 */
@ApiTags('Monitoring')
@Controller('monitoring')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Health check endpoint
   * Returns basic application health status
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  async health(): Promise<HealthResponse> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
    };
  }

  /**
   * Readiness check endpoint
   * Checks if the application is ready to serve traffic
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check endpoint' })
  async ready(): Promise<ReadinessResponse> {
    // Here you would check database connectivity, cache, etc.
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        cache: 'connected',
        queue: 'ready',
      },
    };
  }

  /**
   * Liveness check endpoint
   * Simple check to verify the application is alive
   */
  @Get('live')
  @ApiOperation({ summary: 'Liveness check endpoint' })
  async live(): Promise<LivenessResponse> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Trigger business metrics collection
   * This would typically be called by a scheduler
   */
  @Get('collect-metrics')
  @ApiExcludeEndpoint()
  async collectMetrics(): Promise<CollectMetricsResponse> {
    await this.metricsService.collectBusinessMetrics();
    return {
      message: 'Metrics collection triggered',
      timestamp: new Date().toISOString(),
    };
  }
}
