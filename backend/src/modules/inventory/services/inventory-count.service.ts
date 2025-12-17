import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InventoryActualCount,
  InventoryLevelType,
} from '../entities/inventory-actual-count.entity';
import {
  CreateActualCountDto,
  CreateBatchCountDto,
  GetActualCountsFilterDto,
} from '../dto/inventory-count.dto';
import { v4 as uuidv4 } from 'uuid';
import { InventoryDifferenceService } from './inventory-difference.service';

/**
 * Inventory session summary from aggregated data
 */
export interface InventorySessionSummary {
  session_id: string;
  counted_at: Date;
  level_type: InventoryLevelType;
  level_ref_id: string;
  counted_by_user_id: string;
  total_items: string;
}

/**
 * Product statistics in inventorization report
 */
export interface ProductStats {
  nomenclature_id: string;
  nomenclature_name: string;
  items_counted: number;
  total_quantity: number;
  avg_quantity: number;
}

/**
 * Location statistics in inventorization report
 */
export interface LocationStats {
  level_ref_id: string;
  level_type: InventoryLevelType;
  items_counted: number;
  unique_products: number;
  total_quantity: number;
}

/**
 * Operator statistics in inventorization report
 */
export interface OperatorStats {
  user_id: string;
  user_name: string;
  items_counted: number;
  unique_products: number;
  total_quantity: number;
}

/**
 * Inventorization report item
 */
export interface InventorizationReportItem {
  id: string;
  nomenclature_id: string;
  nomenclature_name: string | undefined;
  actual_quantity: number;
  unit_of_measure: string | null;
  counted_at: Date;
  counted_by: {
    id: string | undefined;
    full_name: string | undefined;
  };
  notes: string | null;
}

/**
 * Inventorization report summary
 */
export interface InventorizationReportSummary {
  session_id: string;
  level_type: InventoryLevelType;
  level_ref_id: string;
  counted_at: Date;
  total_items_counted: number;
  unique_products: number;
  unique_locations: number;
  unique_operators: number;
  total_quantity: number;
}

/**
 * Full inventorization report
 */
export interface InventorizationReport {
  summary: InventorizationReportSummary;
  items: InventorizationReportItem[];
  product_stats: ProductStats[];
  location_stats: LocationStats[];
  operator_stats: OperatorStats[];
}

/**
 * InventoryCountService
 *
 * REQ-STK-CALC-02: Управление фактическими остатками
 *
 * Используется для:
 * - Создания фактических замеров остатков
 * - Массовой инвентаризации
 * - Получения истории замеров
 */
@Injectable()
export class InventoryCountService {
  private readonly logger = new Logger(InventoryCountService.name);

  constructor(
    @InjectRepository(InventoryActualCount)
    private readonly actualCountRepository: Repository<InventoryActualCount>,
    @Inject(forwardRef(() => InventoryDifferenceService))
    private readonly differenceService: InventoryDifferenceService,
  ) {}

  /**
   * Создать фактический замер
   *
   * После создания автоматически проверяет пороги расхождений
   * и выполняет настроенные действия (инциденты, задачи, уведомления)
   */
  async createActualCount(
    dto: CreateActualCountDto,
    userId: string,
  ): Promise<InventoryActualCount> {
    this.logger.log(
      `Creating actual count for nomenclature=${dto.nomenclature_id}, level=${dto.level_type}`,
    );

    const actualCount = this.actualCountRepository.create({
      ...dto,
      counted_by_user_id: userId,
      counted_at: new Date(dto.counted_at),
    });

    const saved = await this.actualCountRepository.save(actualCount);

    // Автоматическая проверка порогов и выполнение действий
    await this.checkThresholdsAndExecuteActions(saved.id, userId);

    return saved;
  }

  /**
   * Проверить пороги расхождений и выполнить автоматические действия
   *
   * Вызывается после создания фактического замера.
   * Создаёт инциденты, задачи, уведомления при превышении порогов.
   */
  private async checkThresholdsAndExecuteActions(
    actualCountId: string,
    userId: string,
  ): Promise<void> {
    try {
      const result = await this.differenceService.executeThresholdActionsForCount(
        actualCountId,
        userId,
      );

      if (result.incidentId || result.taskId || result.notificationsSent > 0) {
        this.logger.log(
          `Threshold actions executed for count ${actualCountId}: ` +
            `incident=${result.incidentId || 'none'}, ` +
            `task=${result.taskId || 'none'}, ` +
            `notifications=${result.notificationsSent}`,
        );
      }
    } catch (error) {
      // Не прерываем создание замера при ошибке в автоматических действиях
      this.logger.error(
        `Failed to execute threshold actions for count ${actualCountId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Массовая инвентаризация (много товаров за раз)
   *
   * После создания автоматически проверяет пороги расхождений
   * для каждого созданного замера
   */
  async createBatchCount(
    dto: CreateBatchCountDto,
    userId: string,
  ): Promise<InventoryActualCount[]> {
    this.logger.log(
      `Creating batch count with ${dto.items.length} items for level=${dto.level_type}, ref=${dto.level_ref_id}`,
    );

    // Генерировать session_id, если не указан
    const sessionId = dto.session_id || uuidv4();

    const actualCounts: InventoryActualCount[] = [];

    for (const item of dto.items) {
      const actualCount = this.actualCountRepository.create({
        nomenclature_id: item.nomenclature_id,
        level_type: dto.level_type,
        level_ref_id: dto.level_ref_id,
        counted_at: new Date(dto.counted_at),
        counted_by_user_id: userId,
        actual_quantity: item.actual_quantity,
        unit_of_measure: item.unit_of_measure || null,
        notes: item.notes || dto.notes || null,
        session_id: sessionId,
        metadata: dto.metadata || null,
      });

      actualCounts.push(actualCount);
    }

    const savedCounts = await this.actualCountRepository.save(actualCounts);

    // Автоматическая проверка порогов для каждого замера (асинхронно)
    // Не блокируем возврат результата, но логируем ошибки
    this.checkThresholdsForBatch(savedCounts, userId);

    return savedCounts;
  }

  /**
   * Проверить пороги для массовой инвентаризации
   */
  private async checkThresholdsForBatch(
    counts: InventoryActualCount[],
    userId: string,
  ): Promise<void> {
    let actionsExecuted = 0;

    for (const count of counts) {
      try {
        const result = await this.differenceService.executeThresholdActionsForCount(
          count.id,
          userId,
        );

        if (result.incidentId || result.taskId || result.notificationsSent > 0) {
          actionsExecuted++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to execute threshold actions for batch count ${count.id}: ${error.message}`,
        );
      }
    }

    if (actionsExecuted > 0) {
      this.logger.log(
        `Batch threshold check complete: ${actionsExecuted}/${counts.length} counts triggered actions`,
      );
    }
  }

  /**
   * Получить фактические замеры с фильтрацией
   */
  async getActualCounts(
    filters: GetActualCountsFilterDto,
  ): Promise<{ data: InventoryActualCount[]; total: number }> {
    const query = this.actualCountRepository
      .createQueryBuilder('ac')
      .leftJoinAndSelect('ac.nomenclature', 'nomenclature')
      .leftJoinAndSelect('ac.counted_by', 'user');

    // Фильтры
    if (filters.level_type) {
      query.andWhere('ac.level_type = :levelType', {
        levelType: filters.level_type,
      });
    }

    if (filters.level_ref_id) {
      query.andWhere('ac.level_ref_id = :levelRefId', {
        levelRefId: filters.level_ref_id,
      });
    }

    if (filters.nomenclature_id) {
      query.andWhere('ac.nomenclature_id = :nomenclatureId', {
        nomenclatureId: filters.nomenclature_id,
      });
    }

    if (filters.session_id) {
      query.andWhere('ac.session_id = :sessionId', {
        sessionId: filters.session_id,
      });
    }

    if (filters.counted_by_user_id) {
      query.andWhere('ac.counted_by_user_id = :countedBy', {
        countedBy: filters.counted_by_user_id,
      });
    }

    if (filters.date_from) {
      query.andWhere('ac.counted_at >= :dateFrom', {
        dateFrom: new Date(filters.date_from),
      });
    }

    if (filters.date_to) {
      query.andWhere('ac.counted_at <= :dateTo', {
        dateTo: new Date(filters.date_to),
      });
    }

    // Сортировка
    query.orderBy('ac.counted_at', 'DESC');

    // Пагинация
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const [data, total] = await query.take(limit).skip(offset).getManyAndCount();

    return { data, total };
  }

  /**
   * Получить последний фактический замер для товара на уровне
   */
  async getLatestCount(
    nomenclatureId: string,
    levelType: InventoryLevelType,
    levelRefId: string,
  ): Promise<InventoryActualCount | null> {
    return await this.actualCountRepository.findOne({
      where: {
        nomenclature_id: nomenclatureId,
        level_type: levelType,
        level_ref_id: levelRefId,
      },
      order: { counted_at: 'DESC' },
    });
  }

  /**
   * Получить замер по ID
   */
  async getActualCountById(id: string): Promise<InventoryActualCount> {
    const actualCount = await this.actualCountRepository.findOne({
      where: { id },
      relations: ['nomenclature', 'counted_by'],
    });

    if (!actualCount) {
      throw new NotFoundException(`Actual count with ID ${id} not found`);
    }

    return actualCount;
  }

  /**
   * Получить все инвентаризации (сессии) с агрегацией
   */
  async getInventorySessions(
    levelType?: InventoryLevelType,
    levelRefId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<InventorySessionSummary[]> {
    const query = this.actualCountRepository
      .createQueryBuilder('ac')
      .select('ac.session_id', 'session_id')
      .addSelect('MIN(ac.counted_at)', 'counted_at')
      .addSelect('ac.level_type', 'level_type')
      .addSelect('ac.level_ref_id', 'level_ref_id')
      .addSelect('ac.counted_by_user_id', 'counted_by_user_id')
      .addSelect('COUNT(*)', 'total_items')
      .where('ac.session_id IS NOT NULL')
      .groupBy('ac.session_id')
      .addGroupBy('ac.level_type')
      .addGroupBy('ac.level_ref_id')
      .addGroupBy('ac.counted_by_user_id');

    if (levelType) {
      query.andWhere('ac.level_type = :levelType', { levelType });
    }

    if (levelRefId) {
      query.andWhere('ac.level_ref_id = :levelRefId', { levelRefId });
    }

    if (dateFrom) {
      query.andWhere('ac.counted_at >= :dateFrom', {
        dateFrom: new Date(dateFrom),
      });
    }

    if (dateTo) {
      query.andWhere('ac.counted_at <= :dateTo', { dateTo: new Date(dateTo) });
    }

    query.orderBy('counted_at', 'DESC');

    return await query.getRawMany();
  }

  /**
   * Получить детальный отчёт по инвентаризации
   *
   * REQ-ANL-08: Детальный отчёт по инвентаризациям с разбивкой по товарам,
   * местоположениям и операторам с расчётом расхождений и статистики
   *
   * @param sessionId - ID сессии инвентаризации
   * @returns Детальный отчёт по инвентаризации
   */
  async getInventorizationReport(sessionId: string): Promise<InventorizationReport> {
    this.logger.log(`Getting inventorization report for session=${sessionId}`);

    // Получить все замеры в сессии с связанными данными
    const counts = await this.actualCountRepository
      .createQueryBuilder('ac')
      .leftJoinAndSelect('ac.nomenclature', 'nomenclature')
      .leftJoinAndSelect('ac.counted_by', 'user')
      .where('ac.session_id = :sessionId', { sessionId })
      .orderBy('nomenclature.name', 'ASC')
      .addOrderBy('ac.counted_at', 'DESC')
      .getMany();

    if (counts.length === 0) {
      throw new NotFoundException(`Inventory session with ID ${sessionId} not found`);
    }

    // Базовая информация о сессии
    const firstCount = counts[0];
    // lastCount available for future use: counts[counts.length - 1]

    // Группировка по местоположениям, товарам, операторам
    const byLocation = new Map<string, typeof counts>();
    const byProduct = new Map<string, typeof counts>();
    const byOperator = new Map<string, typeof counts>();

    for (const count of counts) {
      // По местоположению
      const locKey = count.level_ref_id || 'unknown';
      if (!byLocation.has(locKey)) {
        byLocation.set(locKey, []);
      }
      const locList = byLocation.get(locKey);
      if (locList) {
        locList.push(count);
      }

      // По товару
      const prodKey = count.nomenclature_id;
      if (!byProduct.has(prodKey)) {
        byProduct.set(prodKey, []);
      }
      const prodList = byProduct.get(prodKey);
      if (prodList) {
        prodList.push(count);
      }

      // По оператору
      const opKey = count.counted_by_user_id;
      if (!byOperator.has(opKey)) {
        byOperator.set(opKey, []);
      }
      const opList = byOperator.get(opKey);
      if (opList) {
        opList.push(count);
      }
    }

    // Статистика по товарам
    const productStats = Array.from(byProduct.entries()).map(([prodId, items]) => {
      const totalQty = items.reduce((sum, item) => sum + (item.actual_quantity || 0), 0);
      return {
        nomenclature_id: prodId,
        nomenclature_name: items[0].nomenclature?.name || 'Unknown',
        items_counted: items.length,
        total_quantity: totalQty,
        avg_quantity: totalQty / items.length,
      };
    });

    // Статистика по местоположениям
    const locationStats = Array.from(byLocation.entries()).map(([locId, items]) => {
      const uniqueProducts = new Set(items.map((i) => i.nomenclature_id)).size;
      const totalQty = items.reduce((sum, item) => sum + (item.actual_quantity || 0), 0);
      return {
        level_ref_id: locId,
        level_type: items[0].level_type,
        items_counted: items.length,
        unique_products: uniqueProducts,
        total_quantity: totalQty,
      };
    });

    // Статистика по операторам
    const operatorStats = Array.from(byOperator.entries()).map(([opId, items]) => {
      const uniqueProducts = new Set(items.map((i) => i.nomenclature_id)).size;
      const totalQty = items.reduce((sum, item) => sum + (item.actual_quantity || 0), 0);
      return {
        user_id: opId,
        user_name: items[0].counted_by?.full_name || 'Unknown',
        items_counted: items.length,
        unique_products: uniqueProducts,
        total_quantity: totalQty,
      };
    });

    // Общая статистика
    const summary = {
      session_id: sessionId,
      level_type: firstCount.level_type,
      level_ref_id: firstCount.level_ref_id,
      counted_at: firstCount.counted_at,
      total_items_counted: counts.length,
      unique_products: new Set(counts.map((c) => c.nomenclature_id)).size,
      unique_locations: byLocation.size,
      unique_operators: byOperator.size,
      total_quantity: counts.reduce((sum, c) => sum + (c.actual_quantity || 0), 0),
    };

    return {
      summary,
      items: counts.map((c) => ({
        id: c.id,
        nomenclature_id: c.nomenclature_id,
        nomenclature_name: c.nomenclature?.name,
        actual_quantity: c.actual_quantity,
        unit_of_measure: c.unit_of_measure,
        counted_at: c.counted_at,
        counted_by: {
          id: c.counted_by?.id,
          full_name: c.counted_by?.full_name,
        },
        notes: c.notes,
      })),
      product_stats: productStats.sort((a, b) => b.total_quantity - a.total_quantity),
      location_stats: locationStats,
      operator_stats: operatorStats,
    };
  }
}
