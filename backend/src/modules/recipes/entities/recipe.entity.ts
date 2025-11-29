import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Nomenclature } from '../../nomenclature/entities/nomenclature.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';

@Entity('recipes')
@Index(['product_id'])
@Index(['product_id', 'type_code'], { unique: true })
export class Recipe extends BaseEntity {
  @Column({ type: 'uuid' })
  product_id: string; // ID напитка из nomenclature

  @ManyToOne(() => Nomenclature, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Nomenclature;

  @Column({ type: 'varchar', length: 200 })
  name: string; // Название рецепта

  @Column({ type: 'varchar', length: 50 })
  type_code: string; // from dictionaries: recipe_types (primary, alternative, test)

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Settings
  @Column({ type: 'integer', nullable: true })
  preparation_time_seconds: number | null; // Время приготовления

  @Column({ type: 'integer', nullable: true })
  temperature_celsius: number | null; // Температура

  @Column({ type: 'integer', default: 1 })
  serving_size_ml: number; // Объем порции (мл)

  // Cost calculation (cached, updated when ingredients change)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_cost: number; // Себестоимость рецепта

  // Additional settings
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any> | null; // Доп. настройки (давление, скорость и т.д.)

  @OneToMany(() => RecipeIngredient, (ingredient) => ingredient.recipe, {
    cascade: true,
  })
  ingredients: RecipeIngredient[];
}
