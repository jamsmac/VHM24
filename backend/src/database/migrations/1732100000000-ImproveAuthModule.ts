import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration for Auth Module improvements
 *
 * This migration is empty because all required fields already exist:
 * - User.roles relation (many-to-many with Role)
 * - User.status (ACTIVE, INACTIVE, SUSPENDED)
 * - User.account_locked_until
 * - User.requires_password_change
 * - User.settings (jsonb)
 *
 * All improvements were done at the application level
 */
export class ImproveAuthModule1732100000000 implements MigrationInterface {
  name = 'ImproveAuthModule1732100000000';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // All required database fields already exist
    // This migration is for documentation purposes
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Nothing to revert
  }
}
