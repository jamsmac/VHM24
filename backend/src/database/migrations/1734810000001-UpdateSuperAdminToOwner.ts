import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration Part 2: Update SuperAdmin to Owner in data
 *
 * This migration runs after 1734810000000-RenameSuperAdminToOwner
 * which added the 'Owner' enum value.
 */
export class UpdateSuperAdminToOwner1734810000001 implements MigrationInterface {
  name = 'UpdateSuperAdminToOwner1734810000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Update existing users with 'SuperAdmin' role to 'Owner'
    await queryRunner.query(`
      UPDATE users SET role = 'Owner' WHERE role = 'SuperAdmin'
    `);

    // Step 2: Update the roles table
    await queryRunner.query(`
      UPDATE roles
      SET name = 'Owner',
          description = 'Full system access - Owner of the system. Can manage everything including admins.',
          updated_at = NOW()
      WHERE name = 'SuperAdmin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Update users back to SuperAdmin
    await queryRunner.query(`
      UPDATE users SET role = 'SuperAdmin' WHERE role = 'Owner'
    `);

    // Update the roles table back
    await queryRunner.query(`
      UPDATE roles
      SET name = 'SuperAdmin',
          description = 'Full system access - God mode. Can manage everything including other admins.',
          updated_at = NOW()
      WHERE name = 'Owner'
    `);
  }
}
