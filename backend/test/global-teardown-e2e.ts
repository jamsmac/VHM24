/**
 * Jest Global Teardown for E2E Tests
 *
 * Runs once after all E2E tests.
 * Currently just logs completion - data cleanup is optional.
 */

export default async function globalTeardown() {
  console.log('\n🧹 E2E Global Teardown Complete\n');
}
