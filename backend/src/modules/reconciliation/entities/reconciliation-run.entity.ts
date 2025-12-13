import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { ReconciliationMismatch } from './reconciliation-mismatch.entity';

/**
 * Статусы прогона сверки.
 */
export enum ReconciliationStatus {
  PENDING = 'pending', // Ожидает запуска
  PROCESSING = 'processing', // Выполняется
  COMPLETED = 'completed', // Завершен
  FAILED = 'failed', // Ошибка
  CANCELLED = 'cancelled', // Отменен
}

/**
 * Источники данных для сверки.
 */
export enum ReconciliationSource {
  HW = 'hw', // Hardware export (HW.xlsx)
  SALES_REPORT = 'sales_report', // VendHub sales report
  FISCAL = 'fiscal', // Фискальные чеки
  PAYME = 'payme', // Payme транзакции
  CLICK = 'click', // Click транзакции
  UZUM = 'uzum', // Uzum транзакции
}

/**
 * Сводка результатов сверки.
 */
export interface ReconciliationSummary {
  totalOrders: number;
  matchedOrders: number;
  unmatchedOrders: number;
  matchRate: number;
  scoreDistribution: {
    '6': number;
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
    '0': number;
  };
  totalRevenue: number;
  matchedRevenue: number;
  discrepancyAmount: number;
  bySource: Record<string, { found: number; missing: number }>;
  byMachine: Array<{
    machineId: string;
    machineName: string;
    matched: number;
    unmatched: number;
    revenue: number;
  }>;
}

/**
 * ReconciliationRun entity - прогон сверки платежей.
 *
 * Хранит параметры и результаты сверки данных из различных источников.
 * Использует алгоритм сопоставления по времени и сумме.
 */
@Entity('reconciliation_runs')
@Index(['status'])
@Index(['created_by_user_id'])
@Index(['date_from', 'date_to'])
export class ReconciliationRun extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ReconciliationStatus,
    default: ReconciliationStatus.PENDING,
  })
  status: ReconciliationStatus;

  /**
   * Начало периода сверки.
   */
  @Column({ type: 'date' })
  date_from: Date;

  /**
   * Конец периода сверки.
   */
  @Column({ type: 'date' })
  date_to: Date;

  /**
   * Источники данных для сверки.
   */
  @Column({ type: 'simple-array' })
  sources: ReconciliationSource[];

  /**
   * ID автоматов для сверки (если пусто - все).
   */
  @Column({ type: 'simple-array', nullable: true })
  machine_ids: string[] | null;

  /**
   * Допустимое отклонение по времени (секунды).
   * По умолчанию: 5 секунд.
   */
  @Column({ type: 'int', default: 5 })
  time_tolerance: number;

  /**
   * Допустимое отклонение по сумме (сум).
   * По умолчанию: 100 сум.
   */
  @Column({ type: 'int', default: 100 })
  amount_tolerance: number;

  /**
   * Время начала обработки.
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  started_at: Date | null;

  /**
   * Время завершения.
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  /**
   * Время обработки в миллисекундах.
   */
  @Column({ type: 'int', nullable: true })
  processing_time_ms: number | null;

  /**
   * Сводка результатов.
   */
  @Column({ type: 'jsonb', nullable: true })
  summary: ReconciliationSummary | null;

  /**
   * Текст ошибки (если status = FAILED).
   */
  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  // Creator
  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User;

  // Relations
  @OneToMany(() => ReconciliationMismatch, (mismatch) => mismatch.run, { cascade: true })
  mismatches: ReconciliationMismatch[];

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
