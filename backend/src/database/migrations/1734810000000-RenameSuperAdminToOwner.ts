import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration Part 1: Add 'Owner' to the user role enum
 *
 * PostgreSQL requires a commit between adding an enum value and using it.
 * This migration only adds the enum value.
 * The next migration (1734810000001) will update the data.
 */
export class RenameSuperAdminToOwner1734810000000 implements MigrationInterface {
  name = 'RenameSuperAdminToOwner1734810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add 'Owner' to the enum type
    // Note: This needs to be committed before it can be used in updates
    await queryRunner.query(`
      ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'Owner'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't support removing enum values
    // The 'Owner' value will remain in the enum but unused
  }
}
