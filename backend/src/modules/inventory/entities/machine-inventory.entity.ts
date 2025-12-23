import { Entity, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Nomenclature } from '../../nomenclature/entities/nomenclature.entity';
import { Machine } from '../../machines/entities/machine.entity';

/**
 * Инвентарь аппарата (уровень 3)
 * Товары/ингредиенты, находящиеся в конкретном вендинговом аппарате
 */
@Entity('machine_inventory')
@Unique(['machine_id', 'nomenclature_id'])
@Index(['machine_id'])
@Index(['nomenclature_id'])
export class MachineInventory extends BaseEntity {
  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature;

  @ApiProperty({
    example: 15.5,
    description: 'Текущее количество в аппарате',
  })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_quantity: number;

  @ApiProperty({
    example: 5,
    description: 'Минимальный уровень для уведомления о необходимости пополнения',
  })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  min_stock_level: number;

  @ApiProperty({
    example: 50,
    description: 'Максимальная вместимость для этого товара в аппарате',
  })
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  max_capacity: number | null;

  @ApiProperty({
    example: '2025-11-14T10:00:00Z',
    description: 'Дата последнего пополнения',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_refilled_at: Date | null;

  @ApiProperty({
    example: 'uuid',
    description: 'ID последней задачи пополнения',
  })
  @Column({ type: 'uuid', nullable: true })
  last_refill_task_id: string | null;

  @ApiProperty({
    example: 'A-12',
    description: 'Номер слота/бункера в аппарате',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  slot_number: string | null;
}
