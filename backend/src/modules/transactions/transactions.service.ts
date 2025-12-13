import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Transaction, TransactionType, PaymentMethod } from './entities/transaction.entity';
import {
  CreateTransactionDto,
  RecordSaleDto,
  RecordCollectionDto,
  RecordExpenseDto,
} from './dto/create-transaction.dto';
import { Machine } from '../machines/entities/machine.entity';
import { InventoryService } from '../inventory/inventory.service';
import { RecipesService } from '../recipes/recipes.service';
import { IncidentsService } from '../incidents/incidents.service';
import { IncidentType, IncidentPriority } from '../incidents/entities/incident.entity';
import { AuditLogService } from '../security/services/audit-log.service';
import { AuditEventType, AuditSeverity } from '../security/entities/audit-log.entity';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    private readonly eventEmitter: EventEmitter2,
    private readonly inventoryService: InventoryService,
    private readonly recipesService: RecipesService,
    private readonly incidentsService: IncidentsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ============================================================================
  // TRANSACTION CRUD
  // ============================================================================

  /**
   * Создание транзакции
   */
  async create(dto: CreateTransactionDto, _userId?: string): Promise<Transaction> {
    // Генерируем уникальный номер транзакции
    const transactionNumber = await this.generateTransactionNumber();

    // Phase 3: Auto-link to contract if machine has one
    let contractId: string | null = null;
    if (dto.machine_id) {
      const machine = await this.machineRepository.findOne({
        where: { id: dto.machine_id },
        select: ['contract_id'],
      });
      contractId = machine?.contract_id || null;
    }

    const transaction = this.transactionRepository.create({
      ...dto,
      contract_id: contractId, // Phase 3: Auto-link to contract
      transaction_number: transactionNumber,
      transaction_date: dto.transaction_date ? new Date(dto.transaction_date) : new Date(),
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Emit event for analytics
    this.eventEmitter.emit('transaction.created', {
      transaction: savedTransaction,
      date: savedTransaction.sale_date || savedTransaction.transaction_date,
    });

    return savedTransaction;
  }

  /**
   * Получение всех транзакций с фильтрацией
   */
  async findAll(
    transactionType?: TransactionType,
    machineId?: string,
    userId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<Transaction[]> {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.machine', 'machine')
      .leftJoinAndSelect('transaction.user', 'user');

    if (transactionType) {
      query.andWhere('transaction.transaction_type = :transactionType', {
        transactionType,
      });
    }

    if (machineId) {
      query.andWhere('transaction.machine_id = :machineId', { machineId });
    }

    if (userId) {
      query.andWhere('transaction.user_id = :userId', { userId });
    }

    if (dateFrom && dateTo) {
      query.andWhere('transaction.transaction_date BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      });
    }

    query.orderBy('transaction.transaction_date', 'DESC');

    return query.getMany();
  }

  /**
   * Получение транзакции по ID
   */
  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['machine', 'user'],
    });

    if (!transaction) {
      throw new NotFoundException(`Транзакция с ID ${id} не найдена`);
    }

    return transaction;
  }

  /**
   * Удаление транзакции (soft delete)
   * SECURITY: All deletions are logged to audit trail for compliance
   */
  async remove(id: string, userId?: string): Promise<void> {
    const transaction = await this.findOne(id);

    // CRITICAL: Log transaction deletion to audit trail before deleting
    await this.auditLogService.log({
      event_type: AuditEventType.TRANSACTION_DELETED,
      user_id: userId,
      severity: AuditSeverity.WARNING,
      description: `Transaction ${transaction.transaction_number} deleted (${transaction.transaction_type}: ${transaction.amount} ${transaction.currency})`,
      metadata: {
        transaction_id: transaction.id,
        transaction_number: transaction.transaction_number,
        transaction_type: transaction.transaction_type,
        amount: transaction.amount,
        currency: transaction.currency,
        machine_id: transaction.machine_id,
        original_date: transaction.transaction_date,
        deleted_at: new Date().toISOString(),
      },
    });

    this.logger.warn(
      `Transaction ${transaction.transaction_number} deleted by user ${userId || 'system'}`,
    );

    await this.transactionRepository.softRemove(transaction);
  }

  // ============================================================================
  // SPECIFIC TRANSACTION TYPES
  // ============================================================================

  /**
   * Регистрация продажи
   *
   * CRITICAL FIX: Now integrates with InventoryService to deduct ingredients.
   * When a sale is recorded, the system:
   * 1. Creates a transaction record
   * 2. Fetches the recipe ingredients
   * 3. Deducts each ingredient from machine inventory
   *
   * @param dto - Sale data (machine_id, recipe_id, amount, quantity)
   * @returns Created transaction
   */
  async recordSale(dto: RecordSaleDto): Promise<Transaction> {
    // 1. Create transaction record
    const transaction = await this.create({
      transaction_type: TransactionType.SALE,
      amount: dto.amount,
      payment_method: dto.payment_method,
      machine_id: dto.machine_id,
      recipe_id: dto.recipe_id,
      quantity: dto.quantity || 1,
      metadata: dto.metadata,
    });

    this.logger.log(`💰 Sale recorded: Transaction ${transaction.id}, Amount: ${dto.amount} UZS`);

    // 2. Deduct inventory if recipe provided
    if (dto.recipe_id) {
      try {
        const recipe = await this.recipesService.findOne(dto.recipe_id);

        if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
          this.logger.warn(
            `⚠️  Recipe ${dto.recipe_id} has no ingredients. Skipping inventory deduction.`,
          );
          return transaction;
        }

        this.logger.log(
          `📦 Deducting ${recipe.ingredients.length} ingredients for recipe "${recipe.name}" x${dto.quantity || 1}`,
        );

        // 3. Deduct each ingredient from machine inventory
        for (const item of recipe.ingredients) {
          const quantityToDeduct = Number(item.quantity) * (dto.quantity || 1);

          try {
            await this.inventoryService.deductFromMachine(
              dto.machine_id,
              item.ingredient_id,
              quantityToDeduct,
              `Продажа: ${recipe.name} x${dto.quantity || 1} (Transaction: ${transaction.id})`,
            );

            this.logger.log(
              `✅ Deducted ${quantityToDeduct} units of ${item.ingredient?.name || item.ingredient_id} from machine ${dto.machine_id}`,
            );
          } catch (error) {
            // Log warning but don't fail the transaction
            // This allows sales to be recorded even if inventory is out of sync
            this.logger.warn(
              `⚠️  Failed to deduct ingredient ${item.ingredient_id}: ${error.message}. ` +
                `Sale recorded but inventory not updated. Manual adjustment may be needed.`,
            );

            // Create incident for inventory mismatch
            try {
              await this.incidentsService.create({
                incident_type: IncidentType.OUT_OF_STOCK,
                priority: IncidentPriority.MEDIUM,
                machine_id: dto.machine_id,
                title: `Несоответствие инвентаря: ${item.ingredient?.name || item.ingredient_id}`,
                description:
                  `Не удалось списать ${quantityToDeduct} ед. ингредиента "${item.ingredient?.name || item.ingredient_id}" ` +
                  `при продаже "${recipe.name}" (Transaction: ${transaction.id}).\n\n` +
                  `Ошибка: ${error.message}\n\n` +
                  `Требуется ручная корректировка инвентаря.`,
                metadata: {
                  transaction_id: transaction.id,
                  recipe_id: dto.recipe_id,
                  recipe_name: recipe.name,
                  nomenclature_id: item.ingredient_id,
                  nomenclature_name: item.ingredient?.name,
                  quantity_attempted: quantityToDeduct,
                  error_message: error.message,
                },
              });
              this.logger.log(
                `🚨 Created incident for inventory mismatch: ${item.ingredient?.name || item.ingredient_id}`,
              );
            } catch (incidentError) {
              // If incident creation also fails, just log it
              this.logger.error(
                `❌ Failed to create incident for inventory mismatch: ${incidentError.message}`,
              );
            }
          }
        }
      } catch (error) {
        this.logger.error(`❌ Error processing recipe ${dto.recipe_id} for sale: ${error.message}`);
        // Sale is still recorded, just inventory not updated
      }
    } else {
      this.logger.warn(
        `⚠️  Sale recorded without recipe_id. Inventory not deducted. Transaction: ${transaction.id}`,
      );
    }

    return transaction;
  }

  /**
   * Регистрация инкассации
   */
  async recordCollection(dto: RecordCollectionDto): Promise<Transaction> {
    return this.create({
      transaction_type: TransactionType.COLLECTION,
      amount: dto.amount,
      payment_method: PaymentMethod.CASH,
      machine_id: dto.machine_id,
      user_id: dto.user_id,
      collection_task_id: dto.collection_task_id,
      description: dto.description || 'Инкассация',
    });
  }

  /**
   * Регистрация расхода
   */
  async recordExpense(dto: RecordExpenseDto): Promise<Transaction> {
    return this.create({
      transaction_type: TransactionType.EXPENSE,
      amount: dto.amount,
      payment_method: dto.payment_method || PaymentMethod.CASH,
      user_id: dto.user_id,
      expense_category: dto.expense_category,
      description: dto.description,
      metadata: dto.metadata,
    });
  }

  // ============================================================================
  // STATISTICS AND REPORTS
  // ============================================================================

  /**
   * Получение общей статистики транзакций
   */
  async getStats(dateFrom?: Date, dateTo?: Date) {
    const query = this.transactionRepository.createQueryBuilder('transaction');

    if (dateFrom && dateTo) {
      query.where('transaction.transaction_date BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      });
    }

    const total = await query.getCount();

    // Статистика по типам
    const byType = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.transaction_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(transaction.amount)', 'total_amount')
      .groupBy('transaction.transaction_type')
      .getRawMany();

    // Статистика по методам оплаты (только для продаж)
    const byPaymentMethod = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.payment_method', 'method')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(transaction.amount)', 'total_amount')
      .where('transaction.transaction_type = :type', {
        type: TransactionType.SALE,
      })
      .groupBy('transaction.payment_method')
      .getRawMany();

    // Статистика по категориям расходов
    const byExpenseCategory = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.expense_category', 'category')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(transaction.amount)', 'total_amount')
      .where('transaction.transaction_type = :type', {
        type: TransactionType.EXPENSE,
      })
      .groupBy('transaction.expense_category')
      .getRawMany();

    // Общий доход (продажи)
    const revenue = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.transaction_type = :type', {
        type: TransactionType.SALE,
      })
      .getRawOne();

    // Общий расход
    const expenses = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.transaction_type = :type', {
        type: TransactionType.EXPENSE,
      })
      .getRawOne();

    // Собранная сумма (инкассации)
    const collections = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.transaction_type = :type', {
        type: TransactionType.COLLECTION,
      })
      .getRawOne();

    return {
      total,
      by_type: byType.map((item) => ({
        type: item.type,
        count: parseInt(item.count),
        total_amount: parseFloat(item.total_amount) || 0,
      })),
      by_payment_method: byPaymentMethod.map((item) => ({
        method: item.method,
        count: parseInt(item.count),
        total_amount: parseFloat(item.total_amount) || 0,
      })),
      by_expense_category: byExpenseCategory.map((item) => ({
        category: item.category,
        count: parseInt(item.count),
        total_amount: parseFloat(item.total_amount) || 0,
      })),
      total_revenue: parseFloat(revenue?.total) || 0,
      total_expenses: parseFloat(expenses?.total) || 0,
      total_collections: parseFloat(collections?.total) || 0,
      net_profit: (parseFloat(revenue?.total) || 0) - (parseFloat(expenses?.total) || 0),
    };
  }

  /**
   * Статистика по аппарату
   */
  async getMachineStats(machineId: string, dateFrom?: Date, dateTo?: Date) {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.machine_id = :machineId', { machineId });

    if (dateFrom && dateTo) {
      query.andWhere('transaction.transaction_date BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      });
    }

    const sales = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(transaction.amount)', 'total')
      .where('transaction.machine_id = :machineId', { machineId })
      .andWhere('transaction.transaction_type = :type', {
        type: TransactionType.SALE,
      })
      .getRawOne();

    const collections = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.machine_id = :machineId', { machineId })
      .andWhere('transaction.transaction_type = :type', {
        type: TransactionType.COLLECTION,
      })
      .getRawOne();

    return {
      sales_count: parseInt(sales?.count) || 0,
      total_revenue: parseFloat(sales?.total) || 0,
      total_collections: parseFloat(collections?.total) || 0,
    };
  }

  /**
   * Ежедневная выручка (для графиков)
   */
  async getDailyRevenue(dateFrom: Date, dateTo: Date) {
    const dailyRevenue = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('DATE(transaction.transaction_date)', 'date')
      .addSelect('SUM(transaction.amount)', 'total')
      .where('transaction.transaction_type = :type', {
        type: TransactionType.SALE,
      })
      .andWhere('transaction.transaction_date BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .groupBy('DATE(transaction.transaction_date)')
      .orderBy('DATE(transaction.transaction_date)', 'ASC')
      .getRawMany();

    return dailyRevenue.map((item) => ({
      date: item.date,
      total: parseFloat(item.total) || 0,
    }));
  }

  /**
   * Топ продаваемых рецептов
   */
  async getTopRecipes(limit: number = 10) {
    const topRecipes = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.recipe_id', 'recipe_id')
      .addSelect('COUNT(*)', 'sales_count')
      .addSelect('SUM(transaction.amount)', 'total_revenue')
      .where('transaction.transaction_type = :type', {
        type: TransactionType.SALE,
      })
      .andWhere('transaction.recipe_id IS NOT NULL')
      .groupBy('transaction.recipe_id')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany();

    return topRecipes.map((item) => ({
      recipe_id: item.recipe_id,
      sales_count: parseInt(item.sales_count),
      total_revenue: parseFloat(item.total_revenue),
    }));
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Генерация уникального номера транзакции
   */
  private async generateTransactionNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Получаем количество транзакций за сегодня
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.transaction_date BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getCount();

    const sequence = (count + 1).toString().padStart(4, '0');

    return `TXN-${dateStr}-${sequence}`;
  }
}
