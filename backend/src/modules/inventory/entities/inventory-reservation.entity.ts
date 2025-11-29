import { Entity, Column, ManyToOne, JoinColumn, Index, BeforeInsert } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Nomenclature } from '../../nomenclature/entities/nomenclature.entity';
import { Task } from '../../tasks/entities/task.entity';

/**
 * Статус резервации инвентаря
 */
export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PARTIALLY_FULFILLED = 'partially_fulfilled',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Уровень инвентаря для резервации
 */
export enum InventoryLevel {
  WAREHOUSE = 'warehouse',
  OPERATOR = 'operator',
}

/**
 * Резервация инвентаря
 *
 * Отслеживает зарезервированный товар для конкретной задачи.
 * Предотвращает race conditions при создании нескольких задач.
 *
 * Жизненный цикл:
 * 1. PENDING - создана резервация (при создании задачи)
 * 2. CONFIRMED - резервация подтверждена (опционально)
 * 3. FULFILLED - резервация выполнена (при завершении задачи)
 * 4. CANCELLED - резервация отменена (при отмене задачи)
 * 5. EXPIRED - резервация истекла (автоматически через CRON)
 */
@Entity('inventory_reservations')
@Index(['task_id'])
@Index(['nomenclature_id'])
@Index(['status'])
@Index(['inventory_level', 'reference_id'])
@Index(['expires_at'])
export class InventoryReservation extends BaseEntity {
  @ApiProperty({
    example: 'RSV-2025-001234',
    description: 'Уникальный номер резервации',
  })
  @Column({ type: 'varchar', length: 50, unique: true })
  reservation_number: string;

  @ApiProperty({ example: 'uuid', description: 'ID задачи' })
  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature;

  @ApiProperty({
    example: 15.5,
    description: 'Зарезервированное количество',
  })
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity_reserved: number;

  @ApiProperty({
    example: 15.5,
    description: 'Выполненное количество (при завершении задачи)',
  })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  quantity_fulfilled: number;

  @ApiProperty({
    enum: ReservationStatus,
    example: ReservationStatus.PENDING,
    description: 'Статус резервации',
  })
  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @ApiProperty({
    enum: InventoryLevel,
    example: InventoryLevel.OPERATOR,
    description: 'Уровень инвентаря (warehouse/operator)',
  })
  @Column({ type: 'varchar', length: 20 })
  inventory_level: InventoryLevel;

  @ApiProperty({
    example: 'uuid',
    description: 'ID склада или оператора (в зависимости от inventory_level)',
  })
  @Column({ type: 'uuid' })
  reference_id: string;

  @ApiProperty({
    example: '2025-11-16T10:00:00Z',
    description: 'Дата и время резервации',
  })
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  reserved_at: Date;

  @ApiProperty({
    example: '2025-11-17T10:00:00Z',
    description: 'Дата и время истечения резервации',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  expires_at: Date | null;

  @ApiProperty({
    example: '2025-11-16T14:30:00Z',
    description: 'Дата и время выполнения резервации',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  fulfilled_at: Date | null;

  @ApiProperty({
    example: '2025-11-16T12:00:00Z',
    description: 'Дата и время отмены резервации',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  cancelled_at: Date | null;

  @ApiProperty({
    example: 'Автоматическая резервация при создании задачи',
    description: 'Примечания',
  })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * Генерация номера резервации перед вставкой
   */
  @BeforeInsert()
  generateReservationNumber() {
    if (!this.reservation_number) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      this.reservation_number = `RSV-${timestamp}-${random}`;
    }
  }

  /**
   * Вычисляемое свойство: осталось зарезервировать
   */
  get quantity_remaining(): number {
    return Number(this.quantity_reserved) - Number(this.quantity_fulfilled);
  }

  /**
   * Проверка: истекла ли резервация
   */
  get is_expired(): boolean {
    if (!this.expires_at) return false;
    return new Date() > new Date(this.expires_at);
  }

  /**
   * Проверка: активна ли резервация
   */
  get is_active(): boolean {
    return (
      this.status === ReservationStatus.PENDING ||
      this.status === ReservationStatus.CONFIRMED ||
      this.status === ReservationStatus.PARTIALLY_FULFILLED
    );
  }
}
