import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIntegrationTables1731640000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums (idempotent - skip if already exists)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE integration_type AS ENUM (
          'payment_gateway', 'erp', 'accounting', 'crm', 'email', 'sms', 'shipping', 'inventory', 'api', 'webhook'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE integration_status AS ENUM ('active', 'inactive', 'error', 'testing');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE log_level AS ENUM ('info', 'warning', 'error', 'debug');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE request_method AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE webhook_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'ignored');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE sync_job_status AS ENUM ('scheduled', 'running', 'completed', 'failed', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE sync_direction AS ENUM ('inbound', 'outbound', 'bidirectional');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE api_key_status AS ENUM ('active', 'inactive', 'revoked', 'expired');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Create integrations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS integrations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        type integration_type NOT NULL,
        provider VARCHAR(100) NOT NULL,
        status integration_status DEFAULT 'inactive',
        description TEXT,
        api_endpoint VARCHAR(500),
        api_key VARCHAR(500),
        api_secret VARCHAR(500),
        webhook_url VARCHAR(500),
        webhook_secret VARCHAR(500),
        sync_interval_minutes INTEGER DEFAULT 0,
        last_sync_at TIMESTAMP,
        next_sync_at TIMESTAMP,
        auto_sync_enabled BOOLEAN DEFAULT false,
        config JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrations_sync ON integrations(next_sync_at) WHERE auto_sync_enabled = true;
    `);

    // Create integration_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS integration_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
        level log_level DEFAULT 'info',
        method request_method NOT NULL,
        endpoint VARCHAR(500) NOT NULL,
        status_code INTEGER,
        request_body TEXT,
        response_body TEXT,
        request_headers JSONB DEFAULT '{}',
        response_headers JSONB DEFAULT '{}',
        duration_ms INTEGER,
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        stack_trace TEXT,
        user_id UUID,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integration_logs_integration ON integration_logs(integration_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integration_logs_created ON integration_logs(created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integration_logs_success ON integration_logs(success);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integration_logs_level ON integration_logs(level);
    `);

    // Create webhooks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        source VARCHAR(100),
        external_id VARCHAR(255),
        payload JSONB NOT NULL,
        headers JSONB DEFAULT '{}',
        status webhook_status DEFAULT 'pending',
        processed_at TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        error_message TEXT,
        signature VARCHAR(500),
        signature_verified BOOLEAN DEFAULT true,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_integration ON webhooks(integration_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON webhooks(event_type);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_created ON webhooks(created_at);
    `);

    // Create sync_jobs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sync_jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
        job_name VARCHAR(100) NOT NULL,
        direction sync_direction NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        status sync_job_status DEFAULT 'scheduled',
        scheduled_at TIMESTAMP NOT NULL,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        duration_ms INTEGER,
        total_records INTEGER DEFAULT 0,
        processed_records INTEGER DEFAULT 0,
        successful_records INTEGER DEFAULT 0,
        failed_records INTEGER DEFAULT 0,
        error_message TEXT,
        config JSONB DEFAULT '{}',
        results JSONB DEFAULT '{}',
        triggered_by_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_jobs_integration ON sync_jobs(integration_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_jobs_scheduled ON sync_jobs(scheduled_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_jobs_entity_type ON sync_jobs(entity_type);
    `);

    // Create api_keys table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        key_hash VARCHAR(64) UNIQUE NOT NULL,
        key_prefix VARCHAR(16) UNIQUE NOT NULL,
        user_id UUID NOT NULL,
        status api_key_status DEFAULT 'active',
        expires_at TIMESTAMP,
        last_used_at TIMESTAMP,
        usage_count INTEGER DEFAULT 0,
        rate_limit INTEGER,
        scopes JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS api_keys CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sync_jobs CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS webhooks CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS integration_logs CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS integrations CASCADE;`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS api_key_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS sync_direction;`);
    await queryRunner.query(`DROP TYPE IF EXISTS sync_job_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS webhook_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS request_method;`);
    await queryRunner.query(`DROP TYPE IF EXISTS log_level;`);
    await queryRunner.query(`DROP TYPE IF EXISTS integration_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS integration_type;`);
  }
}
