/**
 * E2E Test Setup
 *
 * This file sets up required environment variables for E2E tests.
 * Jest loads this file before running tests.
 *
 * To run E2E tests:
 * 1. Start test infrastructure: docker-compose -f docker-compose.test.yml up -d
 * 2. Run tests: npm run test:e2e
 */

// Set required environment variables for E2E tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Database - uses docker-compose.test.yml (port 25432)
process.env.DATABASE_HOST = process.env.DATABASE_HOST || 'localhost';
process.env.DATABASE_PORT = process.env.DATABASE_PORT || '25432';
process.env.DATABASE_USER = process.env.DATABASE_USER || 'test';
process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || 'test';
process.env.DATABASE_NAME = process.env.DATABASE_NAME || 'vendhub_test';

// Enable schema synchronization for tests (auto-creates tables from entities)
process.env.DATABASE_SYNCHRONIZE = 'true';

// Auth secrets
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-e2e-tests';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key-for-e2e';

// Redis - uses docker-compose.test.yml (port 26379)
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '26379';

// Required for TwoFactorAuthService (64 hex chars = 32 bytes for AES-256)
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Disable Telegram bot in tests
process.env.TELEGRAM_BOT_TOKEN = '';

// Increase test timeout for E2E tests
jest.setTimeout(60000);
