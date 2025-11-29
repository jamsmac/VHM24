import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add Login Lockout Fields to Users Table
 *
 * Adds fields for tracking failed login attempts and account lockout
 * to prevent brute force attacks
 *
 * Security feature: Lock account after 5 failed attempts for 15 minutes
 */
export class AddLoginLockoutFields1731770000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER DEFAULT 0 NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "account_locked_until" TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "last_failed_login_at" TIMESTAMP WITH TIME ZONE
    `);

    // Add index for efficient lockout checks
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_account_locked_until"
      ON "users"("account_locked_until")
      WHERE "account_locked_until" IS NOT NULL
    `);

    // Add comment for documentation
    await queryRunner.query(`
      COMMENT ON COLUMN "users"."failed_login_attempts" IS
      'Number of consecutive failed login attempts (resets on successful login)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "users"."account_locked_until" IS
      'Account locked until this timestamp (NULL if not locked). Locked after 5 failed attempts for 15 minutes.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "users"."last_failed_login_at" IS
      'Timestamp of last failed login attempt for auditing'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_account_locked_until"
    `);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "last_failed_login_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "account_locked_until"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "failed_login_attempts"
    `);
  }
}
