import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@Controller('health')
@SkipThrottle() // Health endpoints should not be rate-limited
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    @InjectQueue('commission-calculations')
    private commissionQueue: Queue,
    @InjectQueue('sales-import')
    private salesImportQueue: Queue,
  ) {}

  /**
   * Check Redis connectivity through Bull queue client
   */
  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      const client = this.commissionQueue.client;
      const pong = await client.ping();
      if (pong === 'PONG') {
        return { redis: { status: 'up' } };
      }
      return { redis: { status: 'down', message: 'Unexpected response' } };
    } catch (error) {
      return {
        redis: {
          status: 'down',
          message: error instanceof Error ? error.message : 'Connection failed',
        },
      };
    }
  }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'The service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
      },
    },
  })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.checkRedis(),
    ]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  ready() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('queues')
  @ApiOperation({ summary: 'Queue health check' })
  @ApiResponse({ status: 200, description: 'Queue statistics' })
  async queues() {
    const [commissionCounts, salesImportCounts] = await Promise.all([
      this.commissionQueue.getJobCounts(),
      this.salesImportQueue.getJobCounts(),
    ]);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      queues: {
        'commission-calculations': {
          waiting: commissionCounts.waiting,
          active: commissionCounts.active,
          completed: commissionCounts.completed,
          failed: commissionCounts.failed,
          delayed: commissionCounts.delayed,
        },
        'sales-import': {
          waiting: salesImportCounts.waiting,
          active: salesImportCounts.active,
          completed: salesImportCounts.completed,
          failed: salesImportCounts.failed,
          delayed: salesImportCounts.delayed,
        },
      },
    };
  }
}
