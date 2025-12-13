import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InventoryActualCount,
  InventoryLevelType,
} from '../entities/inventory-actual-count.entity';
import {
  InventoryDifferenceThreshold,
  ThresholdType,
  SeverityLevel,
} from '../entities/inventory-difference-threshold.entity';
import { InventoryCalculationService } from './inventory-calculation.service';
import { InventoryThresholdActionsService } from './inventory-threshold-actions.service';

/**
 * Difference Report Item
 */
export interface DifferenceReportItem {
  // Actual count data
  actual_count_id: string;
  nomenclature_id: string;
  nomenclature_name: string;
  level_type: InventoryLevelType;
  level_ref_id: string;
  counted_at: Date;
  actual_quantity: number;
  counted_by: {
    id: string;
    full_name: string;
  };

  // Calculated data
  calculated_quantity: number;

  // Difference
  difference_abs: number; // actual - calculated
  difference_rel: number; // ((actual - calculated) / calculated) * 100

  // Threshold evaluation
  severity: SeverityLevel;
  threshold_exceeded: boolean;
  applied_threshold: {
    id: string;
    name: string;
    threshold_type: ThresholdType;
  } | null;
}

/**
 * Difference Dashboard Data
 */
export interface DifferenceDashboard {
  summary: {
    total_discrepancies: number;
    total_items_counted: number;
    critical_count: number;
    warning_count: number;
    info_count: number;
    total_abs_difference: number;
    avg_rel_difference: number;
  };
  top_products: Array<{
    nomenclature_id: string;
    nomenclature_name: string;
    total_difference_abs: number;
    avg_difference_rel: number;
    count: number;
  }>;
  top_machines: Array<{
    machine_id: string;
    machine_name: string;
    total_difference_abs: number;
    avg_difference_rel: number;
    count: number;
  }>;
  top_operators: Array<{
    operator_id: string;
    operator_name: string;
    total_difference_abs: number;
    avg_difference_rel: number;
    count: number;
  }>;
}

/**
 * InventoryDifferenceService
 *
 * REQ-STK-CALC-03: Сравнение расчётных и фактических остатков
 * REQ-STK-CALC-04, REQ-ANL-05/06: Применение порогов
 * REQ-ANL-01/02: Отчёты и дашборды
 */
@Injectable()
export class InventoryDifferenceService {
  private readonly logger = new Logger(InventoryDifferenceService.name);

  constructor(
    @InjectRepository(InventoryActualCount)
    private readonly actualCountRepository: Repository<InventoryActualCount>,
    @InjectRepository(InventoryDifferenceThreshold)
    private readonly thresholdRepository: Repository<InventoryDifferenceThreshold>,
    private readonly calculationService: InventoryCalculationService,
    private readonly thresholdActionsService: InventoryThresholdActionsService,
  ) {}

  /**
   * Получить отчёт по расхождениям с фильтрами (REQ-ANL-01)
   */
  async getDifferencesReport(filters: {
    level_type?: InventoryLevelType;
    level_ref_id?: string;
    nomenclature_id?: string;
    session_id?: string;
    date_from?: string;
    date_to?: string;
    severity?: SeverityLevel;
    threshold_exceeded_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ data: DifferenceReportItem[]; total: number }> {
    this.logger.log('Generating differences report with filters:', filters);

    // Получить фактические замеры
    const query = this.actualCountRepository
      .createQueryBuilder('ac')
      .leftJoinAndSelect('ac.nomenclature', 'nomenclature')
      .leftJoinAndSelect('ac.counted_by', 'user');

    // Применить фильтры
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

    query.orderBy('ac.counted_at', 'DESC');

    // Пагинация
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const [actualCounts] = await query.take(limit).skip(offset).getManyAndCount();

    // Для каждого замера рассчитать расхождение
    const reportItems: DifferenceReportItem[] = [];

    for (const actualCount of actualCounts) {
      const item = await this.calculateDifferenceForCount(actualCount);

      // Фильтр по severity
      if (filters.severity && item.severity !== filters.severity) {
        continue;
      }

      // Фильтр по превышению порога
      if (filters.threshold_exceeded_only && !item.threshold_exceeded) {
        continue;
      }

      reportItems.push(item);
    }

    return { data: reportItems, total: reportItems.length };
  }

  /**
   * Рассчитать расхождение для одного фактического замера
   */
  async calculateDifferenceForCount(
    actualCount: InventoryActualCount,
  ): Promise<DifferenceReportItem> {
    // Рассчитать расчётный остаток на момент замера
    const calculatedQty = await this.calculationService.calculateBalance(
      actualCount.nomenclature_id,
      actualCount.level_type,
      actualCount.level_ref_id,
      actualCount.counted_at,
    );

    const actualQty = Number(actualCount.actual_quantity);

    // Рассчитать абсолютное и относительное расхождение
    const differenceAbs = actualQty - calculatedQty;
    const differenceRel = calculatedQty !== 0 ? (differenceAbs / calculatedQty) * 100 : 0;

    // Применить пороги
    const thresholdEvaluation = await this.evaluateThresholds(
      actualCount.nomenclature_id,
      actualCount.level_type,
      actualCount.level_ref_id,
      differenceAbs,
      differenceRel,
    );

    return {
      actual_count_id: actualCount.id,
      nomenclature_id: actualCount.nomenclature_id,
      nomenclature_name: actualCount.nomenclature?.name || 'Unknown',
      level_type: actualCount.level_type,
      level_ref_id: actualCount.level_ref_id,
      counted_at: actualCount.counted_at,
      actual_quantity: actualQty,
      counted_by: {
        id: actualCount.counted_by.id,
        full_name: actualCount.counted_by.full_name,
      },
      calculated_quantity: calculatedQty,
      difference_abs: differenceAbs,
      difference_rel: differenceRel,
      severity: thresholdEvaluation.severity,
      threshold_exceeded: thresholdEvaluation.threshold_exceeded,
      applied_threshold: thresholdEvaluation.applied_threshold,
    };
  }

  /**
   * Применить пороги к расхождению (REQ-ANL-05/06)
   */
  private async evaluateThresholds(
    nomenclatureId: string,
    levelType: InventoryLevelType,
    levelRefId: string,
    differenceAbs: number,
    differenceRel: number,
  ): Promise<{
    severity: SeverityLevel;
    threshold_exceeded: boolean;
    applied_threshold: {
      id: string;
      name: string;
      threshold_type: ThresholdType;
    } | null;
  }> {
    // Получить активные пороги, отсортированные по приоритету
    const thresholds = await this.thresholdRepository.find({
      where: { is_active: true },
      order: { priority: 'DESC' },
    });

    // Применить пороги в порядке приоритета
    for (const threshold of thresholds) {
      // Проверить, применим ли порог
      const isApplicable = this.isThresholdApplicable(
        threshold,
        nomenclatureId,
        levelType,
        levelRefId,
      );

      if (!isApplicable) {
        continue;
      }

      // Проверить превышение
      const isExceeded = this.isThresholdExceeded(threshold, differenceAbs, differenceRel);

      if (isExceeded) {
        return {
          severity: threshold.severity_level,
          threshold_exceeded: true,
          applied_threshold: {
            id: threshold.id,
            name: threshold.name,
            threshold_type: threshold.threshold_type,
          },
        };
      }
    }

    // Нет превышений
    return {
      severity: SeverityLevel.INFO,
      threshold_exceeded: false,
      applied_threshold: null,
    };
  }

  /**
   * Проверить, применим ли порог к данному замеру
   */
  private isThresholdApplicable(
    threshold: InventoryDifferenceThreshold,
    nomenclatureId: string,
    levelType: InventoryLevelType,
    levelRefId: string,
  ): boolean {
    switch (threshold.threshold_type) {
      case ThresholdType.GLOBAL:
        return true;
      case ThresholdType.NOMENCLATURE:
        return threshold.reference_id === nomenclatureId;
      case ThresholdType.MACHINE:
        return levelType === InventoryLevelType.MACHINE && threshold.reference_id === levelRefId;
      case ThresholdType.OPERATOR:
        return levelType === InventoryLevelType.OPERATOR && threshold.reference_id === levelRefId;
      // Для CATEGORY и LOCATION нужна дополнительная логика (связь с nomenclature)
      default:
        return false;
    }
  }

  /**
   * Проверить, превышен ли порог
   */
  private isThresholdExceeded(
    threshold: InventoryDifferenceThreshold,
    differenceAbs: number,
    differenceRel: number,
  ): boolean {
    const absDiff = Math.abs(differenceAbs);
    const relDiff = Math.abs(differenceRel);

    // Проверить абсолютный порог
    if (threshold.threshold_abs !== null && absDiff > Number(threshold.threshold_abs)) {
      return true;
    }

    // Проверить относительный порог
    if (threshold.threshold_rel !== null && relDiff > Number(threshold.threshold_rel)) {
      return true;
    }

    return false;
  }

  /**
   * Получить данные для дашборда (REQ-ANL-02)
   */
  async getDifferenceDashboard(filters: {
    date_from?: string;
    date_to?: string;
  }): Promise<DifferenceDashboard> {
    this.logger.log('Generating difference dashboard');

    // Получить все замеры за период
    const { data: reportItems } = await this.getDifferencesReport({
      date_from: filters.date_from,
      date_to: filters.date_to,
      limit: 10000, // Достаточно большой лимит для агрегации
    });

    // Агрегировать данные
    const summary = {
      total_discrepancies: reportItems.filter((i) => i.difference_abs !== 0).length,
      total_items_counted: reportItems.length,
      critical_count: reportItems.filter((i) => i.severity === SeverityLevel.CRITICAL).length,
      warning_count: reportItems.filter((i) => i.severity === SeverityLevel.WARNING).length,
      info_count: reportItems.filter((i) => i.severity === SeverityLevel.INFO).length,
      total_abs_difference: reportItems.reduce((sum, i) => sum + Math.abs(i.difference_abs), 0),
      avg_rel_difference:
        reportItems.length > 0
          ? reportItems.reduce((sum, i) => sum + Math.abs(i.difference_rel), 0) / reportItems.length
          : 0,
    };

    // Топ товаров по расхождениям
    const productMap = new Map<string, { name: string; items: DifferenceReportItem[] }>();
    reportItems.forEach((item) => {
      if (!productMap.has(item.nomenclature_id)) {
        productMap.set(item.nomenclature_id, {
          name: item.nomenclature_name,
          items: [],
        });
      }
      productMap.get(item.nomenclature_id)!.items.push(item);
    });

    const topProducts = Array.from(productMap.entries())
      .map(([id, data]) => ({
        nomenclature_id: id,
        nomenclature_name: data.name,
        total_difference_abs: data.items.reduce((sum, i) => sum + Math.abs(i.difference_abs), 0),
        avg_difference_rel:
          data.items.reduce((sum, i) => sum + Math.abs(i.difference_rel), 0) / data.items.length,
        count: data.items.length,
      }))
      .sort((a, b) => b.total_difference_abs - a.total_difference_abs)
      .slice(0, 10);

    // Топ аппаратов (только для MACHINE уровня)
    const machineItems = reportItems.filter((i) => i.level_type === InventoryLevelType.MACHINE);
    const machineMap = new Map<string, DifferenceReportItem[]>();
    machineItems.forEach((item) => {
      if (!machineMap.has(item.level_ref_id)) {
        machineMap.set(item.level_ref_id, []);
      }
      machineMap.get(item.level_ref_id)!.push(item);
    });

    const topMachines = Array.from(machineMap.entries())
      .map(([id, items]) => ({
        machine_id: id,
        machine_name: `Machine ${id.substring(0, 8)}`, // TODO: загрузить имя аппарата
        total_difference_abs: items.reduce((sum, i) => sum + Math.abs(i.difference_abs), 0),
        avg_difference_rel:
          items.reduce((sum, i) => sum + Math.abs(i.difference_rel), 0) / items.length,
        count: items.length,
      }))
      .sort((a, b) => b.total_difference_abs - a.total_difference_abs)
      .slice(0, 10);

    // Топ операторов (только для OPERATOR уровня)
    const operatorItems = reportItems.filter((i) => i.level_type === InventoryLevelType.OPERATOR);
    const operatorMap = new Map<string, DifferenceReportItem[]>();
    operatorItems.forEach((item) => {
      if (!operatorMap.has(item.level_ref_id)) {
        operatorMap.set(item.level_ref_id, []);
      }
      operatorMap.get(item.level_ref_id)!.push(item);
    });

    const topOperators = Array.from(operatorMap.entries())
      .map(([id, items]) => ({
        operator_id: id,
        operator_name: `Operator ${id.substring(0, 8)}`, // TODO: загрузить имя оператора
        total_difference_abs: items.reduce((sum, i) => sum + Math.abs(i.difference_abs), 0),
        avg_difference_rel:
          items.reduce((sum, i) => sum + Math.abs(i.difference_rel), 0) / items.length,
        count: items.length,
      }))
      .sort((a, b) => b.total_difference_abs - a.total_difference_abs)
      .slice(0, 10);

    return {
      summary,
      top_products: topProducts,
      top_machines: topMachines,
      top_operators: topOperators,
    };
  }

  /**
   * Выполнить действия при превышении порога для расхождения
   *
   * @param actualCountId - ID фактического замера
   * @param userId - ID пользователя, инициирующего действия
   * @returns Результаты выполненных действий
   */
  async executeThresholdActionsForCount(
    actualCountId: string,
    userId: string,
  ): Promise<{
    incidentId?: string;
    taskId?: string;
    notificationsSent: number;
  }> {
    // Получить фактический замер
    const actualCount = await this.actualCountRepository.findOne({
      where: { id: actualCountId },
      relations: ['nomenclature', 'counted_by'],
    });

    if (!actualCount) {
      throw new Error(`Actual count with ID ${actualCountId} not found`);
    }

    // Рассчитать расхождение
    const difference = await this.calculateDifferenceForCount(actualCount);

    // Если порог не превышен, ничего не делаем
    if (!difference.threshold_exceeded || !difference.applied_threshold) {
      this.logger.log(`Threshold not exceeded for count ${actualCountId}, skipping actions`);
      return { notificationsSent: 0 };
    }

    // Получить полные данные порога
    const threshold = await this.thresholdRepository.findOne({
      where: { id: difference.applied_threshold.id },
    });

    if (!threshold) {
      throw new Error(`Threshold with ID ${difference.applied_threshold.id} not found`);
    }

    // Выполнить действия
    return await this.thresholdActionsService.executeThresholdActions(
      difference,
      threshold,
      userId,
    );
  }
}
