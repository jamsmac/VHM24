import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { DictionaryItem } from './dictionary-item.entity';

@Entity('dictionaries')
@Index(['code'], { unique: true })
export class Dictionary extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name_ru: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name_en: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  is_system: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  @OneToMany(() => DictionaryItem, (item) => item.dictionary, {
    cascade: true,
  })
  items: DictionaryItem[];
}
