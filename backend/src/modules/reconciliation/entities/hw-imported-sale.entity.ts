import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Источник импорта HW данных
 */
export enum HwImportSource {
  EXCEL = 'excel',
  CSV = 'csv',
  API = 'api',
}

/**
 * HwImportedSale entity - импортированные продажи из Hardware Export (HW.xlsx)
 *
 * Хранит данные продаж, экспортированные напрямую из вендингового оборудования.
 * Используется для сверки с данными из VendHub и платёжных систем.
 */
@Entity('hw_imported_sales')
@Index(['sale_date'])
@Index(['machine_id'])
@Index(['machine_code'])
@Index(['import_batch_id'])
@Index(['is_reconciled'])
export class HwImportedSale extends BaseEntity {
  /**
   * ID пакета импорта (группировка записей одного импорта)
   */
  @Column({ type: 'uuid' })
  import_batch_id: string;

  /**
   * Дата и время продажи
   */
  @Column({ type: 'timestamp with time zone' })
  sale_date: Date;

  /**
   * Код автомата из HW экспорта (машинный номер)
   */
  @Column({ type: 'varchar', length: 50 })
  machine_code: string;

  /**
   * ID автомата (связь с machines таблицей, если найден)
   */
  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;

  @ManyToOne(() => Machine, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine | null;

  /**
   * Сумма продажи
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  /**
   * Валюта
   */
  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  /**
   * Метод оплаты (если известен)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_method: string | null;

  /**
   * Номер заказа/чека из HW
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  order_number: string | null;

  /**
   * Номер транзакции из HW
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  transaction_id: string | null;

  /**
   * Название продукта
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  product_name: string | null;

  /**
   * Код продукта
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  product_code: string | null;

  /**
   * Количество
   */
  @Column({ type: 'integer', default: 1 })
  quantity: number;

  /**
   * Источник импорта
   */
  @Column({
    type: 'enum',
    enum: HwImportSource,
    default: HwImportSource.EXCEL,
  })
  import_source: HwImportSource;

  /**
   * Имя файла импорта
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  import_filename: string | null;

  /**
   * Номер строки в файле импорта
   */
  @Column({ type: 'integer', nullable: true })
  import_row_number: number | null;

  /**
   * Флаг: запись прошла сверку
   */
  @Column({ type: 'boolean', default: false })
  is_reconciled: boolean;

  /**
   * ID сверки, в которой участвовала запись
   */
  @Column({ type: 'uuid', nullable: true })
  reconciliation_run_id: string | null;

  /**
   * Дополнительные данные из импорта
   */
  @Column({ type: 'jsonb', nullable: true })
  raw_data: Record<string, any> | null;

  /**
   * Пользователь, выполнивший импорт
   */
  @Column({ type: 'uuid' })
  imported_by_user_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'imported_by_user_id' })
  imported_by: User;
}
