/**
 * E2E Test Seed Data
 *
 * Creates test users and data required for E2E tests.
 * This runs before E2E tests to ensure consistent test data.
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface E2ESeedData {
  adminId: string;
  operatorId: string;
  organizationId: string;
  locationId: string;
  machineId: string;
}

/**
 * Seed E2E test data
 */
export async function seedE2EData(dataSource: DataSource): Promise<E2ESeedData> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Generate UUIDs
    const adminId = uuidv4();
    const operatorId = uuidv4();
    const organizationId = uuidv4();
    const locationId = uuidv4();
    const machineId = uuidv4();

    // Hash passwords
    const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
    const operatorPasswordHash = await bcrypt.hash('OperatorPassword123!', 10);

    // 1. Create organization
    await queryRunner.query(
      `INSERT INTO organizations (id, name, code, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (code) DO NOTHING`,
      [organizationId, 'Test Organization', 'TEST-ORG', 'active'],
    );

    // Get actual organization ID (in case it already existed)
    const orgResult = await queryRunner.query(
      `SELECT id FROM organizations WHERE code = $1`,
      ['TEST-ORG'],
    );
    const actualOrgId = orgResult[0]?.id || organizationId;

    // 2. Create admin user
    await queryRunner.query(
      `INSERT INTO users (
        id, email, password_hash, full_name, role, status,
        organization_id, is_2fa_enabled, requires_password_change,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET
         password_hash = $3,
         status = $6,
         requires_password_change = $9`,
      [
        adminId,
        'admin@vendhub.local',
        adminPasswordHash,
        'E2E Test Admin',
        'Admin',
        'active',
        actualOrgId,
        false,
        false,
      ],
    );

    // Get actual admin ID
    const adminResult = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      ['admin@vendhub.local'],
    );
    const actualAdminId = adminResult[0]?.id || adminId;

    // 3. Create operator user
    await queryRunner.query(
      `INSERT INTO users (
        id, email, password_hash, full_name, role, status,
        organization_id, is_2fa_enabled, requires_password_change,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET
         password_hash = $3,
         status = $6`,
      [
        operatorId,
        'operator@vendhub.local',
        operatorPasswordHash,
        'E2E Test Operator',
        'Operator',
        'active',
        actualOrgId,
        false,
        false,
      ],
    );

    // Get actual operator ID
    const operatorResult = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      ['operator@vendhub.local'],
    );
    const actualOperatorId = operatorResult[0]?.id || operatorId;

    // 4. Create location
    await queryRunner.query(
      `INSERT INTO locations (
        id, name, address, organization_id, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [locationId, 'E2E Test Location', '123 Test Street', actualOrgId, 'active'],
    );

    // Get or create location
    let actualLocationId = locationId;
    const locResult = await queryRunner.query(
      `SELECT id FROM locations WHERE name = $1 AND organization_id = $2`,
      ['E2E Test Location', actualOrgId],
    );
    if (locResult.length > 0) {
      actualLocationId = locResult[0].id;
    }

    // 5. Create machine
    await queryRunner.query(
      `INSERT INTO machines (
        id, machine_number, name, status, location_id, organization_id,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (machine_number) DO NOTHING`,
      [machineId, 'E2E-001', 'E2E Test Machine', 'active', actualLocationId, actualOrgId],
    );

    // Get actual machine ID
    const machineResult = await queryRunner.query(
      `SELECT id FROM machines WHERE machine_number = $1`,
      ['E2E-001'],
    );
    const actualMachineId = machineResult[0]?.id || machineId;

    await queryRunner.commitTransaction();

    console.log('✅ E2E seed data created:');
    console.log(`   Admin: admin@vendhub.local / AdminPassword123!`);
    console.log(`   Operator: operator@vendhub.local / OperatorPassword123!`);
    console.log(`   Machine: E2E-001`);

    return {
      adminId: actualAdminId,
      operatorId: actualOperatorId,
      organizationId: actualOrgId,
      locationId: actualLocationId,
      machineId: actualMachineId,
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ E2E seed failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Clean up E2E test data
 */
export async function cleanupE2EData(dataSource: DataSource): Promise<void> {
  try {
    // Delete in reverse order of dependencies
    await dataSource.query(`DELETE FROM tasks WHERE machine_id IN (SELECT id FROM machines WHERE machine_number LIKE 'E2E%')`);
    await dataSource.query(`DELETE FROM machines WHERE machine_number LIKE 'E2E%'`);
    await dataSource.query(`DELETE FROM locations WHERE name LIKE 'E2E%'`);
    await dataSource.query(`DELETE FROM users WHERE email LIKE '%@vendhub.local'`);
    await dataSource.query(`DELETE FROM organizations WHERE code = 'TEST-ORG'`);
    console.log('✅ E2E test data cleaned up');
  } catch (error) {
    console.warn('⚠️ E2E cleanup warning:', error);
  }
}
