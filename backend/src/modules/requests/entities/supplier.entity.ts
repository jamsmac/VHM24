import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Material } from './material.entity';

/**
 * Supplier entity - поставщик материалов.
 *
 * Поставщики могут быть привязаны к Telegram для автоматической отправки заявок.
 */
@Entity('suppliers')
@Index(['telegram_id'])
@Index(['is_active'])
export class Supplier extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  telegram_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  telegram_username: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 320, nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  /**
   * Категории материалов, которые поставляет этот поставщик.
   * Хранится как массив строк.
   */
  @Column({ type: 'simple-array', nullable: true })
  categories: string[] | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  /**
   * Приоритет поставщика при выборе (больше = выше приоритет).
   */
  @Column({ type: 'int', default: 0 })
  priority: number;

  // Relations
  @OneToMany(() => Material, (material) => material.supplier)
  materials: Material[];
}
