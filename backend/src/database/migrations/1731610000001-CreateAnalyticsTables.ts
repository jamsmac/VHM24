import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAnalyticsTables1731610000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums (IF NOT EXISTS)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE widget_type_enum AS ENUM (
          'sales_chart', 'revenue_chart', 'top_machines', 'top_products',
          'machine_status', 'stock_levels', 'tasks_summary', 'incidents_map',
          'kpi_metric', 'custom_chart'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE chart_type_enum AS ENUM ('line', 'bar', 'pie', 'area', 'donut', 'heatmap', 'scatter');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE time_range_enum AS ENUM (
          'today', 'yesterday', 'last_7_days', 'last_30_days',
          'this_month', 'last_month', 'this_year', 'custom'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE snapshot_type_enum AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE report_type_enum AS ENUM ('sales', 'financial', 'inventory', 'machines', 'tasks', 'custom');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE report_format_enum AS ENUM ('pdf', 'excel', 'csv', 'json');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE schedule_frequency_enum AS ENUM ('once', 'daily', 'weekly', 'monthly');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create dashboard_widgets table
    await queryRunner.createTable(
      new Table({
        name: 'dashboard_widgets',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid' },
          { name: 'title', type: 'varchar', length: '255' },
          { name: 'widget_type', type: 'widget_type_enum' },
          { name: 'chart_type', type: 'chart_type_enum', isNullable: true },
          { name: 'time_range', type: 'time_range_enum', default: "'last_7_days'" },
          { name: 'position', type: 'integer' },
          { name: 'width', type: 'integer', default: 6 },
          { name: 'height', type: 'integer', default: 4 },
          { name: 'config', type: 'jsonb', default: "'{}'" },
          { name: 'is_visible', type: 'boolean', default: true },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    // Create analytics_snapshots table
    await queryRunner.createTable(
      new Table({
        name: 'analytics_snapshots',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'snapshot_type', type: 'snapshot_type_enum' },
          { name: 'snapshot_date', type: 'date' },
          { name: 'machine_id', type: 'uuid', isNullable: true },
          { name: 'location_id', type: 'uuid', isNullable: true },
          { name: 'product_id', type: 'uuid', isNullable: true },
          { name: 'total_transactions', type: 'integer', default: 0 },
          { name: 'total_revenue', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'total_units_sold', type: 'integer', default: 0 },
          {
            name: 'average_transaction_value',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          { name: 'uptime_minutes', type: 'integer', default: 0 },
          { name: 'downtime_minutes', type: 'integer', default: 0 },
          { name: 'availability_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 },
          { name: 'stock_refills', type: 'integer', default: 0 },
          { name: 'out_of_stock_incidents', type: 'integer', default: 0 },
          { name: 'maintenance_tasks_completed', type: 'integer', default: 0 },
          { name: 'incidents_reported', type: 'integer', default: 0 },
          { name: 'complaints_received', type: 'integer', default: 0 },
          { name: 'operational_costs', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'profit_margin', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'detailed_metrics', type: 'jsonb', default: "'{}'" },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    // Create custom_reports table
    await queryRunner.createTable(
      new Table({
        name: 'custom_reports',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'created_by_id', type: 'uuid' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'report_type', type: 'report_type_enum' },
          { name: 'format', type: 'report_format_enum', default: "'pdf'" },
          { name: 'config', type: 'jsonb', default: "'{}'" },
          { name: 'is_scheduled', type: 'boolean', default: false },
          { name: 'schedule_frequency', type: 'schedule_frequency_enum', isNullable: true },
          { name: 'schedule_time', type: 'time', isNullable: true },
          { name: 'schedule_days', type: 'text', isNullable: true },
          { name: 'recipients', type: 'text', isNullable: true },
          { name: 'last_run_at', type: 'timestamp', isNullable: true },
          { name: 'next_run_at', type: 'timestamp', isNullable: true },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    // Create indexes (IF NOT EXISTS)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dashboard_widgets_user_id" ON "dashboard_widgets" ("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_analytics_snapshots_type_date" ON "analytics_snapshots" ("snapshot_type", "snapshot_date");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_analytics_snapshots_machine_date" ON "analytics_snapshots" ("machine_id", "snapshot_date");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_analytics_snapshots_location_date" ON "analytics_snapshots" ("location_id", "snapshot_date");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_custom_reports_created_by" ON "custom_reports" ("created_by_id");`,
    );

    // Create foreign keys (IF NOT EXISTS)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_3b6c5373c29f8eb0e1b41056e52') THEN
          ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "FK_3b6c5373c29f8eb0e1b41056e52"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_custom_reports_created_by') THEN
          ALTER TABLE "custom_reports" ADD CONSTRAINT "FK_custom_reports_created_by"
            FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('custom_reports');
    await queryRunner.dropTable('analytics_snapshots');
    await queryRunner.dropTable('dashboard_widgets');

    await queryRunner.query(`DROP TYPE schedule_frequency_enum`);
    await queryRunner.query(`DROP TYPE report_format_enum`);
    await queryRunner.query(`DROP TYPE report_type_enum`);
    await queryRunner.query(`DROP TYPE snapshot_type_enum`);
    await queryRunner.query(`DROP TYPE time_range_enum`);
    await queryRunner.query(`DROP TYPE chart_type_enum`);
    await queryRunner.query(`DROP TYPE widget_type_enum`);
  }
}
