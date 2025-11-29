import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Recipe } from './recipe.entity';
import { Nomenclature } from '../../nomenclature/entities/nomenclature.entity';

@Entity('recipe_ingredients')
@Index(['recipe_id'])
@Index(['ingredient_id'])
export class RecipeIngredient extends BaseEntity {
  @Column({ type: 'uuid' })
  recipe_id: string;

  @ManyToOne(() => Recipe, (recipe) => recipe.ingredients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  @Column({ type: 'uuid' })
  ingredient_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Nomenclature;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number; // Количество ингредиента

  @Column({ type: 'varchar', length: 50 })
  unit_of_measure_code: string; // from dictionaries: units_of_measure

  @Column({ type: 'integer', default: 1 })
  sort_order: number; // Порядок добавления ингредиента
}
