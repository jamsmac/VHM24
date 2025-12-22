import { MigrationInterface, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('FixOwnerRoleAndUserLink1734820000000');

/**
 * Migration: Fix Owner Role and User Link
 *
 * This migration ensures:
 * 1. Owner role exists in the roles table
 * 2. Admin user (admin@vendhub.com) is linked to Owner role via user_roles
 *
 * This fixes the issue where INSERT 0 0 occurs when trying to link user to Owner role.
 */
export class FixOwnerRoleAndUserLink1734820000000 implements MigrationInterface {
  name = 'FixOwnerRoleAndUserLink1734820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.log('🔧 Fixing Owner role and user link...');

    // Step 1: Check if Owner role exists
    const ownerRoleCheck = await queryRunner.query(`
      SELECT id, name, description FROM roles WHERE name = 'Owner'
    `);

    let ownerRoleId: string;

    if (ownerRoleCheck.length === 0) {
      // Owner role doesn't exist, create it
      logger.log('  📝 Creating Owner role...');
      const insertResult = await queryRunner.query(`
        INSERT INTO roles (id, name, description, is_active, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          'Owner',
          'Full system access - Owner of the system. Can manage everything including admins.',
          true,
          NOW(),
          NOW()
        )
        RETURNING id
      `);
      ownerRoleId = insertResult[0].id;
      logger.log(`  ✅ Owner role created with id: ${ownerRoleId}`);
    } else {
      ownerRoleId = ownerRoleCheck[0].id;
      logger.log(`  ✅ Owner role already exists with id: ${ownerRoleId}`);
    }

    // Step 2: Find admin/owner user
    // Try multiple strategies to find the user:
    // 1. By email admin@vendhub.com
    // 2. By role enum 'Owner' or 'SuperAdmin'
    // 3. Any user with Owner role enum (first one found)
    
    let adminUserCheck = await queryRunner.query(`
      SELECT id, email, role, full_name FROM users WHERE email = 'admin@vendhub.com'
    `);

    if (adminUserCheck.length === 0) {
      logger.warn('  ⚠️  User with email admin@vendhub.com not found. Trying to find user with Owner/SuperAdmin role...');
      
      // Try to find user with Owner or SuperAdmin role enum
      adminUserCheck = await queryRunner.query(`
        SELECT id, email, role, full_name 
        FROM users 
        WHERE role IN ('Owner', 'SuperAdmin')
        ORDER BY created_at ASC
        LIMIT 1
      `);
    }

    if (adminUserCheck.length === 0) {
      logger.warn('  ⚠️  No user with Owner/SuperAdmin role found.');
      logger.warn('  💡 To link a user to Owner role manually, run:');
      logger.warn('     psql $DATABASE_URL -f src/database/scripts/fix-owner-role.sql');
      logger.warn('     (Update the email in the script to match your user)');
      return;
    }

    const adminUserId = adminUserCheck[0].id;
    const adminEmail = adminUserCheck[0].email;
    logger.log(`  ✅ Found user: ${adminEmail} (id: ${adminUserId}, role enum: ${adminUserCheck[0].role})`);

    // Step 3: Check if user-role link already exists
    const existingLink = await queryRunner.query(`
      SELECT user_id, role_id FROM user_roles 
      WHERE user_id = '${adminUserId}' AND role_id = '${ownerRoleId}'
    `);

    if (existingLink.length > 0) {
      logger.log('  ✅ User-role link already exists');
      return;
    }

    // Step 4: Create user-role link
    logger.log('  📝 Creating user-role link...');
    // Note: user_roles table may not have updated_at column, only created_at
    const linkResult = await queryRunner.query(`
      INSERT INTO user_roles (user_id, role_id, created_at)
      VALUES ('${adminUserId}', '${ownerRoleId}', NOW())
      ON CONFLICT (user_id, role_id) DO NOTHING
      RETURNING user_id, role_id
    `);

    if (linkResult.length > 0) {
      logger.log('  ✅ User-role link created successfully');
    } else {
      logger.warn('  ⚠️  User-role link already exists (ON CONFLICT triggered)');
    }

    // Step 5: Verify the fix
    const verification = await queryRunner.query(`
      SELECT 
        u.id as user_id,
        u.email,
        u.role as user_role_enum,
        r.id as role_id,
        r.name as rbac_role_name,
        r.description as role_description
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = '${adminUserId}'
    `);

    logger.log('  📊 Verification result:');
    logger.log(`     User: ${verification[0]?.email || 'not found'}`);
    logger.log(`     User role enum: ${verification[0]?.user_role_enum || 'not set'}`);
    logger.log(`     RBAC role: ${verification[0]?.rbac_role_name || 'not linked'}`);
    logger.log(`     Role description: ${verification[0]?.role_description || 'N/A'}`);

    if (verification[0]?.rbac_role_name === 'Owner') {
      logger.log('  ✅ Fix completed successfully!');
    } else {
      logger.warn('  ⚠️  Fix may not have completed correctly. Please verify manually.');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    logger.log('🔄 Reverting Owner role and user link fix...');

    // Remove user-role link for admin user
    await queryRunner.query(`
      DELETE FROM user_roles ur
      USING users u, roles r
      WHERE ur.user_id = u.id 
        AND ur.role_id = r.id
        AND u.email = 'admin@vendhub.com'
        AND r.name = 'Owner'
    `);

    logger.log('  ✅ User-role link removed');
    // Note: We don't delete the Owner role as it might be used by other users
  }
}

