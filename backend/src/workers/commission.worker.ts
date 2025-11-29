/**
 * Commission Calculation Worker
 *
 * This standalone worker processes commission calculation jobs from the BullMQ queue.
 * It runs independently from the main API server for better scalability and reliability.
 *
 * Features:
 * - Processes 5 job types: daily, weekly, monthly, overdue checks, manual
 * - Graceful shutdown on SIGTERM/SIGINT
 * - Automatic reconnection to Redis
 * - Comprehensive error logging
 *
 * Usage:
 *   npm run build && node dist/workers/commission.worker.js
 *   Or via PM2: pm2 start ecosystem.config.js --only commission-worker
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { Queue, Job } from 'bull';
import { CommissionSchedulerService } from '../modules/counterparty/services/commission-scheduler.service';
import { RealtimeGateway } from '../modules/websocket/realtime.gateway';

const logger = new Logger('CommissionWorker');

async function bootstrap() {
  logger.log('Starting Commission Calculation Worker...');

  try {
    // Create NestJS application context (no HTTP server)
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Get required services
    const schedulerService = app.get(CommissionSchedulerService);
    const realtimeGateway = app.get(RealtimeGateway);

    // Get the BullMQ queue
    const commissionQueue = app.get<Queue>('BullQueue_commission-calculations');

    logger.log('Commission worker initialized successfully');
    logger.log(`Connected to Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
    logger.log('WebSocket gateway ready for real-time updates');
    logger.log('Waiting for jobs...');

    // Process jobs
    commissionQueue.process('calculate-daily', 2, async (job: Job) => {
      logger.log(`[Job ${job.id}] Processing daily commission calculation...`);

      // Emit job started
      realtimeGateway.emitJobProgress({
        jobId: job.id.toString(),
        type: 'calculate-daily',
        progress: 0,
        message: 'Starting daily commission calculation...',
      });

      try {
        const processed = await schedulerService.calculateDailyCommissions();

        // Emit job completed
        realtimeGateway.emitJobCompleted({
          jobId: job.id.toString(),
          type: 'calculate-daily',
          result: { processed },
        });

        logger.log(
          `[Job ${job.id}] Daily calculation completed. Processed: ${processed} contracts`,
        );
        return { processed };
      } catch (error) {
        // Emit job failed
        realtimeGateway.emitJobFailed({
          jobId: job.id.toString(),
          type: 'calculate-daily',
          error: error.message,
          stack: error.stack,
        });

        logger.error(`[Job ${job.id}] Daily calculation failed: ${error.message}`, error.stack);
        throw error;
      }
    });

    commissionQueue.process('calculate-weekly', 2, async (job: Job) => {
      logger.log(`[Job ${job.id}] Processing weekly commission calculation...`);

      realtimeGateway.emitJobProgress({
        jobId: job.id.toString(),
        type: 'calculate-weekly',
        progress: 0,
        message: 'Starting weekly commission calculation...',
      });

      try {
        const processed = await schedulerService.calculateWeeklyCommissions();

        realtimeGateway.emitJobCompleted({
          jobId: job.id.toString(),
          type: 'calculate-weekly',
          result: { processed },
        });

        logger.log(
          `[Job ${job.id}] Weekly calculation completed. Processed: ${processed} contracts`,
        );
        return { processed };
      } catch (error) {
        realtimeGateway.emitJobFailed({
          jobId: job.id.toString(),
          type: 'calculate-weekly',
          error: error.message,
          stack: error.stack,
        });

        logger.error(`[Job ${job.id}] Weekly calculation failed: ${error.message}`, error.stack);
        throw error;
      }
    });

    commissionQueue.process('calculate-monthly', 2, async (job: Job) => {
      logger.log(`[Job ${job.id}] Processing monthly commission calculation...`);

      realtimeGateway.emitJobProgress({
        jobId: job.id.toString(),
        type: 'calculate-monthly',
        progress: 0,
        message: 'Starting monthly commission calculation...',
      });

      try {
        const processed = await schedulerService.calculateMonthlyCommissions();

        realtimeGateway.emitJobCompleted({
          jobId: job.id.toString(),
          type: 'calculate-monthly',
          result: { processed },
        });

        logger.log(
          `[Job ${job.id}] Monthly calculation completed. Processed: ${processed} contracts`,
        );
        return { processed };
      } catch (error) {
        realtimeGateway.emitJobFailed({
          jobId: job.id.toString(),
          type: 'calculate-monthly',
          error: error.message,
          stack: error.stack,
        });

        logger.error(`[Job ${job.id}] Monthly calculation failed: ${error.message}`, error.stack);
        throw error;
      }
    });

    commissionQueue.process('check-overdue', 1, async (job: Job) => {
      logger.log(`[Job ${job.id}] Checking for overdue payments...`);

      realtimeGateway.emitJobProgress({
        jobId: job.id.toString(),
        type: 'check-overdue',
        progress: 0,
        message: 'Checking for overdue payments...',
      });

      try {
        const updated = await schedulerService.checkAndUpdateOverduePayments();

        realtimeGateway.emitJobCompleted({
          jobId: job.id.toString(),
          type: 'check-overdue',
          result: { updated },
        });

        logger.log(`[Job ${job.id}] Overdue check completed. Updated: ${updated} calculations`);
        return { updated };
      } catch (error) {
        realtimeGateway.emitJobFailed({
          jobId: job.id.toString(),
          type: 'check-overdue',
          error: error.message,
          stack: error.stack,
        });

        logger.error(`[Job ${job.id}] Overdue check failed: ${error.message}`, error.stack);
        throw error;
      }
    });

    commissionQueue.process('calculate-manual', 2, async (job: Job) => {
      logger.log(`[Job ${job.id}] Processing manual commission calculation...`);
      const { period, contractId, periodStart, periodEnd } = job.data;

      realtimeGateway.emitJobProgress({
        jobId: job.id.toString(),
        type: 'calculate-manual',
        progress: 0,
        message: 'Starting manual commission calculation...',
      });

      try {
        let processed = 0;

        if (contractId && periodStart && periodEnd) {
          // Calculate for specific contract and period
          realtimeGateway.emitJobProgress({
            jobId: job.id.toString(),
            type: 'calculate-manual',
            progress: 50,
            message: `Calculating for contract ${contractId}...`,
          });

          await schedulerService.calculateForContract(
            contractId,
            new Date(periodStart),
            new Date(periodEnd),
          );
          processed = 1;
        } else if (period) {
          // Calculate by period type
          switch (period) {
            case 'daily':
              processed = await schedulerService.calculateDailyCommissions();
              break;
            case 'weekly':
              processed = await schedulerService.calculateWeeklyCommissions();
              break;
            case 'monthly':
              processed = await schedulerService.calculateMonthlyCommissions();
              break;
            case 'all':
              realtimeGateway.emitJobProgress({
                jobId: job.id.toString(),
                type: 'calculate-manual',
                progress: 25,
                message: 'Calculating daily commissions...',
              });
              const daily = await schedulerService.calculateDailyCommissions();

              realtimeGateway.emitJobProgress({
                jobId: job.id.toString(),
                type: 'calculate-manual',
                progress: 50,
                message: 'Calculating weekly commissions...',
              });
              const weekly = await schedulerService.calculateWeeklyCommissions();

              realtimeGateway.emitJobProgress({
                jobId: job.id.toString(),
                type: 'calculate-manual',
                progress: 75,
                message: 'Calculating monthly commissions...',
              });
              const monthly = await schedulerService.calculateMonthlyCommissions();

              processed = daily + weekly + monthly;
              break;
          }
        }

        realtimeGateway.emitJobCompleted({
          jobId: job.id.toString(),
          type: 'calculate-manual',
          result: { processed },
        });

        logger.log(`[Job ${job.id}] Manual calculation completed. Processed: ${processed}`);
        return { processed };
      } catch (error) {
        realtimeGateway.emitJobFailed({
          jobId: job.id.toString(),
          type: 'calculate-manual',
          error: error.message,
          stack: error.stack,
        });

        logger.error(`[Job ${job.id}] Manual calculation failed: ${error.message}`, error.stack);
        throw error;
      }
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.log(`Received ${signal}, closing worker gracefully...`);

      await commissionQueue.close();
      await app.close();

      logger.log('Worker closed successfully');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start commission worker:', error);
    process.exit(1);
  }
}

bootstrap();
