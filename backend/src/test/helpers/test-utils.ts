import { Logger } from '@nestjs/common';

/**
 * Test Utilities
 *
 * General-purpose testing helper functions
 */

const logger = new Logger('TestUtils');

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random UUID for testing
 */
export function generateTestUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a random email for testing
 */
export function generateTestEmail(): string {
  const random = Math.random().toString(36).substring(7);
  return `test-${random}@example.com`;
}

/**
 * Generate a random phone number for testing
 */
export function generateTestPhone(): string {
  const random = Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, '0');
  return `+99890${random}`;
}

/**
 * Generate a random machine number
 */
export function generateMachineNumber(): string {
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `M-${random}`;
}

/**
 * Generate a random task number
 */
export function generateTaskNumber(): string {
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `TASK-${random}`;
}

/**
 * Generate a random transaction number
 */
export function generateTransactionNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `TRX-${timestamp}-${random}`;
}

/**
 * Create a date in the past
 */
export function dateInPast(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Create a date in the future
 */
export function dateInFuture(daysAhead: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date;
}

/**
 * Assert that a function throws a specific error
 */
export async function expectToThrow(
  fn: () => Promise<any> | any,
  errorMessage?: string | RegExp,
): Promise<void> {
  let error: Error | null = null;

  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  if (!error) {
    throw new Error('Expected function to throw an error, but it did not');
  }

  if (errorMessage) {
    if (typeof errorMessage === 'string') {
      if (!error.message.includes(errorMessage)) {
        throw new Error(
          `Expected error message to include "${errorMessage}", but got "${error.message}"`,
        );
      }
    } else {
      if (!errorMessage.test(error.message)) {
        throw new Error(
          `Expected error message to match ${errorMessage}, but got "${error.message}"`,
        );
      }
    }
  }
}

/**
 * Assert that an object has specific properties
 */
export function expectToHaveProperties<T extends object>(obj: T, properties: (keyof T)[]): void {
  for (const prop of properties) {
    if (!(prop in obj)) {
      throw new Error(`Expected object to have property "${String(prop)}"`);
    }
  }
}

/**
 * Assert that an array has a specific length
 */
export function expectArrayLength<T>(arr: T[], length: number): void {
  if (arr.length !== length) {
    throw new Error(`Expected array length to be ${length}, but got ${arr.length}`);
  }
}

/**
 * Deep clone an object (useful for test data manipulation)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Create a mock date (useful for consistent timestamps in tests)
 */
export function createMockDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Freeze time at a specific date for testing
 */
export function freezeTime(date: Date): void {
  jest.useFakeTimers();
  jest.setSystemTime(date);
}

/**
 * Restore real timers after freezing
 */
export function unfreezeTime(): void {
  jest.useRealTimers();
}

/**
 * Generate random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random amount in UZS (Uzbekistan Sum)
 */
export function randomAmount(min = 1000, max = 1000000): number {
  return randomInt(min, max);
}

/**
 * Format amount as UZS currency string
 */
export function formatUZS(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} UZS`;
}

/**
 * Strip timestamps from object for easier comparison
 */
export function stripTimestamps<T extends object>(obj: T): Partial<T> {
  const copy = { ...obj };
  delete (copy as any).created_at;
  delete (copy as any).updated_at;
  delete (copy as any).deleted_at;
  return copy;
}

/**
 * Strip IDs from object for easier comparison
 */
export function stripIds<T extends object>(obj: T): Partial<T> {
  const copy = { ...obj };
  delete (copy as any).id;
  return copy;
}

/**
 * Create a matcher for partial object comparison
 */
export function partialMatch<T extends object>(expected: Partial<T>) {
  return expect.objectContaining(expected);
}

/**
 * Wait for all promises to settle (useful in tests with async operations)
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

/**
 * Mock console methods to suppress output during tests
 * Note: This mocks console methods but NestJS Logger should be used in actual code
 */
export function suppressConsole(): {
  restore: () => void;
} {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();

  return {
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    },
  };
}

/**
 * Create a spy on a method
 */
export function spyOn<T extends object, K extends keyof T>(obj: T, method: K): jest.SpyInstance {
  return jest.spyOn(obj, method as any);
}

/**
 * Assert that a mock was called with specific arguments
 */
export function expectCalledWith<T extends (...args: any[]) => any>(
  mockFn: jest.Mock<T>,
  ...expectedArgs: Parameters<T>
): void {
  expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
}

/**
 * Assert that a mock was called N times
 */
export function expectCalledTimes(mockFn: jest.Mock, times: number): void {
  expect(mockFn).toHaveBeenCalledTimes(times);
}

/**
 * Reset all mocks
 */
export function resetAllMocks(): void {
  jest.clearAllMocks();
  jest.resetAllMocks();
}
