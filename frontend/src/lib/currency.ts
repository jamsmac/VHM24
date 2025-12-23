/**
 * Currency configuration and formatting utilities for VendHub Manager
 * Primary currency: UZS (Uzbekistan Som)
 */

export const CURRENCY = {
  code: 'UZS',
  symbol: 'сўм',
  symbolShort: 'сўм',
  locale: 'uz-UZ',
  // Position: 'after' means "10 000 сўм" (not "сўм 10 000")
  position: 'after' as const,
} as const;

export interface FormatCurrencyOptions {
  /** Whether to show the currency symbol. Default: true */
  showSymbol?: boolean;
  /** Whether to use compact notation (K, M). Default: false */
  compact?: boolean;
  /** Number of decimal places. Default: 0 */
  decimals?: number;
}

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(10000) // "10 000 сўм"
 * formatCurrency(1500000, { compact: true }) // "1.5M сўм"
 * formatCurrency(500, { showSymbol: false }) // "500"
 */
export function formatCurrency(
  amount: number | null | undefined,
  options?: FormatCurrencyOptions
): string {
  const { showSymbol = true, compact = false, decimals = 0 } = options || {};

  // Handle null/undefined
  if (amount == null || isNaN(amount)) {
    return showSymbol ? `0 ${CURRENCY.symbol}` : '0';
  }

  let formatted: string;

  if (compact && Math.abs(amount) >= 1_000_000_000) {
    formatted = (amount / 1_000_000_000).toFixed(1) + 'B';
  } else if (compact && Math.abs(amount) >= 1_000_000) {
    formatted = (amount / 1_000_000).toFixed(1) + 'M';
  } else if (compact && Math.abs(amount) >= 1_000) {
    formatted = (amount / 1_000).toFixed(1) + 'K';
  } else {
    formatted = new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  }

  if (showSymbol) {
    return CURRENCY.position === 'after'
      ? `${formatted} ${CURRENCY.symbol}`
      : `${CURRENCY.symbol} ${formatted}`;
  }

  return formatted;
}

/**
 * Parse a currency string back to number
 * @param value - The string to parse (e.g., "10 000 сўм")
 * @returns The numeric value
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;
  // Remove currency symbol and spaces, replace comma with dot
  const cleaned = value
    .replace(CURRENCY.symbol, '')
    .replace(CURRENCY.symbolShort, '')
    .replace(/\s/g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(): string {
  return CURRENCY.symbol;
}

/**
 * Get currency code
 */
export function getCurrencyCode(): string {
  return CURRENCY.code;
}

// Legacy compatibility - keep RUB references working during transition
export const LEGACY_CURRENCY_MAP = {
  RUB: 'UZS',
  '₽': 'сўм',
  'руб': 'сўм',
  'руб.': 'сўм',
} as const;
