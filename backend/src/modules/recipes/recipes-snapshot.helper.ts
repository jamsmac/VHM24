import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { RecipeSnapshot } from './entities/recipe-snapshot.entity';
import { Recipe } from './entities/recipe.entity';
import * as crypto from 'crypto';

/**
 * Helper service for managing recipe snapshots
 *
 * Provides versioning functionality for recipes to maintain historical accuracy.
 */
@Injectable()
export class RecipeSnapshotHelper {
  private readonly logger = new Logger(RecipeSnapshotHelper.name);

  constructor(
    @InjectRepository(RecipeSnapshot)
    private readonly snapshotRepository: Repository<RecipeSnapshot>,
  ) {}

  /**
   * Create snapshot of current recipe version
   *
   * Called before updating a recipe to preserve the previous version.
   */
  async createSnapshot(
    recipe: Recipe,
    userId: string,
    changeReason?: string,
  ): Promise<RecipeSnapshot> {
    // Get current version number
    const currentSnapshot = await this.getCurrentSnapshot(recipe.id);
    const nextVersion = currentSnapshot ? currentSnapshot.version + 1 : 1;

    // Close current snapshot if exists
    if (currentSnapshot) {
      currentSnapshot.valid_to = new Date();
      await this.snapshotRepository.save(currentSnapshot);
    }

    // Create snapshot data
    const snapshotData = {
      name: recipe.name,
      description: recipe.description,
      product_id: recipe.product_id,
      type_code: recipe.type_code,
      total_cost: Number(recipe.total_cost),
      serving_size_ml: recipe.serving_size_ml,
      preparation_time_seconds: recipe.preparation_time_seconds,
      temperature_celsius: recipe.temperature_celsius,
      is_active: recipe.is_active,
      items:
        recipe.ingredients?.map((ing) => ({
          ingredient_id: ing.ingredient_id,
          ingredient_name: ing.ingredient?.name || '',
          quantity: Number(ing.quantity),
          unit_of_measure_code: ing.unit_of_measure_code || 'unit',
          sort_order: ing.sort_order,
        })) || [],
      settings: recipe.settings,
    };

    // Calculate checksum for data integrity
    const checksum = this.calculateChecksum(snapshotData);

    // Create new snapshot
    const snapshot = this.snapshotRepository.create({
      recipe_id: recipe.id,
      version: nextVersion,
      snapshot: snapshotData,
      valid_from: new Date(),
      valid_to: null, // Current version
      created_by_user_id: userId,
      change_reason: changeReason,
      checksum,
    });

    const saved = await this.snapshotRepository.save(snapshot);

    this.logger.log(`Created snapshot v${nextVersion} for recipe ${recipe.id} (${recipe.name})`);

    return saved;
  }

  /**
   * Get current (active) snapshot for recipe
   */
  async getCurrentSnapshot(recipeId: string): Promise<RecipeSnapshot | null> {
    return this.snapshotRepository.findOne({
      where: {
        recipe_id: recipeId,
        valid_to: IsNull(),
      },
      order: {
        version: 'DESC',
      },
    });
  }

  /**
   * Get snapshot by version number
   */
  async getSnapshotByVersion(recipeId: string, version: number): Promise<RecipeSnapshot | null> {
    return this.snapshotRepository.findOne({
      where: {
        recipe_id: recipeId,
        version,
      },
    });
  }

  /**
   * Get snapshot that was active at specific date
   */
  async getSnapshotAtDate(recipeId: string, date: Date): Promise<RecipeSnapshot | null> {
    return this.snapshotRepository
      .createQueryBuilder('snapshot')
      .where('snapshot.recipe_id = :recipeId', { recipeId })
      .andWhere('snapshot.valid_from <= :date', { date })
      .andWhere('(snapshot.valid_to IS NULL OR snapshot.valid_to > :date)', { date })
      .orderBy('snapshot.version', 'DESC')
      .getOne();
  }

  /**
   * Get all versions for recipe
   */
  async getAllVersions(recipeId: string): Promise<RecipeSnapshot[]> {
    return this.snapshotRepository.find({
      where: { recipe_id: recipeId },
      order: { version: 'DESC' },
    });
  }

  /**
   * Calculate checksum for snapshot data
   */
  private calculateChecksum(data: Record<string, unknown>): string {
    const json = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Verify snapshot integrity
   */
  async verifySnapshot(snapshot: RecipeSnapshot): Promise<boolean> {
    const calculatedChecksum = this.calculateChecksum(snapshot.snapshot);
    return calculatedChecksum === snapshot.checksum;
  }
}
