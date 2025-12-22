import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoginAttemptsTable1733100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create login_attempts table for brute-force protection (REQ-AUTH-44)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        success BOOLEAN NOT NULL DEFAULT FALSE,
        failure_reason VARCHAR(255),
        attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_username_ip ON login_attempts(username, ip_address, attempted_at);
    `);

    // Create a partial index for failed attempts only (more efficient for queries)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_failed ON login_attempts(username, attempted_at)
      WHERE success = FALSE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_login_attempts_failed;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_login_attempts_username_ip;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_login_attempts_time;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_login_attempts_ip;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_login_attempts_username;`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS login_attempts;`);
  }
}
