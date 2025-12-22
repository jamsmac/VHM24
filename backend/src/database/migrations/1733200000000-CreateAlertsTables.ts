import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAlertsTables1733200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums for alert system
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE alert_metric AS ENUM (
          'low_stock_percentage',
          'machine_error_count',
          'task_overdue_hours',
          'incident_count',
          'collection_due_days',
          'component_lifetime_percentage',
          'washing_overdue_days',
          'daily_sales_drop_percentage',
          'machine_offline_hours',
          'spare_part_low_stock'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical', 'emergency');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE alert_operator AS ENUM ('>', '<', '>=', '<=', '==', '!=');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'escalated', 'expired');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Create alert_rules table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        metric alert_metric NOT NULL,
        operator alert_operator NOT NULL,
        threshold DECIMAL(10, 2) NOT NULL,
        severity alert_severity DEFAULT 'warning',
        is_enabled BOOLEAN DEFAULT true,
        cooldown_minutes INTEGER DEFAULT 60,
        scope_filters JSONB,
        notify_user_ids JSONB,
        notify_roles JSONB,
        notification_channels JSONB,
        escalation_minutes INTEGER,
        escalation_config JSONB,
        last_triggered_at TIMESTAMP WITH TIME ZONE,
        trigger_count INTEGER DEFAULT 0,
        created_by_id UUID,
        updated_by_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create indexes for alert_rules
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_rules_metric ON alert_rules(metric);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_rules_severity ON alert_rules(severity);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(is_enabled);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_rules_created_by ON alert_rules(created_by_id);
    `);

    // Create alert_history table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS alert_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
        status alert_status DEFAULT 'active',
        severity alert_severity NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
        machine_id UUID,
        location_id UUID,
        metric_snapshot JSONB,
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        acknowledged_by_id UUID,
        acknowledgement_note TEXT,
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by_id UUID,
        resolution_note TEXT,
        escalated_at TIMESTAMP WITH TIME ZONE,
        escalation_level INTEGER DEFAULT 0,
        notification_ids JSONB,
        auto_created_task_id UUID,
        created_by_id UUID,
        updated_by_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create indexes for alert_history
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_rule ON alert_history(alert_rule_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_status ON alert_history(status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_severity ON alert_history(severity);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_triggered ON alert_history(triggered_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_machine ON alert_history(machine_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_location ON alert_history(location_id);
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE alert_rules
      ADD CONSTRAINT fk_alert_rules_created_by
      FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE alert_rules
      ADD CONSTRAINT fk_alert_rules_updated_by
      FOREIGN KEY (updated_by_id) REFERENCES users(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE alert_history
      ADD CONSTRAINT fk_alert_history_acknowledged_by
      FOREIGN KEY (acknowledged_by_id) REFERENCES users(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE alert_history
      ADD CONSTRAINT fk_alert_history_resolved_by
      FOREIGN KEY (resolved_by_id) REFERENCES users(id) ON DELETE SET NULL;
    `);

    // Add comment for documentation
    await queryRunner.query(`
      COMMENT ON TABLE alert_rules IS 'Alert rules configuration for automated monitoring and notifications';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE alert_history IS 'History of triggered alerts with status tracking and resolution';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS alert_history CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS alert_rules CASCADE;`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS alert_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS alert_operator;`);
    await queryRunner.query(`DROP TYPE IF EXISTS alert_severity;`);
    await queryRunner.query(`DROP TYPE IF EXISTS alert_metric;`);
  }
}
