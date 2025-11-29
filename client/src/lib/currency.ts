/**
 * Currency formatting utilities for Uzbek Sum (UZS)
 * 
 * UZS is the currency of Uzbekistan
 * 1 USD ≈ 12,500 UZS (approximate)
 * UZS uses no decimal places in common usage
 */

export type Currency = 'UZS' | 'USD' | 'EUR';

export interface CurrencyConfig {
  symbol: string;
  code: string;
  locale: string;
  decimals: number;
}

const currencyConfigs: Record<Currency, CurrencyConfig> = {
  UZS: {
    symbol: 'сум',
    code: 'UZS',
    locale: 'uz-UZ',
    decimals: 0,
  },
  USD: {
    symbol: '$',
    code: 'USD',
    locale: 'en-US',
    decimals: 2,
  },
  EUR: {
    symbol: '€',
    code: 'EUR',
    locale: 'de-DE',
    decimals: 2,
  },
};

/**
 * Format amount as currency
 * @param amount - The amount to format
 * @param currency - Currency type (default: UZS)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: Currency = 'UZS'): string {
  const config = currencyConfigs[currency];
  
  const formatted = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);

  return formatted;
}

/**
 * Format amount as UZS specifically
 * @param amount - The amount to format
 * @returns Formatted UZS string (e.g., "1 234 567 сум")
 */
export function formatUZS(amount: number): string {
  const formatted = new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return formatted;
}

/**
 * Format amount with custom symbol
 * @param amount - The amount to format
 * @param symbol - Currency symbol (default: 'сум')
 * @returns Formatted string
 */
export function formatWithSymbol(amount: number, symbol: string = 'сум'): string {
  const formatted = new Intl.NumberFormat('uz-UZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return `${formatted} ${symbol}`;
}

/**
 * Parse currency string to number
 * @param value - Currency string (e.g., "1 234 567 сум")
 * @returns Parsed number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and extra spaces
  const cleaned = value
    .replace(/[^\d\s.,]/g, '')
    .trim();

  // Replace space and comma with nothing for parsing
  const number = cleaned.replace(/\s/g, '').replace(',', '.');
  
  return parseFloat(number) || 0;
}

/**
 * Convert between currencies (using approximate rates)
 * Note: These are approximate rates and should be updated regularly
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates?: Record<Currency, number>
): number {
  if (from === to) return amount;

  // Default approximate rates (1 unit = X UZS)
  const defaultRates: Record<Currency, number> = {
    UZS: 1,
    USD: 12500,
    EUR: 13500,
  };

  const ratesMap = rates || defaultRates;
  const fromRate = ratesMap[from];
  const toRate = ratesMap[to];

  if (!fromRate || !toRate) {
    throw new Error(`Unknown currency: ${from} or ${to}`);
  }

  // Convert to UZS first, then to target currency
  const inUZS = amount * fromRate;
  return inUZS / toRate;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  return currencyConfigs[currency].symbol;
}

/**
 * Get currency code
 */
export function getCurrencyCode(currency: Currency): string {
  return currencyConfigs[currency].code;
}

/**
 * Format amount for display in tables/lists
 * Shows abbreviated format for large numbers
 */
export function formatCurrencyCompact(amount: number, currency: Currency = 'UZS'): string {
  const absAmount = Math.abs(amount);
  let formatted: string;

  if (absAmount >= 1_000_000_000) {
    formatted = (amount / 1_000_000_000).toFixed(1) + 'B';
  } else if (absAmount >= 1_000_000) {
    formatted = (amount / 1_000_000).toFixed(1) + 'M';
  } else if (absAmount >= 1_000) {
    formatted = (amount / 1_000).toFixed(1) + 'K';
  } else {
    formatted = amount.toFixed(0);
  }

  return `${formatted} ${getCurrencySymbol(currency)}`;
}

export default {
  formatCurrency,
  formatUZS,
  formatWithSymbol,
  parseCurrency,
  convertCurrency,
  getCurrencySymbol,
  getCurrencyCode,
  formatCurrencyCompact,
};
