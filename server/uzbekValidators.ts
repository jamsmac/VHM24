/**
 * Uzbekistan-specific validators
 * 
 * Validates data according to Uzbek standards:
 * - Phone numbers: +998 format
 * - INN: 9 digits (companies) or 14 digits (individuals)
 * - Bank accounts: 20 digits
 * - Bank MFO: 5 digits
 * - Postal codes: 6 digits
 * - Passport series: 2 letters + 7 digits
 * - Vehicle plates: Regional code + 3 letters + 3 digits
 */

export class UzbekValidators {
  /**
   * Validate Uzbek phone number format: +998XXXXXXXXX
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+998\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate INN (Identification Number)
   * 9 digits for companies, 14 digits for individuals
   */
  static isValidINN(inn: string): boolean {
    const innRegex = /^(\d{9}|\d{14})$/;
    return innRegex.test(inn);
  }

  /**
   * Validate bank account number: 20 digits
   */
  static isValidBankAccount(account: string): boolean {
    const accountRegex = /^\d{20}$/;
    return accountRegex.test(account);
  }

  /**
   * Validate bank MFO code: 5 digits
   */
  static isValidBankMFO(mfo: string): boolean {
    const mfoRegex = /^\d{5}$/;
    return mfoRegex.test(mfo);
  }

  /**
   * Validate postal code: 6 digits
   */
  static isValidPostalCode(code: string): boolean {
    const codeRegex = /^\d{6}$/;
    return codeRegex.test(code);
  }

  /**
   * Validate passport series: 2 letters + 7 digits (e.g., AB1234567)
   */
  static isValidPassportSeries(series: string): boolean {
    const seriesRegex = /^[A-Z]{2}\d{7}$/;
    return seriesRegex.test(series);
  }

  /**
   * Validate vehicle registration plate
   * Format: Regional code (2 digits) + 3 letters + 3 digits + UZ
   * Example: 01ABC123UZ
   */
  static isValidVehiclePlate(plate: string): boolean {
    const plateRegex = /^(01|10|20|25|30|40|50|60|70|75|80|85|90|95)[A-Z]{3}\d{3}$/;
    return plateRegex.test(plate);
  }

  /**
   * Format phone number to standard format
   */
  static formatPhone(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // If starts with 998, add +
    if (digits.startsWith('998')) {
      return '+' + digits;
    }
    
    // If starts with 9 (local format), convert to +998
    if (digits.startsWith('9')) {
      return '+998' + digits.substring(1);
    }
    
    return phone;
  }

  /**
   * Format amount with UZS currency
   * UZS uses 2 decimal places
   */
  static formatUZS(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  }

  /**
   * Parse Uzbek date format DD.MM.YYYY
   */
  static parseUzbekDate(dateStr: string): Date | null {
    const regex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    const match = dateStr.match(regex);
    
    if (!match) return null;
    
    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Validate date
    if (date.getDate() !== parseInt(day)) return null;
    if (date.getMonth() !== parseInt(month) - 1) return null;
    if (date.getFullYear() !== parseInt(year)) return null;
    
    return date;
  }

  /**
   * Format date to Uzbek format DD.MM.YYYY
   */
  static formatUzbekDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  /**
   * Get Uzbek region name by code
   */
  static getRegionName(code: string): string {
    const regions: Record<string, string> = {
      '01': 'Tashkent City',
      '10': 'Tashkent Region',
      '20': 'Bukhara Region',
      '25': 'Navoi Region',
      '30': 'Samarkand Region',
      '40': 'Kashkadarya Region',
      '50': 'Surkhandarya Region',
      '60': 'Andijan Region',
      '70': 'Fergana Region',
      '75': 'Namangan Region',
      '80': 'Khorezm Region',
      '85': 'Karakalpakstan',
      '90': 'Jizzakh Region',
      '95': 'Syrdarya Region',
    };
    return regions[code] || 'Unknown Region';
  }

  /**
   * Validate all Uzbek-specific fields
   */
  static validateUzbekData(data: {
    phone?: string;
    inn?: string;
    bankAccount?: string;
    bankMFO?: string;
    postalCode?: string;
    passportSeries?: string;
    vehiclePlate?: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Invalid phone number format. Use +998XXXXXXXXX');
    }

    if (data.inn && !this.isValidINN(data.inn)) {
      errors.push('Invalid INN. Must be 9 or 14 digits');
    }

    if (data.bankAccount && !this.isValidBankAccount(data.bankAccount)) {
      errors.push('Invalid bank account. Must be 20 digits');
    }

    if (data.bankMFO && !this.isValidBankMFO(data.bankMFO)) {
      errors.push('Invalid bank MFO. Must be 5 digits');
    }

    if (data.postalCode && !this.isValidPostalCode(data.postalCode)) {
      errors.push('Invalid postal code. Must be 6 digits');
    }

    if (data.passportSeries && !this.isValidPassportSeries(data.passportSeries)) {
      errors.push('Invalid passport series. Format: 2 letters + 7 digits');
    }

    if (data.vehiclePlate && !this.isValidVehiclePlate(data.vehiclePlate)) {
      errors.push('Invalid vehicle plate format');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default UzbekValidators;
