import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Дневная агрегированная статистика
 *
 * Хранит предварительно рассчитанные метрики за день для быстрого доступа.
 * Обновляется в реальном времени при создании транзакций и задач.
 */
@Entity('daily_stats')
@Unique(['stat_date'])
@Index(['stat_date'])
export class DailyStats extends BaseEntity {
  @ApiProperty({ example: '2024-11-15', description: 'Дата статистики' })
  @Column({ type: 'date' })
  stat_date: Date;

  // ============================================================================
  // ПРОДАЖИ И ВЫРУЧКА
  // ============================================================================

  @ApiProperty({ example: 15000.5, description: 'Общая выручка за день' })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_revenue: number;

  @ApiProperty({ example: 350, description: 'Количество продаж' })
  @Column({ type: 'integer', default: 0 })
  total_sales_count: number;

  @ApiProperty({ example: 42.86, description: 'Средний чек' })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  average_sale_amount: number;

  // ============================================================================
  // ИНКАССАЦИИ
  // ============================================================================

  @ApiProperty({ example: 12000, description: 'Собрано наличных' })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_collections: number;

  @ApiProperty({ example: 3, description: 'Количество инкассаций' })
  @Column({ type: 'integer', default: 0 })
  collections_count: number;

  // ============================================================================
  // АППАРАТЫ
  // ============================================================================

  @ApiProperty({ example: 45, description: 'Количество активных аппаратов' })
  @Column({ type: 'integer', default: 0 })
  active_machines_count: number;

  @ApiProperty({ example: 42, description: 'Аппаратов в работе (онлайн)' })
  @Column({ type: 'integer', default: 0 })
  online_machines_count: number;

  @ApiProperty({ example: 3, description: 'Аппаратов офлайн' })
  @Column({ type: 'integer', default: 0 })
  offline_machines_count: number;

  // ============================================================================
  // ЗАДАЧИ
  // ============================================================================

  @ApiProperty({ example: 12, description: 'Выполнено задач пополнения' })
  @Column({ type: 'integer', default: 0 })
  refill_tasks_completed: number;

  @ApiProperty({ example: 3, description: 'Выполнено задач инкассации' })
  @Column({ type: 'integer', default: 0 })
  collection_tasks_completed: number;

  @ApiProperty({ example: 2, description: 'Выполнено задач мойки' })
  @Column({ type: 'integer', default: 0 })
  cleaning_tasks_completed: number;

  @ApiProperty({ example: 1, description: 'Выполнено задач ремонта' })
  @Column({ type: 'integer', default: 0 })
  repair_tasks_completed: number;

  @ApiProperty({ example: 18, description: 'Всего завершено задач' })
  @Column({ type: 'integer', default: 0 })
  total_tasks_completed: number;

  // ============================================================================
  // ИНВЕНТАРЬ
  // ============================================================================

  @ApiProperty({ example: 500, description: 'Единиц товара выдано (пополнено)' })
  @Column({ type: 'integer', default: 0 })
  inventory_units_refilled: number;

  @ApiProperty({ example: 350, description: 'Единиц товара продано' })
  @Column({ type: 'integer', default: 0 })
  inventory_units_sold: number;

  // ============================================================================
  // ПОПУЛЯРНЫЕ ПРОДУКТЫ
  // ============================================================================

  @ApiProperty({
    example: [
      { nomenclature_id: 'uuid-1', name: 'Кофе эспрессо', quantity: 120, revenue: 3600 },
      { nomenclature_id: 'uuid-2', name: 'Капучино', quantity: 95, revenue: 4275 },
    ],
    description: 'Топ-10 продуктов по продажам',
  })
  @Column({ type: 'jsonb', nullable: true })
  top_products: Array<{
    nomenclature_id: string;
    name: string;
    quantity: number;
    revenue: number;
  }> | null;

  // ============================================================================
  // ПОПУЛЯРНЫЕ АППАРАТЫ
  // ============================================================================

  @ApiProperty({
    example: [
      { machine_id: 'uuid-1', machine_number: 'VM-001', sales_count: 85, revenue: 3825 },
      { machine_id: 'uuid-2', machine_number: 'VM-002', sales_count: 72, revenue: 3240 },
    ],
    description: 'Топ-10 аппаратов по выручке',
  })
  @Column({ type: 'jsonb', nullable: true })
  top_machines: Array<{
    machine_id: string;
    machine_number: string;
    sales_count: number;
    revenue: number;
  }> | null;

  // ============================================================================
  // ОПЕРАТОРЫ
  // ============================================================================

  @ApiProperty({ example: 8, description: 'Количество работавших операторов' })
  @Column({ type: 'integer', default: 0 })
  active_operators_count: number;

  // ============================================================================
  // МЕТАДАННЫЕ
  // ============================================================================

  @ApiProperty({ description: 'Когда статистика последний раз обновлялась' })
  @Index()
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  last_updated_at: Date;

  @ApiProperty({ description: 'Когда была полная пересборка статистики' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_full_rebuild_at: Date | null;

  @ApiProperty({ example: true, description: 'Флаг завершенности дня (для финализации)' })
  @Column({ type: 'boolean', default: false })
  is_finalized: boolean;

  @ApiProperty({ description: 'Дополнительные метаданные' })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
