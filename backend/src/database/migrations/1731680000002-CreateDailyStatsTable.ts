import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDailyStatsTable1731680000002 implements MigrationInterface {
  name = 'CreateDailyStatsTable1731680000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create daily_stats table
    await queryRunner.createTable(
      new Table({
        name: 'daily_stats',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'stat_date',
            type: 'date',
            isUnique: true,
          },
          // Продажи и выручка
          {
            name: 'total_revenue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'total_sales_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'average_sale_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          // Инкассации
          {
            name: 'total_collections',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'collections_count',
            type: 'integer',
            default: 0,
          },
          // Аппараты
          {
            name: 'active_machines_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'online_machines_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'offline_machines_count',
            type: 'integer',
            default: 0,
          },
          // Задачи
          {
            name: 'refill_tasks_completed',
            type: 'integer',
            default: 0,
          },
          {
            name: 'collection_tasks_completed',
            type: 'integer',
            default: 0,
          },
          {
            name: 'cleaning_tasks_completed',
            type: 'integer',
            default: 0,
          },
          {
            name: 'repair_tasks_completed',
            type: 'integer',
            default: 0,
          },
          {
            name: 'total_tasks_completed',
            type: 'integer',
            default: 0,
          },
          // Инвентарь
          {
            name: 'inventory_units_refilled',
            type: 'integer',
            default: 0,
          },
          {
            name: 'inventory_units_sold',
            type: 'integer',
            default: 0,
          },
          // JSON поля
          {
            name: 'top_products',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'top_machines',
            type: 'jsonb',
            isNullable: true,
          },
          // Операторы
          {
            name: 'active_operators_count',
            type: 'integer',
            default: 0,
          },
          // Метаданные
          {
            name: 'last_updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'last_full_rebuild_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'is_finalized',
            type: 'boolean',
            default: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          // BaseEntity fields
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'daily_stats',
      new TableIndex({
        name: 'idx_daily_stats_stat_date',
        columnNames: ['stat_date'],
      }),
    );

    await queryRunner.createIndex(
      'daily_stats',
      new TableIndex({
        name: 'idx_daily_stats_last_updated_at',
        columnNames: ['last_updated_at'],
      }),
    );

    // Add comment to table
    await queryRunner.query(`
      COMMENT ON TABLE daily_stats IS 'Агрегированная дневная статистика для быстрого доступа к отчетам';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN daily_stats.stat_date IS 'Дата статистики';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN daily_stats.is_finalized IS 'Флаг финализации дня (закрытия дня)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('daily_stats', true);
  }
}
