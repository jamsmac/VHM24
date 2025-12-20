/**
 * Health Monitor Worker
 *
 * This standalone worker monitors the health of:
 * - BullMQ queues (waiting, active, failed, delayed)
 * - Database connections
 * - Redis connections
 * - Application health endpoints
 *
 * It runs periodic health checks and can trigger alerts if issues are detected.
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { Queue } from 'bull';
import { Connection } from 'typeorm';
import Redis from 'ioredis';

const logger = new Logger('HealthMonitorWorker');

interface QueueHealth {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

interface SystemHealth {
  timestamp: string;
  queues: QueueHealth[];
  database: {
    connected: boolean;
    activeConnections: number;
  };
  redis: {
    connected: boolean;
    usedMemory: string;
  };
  status: 'healthy' | 'degraded' | 'unhealthy';
}

async function bootstrap() {
  logger.log('Starting Health Monitor Worker...');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Get services
  const connection = app.get(Connection);
  const commissionQueue = app.get<Queue>('BullQueue_commission-calculations');

  // Create Redis client for health checks
  const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  });

  // Health check interval (every 30 seconds)
  const CHECK_INTERVAL = 30000;

  // Alert thresholds
  const THRESHOLDS = {
    queueWaitingWarning: 500,
    queueWaitingCritical: 1000,
    queueFailedWarning: 50,
    queueFailedCritical: 100,
    dbConnectionsWarning: 50,
    dbConnectionsCritical: 80,
  };

  /**
   * Check queue health
   */
  async function checkQueueHealth(queue: Queue): Promise<QueueHealth> {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    return {
      name: queue.name,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  /**
   * Check database health
   */
  async function checkDatabaseHealth() {
    try {
      const isConnected = connection.isConnected;

      // Get active connections count
      const result = await connection.query(
        'SELECT count(*) as count FROM pg_stat_activity WHERE state = $1',
        ['active'],
      );

      const activeConnections = parseInt(result[0]?.count || '0');

      return {
        connected: isConnected,
        activeConnections,
      };
    } catch (error) {
      logger.error(`Database health check failed: ${error.message}`);
      return {
        connected: false,
        activeConnections: 0,
      };
    }
  }

  /**
   * Check Redis health
   */
  async function checkRedisHealth() {
    try {
      const info = await redisClient.info('memory');
      const usedMemoryLine = info.split('\n').find((line) => line.startsWith('used_memory_human:'));
      const usedMemory = usedMemoryLine ? usedMemoryLine.split(':')[1].trim() : 'unknown';

      return {
        connected: true,
        usedMemory,
      };
    } catch (error) {
      logger.error(`Redis health check failed: ${error.message}`);
      return {
        connected: false,
        usedMemory: 'unknown',
      };
    }
  }

  /**
   * Determine overall system status
   */
  function determineSystemStatus(health: SystemHealth): SystemHealth['status'] {
    // Critical: Database or Redis down
    if (!health.database.connected || !health.redis.connected) {
      return 'unhealthy';
    }

    // Critical: Any queue has too many waiting or failed jobs
    const criticalQueue = health.queues.some(
      (q) =>
        q.waiting > THRESHOLDS.queueWaitingCritical || q.failed > THRESHOLDS.queueFailedCritical,
    );
    if (criticalQueue) {
      return 'unhealthy';
    }

    // Warning: High database connections or queue backlog
    const degraded =
      health.database.activeConnections > THRESHOLDS.dbConnectionsWarning ||
      health.queues.some(
        (q) =>
          q.waiting > THRESHOLDS.queueWaitingWarning || q.failed > THRESHOLDS.queueFailedWarning,
      );

    if (degraded) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Log health alerts
   */
  function logHealthAlerts(health: SystemHealth) {
    // Database alerts
    if (!health.database.connected) {
      logger.error('❌ CRITICAL: Database is disconnected!');
    } else if (health.database.activeConnections > THRESHOLDS.dbConnectionsCritical) {
      logger.error(
        `❌ CRITICAL: Database has ${health.database.activeConnections} active connections (threshold: ${THRESHOLDS.dbConnectionsCritical})`,
      );
    } else if (health.database.activeConnections > THRESHOLDS.dbConnectionsWarning) {
      logger.warn(
        `⚠️ WARNING: Database has ${health.database.activeConnections} active connections (threshold: ${THRESHOLDS.dbConnectionsWarning})`,
      );
    }

    // Redis alerts
    if (!health.redis.connected) {
      logger.error('❌ CRITICAL: Redis is disconnected!');
    }

    // Queue alerts
    health.queues.forEach((queue) => {
      if (queue.paused) {
        logger.warn(`⚠️ WARNING: Queue "${queue.name}" is paused`);
      }

      if (queue.waiting > THRESHOLDS.queueWaitingCritical) {
        logger.error(
          `❌ CRITICAL: Queue "${queue.name}" has ${queue.waiting} waiting jobs (threshold: ${THRESHOLDS.queueWaitingCritical})`,
        );
      } else if (queue.waiting > THRESHOLDS.queueWaitingWarning) {
        logger.warn(
          `⚠️ WARNING: Queue "${queue.name}" has ${queue.waiting} waiting jobs (threshold: ${THRESHOLDS.queueWaitingWarning})`,
        );
      }

      if (queue.failed > THRESHOLDS.queueFailedCritical) {
        logger.error(
          `❌ CRITICAL: Queue "${queue.name}" has ${queue.failed} failed jobs (threshold: ${THRESHOLDS.queueFailedCritical})`,
        );
      } else if (queue.failed > THRESHOLDS.queueFailedWarning) {
        logger.warn(
          `⚠️ WARNING: Queue "${queue.name}" has ${queue.failed} failed jobs (threshold: ${THRESHOLDS.queueFailedWarning})`,
        );
      }
    });
  }

  /**
   * Run periodic health check
   */
  async function runHealthCheck() {
    try {
      logger.log('Running health check...');

      const [queueHealth, databaseHealth, redisHealth] = await Promise.all([
        checkQueueHealth(commissionQueue),
        checkDatabaseHealth(),
        checkRedisHealth(),
      ]);

      const systemHealth: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [queueHealth],
        database: databaseHealth,
        redis: redisHealth,
        status: 'healthy',
      };

      // Determine overall status
      systemHealth.status = determineSystemStatus(systemHealth);

      // Log health status
      if (systemHealth.status === 'healthy') {
        logger.log('✅ System health: HEALTHY');
      } else if (systemHealth.status === 'degraded') {
        logger.warn('⚠️ System health: DEGRADED');
      } else {
        logger.error('❌ System health: UNHEALTHY');
      }

      // Log detailed metrics
      logger.log(
        `Queue: ${queueHealth.name} - Waiting: ${queueHealth.waiting}, Active: ${queueHealth.active}, Failed: ${queueHealth.failed}`,
      );
      logger.log(
        `Database: Connected: ${databaseHealth.connected}, Active Connections: ${databaseHealth.activeConnections}`,
      );
      logger.log(
        `Redis: Connected: ${redisHealth.connected}, Used Memory: ${redisHealth.usedMemory}`,
      );

      // Log alerts if any
      logHealthAlerts(systemHealth);

      // TODO: Send alerts to external monitoring systems (PagerDuty, Slack, etc.)
      // if (systemHealth.status === 'unhealthy') {
      //   await sendAlert(systemHealth);
      // }
    } catch (error) {
      logger.error(`Health check failed: ${error.message}`, error.stack);
    }
  }

  // Initial health check
  await runHealthCheck();

  // Schedule periodic health checks
  const healthCheckInterval = setInterval(() => void runHealthCheck(), CHECK_INTERVAL);

  logger.log(`Health Monitor Worker started. Checking every ${CHECK_INTERVAL / 1000} seconds`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.log(`${signal} received. Shutting down Health Monitor Worker...`);

    clearInterval(healthCheckInterval);
    await redisClient.quit();
    await app.close();

    logger.log('Health Monitor Worker stopped');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error('Failed to start Health Monitor Worker:', error);
  process.exit(1);
});
