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
import Redis from 'ioredis';

// Load environment variables (no Jest code)
import './env-e2e';

/**
 * Clear Redis blacklist to prevent cascade effects from logout tests
 *
 * When logout() is called, it blacklists the user for 7 days.
 * This causes subsequent tests using the same user to fail with 401.
 * Clearing at test start ensures clean state.
 *
 * NOTE: We clear BOTH test Redis (26379) AND production Redis (6379) because:
 * - env-e2e.ts sets process.env.REDIS_PORT = 26379
 * - But NestJS ConfigService reads from .env file which has REDIS_PORT=6379
 * - So the app actually connects to production Redis during E2E tests
 */
async function clearRedisBlacklist(): Promise<void> {
  // Clear both Redis instances to handle ConfigService vs process.env mismatch
  const redisPorts = [26379, 6379];

  for (const port of redisPorts) {
    const redis = new Redis({
      host: 'localhost',
      port,
      maxRetriesPerRequest: 3,
    });

    try {
      const keys = await redis.keys('vendhub:blacklist:*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`  🗑️ Cleared ${keys.length} blacklist keys from Redis:${port}`);
      } else {
        console.log(`  ✓ Redis:${port} blacklist already clean`);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`  ⚠️ Could not clear Redis:${port} blacklist: ${errMsg}`);
    } finally {
      await redis.quit();
    }
  }
}

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
        `INSERT INTO organizations (id, name, slug, type, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         ON CONFLICT (slug) DO NOTHING`,
        [organizationId, 'Test Organization', 'test-org', 'franchise'],
      );
    } catch (_e) {
      console.log('  ⚠️ Organizations table may not exist yet');
    }

    // Get organization ID
    let actualOrgId: string | null = null;
    try {
      const orgResult = await client.query(
        `SELECT id FROM organizations WHERE slug = $1`,
        ['test-org'],
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

    // 4. Create dictionaries for machine types (required for machine creation)
    let machineTypesDictId: string | null = null;
    try {
      const dictId = uuidv4();
      await client.query(
        `INSERT INTO dictionaries (id, code, name_ru, name_en, description, is_active, is_system, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, true, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE SET id = dictionaries.id
         RETURNING id`,
        [dictId, 'machine_types', 'Типы автоматов', 'Machine Types', 'Types of vending machines'],
      );

      // Get the actual dictionary ID
      const dictResult = await client.query(
        `SELECT id FROM dictionaries WHERE code = 'machine_types'`,
      );
      machineTypesDictId = dictResult.rows[0]?.id;

      if (machineTypesDictId) {
        await client.query(
          `INSERT INTO dictionary_items (id, dictionary_id, code, value_ru, value_en, is_active, sort_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, 1, NOW(), NOW())
           ON CONFLICT (dictionary_id, code) DO NOTHING`,
          [uuidv4(), machineTypesDictId, 'coffee_machine', 'Кофейный автомат', 'Coffee Machine'],
        );
        await client.query(
          `INSERT INTO dictionary_items (id, dictionary_id, code, value_ru, value_en, is_active, sort_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, 2, NOW(), NOW())
           ON CONFLICT (dictionary_id, code) DO NOTHING`,
          [uuidv4(), machineTypesDictId, 'vending_machine', 'Вендинговый автомат', 'Vending Machine'],
        );
        console.log('  ✓ Machine types dictionary created');
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.log(`  ⚠️ Machine types dictionary error: ${errMsg}`);
    }

    // 5. Create location_types dictionary for locations
    let locationTypesDictId: string | null = null;
    try {
      const dictId = uuidv4();
      await client.query(
        `INSERT INTO dictionaries (id, code, name_ru, name_en, description, is_active, is_system, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, true, NOW(), NOW())
         ON CONFLICT (code) DO NOTHING`,
        [dictId, 'location_types', 'Типы локаций', 'Location Types', 'Types of business locations'],
      );

      const dictResult = await client.query(
        `SELECT id FROM dictionaries WHERE code = 'location_types'`,
      );
      locationTypesDictId = dictResult.rows[0]?.id;

      if (locationTypesDictId) {
        await client.query(
          `INSERT INTO dictionary_items (id, dictionary_id, code, value_ru, value_en, is_active, sort_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, 1, NOW(), NOW())
           ON CONFLICT (dictionary_id, code) DO NOTHING`,
          [uuidv4(), locationTypesDictId, 'office', 'Офис', 'Office'],
        );
        await client.query(
          `INSERT INTO dictionary_items (id, dictionary_id, code, value_ru, value_en, is_active, sort_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, 2, NOW(), NOW())
           ON CONFLICT (dictionary_id, code) DO NOTHING`,
          [uuidv4(), locationTypesDictId, 'mall', 'ТЦ', 'Mall'],
        );
        console.log('  ✓ Location types dictionary created');
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.log(`  ⚠️ Location types dictionary error: ${errMsg}`);
    }

    // 6. Create location (required fields: name, type_code, city, address)
    try {
      await client.query(
        `INSERT INTO locations (id, name, type_code, city, address, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [locationId, 'E2E Test Location', 'office', 'Tashkent', '123 Test Street'],
      );
    } catch (_e) {
      console.log('  ⚠️ Locations table may not exist yet');
    }

    // 7. Create machine
    try {
      await client.query(
        `INSERT INTO machines (id, machine_number, name, status, location_id, organization_id, type_code, qr_code, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         ON CONFLICT (machine_number) DO NOTHING`,
        [machineId, 'E2E-001', 'E2E Test Machine', 'active', locationId, actualOrgId, 'coffee_machine', 'QR-E2E-001'],
      );
    } catch (_e) {
      console.log('  ⚠️ Machines table may not exist yet');
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
    // Clear Redis blacklist first (prevents cascade effects from previous test runs)
    console.log('🔄 Clearing Redis blacklist...');
    await clearRedisBlacklist();

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
