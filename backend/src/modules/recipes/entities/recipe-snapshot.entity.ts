import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Recipe } from './recipe.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Recipe Snapshot - immutable version of recipe at a point in time
 *
 * When a recipe is modified, we create a snapshot of the previous version.
 * This ensures that historical transactions show the correct recipe composition
 * that was active at the time of sale.
 *
 * Example:
 * - 2024-01-01: Recipe "Cappuccino" has 20g coffee, 100ml milk
 * - Sales from Jan use this version
 * - 2024-02-01: Recipe updated to 25g coffee, 120ml milk
 * - A snapshot of Jan version is created
 * - Sales from Feb use new version
 * - Historical reports show correct composition for each period
 */
@Entity('recipe_snapshots')
@Index(['recipe_id', 'version'])
@Index(['valid_from'])
@Index(['valid_to'])
export class RecipeSnapshot extends BaseEntity {
  @ApiProperty({ description: 'Recipe this snapshot belongs to' })
  @Column({ type: 'uuid' })
  recipe_id: string;

  @ManyToOne(() => Recipe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  @ApiProperty({ example: 1, description: 'Version number (incremental)' })
  @Column({ type: 'integer' })
  version: number;

  @ApiProperty({ description: 'Snapshot of recipe data at this version' })
  @Column({ type: 'jsonb' })
  snapshot: {
    name: string;
    description: string | null;
    category_code: string;
    base_cost: number;
    base_price: number;
    items: Array<{
      nomenclature_id: string;
      nomenclature_name: string;
      quantity: number;
      unit_of_measure_code: string;
    }>;
    metadata: Record<string, any> | null;
  };

  @ApiProperty({ description: 'When this version became active' })
  @Column({ type: 'timestamp with time zone' })
  valid_from: Date;

  @ApiProperty({ description: 'When this version was replaced (null = current)' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  valid_to: Date | null;

  @ApiProperty({ description: 'User who created this snapshot' })
  @Column({ type: 'uuid', nullable: true })
  created_by_user_id: string | null;

  @ApiProperty({ description: 'Reason for version change' })
  @Column({ type: 'text', nullable: true })
  change_reason: string | null;

  @ApiProperty({ description: 'Checksum for data integrity' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string | null;
}
