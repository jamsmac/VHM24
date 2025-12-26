import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BullBoardController } from './bull-board.controller';

/**
 * BullMQ Board Module
 *
 * Provides a web UI for monitoring BullMQ queues at /admin/queues
 *
 * Features:
 * - View all queues and their jobs
 * - Monitor job progress
 * - Retry failed jobs
 * - Clean completed jobs
 * - View job data and logs
 *
 * Access: http://localhost:3000/admin/queues
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'sales-import',
    }),
    BullModule.registerQueue({
      name: 'commission-calculations',
    }),
  ],
  controllers: [BullBoardController],
})
export class BullBoardModule {}
