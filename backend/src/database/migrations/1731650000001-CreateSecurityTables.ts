import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSecurityTables1731650000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE audit_action AS ENUM (
        'create', 'update', 'delete', 'read', 'login', 'logout',
        'export', 'import', 'approve', 'reject', 'restore'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE audit_entity AS ENUM (
        'user', 'machine', 'task', 'inventory', 'transaction',
        'complaint', 'incident', 'warehouse', 'employee',
        'integration', 'setting'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE security_event_type AS ENUM (
        'login_success', 'login_failed', 'logout', 'password_changed',
        'password_reset_requested', 'password_reset_completed',
        'account_locked', 'account_unlocked', 'two_factor_enabled',
        'two_factor_disabled', 'two_factor_verified', 'two_factor_failed',
        'permission_denied', 'suspicious_activity', 'data_export', 'bulk_operation'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE security_level AS ENUM ('low', 'medium', 'high', 'critical');
    `);

    await queryRunner.query(`
      CREATE TYPE two_factor_method AS ENUM ('totp', 'sms', 'email', 'backup_codes');
    `);

    await queryRunner.query(`
      CREATE TYPE session_status AS ENUM ('active', 'expired', 'revoked', 'logged_out');
    `);

    await queryRunner.query(`
      CREATE TYPE encryption_status AS ENUM ('pending', 'encrypted', 'decrypted', 'failed');
    `);

    await queryRunner.query(`
      CREATE TYPE access_decision AS ENUM ('allow', 'deny');
    `);

    await queryRunner.query(`
      CREATE TYPE access_type AS ENUM ('read', 'write', 'delete', 'execute');
    `);

    // Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        user_email VARCHAR(200),
        action audit_action NOT NULL,
        entity_type audit_entity NOT NULL,
        entity_id UUID,
        entity_name VARCHAR(200),
        old_values JSONB,
        new_values JSONB,
        changes JSONB DEFAULT '[]',
        ip_address VARCHAR(100),
        user_agent TEXT,
        session_id VARCHAR(50),
        description TEXT,
        is_sensitive BOOLEAN DEFAULT false,
        is_system_action BOOLEAN DEFAULT false,
        is_immutable BOOLEAN DEFAULT true,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
    `);

    // Create security_events table
    await queryRunner.query(`
      CREATE TABLE security_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        user_email VARCHAR(200),
        event_type security_event_type NOT NULL,
        security_level security_level DEFAULT 'low',
        ip_address VARCHAR(100),
        user_agent TEXT,
        location VARCHAR(100),
        session_id VARCHAR(50),
        is_blocked BOOLEAN DEFAULT false,
        description TEXT,
        reason TEXT,
        details JSONB DEFAULT '{}',
        requires_investigation BOOLEAN DEFAULT false,
        investigated_at TIMESTAMP,
        investigated_by_id UUID,
        investigation_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_security_events_user ON security_events(user_id, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_security_events_type ON security_events(event_type, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_security_events_level ON security_events(security_level, created_at);
    `);

    // Create two_factor_auth table
    await queryRunner.query(`
      CREATE TABLE two_factor_auth (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL,
        method two_factor_method NOT NULL,
        is_enabled BOOLEAN DEFAULT false,
        is_verified BOOLEAN DEFAULT false,
        secret VARCHAR(500),
        phone_number VARCHAR(50),
        email VARCHAR(200),
        backup_codes JSONB DEFAULT '[]',
        backup_codes_used INTEGER DEFAULT 0,
        enabled_at TIMESTAMP,
        last_used_at TIMESTAMP,
        failed_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_two_factor_auth_user ON two_factor_auth(user_id);
    `);

    // Create session_logs table
    await queryRunner.query(`
      CREATE TABLE session_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        ip_address VARCHAR(100) NOT NULL,
        user_agent TEXT,
        device_type VARCHAR(100),
        browser VARCHAR(100),
        os VARCHAR(100),
        location VARCHAR(100),
        status session_status DEFAULT 'active',
        logged_in_at TIMESTAMP NOT NULL,
        logged_out_at TIMESTAMP,
        expires_at TIMESTAMP,
        last_activity_at TIMESTAMP,
        actions_count INTEGER DEFAULT 0,
        is_suspicious BOOLEAN DEFAULT false,
        revoke_reason TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_session_logs_user ON session_logs(user_id, status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_session_logs_session ON session_logs(session_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_session_logs_created ON session_logs(created_at);
    `);

    // Create data_encryption table
    await queryRunner.query(`
      CREATE TABLE data_encryption (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        entity_type VARCHAR(100) NOT NULL,
        entity_id UUID NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        encrypted_value TEXT NOT NULL,
        encryption_algorithm VARCHAR(100) NOT NULL,
        key_version VARCHAR(100),
        status encryption_status DEFAULT 'encrypted',
        encrypted_at TIMESTAMP,
        encrypted_by_id UUID,
        last_accessed_at TIMESTAMP,
        last_accessed_by_id UUID,
        access_count INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_data_encryption_entity ON data_encryption(entity_type, entity_id);
    `);

    // Create access_control_logs table
    await queryRunner.query(`
      CREATE TABLE access_control_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        user_email VARCHAR(200) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id UUID,
        access_type access_type NOT NULL,
        decision access_decision NOT NULL,
        reason TEXT,
        ip_address VARCHAR(100),
        endpoint VARCHAR(500),
        http_method VARCHAR(20),
        user_permissions JSONB DEFAULT '[]',
        required_permissions JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_access_control_user ON access_control_logs(user_id, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_access_control_resource ON access_control_logs(resource_type, decision);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS access_control_logs CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS data_encryption CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS session_logs CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS two_factor_auth CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS security_events CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs CASCADE;`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS access_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS access_decision;`);
    await queryRunner.query(`DROP TYPE IF EXISTS encryption_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS session_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS two_factor_method;`);
    await queryRunner.query(`DROP TYPE IF EXISTS security_level;`);
    await queryRunner.query(`DROP TYPE IF EXISTS security_event_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS audit_entity;`);
    await queryRunner.query(`DROP TYPE IF EXISTS audit_action;`);
  }
}
