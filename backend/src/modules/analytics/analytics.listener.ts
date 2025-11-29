import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AnalyticsService } from './analytics.service';
import { Transaction, TransactionType } from '../transactions/entities/transaction.entity';
import { Task } from '../tasks/entities/task.entity';

/**
 * Event Listener для real-time обновления агрегированной статистики
 *
 * Слушает события создания транзакций и завершения задач,
 * и инкрементально обновляет DailyStats.
 */
@Injectable()
export class AnalyticsListener {
  private readonly logger = new Logger(AnalyticsListener.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Обработка события создания транзакции продажи
   */
  @OnEvent('transaction.created')
  async handleTransactionCreated(payload: { transaction: Transaction; date: Date }): Promise<void> {
    try {
      const { transaction, date } = payload;

      // Обновляем статистику продаж
      if (transaction.transaction_type === TransactionType.SALE) {
        await this.analyticsService.updateSalesStats(date, transaction);
        this.logger.debug(`📊 Статистика продаж обновлена для транзакции ${transaction.id}`);
      }

      // Обновляем статистику инкассаций
      if (transaction.transaction_type === TransactionType.COLLECTION) {
        await this.analyticsService.updateCollectionStats(date, Number(transaction.amount));
        this.logger.debug(`📊 Статистика инкассаций обновлена для транзакции ${transaction.id}`);
      }
    } catch (error) {
      this.logger.error(
        `Ошибка при обновлении статистики для транзакции: ${error.message}`,
        error.stack,
      );
      // Не пробрасываем ошибку, чтобы не сломать основной процесс
    }
  }

  /**
   * Обработка события завершения задачи
   */
  @OnEvent('task.completed')
  async handleTaskCompleted(payload: { task: Task; date: Date }): Promise<void> {
    try {
      const { task, date } = payload;

      await this.analyticsService.updateTaskStats(date, task);

      this.logger.debug(`📊 Статистика задач обновлена для задачи ${task.id} (${task.type_code})`);
    } catch (error) {
      this.logger.error(
        `Ошибка при обновлении статистики для задачи: ${error.message}`,
        error.stack,
      );
      // Не пробрасываем ошибку, чтобы не сломать основной процесс
    }
  }

  /**
   * Обработка события отклонения задачи (откат статистики)
   */
  @OnEvent('task.rejected')
  async handleTaskRejected(payload: { task: Task; date: Date }): Promise<void> {
    try {
      const { task, date } = payload;

      // При отклонении задачи нужно пересобрать статистику за день,
      // так как инкрементальное обновление не подходит для отката
      this.logger.warn(
        `⚠️ Задача ${task.id} отклонена, запуск пересборки статистики за ${date.toISOString()}`,
      );

      await this.analyticsService.rebuildDailyStats(date);

      this.logger.log(`📊 Статистика пересобрана после отклонения задачи ${task.id}`);
    } catch (error) {
      this.logger.error(
        `Ошибка при пересборке статистики после отклонения задачи: ${error.message}`,
        error.stack,
      );
    }
  }
}
