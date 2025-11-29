import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from './entities/recipe.entity';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { NomenclatureService } from '../nomenclature/nomenclature.service';
import { UnitConversionService } from '@/common/services/unit-conversion.service';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
    private readonly recipeIngredientRepository: Repository<RecipeIngredient>,
    private readonly nomenclatureService: NomenclatureService,
    private readonly unitConversionService: UnitConversionService,
  ) {}

  /**
   * Создание рецепта
   */
  async create(createRecipeDto: CreateRecipeDto): Promise<Recipe> {
    // Проверка уникальности product_id + type_code
    const existing = await this.recipeRepository.findOne({
      where: {
        product_id: createRecipeDto.product_id,
        type_code: createRecipeDto.type_code,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Рецепт типа ${createRecipeDto.type_code} для этого продукта уже существует`,
      );
    }

    // Проверка существования продукта
    await this.nomenclatureService.findOne(createRecipeDto.product_id);

    // Валидация ингредиентов
    if (!createRecipeDto.ingredients || createRecipeDto.ingredients.length === 0) {
      throw new BadRequestException('Рецепт должен содержать минимум 1 ингредиент');
    }

    // Проверка существования всех ингредиентов
    for (const ingredientDto of createRecipeDto.ingredients) {
      const ingredient = await this.nomenclatureService.findOne(ingredientDto.ingredient_id);
      if (!ingredient.is_ingredient) {
        throw new BadRequestException(
          `${ingredient.name} не является ингредиентом (флаг is_ingredient = false)`,
        );
      }
    }

    // Создание рецепта
    const { ingredients, ...recipeData } = createRecipeDto;

    const recipe = this.recipeRepository.create(recipeData);
    const savedRecipe = await this.recipeRepository.save(recipe);

    // Создание ингредиентов
    const recipeIngredients = ingredients.map((ingredientDto) =>
      this.recipeIngredientRepository.create({
        ...ingredientDto,
        recipe_id: savedRecipe.id,
      }),
    );

    await this.recipeIngredientRepository.save(recipeIngredients);

    // Пересчет себестоимости
    await this.recalculateCost(savedRecipe.id);

    return this.findOne(savedRecipe.id);
  }

  /**
   * Получение всех рецептов
   */
  async findAll(productId?: string, typeCode?: string, isActive?: boolean): Promise<Recipe[]> {
    const query = this.recipeRepository
      .createQueryBuilder('recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .leftJoinAndSelect('recipe.ingredients', 'ingredients')
      .leftJoinAndSelect('ingredients.ingredient', 'nomenclature');

    if (productId) {
      query.andWhere('recipe.product_id = :productId', { productId });
    }

    if (typeCode) {
      query.andWhere('recipe.type_code = :typeCode', { typeCode });
    }

    if (isActive !== undefined) {
      query.andWhere('recipe.is_active = :isActive', { isActive });
    }

    query.orderBy('recipe.name', 'ASC');
    query.addOrderBy('ingredients.sort_order', 'ASC');

    return query.getMany();
  }

  /**
   * Получение рецепта по ID
   */
  async findOne(id: string): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({
      where: { id },
      relations: ['product', 'ingredients', 'ingredients.ingredient'],
    });

    if (!recipe) {
      throw new NotFoundException(`Рецепт с ID ${id} не найден`);
    }

    return recipe;
  }

  /**
   * Обновление рецепта
   */
  async update(id: string, updateRecipeDto: UpdateRecipeDto): Promise<Recipe> {
    const recipe = await this.findOne(id);

    const { ingredients, ...recipeData } = updateRecipeDto;

    // Обновление базовых полей
    Object.assign(recipe, recipeData);
    await this.recipeRepository.save(recipe);

    // Обновление ингредиентов (если переданы)
    if (ingredients) {
      if (ingredients.length === 0) {
        throw new BadRequestException('Рецепт должен содержать минимум 1 ингредиент');
      }

      // Удалить старые ингредиенты
      await this.recipeIngredientRepository.delete({ recipe_id: id });

      // Создать новые
      const recipeIngredients = ingredients.map((ingredientDto) =>
        this.recipeIngredientRepository.create({
          ...ingredientDto,
          recipe_id: id,
        }),
      );

      await this.recipeIngredientRepository.save(recipeIngredients);

      // Пересчитать себестоимость
      await this.recalculateCost(id);
    }

    return this.findOne(id);
  }

  /**
   * Удаление рецепта (soft delete)
   */
  async remove(id: string): Promise<void> {
    const recipe = await this.findOne(id);
    await this.recipeRepository.softRemove(recipe);
  }

  /**
   * Пересчет себестоимости рецепта
   *
   * FIXED: Теперь корректно учитывает единицы измерения
   * Пример:
   * - Кофе: 500,000 UZS/kg, в рецепте 15g
   * - Старый расчет: 500,000 * 15 = 7,500,000 UZS (НЕПРАВИЛЬНО!)
   * - Новый расчет: 500,000 * 0.015 = 7,500 UZS (ПРАВИЛЬНО!)
   */
  async recalculateCost(recipeId: string): Promise<number> {
    const recipe = await this.findOne(recipeId);

    let totalCost = 0;

    for (const recipeIngredient of recipe.ingredients) {
      const ingredient = recipeIngredient.ingredient;

      if (ingredient.purchase_price && recipeIngredient.quantity) {
        try {
          // Calculate cost using unit conversion
          const cost = this.unitConversionService.calculateCost(
            Number(ingredient.purchase_price),
            ingredient.unit_of_measure_code, // Price unit (e.g., 'kg')
            Number(recipeIngredient.quantity),
            recipeIngredient.unit_of_measure_code, // Recipe unit (e.g., 'g')
          );

          totalCost += cost;
        } catch (error) {
          // If units are incompatible, log warning and skip this ingredient
          this.logger.warn(
            `Cannot calculate cost for ingredient ${ingredient.name}: ${error.message}. ` +
              `Price unit: ${ingredient.unit_of_measure_code}, Recipe unit: ${recipeIngredient.unit_of_measure_code}`,
          );

          // Fallback: use simple multiplication if units are the same
          if (ingredient.unit_of_measure_code === recipeIngredient.unit_of_measure_code) {
            totalCost += Number(ingredient.purchase_price) * Number(recipeIngredient.quantity);
          }
        }
      }
    }

    // Round to 2 decimal places (UZS has no smaller denominations than tiyin)
    totalCost = Math.round(totalCost * 100) / 100;

    // Update total_cost in recipe
    await this.recipeRepository.update(recipeId, { total_cost: totalCost });

    return totalCost;
  }

  /**
   * Получение рецептов по продукту
   */
  async findByProduct(productId: string): Promise<Recipe[]> {
    return this.findAll(productId);
  }

  /**
   * Получение PRIMARY рецепта для продукта
   */
  async findPrimaryRecipe(productId: string): Promise<Recipe | null> {
    const recipes = await this.findAll(productId, 'primary', true);
    return recipes.length > 0 ? recipes[0] : null;
  }

  /**
   * Статистика по рецептам
   */
  async getStats() {
    const total = await this.recipeRepository.count();
    const active = await this.recipeRepository.count({
      where: { is_active: true },
    });

    const avgCost = await this.recipeRepository
      .createQueryBuilder('recipe')
      .select('AVG(recipe.total_cost)', 'avg')
      .getRawOne();

    return {
      total,
      active,
      inactive: total - active,
      average_cost: parseFloat(avgCost.avg) || 0,
    };
  }
}
