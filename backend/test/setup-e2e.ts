/**
 * E2E Test Setup
 *
 * This file is loaded by Jest after the test environment is set up.
 * It imports environment variables and sets Jest-specific configuration.
 *
 * To run E2E tests:
 * 1. Start test infrastructure: docker-compose -f docker-compose.test.yml up -d
 * 2. Run tests: npm run test:e2e
 */

// Load environment variables (no Jest code in this file)
import './env-e2e';

// Jest-specific configuration
jest.setTimeout(60000);
