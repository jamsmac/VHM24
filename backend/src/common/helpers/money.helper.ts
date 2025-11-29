import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

/**
 * Money Helper Service for UZS Currency
 *
 * Provides consistent formatting and parsing of Uzbekistan Sum (UZS) amounts
 * throughout the application including:
 * - API responses
 * - Frontend displays
 * - PDF reports
 * - Telegram bot messages
 *
 * Format: 1 234 567.89 сум
 * - Thousands separated with spaces
 * - Decimal point for fractional amounts
 * - "сум" suffix for UZS
 */
@Injectable()
export class MoneyHelper {
  /**
   * Format amount as UZS with proper spacing and suffix
   *
   * @param amount - Amount to format (number or Decimal)
   * @param options - Formatting options
   * @returns Formatted string like "1 234 567.89 сум"
   *
   * @example
   * formatUZS(1234567.89) => "1 234 567.89 сум"
   * formatUZS(1000000) => "1 000 000 сум"
   * formatUZS(5500.5) => "5 500.50 сум"
   */
  static formatUZS(
    amount: number | Decimal | string,
    options: {
      decimals?: boolean; // Show decimal places (default: true if has decimals)
      symbol?: boolean; // Show currency symbol (default: true)
      compact?: boolean; // Use compact notation for large numbers
    } = {},
  ): string {
    const { decimals = true, symbol = true, compact = false } = options;

    // Convert to number
    let value: number;
    if (typeof amount === 'string') {
      value = parseFloat(amount);
    } else if (typeof amount === 'object' && 'toNumber' in amount) {
      // Handle Decimal type
      value = amount.toNumber();
    } else {
      value = Number(amount);
    }

    // Handle invalid values
    if (isNaN(value)) {
      return symbol ? '0 сум' : '0';
    }

    // Compact notation for large numbers
    if (compact && Math.abs(value) >= 1_000_000) {
      const millions = value / 1_000_000;
      const formatted = new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: millions % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 1,
      }).format(millions);
      return symbol ? `${formatted} млн сум` : `${formatted} млн`;
    }

    // Determine decimal places
    const hasDecimals = value % 1 !== 0;
    const minDecimals = decimals && hasDecimals ? 2 : 0;
    const maxDecimals = decimals ? 2 : 0;

    // Format with Russian locale (uses spaces for thousands)
    const formatted = new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    }).format(value);

    // Add currency symbol
    return symbol ? `${formatted} сум` : formatted;
  }

  /**
   * Parse UZS string to number
   *
   * @param value - String value to parse
   * @returns Parsed number value
   *
   * @example
   * parseUZS("1 234 567.89 сум") => 1234567.89
   * parseUZS("1 000 000") => 1000000
   * parseUZS("5,500.50 сум") => 5500.5
   */
  static parseUZS(value: string): number {
    if (!value || typeof value !== 'string') {
      return 0;
    }

    // Remove currency symbols and text
    let cleaned = value
      .replace(/сум/gi, '')
      .replace(/sum/gi, '')
      .replace(/uzs/gi, '')
      .replace(/млн/gi, '')
      .replace(/million/gi, '')
      .trim();

    // Handle millions
    const isMillions = value.includes('млн') || value.includes('million');

    // Replace different thousand separators with nothing
    cleaned = cleaned
      .replace(/\s/g, '') // Remove spaces (Russian format)
      .replace(/,(\d{3})/g, '$1'); // Remove commas used as thousand separator

    // Replace comma with dot for decimal (European format)
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      cleaned = cleaned.replace(',', '.');
    }

    const parsed = parseFloat(cleaned);

    if (isNaN(parsed)) {
      return 0;
    }

    // If it was in millions, multiply back
    if (isMillions) {
      return parsed * 1_000_000;
    }

    return parsed;
  }

  /**
   * Format amount for database storage (as Decimal)
   *
   * @param amount - Amount to prepare for storage
   * @returns Decimal instance
   */
  static toDecimal(amount: number | string): Decimal {
    const value = typeof amount === 'string' ? this.parseUZS(amount) : amount;
    return new Decimal(value);
  }

  /**
   * Format amount for API response
   *
   * @param amount - Amount from database
   * @returns Formatted object for API response
   */
  static toApiResponse(amount: number | Decimal | string): {
    value: number;
    formatted: string;
    currency: string;
  } {
    const value =
      typeof amount === 'object' && 'toNumber' in amount
        ? amount.toNumber()
        : typeof amount === 'string'
          ? parseFloat(amount)
          : Number(amount);

    return {
      value,
      formatted: this.formatUZS(value),
      currency: 'UZS',
    };
  }

  /**
   * Format amount for display in tables/lists (compact)
   *
   * @param amount - Amount to format
   * @returns Compact formatted string
   *
   * @example
   * formatCompact(1234567) => "1.2 млн"
   * formatCompact(999999) => "999 999"
   */
  static formatCompact(amount: number | Decimal | string): string {
    return this.formatUZS(amount, { compact: true, symbol: false });
  }

  /**
   * Format amount range
   *
   * @param min - Minimum amount
   * @param max - Maximum amount
   * @returns Formatted range string
   *
   * @example
   * formatRange(100000, 500000) => "100 000 - 500 000 сум"
   */
  static formatRange(min: number | Decimal | string, max: number | Decimal | string): string {
    const minFormatted = this.formatUZS(min, { symbol: false });
    const maxFormatted = this.formatUZS(max, { symbol: false });
    return `${minFormatted} - ${maxFormatted} сум`;
  }

  /**
   * Calculate percentage of amount
   *
   * @param amount - Base amount
   * @param percentage - Percentage value (0-100)
   * @returns Calculated amount
   *
   * @example
   * calculatePercentage(100000, 10) => 10000
   */
  static calculatePercentage(amount: number | Decimal, percentage: number): number {
    const value =
      typeof amount === 'object' && 'toNumber' in amount ? amount.toNumber() : Number(amount);

    return (value * percentage) / 100;
  }

  /**
   * Round amount to nearest denomination
   * In Uzbekistan, the smallest coin is 50 sum
   *
   * @param amount - Amount to round
   * @param denomination - Denomination to round to (default: 50)
   * @returns Rounded amount
   *
   * @example
   * roundToDenomination(1234) => 1250
   * roundToDenomination(1225) => 1200
   */
  static roundToDenomination(amount: number, denomination: number = 50): number {
    return Math.round(amount / denomination) * denomination;
  }

  /**
   * Validate if string is a valid money amount
   *
   * @param value - String to validate
   * @returns True if valid money amount
   */
  static isValidAmount(value: string): boolean {
    const parsed = this.parseUZS(value);
    return !isNaN(parsed) && parsed >= 0;
  }

  /**
   * Compare two amounts
   *
   * @param amount1 - First amount
   * @param amount2 - Second amount
   * @returns -1 if amount1 < amount2, 0 if equal, 1 if amount1 > amount2
   */
  static compare(amount1: number | Decimal | string, amount2: number | Decimal | string): number {
    const value1 = typeof amount1 === 'string' ? this.parseUZS(amount1) : Number(amount1);
    const value2 = typeof amount2 === 'string' ? this.parseUZS(amount2) : Number(amount2);

    if (value1 < value2) return -1;
    if (value1 > value2) return 1;
    return 0;
  }

  /**
   * Sum multiple amounts
   *
   * @param amounts - Array of amounts to sum
   * @returns Total sum
   */
  static sum(amounts: Array<number | Decimal | string>): number {
    let total = 0;
    for (const amount of amounts) {
      const value: number =
        typeof amount === 'string'
          ? this.parseUZS(amount)
          : amount instanceof Decimal
            ? amount.toNumber()
            : Number(amount);
      total += value;
    }
    return total;
  }

  /**
   * Format for Telegram bot messages
   *
   * @param amount - Amount to format
   * @param bold - Use bold formatting
   * @returns Formatted string for Telegram
   */
  static formatForTelegram(amount: number | Decimal | string, bold: boolean = false): string {
    const formatted = this.formatUZS(amount);
    return bold ? `*${formatted}*` : formatted;
  }

  /**
   * Format for PDF reports
   *
   * @param amount - Amount to format
   * @returns Formatted string for PDF
   */
  static formatForPDF(amount: number | Decimal | string): string {
    // PDF reports should show full precision
    return this.formatUZS(amount, { decimals: true });
  }

  /**
   * Format for Excel export
   *
   * @param amount - Amount to format
   * @returns Number value for Excel (no formatting)
   */
  static formatForExcel(amount: number | Decimal | string): number {
    if (typeof amount === 'string') {
      return this.parseUZS(amount);
    }
    if (typeof amount === 'object' && 'toNumber' in amount) {
      return amount.toNumber();
    }
    return Number(amount);
  }
}
