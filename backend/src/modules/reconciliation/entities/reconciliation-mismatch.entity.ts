import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ReconciliationRun, ReconciliationSource } from './reconciliation-run.entity';

/**
 * Типы несовпадений.
 */
export enum MismatchType {
  ORDER_NOT_FOUND = 'order_not_found', // Заказ не найден в источнике
  PAYMENT_NOT_FOUND = 'payment_not_found', // Платёж не найден
  AMOUNT_MISMATCH = 'amount_mismatch', // Несовпадение суммы
  TIME_MISMATCH = 'time_mismatch', // Несовпадение времени (вне допуска)
  DUPLICATE = 'duplicate', // Дубликат записи
  PARTIAL_MATCH = 'partial_match', // Частичное совпадение
}

/**
 * Данные источника в сверке.
 */
export interface SourceData {
  found: boolean;
  amount: number | null;
  time: Date | null;
  transactionId: string | null;
  additionalData: Record<string, any> | null;
}

/**
 * ReconciliationMismatch entity - несовпадение в сверке.
 *
 * Хранит детали каждого несовпадения, найденного при сверке.
 */
@Entity('reconciliation_mismatches')
@Index(['run_id'])
@Index(['mismatch_type'])
@Index(['machine_code'])
@Index(['order_time'])
export class ReconciliationMismatch extends BaseEntity {
  @Column({ type: 'uuid' })
  run_id: string;

  @ManyToOne(() => ReconciliationRun, (run) => run.mismatches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'run_id' })
  run: ReconciliationRun;

  /**
   * Номер заказа (если есть).
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  order_number: string | null;

  /**
   * Код автомата.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  machine_code: string | null;

  /**
   * Время заказа.
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  order_time: Date | null;

  /**
   * Сумма заказа.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount: number | null;

  /**
   * Способ оплаты.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_method: string | null;

  /**
   * Тип несовпадения.
   */
  @Column({
    type: 'enum',
    enum: MismatchType,
  })
  mismatch_type: MismatchType;

  /**
   * Score качества сопоставления (0-6).
   */
  @Column({ type: 'int', default: 0 })
  match_score: number;

  /**
   * Сумма расхождения.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  discrepancy_amount: number | null;

  /**
   * Данные из каждого источника.
   */
  @Column({ type: 'jsonb', nullable: true })
  sources_data: Record<ReconciliationSource, SourceData> | null;

  /**
   * Описание проблемы.
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Флаг: проблема разрешена.
   */
  @Column({ type: 'boolean', default: false })
  is_resolved: boolean;

  /**
   * Комментарий при разрешении.
   */
  @Column({ type: 'text', nullable: true })
  resolution_notes: string | null;

  /**
   * Дата разрешения.
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date | null;

  /**
   * Кем разрешено.
   */
  @Column({ type: 'uuid', nullable: true })
  resolved_by_user_id: string | null;
}
