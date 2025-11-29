import { Test, TestingModule } from '@nestjs/testing';
import { UsernameGeneratorService } from './username-generator.service';

describe('UsernameGeneratorService', () => {
  let service: UsernameGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsernameGeneratorService],
    }).compile();

    service = module.get<UsernameGeneratorService>(UsernameGeneratorService);
  });

  // ============================================================================
  // GENERATE USERNAME TESTS
  // ============================================================================

  describe('generateUsername', () => {
    it('should generate username from simple email', () => {
      const email = 'john@example.com';

      const username = service.generateUsername(email);

      expect(username).toMatch(/^john_\d{5}$/);
    });

    it('should convert email to lowercase', () => {
      const email = 'JOHN@EXAMPLE.COM';

      const username = service.generateUsername(email);

      expect(username).toMatch(/^john_\d{5}$/);
    });

    it('should replace hyphens with underscores', () => {
      const email = 'john-doe@example.com';

      const username = service.generateUsername(email);

      expect(username).toMatch(/^john_doe_\d{5}$/);
    });

    it('should remove special characters except underscore', () => {
      const email = 'john.doe+test@example.com';

      const username = service.generateUsername(email);

      // Dots and plus signs should be removed
      expect(username).toMatch(/^johndoetest_\d{5}$/);
    });

    it('should preserve underscores in email', () => {
      const email = 'john_doe@example.com';

      const username = service.generateUsername(email);

      expect(username).toMatch(/^john_doe_\d{5}$/);
    });

    it('should handle email with numbers', () => {
      const email = 'john123@example.com';

      const username = service.generateUsername(email);

      expect(username).toMatch(/^john123_\d{5}$/);
    });

    it('should generate different usernames for same email (random suffix)', () => {
      const email = 'john@example.com';

      const username1 = service.generateUsername(email);
      const username2 = service.generateUsername(email);
      const username3 = service.generateUsername(email);

      // Suffixes should be different (extremely unlikely to be same)
      const suffixes = [
        username1.split('_').pop(),
        username2.split('_').pop(),
        username3.split('_').pop(),
      ];
      const uniqueSuffixes = new Set(suffixes);
      expect(uniqueSuffixes.size).toBeGreaterThanOrEqual(2);
    });

    it('should handle email with only special characters in local part', () => {
      const email = '...@example.com';

      const username = service.generateUsername(email);

      // Should still generate a valid username with suffix
      expect(username).toMatch(/_\d{5}$/);
    });

    it('should handle very short email local part', () => {
      const email = 'a@example.com';

      const username = service.generateUsername(email);

      expect(username).toMatch(/^a_\d{5}$/);
    });

    it('should handle email without special characters', () => {
      const email = 'testuser@example.com';

      const username = service.generateUsername(email);

      expect(username).toMatch(/^testuser_\d{5}$/);
    });
  });

  // ============================================================================
  // MAX LENGTH TESTS
  // ============================================================================

  describe('max length handling', () => {
    it('should truncate long email to fit within 50 characters', () => {
      const longEmail = 'verylongemailaddressthatexceedsfiftycharsbeforeanytruncation@example.com';

      const username = service.generateUsername(longEmail);

      expect(username.length).toBeLessThanOrEqual(50);
    });

    it('should still include random suffix when truncating', () => {
      const longEmail = 'verylongemailaddressthatexceedsfiftycharsbeforeanytruncation@example.com';

      const username = service.generateUsername(longEmail);

      expect(username).toMatch(/_\d{5}$/);
    });

    it('should handle exactly 50 character result without truncation', () => {
      // Email local part that results in exactly 44 chars (44 + 1 underscore + 5 suffix = 50)
      const email = 'a'.repeat(44) + '@example.com';

      const username = service.generateUsername(email);

      expect(username.length).toBe(50);
    });

    it('should handle email local part longer than max length', () => {
      const email = 'a'.repeat(100) + '@example.com';

      const username = service.generateUsername(email);

      expect(username.length).toBeLessThanOrEqual(50);
      expect(username).toMatch(/_\d{5}$/);
    });
  });

  // ============================================================================
  // SPECIAL CHARACTERS TESTS
  // ============================================================================

  describe('special characters handling', () => {
    it('should remove dots from email', () => {
      const email = 'john.doe@example.com';

      const username = service.generateUsername(email);

      expect(username).not.toContain('.');
      expect(username).toMatch(/^johndoe_\d{5}$/);
    });

    it('should remove plus signs from email', () => {
      const email = 'john+tag@example.com';

      const username = service.generateUsername(email);

      expect(username).not.toContain('+');
      expect(username).toMatch(/^johntag_\d{5}$/);
    });

    it('should remove at symbols from local part', () => {
      // Edge case: malformed email with @ in local part
      const email = 'john@@example.com';

      const username = service.generateUsername(email);

      expect(username.split('@').length).toBe(1);
    });

    it('should handle email with multiple consecutive special chars', () => {
      const email = 'john...doe---test@example.com';

      const username = service.generateUsername(email);

      expect(username).toMatch(/^johndoe___test_\d{5}$/);
    });

    it('should handle email with exclamation marks', () => {
      const email = 'john!doe@example.com';

      const username = service.generateUsername(email);

      expect(username).not.toContain('!');
    });

    it('should handle email with percent signs', () => {
      const email = 'john%doe@example.com';

      const username = service.generateUsername(email);

      expect(username).not.toContain('%');
    });

    it('should handle email with ampersands', () => {
      const email = 'john&doe@example.com';

      const username = service.generateUsername(email);

      expect(username).not.toContain('&');
    });

    it('should handle email with asterisks', () => {
      const email = 'john*doe@example.com';

      const username = service.generateUsername(email);

      expect(username).not.toContain('*');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('edge cases', () => {
    it('should handle empty string before @ symbol', () => {
      const email = '@example.com';

      const username = service.generateUsername(email);

      // Should still generate valid username with suffix
      expect(username).toMatch(/_\d{5}$/);
    });

    it('should handle email with only numbers in local part', () => {
      const email = '12345@example.com';

      const username = service.generateUsername(email);

      expect(username).toMatch(/^12345_\d{5}$/);
    });

    it('should handle email with mixed case and special chars', () => {
      const email = 'John.Doe-Test+Tag@Example.COM';

      const username = service.generateUsername(email);

      // The service removes dots and plus signs, converts hyphens to underscores
      // So 'John.Doe-Test+Tag' becomes 'johndoe_testtag'
      expect(username).toMatch(/^johndoe_testtag_\d{5}$/);
      expect(username).toMatch(/^[a-z0-9_]+$/);
    });

    it('should generate username with 5-digit numeric suffix', () => {
      const email = 'test@example.com';

      const username = service.generateUsername(email);
      const suffix = username.split('_').pop();

      expect(suffix).toHaveLength(5);
      expect(suffix).toMatch(/^\d{5}$/);
    });

    it('should handle email with unicode characters', () => {
      // Unicode characters should be removed
      const email = 'johndoe@example.com';

      const username = service.generateUsername(email);

      // Should only contain ASCII characters
      expect(username).toMatch(/^[a-z0-9_]+$/);
    });

    it('should handle email with leading/trailing spaces (trimmed by email)', () => {
      // Note: Spaces in email local part are technically allowed but unusual
      const email = 'john doe@example.com';

      const username = service.generateUsername(email);

      expect(username).not.toContain(' ');
    });

    it('should handle email with tabs', () => {
      const email = 'john\tdoe@example.com';

      const username = service.generateUsername(email);

      expect(username).not.toContain('\t');
    });
  });

  // ============================================================================
  // FORMAT VALIDATION TESTS
  // ============================================================================

  describe('format validation', () => {
    it('should generate username in format: localpart_suffix', () => {
      const email = 'test@example.com';

      const username = service.generateUsername(email);

      expect(username).toMatch(/^[a-z0-9_]+_\d{5}$/);
    });

    it('should only contain lowercase letters, numbers, and underscores', () => {
      const emails = [
        'John.Doe@example.com',
        'ALLCAPS@example.com',
        'user-name@example.com',
        'test+tag@example.com',
        'mixed123@example.com',
      ];

      for (const email of emails) {
        const username = service.generateUsername(email);
        expect(username).toMatch(/^[a-z0-9_]+$/);
      }
    });

    it('should handle email starting with hyphen', () => {
      const email = '-test@example.com';

      const username = service.generateUsername(email);

      // Hyphens are converted to underscores, so leading hyphen becomes leading underscore
      // This is expected behavior based on the service implementation
      expect(username).toMatch(/^_test_\d{5}$/);
    });

    it('should not have consecutive underscores from transformations', () => {
      const email = 'test@example.com';

      const username = service.generateUsername(email);

      // The format should be localpart_suffix, not localpart__suffix
      expect(username).not.toMatch(/__+/);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('integration', () => {
    it('should generate valid usernames for various real-world emails', () => {
      const realWorldEmails = [
        'john.smith@gmail.com',
        'jane_doe@yahoo.com',
        'bob-jones@company.org',
        'alice+newsletter@domain.co.uk',
        'user123@test.io',
        'admin@localhost',
        'support@example.com',
        'info@subdomain.domain.com',
      ];

      for (const email of realWorldEmails) {
        const username = service.generateUsername(email);

        // Should be valid format
        expect(username).toMatch(/^[a-z0-9_]+$/);
        // Should have reasonable length
        expect(username.length).toBeGreaterThan(5);
        expect(username.length).toBeLessThanOrEqual(50);
        // Should end with 5-digit suffix
        expect(username).toMatch(/_\d{5}$/);
      }
    });

    it('should handle rapid successive calls with same email', () => {
      const email = 'test@example.com';
      const usernames: string[] = [];

      // Generate 100 usernames rapidly
      for (let i = 0; i < 100; i++) {
        usernames.push(service.generateUsername(email));
      }

      // All should be valid
      for (const username of usernames) {
        expect(username).toMatch(/^test_\d{5}$/);
      }

      // Should have reasonable uniqueness
      const uniqueUsernames = new Set(usernames);
      expect(uniqueUsernames.size).toBeGreaterThan(50); // At least 50% unique
    });

    it('should generate usernames suitable for database storage', () => {
      const emails = ['test@example.com', 'very.long.email.address.here@domain.com', 'short@a.co'];

      for (const email of emails) {
        const username = service.generateUsername(email);

        // Should be valid for typical VARCHAR(50) column
        expect(username.length).toBeLessThanOrEqual(50);
        // Should be non-empty
        expect(username.length).toBeGreaterThan(0);
        // Should be valid identifier (no special chars except underscore)
        expect(username).toMatch(/^[a-z0-9_]+$/);
      }
    });
  });

  // ============================================================================
  // SUFFIX GENERATION TESTS
  // ============================================================================

  describe('suffix generation', () => {
    it('should generate 5-digit numeric suffix', () => {
      const email = 'test@example.com';

      for (let i = 0; i < 20; i++) {
        const username = service.generateUsername(email);
        const suffix = username.split('_').pop();

        expect(suffix).toHaveLength(5);
        expect(suffix).toMatch(/^\d{5}$/);
      }
    });

    it('should generate suffixes with good distribution', () => {
      const email = 'test@example.com';
      const suffixes: string[] = [];

      // Generate 100 suffixes
      for (let i = 0; i < 100; i++) {
        const username = service.generateUsername(email);
        const suffix = username.split('_').pop()!;
        suffixes.push(suffix);
      }

      // Check for reasonable distribution (at least 80 unique suffixes out of 100)
      const uniqueSuffixes = new Set(suffixes);
      expect(uniqueSuffixes.size).toBeGreaterThan(80);
    });

    it('should generate suffixes that are digits only', () => {
      const email = 'test@example.com';

      for (let i = 0; i < 50; i++) {
        const username = service.generateUsername(email);
        const suffix = username.split('_').pop()!;

        // Each character should be a digit 0-9
        for (const char of suffix) {
          expect('0123456789').toContain(char);
        }
      }
    });
  });
});
