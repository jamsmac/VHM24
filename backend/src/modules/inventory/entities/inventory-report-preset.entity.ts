import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Inventory Report Preset Entity
 * Пресеты сохранённых фильтров для отчётов инвентаря
 *
 * REQ-ANL-04: Сохранение пресетов фильтров отчётов
 *
 * Позволяет пользователям сохранять и переиспользовать наборы фильтров
 * для отчётов без необходимости повторного ввода параметров
 */
@Entity('inventory_report_presets')
@Index(['user_id', 'is_default'])
@Index(['user_id', 'is_shared'])
export class InventoryReportPreset extends BaseEntity {
  @ApiProperty({
    example: 'Критические расхождения на этой неделе',
    description: 'Название пресета',
  })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({
    example: 'Фильтр для поиска критических расхождений остатков',
    description: 'Описание пресета',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    example: 'uuid',
    description: 'Пользователь, создавший пресет',
  })
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({
    example: {
      level_type: 'MACHINE',
      level_ref_id: 'uuid',
      severity: 'CRITICAL',
      date_from: '2025-11-14',
      date_to: '2025-11-21',
      threshold_exceeded_only: true,
    },
    description: 'Сохранённые фильтры отчёта',
  })
  @Column({ type: 'jsonb' })
  filters: {
    level_type?: string;
    level_ref_id?: string;
    nomenclature_id?: string;
    date_from?: string;
    date_to?: string;
    severity?: string;
    threshold_exceeded_only?: boolean;
  };

  @ApiProperty({
    example: false,
    description: 'Является ли этот пресет пресетом по умолчанию для пользователя',
  })
  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @ApiProperty({
    example: false,
    description: 'Доступен ли этот пресет для всех пользователей (в будущем)',
  })
  @Column({ type: 'boolean', default: false })
  is_shared: boolean;

  @ApiProperty({
    example: 10,
    description: 'Порядок сортировки пресетов',
  })
  @Column({ type: 'integer', default: 0 })
  sort_order: number;
}
