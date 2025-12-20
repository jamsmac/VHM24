/**
 * Sales Import Worker
 *
 * This worker processes Excel file imports and sales data.
 * It runs independently for better performance when handling large files.
 *
 * Features:
 * - Processes Excel files (.xlsx)
 * - Auto-links sales to contracts
 * - Handles errors gracefully
 * - Progress tracking
 *
 * Usage:
 *   npm run build && node dist/workers/sales-import.worker.js
 *   Or via PM2: pm2 start ecosystem.config.js --only sales-import-worker
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { Queue } from 'bull';

const logger = new Logger('SalesImportWorker');

async function bootstrap() {
  logger.log('Starting Sales Import Worker...');

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Get the sales-import queue
    const salesImportQueue = app.get<Queue>('BullQueue_sales-import');

    logger.log('Sales Import Worker initialized successfully');
    logger.log(`Connected to Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
    logger.log('Waiting for file import jobs...');

    // The actual processing is handled by SalesImportProcessor
    // This worker just needs to keep running to process jobs from the queue

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.log(`Received ${signal}, closing worker gracefully...`);

      await salesImportQueue.close();
      await app.close();

      logger.log('Worker closed successfully');
      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));

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
    logger.error('Failed to start sales import worker:', error);
    process.exit(1);
  }
}

void bootstrap();
