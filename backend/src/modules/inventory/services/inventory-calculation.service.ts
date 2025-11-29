import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryMovement, MovementType } from '../entities/inventory-movement.entity';
import { StockOpeningBalance } from '../../opening-balances/entities/opening-balance.entity';
import { PurchaseHistory } from '../../purchase-history/entities/purchase-history.entity';
import { InventoryLevelType } from '../entities/inventory-actual-count.entity';
import { InventoryConsumptionCalculatorService } from './inventory-consumption-calculator.service';

/**
 * InventoryCalculationService
 *
 * REQ-STK-CALC-01: Расчёт расчётных остатков на основе:
 * - Начальных остатков (opening balances)
 * - Закупок (purchases)
 * - Движений инвентаря (movements)
 * - Теоретического расхода по продажам (sales) - REQ-STK-CALC-04
 *
 * Формула: Calculated = Opening + Purchases + Movements_IN - Movements_OUT - TheoreticalConsumption
 */
@Injectable()
export class InventoryCalculationService {
  private readonly logger = new Logger(InventoryCalculationService.name);

  constructor(
    @InjectRepository(InventoryMovement)
    private readonly movementRepository: Repository<InventoryMovement>,
    @InjectRepository(StockOpeningBalance)
    private readonly openingBalanceRepository: Repository<StockOpeningBalance>,
    @InjectRepository(PurchaseHistory)
    private readonly purchaseRepository: Repository<PurchaseHistory>,
    private readonly consumptionCalculator: InventoryConsumptionCalculatorService,
  ) {}

  /**
   * Рассчитать остаток для одного товара на конкретном уровне на дату
   *
   * @param nomenclatureId - ID товара
   * @param levelType - Уровень учёта (WAREHOUSE, OPERATOR, MACHINE)
   * @param levelRefId - ID объекта (warehouse_id, operator_id, machine_id)
   * @param asOfDate - Дата расчёта (по умолчанию текущая)
   * @returns Расчётный остаток
   */
  async calculateBalance(
    nomenclatureId: string,
    levelType: InventoryLevelType,
    levelRefId: string,
    asOfDate: Date = new Date(),
  ): Promise<number> {
    this.logger.debug(
      `Calculating balance for nomenclature=${nomenclatureId}, level=${levelType}, ref=${levelRefId}, date=${asOfDate.toISOString()}`,
    );

    let balance = 0;

    // 1. Начальные остатки (только для WAREHOUSE)
    if (levelType === InventoryLevelType.WAREHOUSE) {
      const openingBalance = await this.getOpeningBalance(nomenclatureId, levelRefId, asOfDate);
      balance += openingBalance;
      this.logger.debug(`  Opening balance: ${openingBalance}`);
    }

    // 2. Закупки (только для WAREHOUSE)
    if (levelType === InventoryLevelType.WAREHOUSE) {
      const purchases = await this.getPurchases(nomenclatureId, levelRefId, asOfDate);
      balance += purchases;
      this.logger.debug(`  Purchases: ${purchases}`);
    }

    // 3. Движения инвентаря
    const movementsBalance = await this.getMovementsBalance(
      nomenclatureId,
      levelType,
      levelRefId,
      asOfDate,
    );
    balance += movementsBalance;
    this.logger.debug(`  Movements balance: ${movementsBalance}`);

    // 4. Теоретический расход (REQ-STK-CALC-04) - только для MACHINE
    if (levelType === InventoryLevelType.MACHINE) {
      const theoreticalConsumption = await this.getTheoreticalConsumption(
        nomenclatureId,
        levelRefId,
        asOfDate,
      );
      balance -= theoreticalConsumption;
      this.logger.debug(`  Theoretical consumption: ${theoreticalConsumption}`);
    }

    this.logger.debug(`  TOTAL calculated balance: ${balance}`);

    return Number(balance);
  }

  /**
   * Рассчитать остатки для всех товаров на уровне
   *
   * @param levelType - Уровень учёта
   * @param levelRefId - ID объекта
   * @param asOfDate - Дата расчёта
   * @returns Map nomenclature_id -> calculated quantity
   */
  async calculateBalancesForLevel(
    levelType: InventoryLevelType,
    levelRefId: string,
    asOfDate: Date = new Date(),
  ): Promise<Map<string, number>> {
    this.logger.debug(
      `Calculating balances for level=${levelType}, ref=${levelRefId}, date=${asOfDate.toISOString()}`,
    );

    const balances = new Map<string, number>();

    // Получить все уникальные nomenclature_id для этого уровня
    const nomenclatures = await this.getNomenclaturesForLevel(levelType, levelRefId, asOfDate);

    this.logger.debug(`  Found ${nomenclatures.length} nomenclatures`);

    // Рассчитать остаток для каждого товара
    for (const nomenclatureId of nomenclatures) {
      const balance = await this.calculateBalance(nomenclatureId, levelType, levelRefId, asOfDate);
      balances.set(nomenclatureId, balance);
    }

    return balances;
  }

  /**
   * Получить начальный остаток для товара на складе
   *
   * @private
   */
  private async getOpeningBalance(
    nomenclatureId: string,
    warehouseId: string,
    asOfDate: Date,
  ): Promise<number> {
    // Получить последний применённый начальный остаток до даты расчёта
    const openingBalance = await this.openingBalanceRepository
      .createQueryBuilder('ob')
      .where('ob.nomenclature_id = :nomenclatureId', { nomenclatureId })
      .andWhere('ob.warehouse_id = :warehouseId', { warehouseId })
      .andWhere('ob.is_applied = :isApplied', { isApplied: true })
      .andWhere('ob.balance_date <= :asOfDate', { asOfDate })
      .orderBy('ob.balance_date', 'DESC')
      .getOne();

    return openingBalance ? Number(openingBalance.quantity) : 0;
  }

  /**
   * Получить сумму закупок до даты
   *
   * @private
   */
  private async getPurchases(
    nomenclatureId: string,
    warehouseId: string,
    asOfDate: Date,
  ): Promise<number> {
    const result = await this.purchaseRepository
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.quantity), 0)', 'total')
      .where('p.nomenclature_id = :nomenclatureId', { nomenclatureId })
      .andWhere('p.warehouse_id = :warehouseId', { warehouseId })
      .andWhere('p.purchase_date <= :asOfDate', { asOfDate })
      .getRawOne();

    return result ? Number(result.total) : 0;
  }

  /**
   * Получить баланс движений (приход - расход)
   *
   * @private
   */
  private async getMovementsBalance(
    nomenclatureId: string,
    levelType: InventoryLevelType,
    levelRefId: string,
    asOfDate: Date,
  ): Promise<number> {
    // Определить типы движений для прихода и расхода в зависимости от уровня
    const { inboundTypes, outboundTypes } = this.getMovementTypesForLevel(levelType);

    // Получить сумму приходов
    const inboundQuery = this.movementRepository
      .createQueryBuilder('m')
      .select('COALESCE(SUM(m.quantity), 0)', 'total')
      .where('m.nomenclature_id = :nomenclatureId', { nomenclatureId })
      .andWhere('m.movement_type IN (:...inboundTypes)', { inboundTypes })
      .andWhere(
        '(m.operation_date IS NULL AND m.created_at <= :asOfDate) OR (m.operation_date <= :asOfDate)',
        {
          asOfDate,
        },
      );

    // Получить сумму расходов
    const outboundQuery = this.movementRepository
      .createQueryBuilder('m')
      .select('COALESCE(SUM(m.quantity), 0)', 'total')
      .where('m.nomenclature_id = :nomenclatureId', { nomenclatureId })
      .andWhere('m.movement_type IN (:...outboundTypes)', { outboundTypes })
      .andWhere(
        '(m.operation_date IS NULL AND m.created_at <= :asOfDate) OR (m.operation_date <= :asOfDate)',
        {
          asOfDate,
        },
      );

    // Фильтр по уровню
    switch (levelType) {
      case InventoryLevelType.WAREHOUSE:
        // Для склада - фильтруем по warehouse движениям (без operator_id и machine_id)
        inboundQuery.andWhere('m.operator_id IS NULL AND m.machine_id IS NULL');
        outboundQuery.andWhere('m.operator_id IS NULL AND m.machine_id IS NULL');
        break;
      case InventoryLevelType.OPERATOR:
        inboundQuery.andWhere('m.operator_id = :levelRefId', { levelRefId });
        outboundQuery.andWhere('m.operator_id = :levelRefId', { levelRefId });
        break;
      case InventoryLevelType.MACHINE:
        inboundQuery.andWhere('m.machine_id = :levelRefId', { levelRefId });
        outboundQuery.andWhere('m.machine_id = :levelRefId', { levelRefId });
        break;
    }

    const [inboundResult, outboundResult] = await Promise.all([
      inboundQuery.getRawOne(),
      outboundQuery.getRawOne(),
    ]);

    const inbound = inboundResult ? Number(inboundResult.total) : 0;
    const outbound = outboundResult ? Number(outboundResult.total) : 0;

    this.logger.debug(`    Inbound: ${inbound}, Outbound: ${outbound}`);

    return inbound - outbound;
  }

  /**
   * Определить типы движений для уровня
   *
   * @private
   */
  private getMovementTypesForLevel(levelType: InventoryLevelType): {
    inboundTypes: MovementType[];
    outboundTypes: MovementType[];
  } {
    switch (levelType) {
      case InventoryLevelType.WAREHOUSE:
        return {
          inboundTypes: [MovementType.WAREHOUSE_IN, MovementType.OPERATOR_TO_WAREHOUSE],
          outboundTypes: [MovementType.WAREHOUSE_OUT, MovementType.WAREHOUSE_TO_OPERATOR],
        };
      case InventoryLevelType.OPERATOR:
        return {
          inboundTypes: [MovementType.WAREHOUSE_TO_OPERATOR, MovementType.MACHINE_TO_OPERATOR],
          outboundTypes: [MovementType.OPERATOR_TO_WAREHOUSE, MovementType.OPERATOR_TO_MACHINE],
        };
      case InventoryLevelType.MACHINE:
        return {
          inboundTypes: [MovementType.OPERATOR_TO_MACHINE],
          outboundTypes: [MovementType.MACHINE_TO_OPERATOR, MovementType.MACHINE_SALE],
        };
    }
  }

  /**
   * Получить теоретический расход для товара на машине
   *
   * REQ-STK-CALC-04: Рассчитывает расход ингредиентов на основе продаж
   * с использованием рецептурных снимков для точности
   *
   * @private
   */
  private async getTheoreticalConsumption(
    nomenclatureId: string,
    machineId: string,
    asOfDate: Date,
  ): Promise<number> {
    // Получить начало периода (например, начало года или фиксированная дата начала учёта)
    // Для упрощения используем 1 января текущего года
    const fromDate = new Date(asOfDate.getFullYear(), 0, 1);

    // Рассчитать теоретический расход за период
    const consumptionMap = await this.consumptionCalculator.calculateTheoreticalConsumption(
      machineId,
      fromDate,
      asOfDate,
    );

    // Получить расход для конкретного nomenclature_id
    return consumptionMap.get(nomenclatureId) || 0;
  }

  /**
   * Получить все nomenclatures для уровня (из движений, закупок, начальных остатков)
   *
   * @private
   */
  private async getNomenclaturesForLevel(
    levelType: InventoryLevelType,
    levelRefId: string,
    asOfDate: Date,
  ): Promise<string[]> {
    const nomenclatures = new Set<string>();

    // Из движений
    const movementsQuery = this.movementRepository
      .createQueryBuilder('m')
      .select('DISTINCT m.nomenclature_id', 'nomenclature_id')
      .where(
        '(m.operation_date IS NULL AND m.created_at <= :asOfDate) OR (m.operation_date <= :asOfDate)',
        {
          asOfDate,
        },
      );

    switch (levelType) {
      case InventoryLevelType.WAREHOUSE:
        // Добавить из начальных остатков
        const openingBalances = await this.openingBalanceRepository.find({
          where: { warehouse_id: levelRefId, is_applied: true },
          select: ['nomenclature_id'],
        });
        openingBalances.forEach((ob) => nomenclatures.add(ob.nomenclature_id));

        // Добавить из закупок
        const purchases = await this.purchaseRepository.find({
          where: { warehouse_id: levelRefId },
          select: ['nomenclature_id'],
        });
        purchases.forEach((p) => nomenclatures.add(p.nomenclature_id));

        // Добавить из движений
        movementsQuery.andWhere('m.operator_id IS NULL AND m.machine_id IS NULL');
        break;
      case InventoryLevelType.OPERATOR:
        movementsQuery.andWhere('m.operator_id = :levelRefId', { levelRefId });
        break;
      case InventoryLevelType.MACHINE:
        movementsQuery.andWhere('m.machine_id = :levelRefId', { levelRefId });
        break;
    }

    const movementsNomenclatures = await movementsQuery.getRawMany();
    movementsNomenclatures.forEach((m) => nomenclatures.add(m.nomenclature_id));

    return Array.from(nomenclatures);
  }
}
