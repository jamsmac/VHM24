import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { Transaction, TransactionType } from '../../transactions/entities/transaction.entity';
import { RecipeSnapshot } from '../../recipes/entities/recipe-snapshot.entity';
import { Recipe } from '../../recipes/entities/recipe.entity';

/** Normalized recipe ingredient item for consumption calculation */
interface NormalizedIngredient {
  nomenclature_id: string;
  quantity: number | string;
  nomenclature_name?: string;
}

/**
 * InventoryConsumptionCalculatorService
 *
 * REQ-STK-CALC-04: Расчёт теоретического расхода ингредиентов по продажам
 *
 * Логика:
 * 1. Получить все продажи (SALE transactions) за период
 * 2. Для каждой продажи получить рецепт (с snapshot для исторической точности)
 * 3. Рассчитать расход каждого ингредиента: количество порций × норма расхода
 * 4. Вернуть суммарный расход по каждому ингредиенту
 */
@Injectable()
export class InventoryConsumptionCalculatorService {
  private readonly logger = new Logger(InventoryConsumptionCalculatorService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(RecipeSnapshot)
    private readonly recipeSnapshotRepository: Repository<RecipeSnapshot>,
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
  ) {}

  /**
   * Рассчитать теоретический расход ингредиентов по продажам
   *
   * @param machineId - ID машины (опционально, для расчёта по конкретной машине)
   * @param fromDate - Начало периода
   * @param toDate - Конец периода
   * @returns Map nomenclatureId -> consumed quantity
   */
  async calculateTheoreticalConsumption(
    machineId: string | null,
    fromDate: Date,
    toDate: Date,
  ): Promise<Map<string, number>> {
    this.logger.debug(
      `Calculating theoretical consumption for machine=${machineId || 'ALL'}, period=${fromDate.toISOString()} - ${toDate.toISOString()}`,
    );

    const consumptionMap = new Map<string, number>();

    // 1. Получить все продажи за период
    const whereConditions: FindOptionsWhere<Transaction> = {
      transaction_type: TransactionType.SALE,
      transaction_date: Between(fromDate, toDate),
    };

    if (machineId) {
      whereConditions.machine_id = machineId;
    }

    const sales = await this.transactionRepository.find({
      where: whereConditions,
      order: { transaction_date: 'ASC' },
    });

    this.logger.debug(`Found ${sales.length} sales transactions`);

    // 2. Обработать каждую продажу
    for (const sale of sales) {
      // Пропустить, если нет recipe_id
      if (!sale.recipe_id) {
        this.logger.warn(`Sale transaction ${sale.id} has no recipe_id, skipping`);
        continue;
      }

      // Получить рецепт (с приоритетом snapshot для исторической точности)
      const recipeIngredients = await this.getRecipeIngredients(
        sale.recipe_id,
        sale.recipe_snapshot_id,
      );

      if (!recipeIngredients || recipeIngredients.length === 0) {
        this.logger.warn(`No ingredients found for recipe ${sale.recipe_id}, skipping`);
        continue;
      }

      // Количество порций (по умолчанию 1)
      const portionsCount = sale.quantity || 1;

      // 3. Рассчитать расход каждого ингредиента
      for (const ingredient of recipeIngredients) {
        const ingredientId = ingredient.nomenclature_id;
        const quantityPerPortion = Number(ingredient.quantity);
        const totalConsumed = quantityPerPortion * portionsCount;

        // Добавить к суммарному расходу
        const currentConsumption = consumptionMap.get(ingredientId) || 0;
        consumptionMap.set(ingredientId, currentConsumption + totalConsumed);

        this.logger.debug(
          `  Recipe ${sale.recipe_id}: ${ingredient.nomenclature_name || 'Unknown'} - ${quantityPerPortion} × ${portionsCount} = ${totalConsumed}`,
        );
      }
    }

    this.logger.debug(
      `Total theoretical consumption calculated for ${consumptionMap.size} ingredients`,
    );

    return consumptionMap;
  }

  /**
   * Получить ингредиенты рецепта (с приоритетом snapshot)
   *
   * @param recipeId - ID рецепта
   * @param snapshotId - ID snapshot (опционально)
   * @returns Массив ингредиентов с нормами расхода в нормализованном формате
   */
  private async getRecipeIngredients(
    recipeId: string,
    snapshotId: string | null,
  ): Promise<NormalizedIngredient[]> {
    // Приоритет: snapshot -> current recipe
    if (snapshotId) {
      try {
        const snapshot = await this.recipeSnapshotRepository.findOne({
          where: { id: snapshotId },
        });

        if (snapshot && snapshot.snapshot?.items) {
          return snapshot.snapshot.items as NormalizedIngredient[];
        }
      } catch (error) {
        this.logger.warn(`Failed to load snapshot ${snapshotId}, falling back to current recipe`);
      }
    }

    // Fallback: текущий рецепт
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId },
      relations: ['ingredients', 'ingredients.ingredient'],
    });

    if (!recipe) {
      return [];
    }

    // Нормализация: маппинг RecipeIngredient -> NormalizedIngredient
    return recipe.ingredients.map((ing) => ({
      nomenclature_id: ing.ingredient_id,
      quantity: ing.quantity,
      nomenclature_name: ing.ingredient?.name,
    }));
  }

  /**
   * Рассчитать теоретический расход для одного ингредиента
   *
   * @param nomenclatureId - ID ингредиента
   * @param machineId - ID машины (опционально)
   * @param fromDate - Начало периода
   * @param toDate - Конец периода
   * @returns Суммарный расход ингредиента
   */
  async calculateIngredientConsumption(
    nomenclatureId: string,
    machineId: string | null,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    const consumptionMap = await this.calculateTheoreticalConsumption(machineId, fromDate, toDate);

    return consumptionMap.get(nomenclatureId) || 0;
  }
}
