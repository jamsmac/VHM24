import { describe, it, expect } from 'vitest';
import UzbekValidators from './uzbekValidators';

describe('UzbekValidators', () => {
  describe('Phone Validation', () => {
    it('should validate correct Uzbek phone numbers', () => {
      expect(UzbekValidators.isValidPhone('+998901234567')).toBe(true);
      expect(UzbekValidators.isValidPhone('+998911234567')).toBe(true);
      expect(UzbekValidators.isValidPhone('+998921234567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(UzbekValidators.isValidPhone('998901234567')).toBe(false); // Missing +
      expect(UzbekValidators.isValidPhone('+998901234')).toBe(false); // Too short
      expect(UzbekValidators.isValidPhone('+998901234567890')).toBe(false); // Too long
      expect(UzbekValidators.isValidPhone('+79991234567')).toBe(false); // Russian format
    });

    it('should format phone numbers correctly', () => {
      expect(UzbekValidators.formatPhone('998901234567')).toBe('+998901234567');
      expect(UzbekValidators.formatPhone('+998901234567')).toBe('+998901234567');
    });
  });

  describe('INN Validation', () => {
    it('should validate correct INN numbers', () => {
      expect(UzbekValidators.isValidINN('123456789')).toBe(true); // 9 digits
      expect(UzbekValidators.isValidINN('12345678901234')).toBe(true); // 14 digits
    });

    it('should reject invalid INN numbers', () => {
      expect(UzbekValidators.isValidINN('12345678')).toBe(false); // Too short
      expect(UzbekValidators.isValidINN('1234567890')).toBe(false); // Wrong length
      expect(UzbekValidators.isValidINN('123456789012345')).toBe(false); // Too long
      expect(UzbekValidators.isValidINN('12345678a')).toBe(false); // Contains letter
    });
  });

  describe('Bank Account Validation', () => {
    it('should validate correct bank accounts', () => {
      expect(UzbekValidators.isValidBankAccount('12345678901234567890')).toBe(true);
      expect(UzbekValidators.isValidBankAccount('00000000000000000000')).toBe(true);
    });

    it('should reject invalid bank accounts', () => {
      expect(UzbekValidators.isValidBankAccount('1234567890123456789')).toBe(false); // 19 digits
      expect(UzbekValidators.isValidBankAccount('123456789012345678901')).toBe(false); // 21 digits
      expect(UzbekValidators.isValidBankAccount('1234567890123456789a')).toBe(false); // Contains letter
    });
  });

  describe('Bank MFO Validation', () => {
    it('should validate correct MFO codes', () => {
      expect(UzbekValidators.isValidBankMFO('12345')).toBe(true);
      expect(UzbekValidators.isValidBankMFO('00001')).toBe(true);
    });

    it('should reject invalid MFO codes', () => {
      expect(UzbekValidators.isValidBankMFO('1234')).toBe(false); // Too short
      expect(UzbekValidators.isValidBankMFO('123456')).toBe(false); // Too long
      expect(UzbekValidators.isValidBankMFO('1234a')).toBe(false); // Contains letter
    });
  });

  describe('Postal Code Validation', () => {
    it('should validate correct postal codes', () => {
      expect(UzbekValidators.isValidPostalCode('100000')).toBe(true);
      expect(UzbekValidators.isValidPostalCode('700000')).toBe(true);
    });

    it('should reject invalid postal codes', () => {
      expect(UzbekValidators.isValidPostalCode('10000')).toBe(false); // Too short
      expect(UzbekValidators.isValidPostalCode('1000000')).toBe(false); // Too long
      expect(UzbekValidators.isValidPostalCode('10000a')).toBe(false); // Contains letter
    });
  });

  describe('Passport Series Validation', () => {
    it('should validate correct passport series', () => {
      expect(UzbekValidators.isValidPassportSeries('AB1234567')).toBe(true);
      expect(UzbekValidators.isValidPassportSeries('ZZ9999999')).toBe(true);
    });

    it('should reject invalid passport series', () => {
      expect(UzbekValidators.isValidPassportSeries('AB123456')).toBe(false); // Too short
      expect(UzbekValidators.isValidPassportSeries('AB12345678')).toBe(false); // Too long
      expect(UzbekValidators.isValidPassportSeries('ab1234567')).toBe(false); // Lowercase
      expect(UzbekValidators.isValidPassportSeries('A11234567')).toBe(false); // Only 1 letter
    });
  });

  describe('Vehicle Plate Validation', () => {
    it('should validate correct vehicle plates', () => {
      expect(UzbekValidators.isValidVehiclePlate('01ABC123')).toBe(true);
      expect(UzbekValidators.isValidVehiclePlate('10XYZ999')).toBe(true);
      expect(UzbekValidators.isValidVehiclePlate('95ZZZ000')).toBe(true);
    });

    it('should reject invalid vehicle plates', () => {
      expect(UzbekValidators.isValidVehiclePlate('99ABC123')).toBe(false); // Invalid region
      expect(UzbekValidators.isValidVehiclePlate('01abc123')).toBe(false); // Lowercase
      expect(UzbekValidators.isValidVehiclePlate('01AB123')).toBe(false); // Too short
      expect(UzbekValidators.isValidVehiclePlate('01ABCD123')).toBe(false); // Too many letters
    });
  });

  describe('Date Parsing', () => {
    it('should parse valid Uzbek dates', () => {
      const date = UzbekValidators.parseUzbekDate('15.06.2023');
      expect(date).not.toBeNull();
      expect(date?.getDate()).toBe(15);
      expect(date?.getMonth()).toBe(5); // 0-indexed
      expect(date?.getFullYear()).toBe(2023);
    });

    it('should reject invalid dates', () => {
      expect(UzbekValidators.parseUzbekDate('32.01.2023')).toBeNull(); // Invalid day
      expect(UzbekValidators.parseUzbekDate('15.13.2023')).toBeNull(); // Invalid month
      expect(UzbekValidators.parseUzbekDate('15/06/2023')).toBeNull(); // Wrong format
    });

    it('should format dates correctly', () => {
      const date = new Date(2023, 5, 15); // June 15, 2023
      expect(UzbekValidators.formatUzbekDate(date)).toBe('15.06.2023');
    });
  });

  describe('Currency Formatting', () => {
    it('should format UZS amounts correctly', () => {
      const formatted = UzbekValidators.formatUZS(1000000);
      // UZS formatting uses Uzbek locale
      expect(formatted).toBeTruthy();
      expect(formatted).toContain('1');
    });
  });

  describe('Region Names', () => {
    it('should return correct region names', () => {
      expect(UzbekValidators.getRegionName('01')).toBe('Tashkent City');
      expect(UzbekValidators.getRegionName('10')).toBe('Tashkent Region');
      expect(UzbekValidators.getRegionName('99')).toBe('Unknown Region');
    });
  });

  describe('Batch Validation', () => {
    it('should validate all Uzbek data correctly', () => {
      const validData = {
        phone: '+998901234567',
        inn: '123456789',
        bankAccount: '12345678901234567890',
        bankMFO: '12345',
      };

      const result = UzbekValidators.validateUzbekData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect all validation errors', () => {
      const invalidData = {
        phone: '998901234567', // Missing +
        inn: '12345', // Wrong length
        bankAccount: '123456789012345678', // Too short
      };

      const result = UzbekValidators.validateUzbekData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
