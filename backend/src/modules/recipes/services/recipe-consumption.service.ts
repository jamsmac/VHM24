/**
 * Recipe Consumption Service
 *
 * Handles ingredient consumption calculations and deductions for recipe-based sales.
 * This service integrates with Containers module to manage ingredient levels.
 *
 * @module RecipesModule
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Recipe } from '../entities/recipe.entity';
import { RecipeIngredient } from '../entities/recipe-ingredient.entity';
import { Container, ContainerStatus } from '../../containers/entities/container.entity';

export interface IngredientConsumption {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
}

export interface AvailabilityResult {
  available: boolean;
  missing: IngredientConsumption[];
  partial: IngredientConsumption[];
}

export interface DeductionResult {
  success: boolean;
  deducted: IngredientConsumption[];
  errors: string[];
}

@Injectable()
export class RecipeConsumptionService {
  private readonly logger = new Logger(RecipeConsumptionService.name);

  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
    private readonly recipeIngredientRepository: Repository<RecipeIngredient>,
    @InjectRepository(Container)
    private readonly containerRepository: Repository<Container>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Calculate ingredient consumption for N portions of a recipe
   *
   * @param recipeId - Recipe UUID
   * @param quantity - Number of portions
   * @returns Array of ingredient consumption requirements
   */
  async calculateConsumption(
    recipeId: string,
    quantity: number = 1,
  ): Promise<IngredientConsumption[]> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId },
      relations: ['ingredients', 'ingredients.ingredient'],
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe ${recipeId} not found`);
    }

    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    return recipe.ingredients.map((ri) => ({
      ingredientId: ri.ingredient_id,
      ingredientName: ri.ingredient?.name || 'Unknown',
      quantity: Number(ri.quantity) * quantity,
      unit: ri.unit_of_measure_code,
    }));
  }

  /**
   * Check ingredient availability for a recipe on a specific machine
   *
   * @param recipeId - Recipe UUID
   * @param machineId - Machine UUID
   * @param quantity - Number of portions
   * @returns Availability status with missing ingredients if any
   */
  async checkAvailability(
    recipeId: string,
    machineId: string,
    quantity: number = 1,
  ): Promise<AvailabilityResult> {
    const consumption = await this.calculateConsumption(recipeId, quantity);

    // Get containers for this machine
    const containers = await this.containerRepository.find({
      where: { machine_id: machineId },
      relations: ['nomenclature'],
    });

    const missing: IngredientConsumption[] = [];
    const partial: IngredientConsumption[] = [];

    for (const req of consumption) {
      // Find container with this ingredient
      const container = containers.find(
        (c) => c.nomenclature_id === req.ingredientId,
      );

      if (!container) {
        missing.push(req);
      } else if (Number(container.current_quantity) < req.quantity) {
        partial.push({
          ...req,
          quantity: req.quantity - Number(container.current_quantity),
        });
      }
    }

    return {
      available: missing.length === 0 && partial.length === 0,
      missing,
      partial,
    };
  }

  /**
   * Deduct ingredients from containers after a sale (atomic operation)
   *
   * @param recipeId - Recipe UUID
   * @param machineId - Machine UUID
   * @param quantity - Number of portions sold
   * @returns Deduction result with success status
   */
  async deductIngredients(
    recipeId: string,
    machineId: string,
    quantity: number = 1,
  ): Promise<DeductionResult> {
    const consumption = await this.calculateConsumption(recipeId, quantity);
    const deducted: IngredientConsumption[] = [];
    const errors: string[] = [];

    // Use transaction for atomic deduction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const req of consumption) {
        const result = await this.deductFromContainer(
          queryRunner.manager,
          machineId,
          req.ingredientId,
          req.quantity,
        );

        if (result.success) {
          deducted.push(req);
        } else {
          errors.push(
            `${req.ingredientName}: ${result.error || 'Unknown error'}`,
          );
        }
      }

      if (errors.length === 0) {
        await queryRunner.commitTransaction();
        this.logger.log(
          `Deducted ingredients for recipe ${recipeId} on machine ${machineId}`,
        );
      } else {
        await queryRunner.rollbackTransaction();
        this.logger.warn(
          `Failed to deduct ingredients: ${errors.join(', ')}`,
        );
      }

      return {
        success: errors.length === 0,
        deducted,
        errors,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Deduction failed: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Deduct quantity from a specific container
   */
  private async deductFromContainer(
    manager: EntityManager,
    machineId: string,
    ingredientId: string,
    quantity: number,
  ): Promise<{ success: boolean; error?: string }> {
    const container = await manager.findOne(Container, {
      where: {
        machine_id: machineId,
        nomenclature_id: ingredientId,
      },
    });

    if (!container) {
      return {
        success: false,
        error: `Container not found for ingredient ${ingredientId}`,
      };
    }

    const currentQty = Number(container.current_quantity);
    if (currentQty < quantity) {
      return {
        success: false,
        error: `Insufficient quantity: have ${currentQty}, need ${quantity}`,
      };
    }

    const newQuantity = currentQty - quantity;

    await manager.update(
      Container,
      { id: container.id },
      {
        current_quantity: newQuantity,
        status: newQuantity <= Number(container.min_level || 0) ? ContainerStatus.EMPTY : ContainerStatus.ACTIVE,
      },
    );

    return { success: true };
  }

  /**
   * Batch deduct for multiple sales (e.g., from sales import)
   *
   * @param sales - Array of sales with recipeId, machineId, and quantity
   * @returns Array of deduction results
   */
  async batchDeduct(
    sales: Array<{ recipeId: string; machineId: string; quantity: number }>,
  ): Promise<DeductionResult[]> {
    const results: DeductionResult[] = [];

    for (const sale of sales) {
      try {
        const result = await this.deductIngredients(
          sale.recipeId,
          sale.machineId,
          sale.quantity,
        );
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          deducted: [],
          errors: [error.message],
        });
      }
    }

    return results;
  }

  /**
   * Get total ingredient requirements for a machine based on low stock
   *
   * @param machineId - Machine UUID
   * @returns Array of ingredients needed to refill to capacity
   */
  async getRefillRequirements(machineId: string): Promise<IngredientConsumption[]> {
    const containers = await this.containerRepository.find({
      where: { machine_id: machineId },
      relations: ['nomenclature'],
    });

    return containers
      .filter((c) => c.nomenclature_id && Number(c.current_quantity) < Number(c.capacity))
      .map((c) => ({
        ingredientId: c.nomenclature_id!,
        ingredientName: c.nomenclature?.name || c.name || 'Unknown',
        quantity: Number(c.capacity) - Number(c.current_quantity),
        unit: c.unit,
      }));
  }

  /**
   * Estimate portions available for a recipe on a machine
   *
   * @param recipeId - Recipe UUID
   * @param machineId - Machine UUID
   * @returns Number of portions that can be made
   */
  async estimateAvailablePortions(
    recipeId: string,
    machineId: string,
  ): Promise<number> {
    const consumption = await this.calculateConsumption(recipeId, 1);

    const containers = await this.containerRepository.find({
      where: { machine_id: machineId },
    });

    let minPortions = Infinity;

    for (const req of consumption) {
      const container = containers.find(
        (c) => c.nomenclature_id === req.ingredientId,
      );

      if (!container) {
        return 0; // Missing ingredient
      }

      const availablePortions = Math.floor(
        Number(container.current_quantity) / req.quantity,
      );
      minPortions = Math.min(minPortions, availablePortions);
    }

    return minPortions === Infinity ? 0 : minPortions;
  }
}
