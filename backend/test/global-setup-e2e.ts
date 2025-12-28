/**
 * Jest Global Setup for E2E Tests
 *
 * Runs once before all E2E tests to:
 * 1. Wait for database connection
 * 2. Seed test data using raw SQL (no entity dependencies)
 */

import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables (no Jest code)
import './env-e2e';

async function waitForDatabase(maxRetries = 30, delayMs = 1000): Promise<Client> {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '25432'),
    user: process.env.DATABASE_USER || 'test',
    password: process.env.DATABASE_PASSWORD || 'test',
    database: process.env.DATABASE_NAME || 'vendhub_test',
  });

  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.connect();
      console.log('✅ Database connected');
      return client;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.log(`⏳ Waiting for database... (${i + 1}/${maxRetries}) - ${errMsg}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Database connection timeout');
}

async function seedE2EData(client: Client): Promise<void> {
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

    // 1. Create organization (if table exists)
    try {
      await client.query(
        `INSERT INTO organizations (id, name, code, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (code) DO NOTHING`,
        [organizationId, 'Test Organization', 'TEST-ORG', 'active'],
      );
    } catch (_e) {
      console.log('  ⚠️ Organizations table may not exist yet');
    }

    // Get organization ID
    let actualOrgId: string | null = null;
    try {
      const orgResult = await client.query(
        `SELECT id FROM organizations WHERE code = $1`,
        ['TEST-ORG'],
      );
      actualOrgId = orgResult.rows[0]?.id || organizationId;
    } catch (_e) {
      // Table doesn't exist, continue without org
    }

    // 2. Create admin user
    await client.query(
      `INSERT INTO users (
        id, email, password_hash, full_name, role, status,
        ${actualOrgId ? 'organization_id,' : ''} is_2fa_enabled, requires_password_change,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, ${actualOrgId ? '$7,' : ''} $${actualOrgId ? 8 : 7}, $${actualOrgId ? 9 : 8}, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET
         password_hash = $3,
         status = $6,
         requires_password_change = $${actualOrgId ? 9 : 8}`,
      actualOrgId
        ? [adminId, 'admin@vendhub.local', adminPasswordHash, 'E2E Test Admin', 'Admin', 'active', actualOrgId, false, false]
        : [adminId, 'admin@vendhub.local', adminPasswordHash, 'E2E Test Admin', 'Admin', 'active', false, false],
    );

    // 3. Create operator user
    await client.query(
      `INSERT INTO users (
        id, email, password_hash, full_name, role, status,
        ${actualOrgId ? 'organization_id,' : ''} is_2fa_enabled, requires_password_change,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, ${actualOrgId ? '$7,' : ''} $${actualOrgId ? 8 : 7}, $${actualOrgId ? 9 : 8}, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET
         password_hash = $3,
         status = $6`,
      actualOrgId
        ? [operatorId, 'operator@vendhub.local', operatorPasswordHash, 'E2E Test Operator', 'Operator', 'active', actualOrgId, false, false]
        : [operatorId, 'operator@vendhub.local', operatorPasswordHash, 'E2E Test Operator', 'Operator', 'active', false, false],
    );

    // 4. Create location (if org exists)
    if (actualOrgId) {
      try {
        await client.query(
          `INSERT INTO locations (id, name, address, organization_id, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [locationId, 'E2E Test Location', '123 Test Street', actualOrgId, 'active'],
        );
      } catch (_e) {
        console.log('  ⚠️ Locations table may not exist yet');
      }
    }

    // 5. Create machine (if location exists)
    if (actualOrgId) {
      try {
        await client.query(
          `INSERT INTO machines (id, machine_number, name, status, location_id, organization_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           ON CONFLICT (machine_number) DO NOTHING`,
          [machineId, 'E2E-001', 'E2E Test Machine', 'active', locationId, actualOrgId],
        );
      } catch (_e) {
        console.log('  ⚠️ Machines table may not exist yet');
      }
    }

    console.log('✅ E2E seed data created:');
    console.log('   Admin: admin@vendhub.local / AdminPassword123!');
    console.log('   Operator: operator@vendhub.local / OperatorPassword123!');
  } catch (error) {
    console.error('❌ E2E seed failed:', error);
    throw error;
  }
}

export default async function globalSetup() {
  console.log('\n🚀 E2E Global Setup Starting...\n');

  try {
    // Connect to database
    const client = await waitForDatabase();

    // Seed test data
    await seedE2EData(client);

    // Close connection
    await client.end();

    console.log('\n✅ E2E Global Setup Complete\n');
  } catch (error) {
    console.error('❌ E2E Global Setup Failed:', error);
    throw error;
  }
}
