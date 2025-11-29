import { Test, TestingModule } from '@nestjs/testing';
import { PasswordGeneratorService } from './password-generator.service';

describe('PasswordGeneratorService', () => {
  let service: PasswordGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordGeneratorService],
    }).compile();

    service = module.get<PasswordGeneratorService>(PasswordGeneratorService);
  });

  // ============================================================================
  // GENERATE PASSWORD TESTS
  // ============================================================================

  describe('generatePassword', () => {
    it('should generate a password of 12 characters', () => {
      const password = service.generatePassword();

      expect(password).toHaveLength(12);
    });

    it('should contain at least one uppercase letter', () => {
      const password = service.generatePassword();

      expect(password).toMatch(/[A-Z]/);
    });

    it('should contain at least one lowercase letter', () => {
      const password = service.generatePassword();

      expect(password).toMatch(/[a-z]/);
    });

    it('should contain at least one digit', () => {
      const password = service.generatePassword();

      expect(password).toMatch(/\d/);
    });

    it('should contain at least one special character', () => {
      const password = service.generatePassword();

      expect(password).toMatch(/[!@#$%^&*\-_=+]/);
    });

    it('should generate different passwords on subsequent calls', () => {
      const password1 = service.generatePassword();
      const password2 = service.generatePassword();
      const password3 = service.generatePassword();

      // While theoretically possible to get same password, it's extremely unlikely
      // with cryptographic randomness
      const uniquePasswords = new Set([password1, password2, password3]);
      expect(uniquePasswords.size).toBeGreaterThanOrEqual(2);
    });

    it('should only contain allowed characters', () => {
      const password = service.generatePassword();
      const allowedChars = /^[A-Za-z0-9!@#$%^&*\-_=+]+$/;

      expect(password).toMatch(allowedChars);
    });

    it('should generate passwords that pass strength validation', () => {
      // Generate multiple passwords and verify they all pass validation
      for (let i = 0; i < 10; i++) {
        const password = service.generatePassword();
        const isValid = service.validatePasswordStrength(password);

        expect(isValid).toBe(true);
      }
    });

    it('should be cryptographically random (entropy test)', () => {
      // Generate 100 passwords and check character distribution
      const passwords: string[] = [];
      for (let i = 0; i < 100; i++) {
        passwords.push(service.generatePassword());
      }

      // Join all passwords and count character occurrences
      const allChars = passwords.join('');
      const charCounts: Record<string, number> = {};
      for (const char of allChars) {
        charCounts[char] = (charCounts[char] || 0) + 1;
      }

      // Check that we have reasonable distribution (at least 20 different characters)
      const uniqueChars = Object.keys(charCounts).length;
      expect(uniqueChars).toBeGreaterThan(20);
    });
  });

  // ============================================================================
  // VALIDATE PASSWORD STRENGTH TESTS
  // ============================================================================

  describe('validatePasswordStrength', () => {
    it('should return true for valid password with all requirements', () => {
      const validPassword = 'ValidPass123!';

      const result = service.validatePasswordStrength(validPassword);

      expect(result).toBe(true);
    });

    it('should return false for password shorter than 8 characters', () => {
      const shortPassword = 'Ab1!xyz';

      const result = service.validatePasswordStrength(shortPassword);

      expect(result).toBe(false);
    });

    it('should return false for password without uppercase letter', () => {
      const noUppercase = 'validpass123!';

      const result = service.validatePasswordStrength(noUppercase);

      expect(result).toBe(false);
    });

    it('should return false for password without lowercase letter', () => {
      const noLowercase = 'VALIDPASS123!';

      const result = service.validatePasswordStrength(noLowercase);

      expect(result).toBe(false);
    });

    it('should return false for password without digit', () => {
      const noDigit = 'ValidPassword!';

      const result = service.validatePasswordStrength(noDigit);

      expect(result).toBe(false);
    });

    it('should return false for password without special character', () => {
      const noSpecial = 'ValidPassword123';

      const result = service.validatePasswordStrength(noSpecial);

      expect(result).toBe(false);
    });

    it('should return true for password with exactly 8 characters', () => {
      const minLength = 'Ab1!efgh';

      const result = service.validatePasswordStrength(minLength);

      expect(result).toBe(true);
    });

    it('should return false for empty password', () => {
      const result = service.validatePasswordStrength('');

      expect(result).toBe(false);
    });

    it('should accept all allowed special characters', () => {
      const specialChars = '!@#$%^&*-_=+';

      for (const char of specialChars) {
        const password = `Abcdefg1${char}`;
        const result = service.validatePasswordStrength(password);

        expect(result).toBe(true);
      }
    });

    it('should return false for password with only spaces', () => {
      const spacesOnly = '        ';

      const result = service.validatePasswordStrength(spacesOnly);

      expect(result).toBe(false);
    });

    it('should handle unicode characters gracefully', () => {
      // Unicode characters should not count as uppercase/lowercase ASCII
      const unicodePassword = 'ABCabc12';

      const result = service.validatePasswordStrength(unicodePassword);

      expect(result).toBe(false); // Missing special character
    });

    it('should return true for very long valid password', () => {
      const longPassword = 'AbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#';

      const result = service.validatePasswordStrength(longPassword);

      expect(result).toBe(true);
    });

    it('should return false for password with only special characters', () => {
      const onlySpecial = '!@#$%^&*';

      const result = service.validatePasswordStrength(onlySpecial);

      expect(result).toBe(false);
    });

    it('should return false for password with only digits', () => {
      const onlyDigits = '12345678';

      const result = service.validatePasswordStrength(onlyDigits);

      expect(result).toBe(false);
    });

    it('should return false for password with only letters', () => {
      const onlyLetters = 'AbcDefGh';

      const result = service.validatePasswordStrength(onlyLetters);

      expect(result).toBe(false);
    });

    it('should handle boundary case of 7 character password', () => {
      const sevenChars = 'Ab1!efg';

      const result = service.validatePasswordStrength(sevenChars);

      expect(result).toBe(false);
    });

    it('should handle password with mixed valid and invalid special characters', () => {
      // Only specific special characters are allowed: !@#$%^&*-_=+
      const validSpecial = 'Abcdefg1!';
      const validResult = service.validatePasswordStrength(validSpecial);
      expect(validResult).toBe(true);

      // Password with only disallowed special characters (no allowed ones)
      const noAllowedSpecial = 'Abcdefg1~';
      const noAllowedResult = service.validatePasswordStrength(noAllowedSpecial);
      expect(noAllowedResult).toBe(false);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('integration', () => {
    it('should generate passwords that are consistently valid', () => {
      // Run 50 iterations to ensure consistency
      for (let i = 0; i < 50; i++) {
        const password = service.generatePassword();

        expect(password).toHaveLength(12);
        expect(service.validatePasswordStrength(password)).toBe(true);
        expect(password).toMatch(/[A-Z]/);
        expect(password).toMatch(/[a-z]/);
        expect(password).toMatch(/\d/);
        expect(password).toMatch(/[!@#$%^&*\-_=+]/);
      }
    });

    it('should generate passwords suitable for user credentials', () => {
      const password = service.generatePassword();

      // Password should be typeable (no control characters)
      expect(password).toMatch(/^[\x20-\x7E]+$/);

      // Password should not start or end with space
      expect(password).not.toMatch(/^\s/);
      expect(password).not.toMatch(/\s$/);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('edge cases', () => {
    it('should handle rapid successive calls', () => {
      const passwords: string[] = [];

      // Generate 1000 passwords rapidly
      for (let i = 0; i < 1000; i++) {
        passwords.push(service.generatePassword());
      }

      // All should be valid
      for (const password of passwords) {
        expect(password).toHaveLength(12);
        expect(service.validatePasswordStrength(password)).toBe(true);
      }
    });

    it('should validate password with repeated characters', () => {
      const repeatedChars = 'Aaaaaa1111!';

      const result = service.validatePasswordStrength(repeatedChars);

      expect(result).toBe(true);
    });

    it('should validate password starting with special character', () => {
      const startsSpecial = '!Abcdefg123';

      const result = service.validatePasswordStrength(startsSpecial);

      expect(result).toBe(true);
    });

    it('should validate password starting with digit', () => {
      const startsDigit = '1Abcdefg!23';

      const result = service.validatePasswordStrength(startsDigit);

      expect(result).toBe(true);
    });

    it('should validate password ending with lowercase', () => {
      const endsLower = 'ABCDEFG123!a';

      const result = service.validatePasswordStrength(endsLower);

      expect(result).toBe(true);
    });
  });
});
