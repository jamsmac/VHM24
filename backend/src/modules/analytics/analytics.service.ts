import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { DailyStats } from './entities/daily-stats.entity';
import { Transaction, TransactionType } from '../transactions/entities/transaction.entity';
import { Task, TaskStatus, TaskType } from '../tasks/entities/task.entity';
import { Machine } from '../machines/entities/machine.entity';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(DailyStats)
    private readonly dailyStatsRepository: Repository<DailyStats>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Получить или создать запись статистики за дату
   */
  async getOrCreateDailyStats(date: Date): Promise<DailyStats> {
    const dateStr = format(date, 'yyyy-MM-dd');

    let stats = await this.dailyStatsRepository.findOne({
      // TypeORM date columns accept 'YYYY-MM-DD' string format
      where: { stat_date: dateStr as unknown as Date },
    });

    if (!stats) {
      stats = this.dailyStatsRepository.create({
        // TypeORM date columns accept 'YYYY-MM-DD' string format
        stat_date: dateStr as unknown as Date,
        last_updated_at: new Date(),
      });
      stats = await this.dailyStatsRepository.save(stats);
      this.logger.log(`Создана новая запись статистики для ${dateStr}`);
    }

    return stats;
  }

  /**
   * Обновить статистику продаж для даты (инкрементально)
   */
  async updateSalesStats(date: Date, transaction: Transaction): Promise<void> {
    const stats = await this.getOrCreateDailyStats(date);

    if (transaction.transaction_type === TransactionType.SALE) {
      const amount = Number(transaction.amount);

      stats.total_revenue = Number(stats.total_revenue) + amount;
      stats.total_sales_count += 1;
      stats.average_sale_amount =
        stats.total_sales_count > 0 ? Number(stats.total_revenue) / stats.total_sales_count : 0;

      stats.last_updated_at = new Date();

      await this.dailyStatsRepository.save(stats);

      this.logger.debug(
        `Обновлена статистика продаж для ${format(date, 'yyyy-MM-dd')}: ` +
          `+${amount.toFixed(2)} сум, всего ${stats.total_sales_count} продаж`,
      );
    }
  }

  /**
   * Обновить статистику инкассаций для даты (инкрементально)
   */
  async updateCollectionStats(date: Date, amount: number): Promise<void> {
    const stats = await this.getOrCreateDailyStats(date);

    stats.total_collections = Number(stats.total_collections) + amount;
    stats.collections_count += 1;
    stats.last_updated_at = new Date();

    await this.dailyStatsRepository.save(stats);

    this.logger.debug(
      `Обновлена статистика инкассаций для ${format(date, 'yyyy-MM-dd')}: ` +
        `+${amount.toFixed(2)} сум, всего ${stats.collections_count} инкассаций`,
    );
  }

  /**
   * Обновить статистику задач для даты (инкрементально)
   */
  async updateTaskStats(date: Date, task: Task): Promise<void> {
    const stats = await this.getOrCreateDailyStats(date);

    stats.total_tasks_completed += 1;

    switch (task.type_code) {
      case TaskType.REFILL:
        stats.refill_tasks_completed += 1;
        break;
      case TaskType.COLLECTION:
        stats.collection_tasks_completed += 1;
        break;
      case TaskType.CLEANING:
        stats.cleaning_tasks_completed += 1;
        break;
      case TaskType.REPAIR:
        stats.repair_tasks_completed += 1;
        break;
    }

    stats.last_updated_at = new Date();

    await this.dailyStatsRepository.save(stats);

    this.logger.debug(
      `Обновлена статистика задач для ${format(date, 'yyyy-MM-dd')}: ` +
        `+1 задача ${task.type_code}`,
    );
  }

  /**
   * Полная пересборка статистики за дату
   * Используется для исправления несоответствий или первичной загрузки
   */
  async rebuildDailyStats(date: Date): Promise<DailyStats> {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    this.logger.log(`Начало полной пересборки статистики для ${dateStr}`);

    // ============================================================================
    // 1. ПРОДАЖИ
    // ============================================================================
    const salesStats = await this.dataSource
      .getRepository(Transaction)
      .createQueryBuilder('t')
      .select([
        'COUNT(t.id) as sales_count',
        'COALESCE(SUM(t.amount), 0) as total_revenue',
        'COALESCE(AVG(t.amount), 0) as average_amount',
      ])
      .where('t.transaction_type = :type', { type: TransactionType.SALE })
      .andWhere('t.sale_date >= :start', { start: dayStart })
      .andWhere('t.sale_date < :end', { end: dayEnd })
      .getRawOne();

    // ============================================================================
    // 2. ИНКАССАЦИИ
    // ============================================================================
    const collectionStats = await this.dataSource
      .getRepository(Transaction)
      .createQueryBuilder('t')
      .select([
        'COUNT(t.id) as collection_count',
        'COALESCE(SUM(t.amount), 0) as total_collections',
      ])
      .where('t.transaction_type = :type', { type: TransactionType.COLLECTION })
      .andWhere('t.created_at >= :start', { start: dayStart })
      .andWhere('t.created_at < :end', { end: dayEnd })
      .getRawOne();

    // ============================================================================
    // 3. ЗАДАЧИ
    // ============================================================================
    const tasksStats = await this.dataSource
      .getRepository(Task)
      .createQueryBuilder('t')
      .select([
        'COUNT(*) FILTER (WHERE t.type_code = :refill) as refill_count',
        'COUNT(*) FILTER (WHERE t.type_code = :collection) as collection_count',
        'COUNT(*) FILTER (WHERE t.type_code = :cleaning) as cleaning_count',
        'COUNT(*) FILTER (WHERE t.type_code = :repair) as repair_count',
        'COUNT(*) as total_count',
      ])
      .where('t.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere('t.completed_at >= :start', { start: dayStart })
      .andWhere('t.completed_at < :end', { end: dayEnd })
      .setParameters({
        refill: TaskType.REFILL,
        collection: TaskType.COLLECTION,
        cleaning: TaskType.CLEANING,
        repair: TaskType.REPAIR,
      })
      .getRawOne();

    // ============================================================================
    // 4. АППАРАТЫ (на конец дня)
    // ============================================================================
    const machinesStats = await this.dataSource
      .getRepository(Machine)
      .createQueryBuilder('m')
      .select([
        'COUNT(m.id) as total_machines',
        'COUNT(*) FILTER (WHERE m.status = :online) as online_count',
        'COUNT(*) FILTER (WHERE m.status = :offline) as offline_count',
      ])
      .where('m.deleted_at IS NULL')
      .setParameters({
        online: 'online',
        offline: 'offline',
      })
      .getRawOne();

    // ============================================================================
    // 5. ТОП ПРОДУКТОВ
    // ============================================================================
    const topProducts = await this.dataSource
      .getRepository(Transaction)
      .createQueryBuilder('t')
      .select([
        't.nomenclature_id as nomenclature_id',
        'n.name as name',
        'COUNT(t.id) as quantity',
        'SUM(t.amount) as revenue',
      ])
      .leftJoin('t.nomenclature', 'n')
      .where('t.transaction_type = :type', { type: TransactionType.SALE })
      .andWhere('t.sale_date >= :start', { start: dayStart })
      .andWhere('t.sale_date < :end', { end: dayEnd })
      .andWhere('t.nomenclature_id IS NOT NULL')
      .groupBy('t.nomenclature_id, n.name')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany();

    // ============================================================================
    // 6. ТОП АППАРАТОВ
    // ============================================================================
    const topMachines = await this.dataSource
      .getRepository(Transaction)
      .createQueryBuilder('t')
      .select([
        't.machine_id as machine_id',
        'm.machine_number as machine_number',
        'COUNT(t.id) as sales_count',
        'SUM(t.amount) as revenue',
      ])
      .leftJoin('t.machine', 'm')
      .where('t.transaction_type = :type', { type: TransactionType.SALE })
      .andWhere('t.sale_date >= :start', { start: dayStart })
      .andWhere('t.sale_date < :end', { end: dayEnd })
      .groupBy('t.machine_id, m.machine_number')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany();

    // ============================================================================
    // 7. ОПЕРАТОРЫ
    // ============================================================================
    const operatorsCount = await this.dataSource
      .getRepository(Task)
      .createQueryBuilder('t')
      .select('COUNT(DISTINCT t.assigned_to_user_id)', 'count')
      .where('t.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere('t.completed_at >= :start', { start: dayStart })
      .andWhere('t.completed_at < :end', { end: dayEnd })
      .andWhere('t.assigned_to_user_id IS NOT NULL')
      .getRawOne();

    // ============================================================================
    // СОХРАНЕНИЕ
    // ============================================================================
    const stats = await this.getOrCreateDailyStats(date);

    stats.total_revenue = parseFloat(salesStats.total_revenue) || 0;
    stats.total_sales_count = parseInt(salesStats.sales_count) || 0;
    stats.average_sale_amount = parseFloat(salesStats.average_amount) || 0;

    stats.total_collections = parseFloat(collectionStats.total_collections) || 0;
    stats.collections_count = parseInt(collectionStats.collection_count) || 0;

    stats.refill_tasks_completed = parseInt(tasksStats.refill_count) || 0;
    stats.collection_tasks_completed = parseInt(tasksStats.collection_count) || 0;
    stats.cleaning_tasks_completed = parseInt(tasksStats.cleaning_count) || 0;
    stats.repair_tasks_completed = parseInt(tasksStats.repair_count) || 0;
    stats.total_tasks_completed = parseInt(tasksStats.total_count) || 0;

    stats.active_machines_count = parseInt(machinesStats.total_machines) || 0;
    stats.online_machines_count = parseInt(machinesStats.online_count) || 0;
    stats.offline_machines_count = parseInt(machinesStats.offline_count) || 0;

    stats.top_products = topProducts.map((p) => ({
      nomenclature_id: p.nomenclature_id,
      name: p.name,
      quantity: parseInt(p.quantity),
      revenue: parseFloat(p.revenue),
    }));

    stats.top_machines = topMachines.map((m) => ({
      machine_id: m.machine_id,
      machine_number: m.machine_number,
      sales_count: parseInt(m.sales_count),
      revenue: parseFloat(m.revenue),
    }));

    stats.active_operators_count = parseInt(operatorsCount.count) || 0;

    stats.last_updated_at = new Date();
    stats.last_full_rebuild_at = new Date();

    await this.dailyStatsRepository.save(stats);

    this.logger.log(
      `✅ Пересборка статистики для ${dateStr} завершена: ` +
        `${stats.total_sales_count} продаж, ${stats.total_revenue} сум`,
    );

    return stats;
  }

  /**
   * CRON: Ежедневная пересборка статистики за вчерашний день
   * Запускается в 01:00 ночи
   */
  @Cron('0 1 * * *', {
    name: 'daily-stats-rebuild',
    timeZone: 'Europe/Moscow',
  })
  async rebuildYesterdayStats(): Promise<void> {
    const yesterday = subDays(new Date(), 1);

    this.logger.log('🔄 Запуск ежедневной пересборки статистики за вчерашний день');

    try {
      await this.rebuildDailyStats(yesterday);
      this.logger.log('✅ Ежедневная пересборка завершена успешно');
    } catch (error) {
      this.logger.error(`❌ Ошибка при пересборке статистики: ${error.message}`, error.stack);
    }
  }

  /**
   * Получить статистику за диапазон дат
   */
  async getStatsForDateRange(startDate: Date, endDate: Date): Promise<DailyStats[]> {
    return this.dailyStatsRepository.find({
      where: {
        // TypeORM Between accepts string date format for date columns
        stat_date: Between(
          format(startDate, 'yyyy-MM-dd'),
          format(endDate, 'yyyy-MM-dd'),
        ) as unknown as Date,
      },
      order: {
        stat_date: 'ASC',
      },
    });
  }

  /**
   * Получить статистику за конкретную дату
   */
  async getStatsForDate(date: Date): Promise<DailyStats | null> {
    return this.dailyStatsRepository.findOne({
      // TypeORM date columns accept 'YYYY-MM-DD' string format
      where: { stat_date: format(date, 'yyyy-MM-dd') as unknown as Date },
    });
  }

  /**
   * Финализировать статистику за день (закрыть день)
   */
  async finalizeDay(date: Date): Promise<DailyStats> {
    const stats = await this.rebuildDailyStats(date);
    stats.is_finalized = true;
    return this.dailyStatsRepository.save(stats);
  }
}
