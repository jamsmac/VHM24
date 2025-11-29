import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Dictionary } from './dictionary.entity';

@Entity('dictionary_items')
@Index(['dictionary_id', 'code'], { unique: true })
export class DictionaryItem extends BaseEntity {
  @Column({ type: 'uuid' })
  dictionary_id: string;

  @ManyToOne(() => Dictionary, (dictionary) => dictionary.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dictionary_id' })
  dictionary: Dictionary;

  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  value_ru: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  value_en: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
