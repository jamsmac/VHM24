/**
 * E2E Test Setup
 *
 * This file sets up required environment variables for E2E tests.
 * Jest loads this file before running tests.
 */

// Set required environment variables for E2E tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_HOST = process.env.DATABASE_HOST || 'localhost';
process.env.DATABASE_PORT = process.env.DATABASE_PORT || '5432';
process.env.DATABASE_USER = process.env.DATABASE_USER || 'test';
process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || 'test';
process.env.DATABASE_NAME = process.env.DATABASE_NAME || 'vendhub_test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-key-for-e2e-tests';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key-for-e2e';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

// Required for TwoFactorAuthService (64 hex chars = 32 bytes for AES-256)
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Increase test timeout for E2E tests
jest.setTimeout(60000);
