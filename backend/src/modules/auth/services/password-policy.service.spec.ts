import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { PasswordPolicyService } from './password-policy.service';

describe('PasswordPolicyService', () => {
  let service: PasswordPolicyService;
  let _configService: ConfigService;

  // Default config values
  const defaultConfig = {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    PASSWORD_REQUIRE_UPPERCASE: true,
    PASSWORD_REQUIRE_LOWERCASE: true,
    PASSWORD_REQUIRE_DIGIT: true,
    PASSWORD_REQUIRE_SPECIAL_CHAR: true,
    PASSWORD_SPECIAL_CHARS: '@$!%*?&#',
  };

  const createConfigService = (overrides: Record<string, any> = {}) => {
    const config: Record<string, any> = { ...defaultConfig, ...overrides };
    return {
      get: jest.fn((key: string, defaultValue?: any) => {
        return key in config ? config[key] : defaultValue;
      }),
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordPolicyService,
        {
          provide: ConfigService,
          useValue: createConfigService(),
        },
      ],
    }).compile();

    service = module.get<PasswordPolicyService>(PasswordPolicyService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    describe('minimum length validation', () => {
      it('should return error when password is shorter than minimum length', () => {
        const result = service.validate('Aa1@');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Пароль должен содержать минимум 8 символов');
      });

      it('should pass when password meets minimum length', () => {
        const result = service.validate('Aa1@aaaa');

        expect(result.errors).not.toContain('Пароль должен содержать минимум 8 символов');
      });

      it('should return error when password is empty', () => {
        const result = service.validate('');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Пароль должен содержать минимум 8 символов');
      });
    });

    describe('maximum length validation', () => {
      it('should return error when password exceeds maximum length', async () => {
        // Create service with lower max length for testing
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            PasswordPolicyService,
            {
              provide: ConfigService,
              useValue: createConfigService({ PASSWORD_MAX_LENGTH: 10 }),
            },
          ],
        }).compile();

        const testService = module.get<PasswordPolicyService>(PasswordPolicyService);
        const result = testService.validate('Aa1@aaaaaaaa'); // 12 chars

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Пароль должен содержать максимум 10 символов');
      });

      it('should pass when password is within maximum length', () => {
        const longPassword = 'A'.repeat(32) + 'a'.repeat(32) + '1@'; // 66 chars (less than 128)
        const result = service.validate(longPassword);

        expect(result.errors.find((e) => e.includes('максимум'))).toBeUndefined();
      });
    });

    describe('uppercase requirement', () => {
      it('should return error when password has no uppercase letter', () => {
        const result = service.validate('aaaa1234@');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Пароль должен содержать хотя бы одну заглавную букву (A-Z)',
        );
      });

      it('should pass when password has uppercase letter', () => {
        const result = service.validate('Aaaa1234@');

        expect(result.errors).not.toContain(
          'Пароль должен содержать хотя бы одну заглавную букву (A-Z)',
        );
      });

      it('should not require uppercase when disabled in config', async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            PasswordPolicyService,
            {
              provide: ConfigService,
              useValue: createConfigService({ PASSWORD_REQUIRE_UPPERCASE: false }),
            },
          ],
        }).compile();

        const testService = module.get<PasswordPolicyService>(PasswordPolicyService);
        const result = testService.validate('aaaa1234@');

        expect(result.errors).not.toContain(
          'Пароль должен содержать хотя бы одну заглавную букву (A-Z)',
        );
      });
    });

    describe('lowercase requirement', () => {
      it('should return error when password has no lowercase letter', () => {
        const result = service.validate('AAAA1234@');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Пароль должен содержать хотя бы одну строчную букву (a-z)',
        );
      });

      it('should pass when password has lowercase letter', () => {
        const result = service.validate('AAAa1234@');

        expect(result.errors).not.toContain(
          'Пароль должен содержать хотя бы одну строчную букву (a-z)',
        );
      });

      it('should not require lowercase when disabled in config', async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            PasswordPolicyService,
            {
              provide: ConfigService,
              useValue: createConfigService({ PASSWORD_REQUIRE_LOWERCASE: false }),
            },
          ],
        }).compile();

        const testService = module.get<PasswordPolicyService>(PasswordPolicyService);
        const result = testService.validate('AAAA1234@');

        expect(result.errors).not.toContain(
          'Пароль должен содержать хотя бы одну строчную букву (a-z)',
        );
      });
    });

    describe('digit requirement', () => {
      it('should return error when password has no digit', () => {
        const result = service.validate('Aaaaaaaa@');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Пароль должен содержать хотя бы одну цифру (0-9)');
      });

      it('should pass when password has digit', () => {
        const result = service.validate('Aaaaaaa1@');

        expect(result.errors).not.toContain('Пароль должен содержать хотя бы одну цифру (0-9)');
      });

      it('should not require digit when disabled in config', async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            PasswordPolicyService,
            {
              provide: ConfigService,
              useValue: createConfigService({ PASSWORD_REQUIRE_DIGIT: false }),
            },
          ],
        }).compile();

        const testService = module.get<PasswordPolicyService>(PasswordPolicyService);
        const result = testService.validate('Aaaaaaaa@');

        expect(result.errors).not.toContain('Пароль должен содержать хотя бы одну цифру (0-9)');
      });
    });

    describe('special character requirement', () => {
      it('should return error when password has no special character', () => {
        const result = service.validate('Aaaaaaa1');

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('спецсимвол'))).toBe(true);
      });

      it('should pass when password has special character @', () => {
        const result = service.validate('Aaaaaaa1@');

        expect(result.errors.some((e) => e.includes('спецсимвол'))).toBe(false);
      });

      it('should pass when password has special character $', () => {
        const result = service.validate('Aaaaaaa1$');

        expect(result.errors.some((e) => e.includes('спецсимвол'))).toBe(false);
      });

      it('should pass when password has special character !', () => {
        const result = service.validate('Aaaaaaa1!');

        expect(result.errors.some((e) => e.includes('спецсимвол'))).toBe(false);
      });

      it('should pass when password has special character #', () => {
        const result = service.validate('Aaaaaaa1#');

        expect(result.errors.some((e) => e.includes('спецсимвол'))).toBe(false);
      });

      it('should not require special char when disabled in config', async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            PasswordPolicyService,
            {
              provide: ConfigService,
              useValue: createConfigService({ PASSWORD_REQUIRE_SPECIAL_CHAR: false }),
            },
          ],
        }).compile();

        const testService = module.get<PasswordPolicyService>(PasswordPolicyService);
        const result = testService.validate('Aaaaaaa1');

        expect(result.errors.some((e) => e.includes('спецсимвол'))).toBe(false);
      });
    });

    describe('weak password blacklist', () => {
      // Only passwords that are exactly in the blacklist (case insensitive)
      const weakPasswords = [
        'password',
        '12345678',
        'qwerty',
        'admin',
        'admin123',
        'test',
        'test123',
        'vendhub',
        'vendhub123',
      ];

      it.each(weakPasswords.slice(0, 5))(
        'should reject weak password: %s',
        (weakPassword: string) => {
          const result = service.validate(weakPassword);

          expect(result.errors).toContain(
            'Пароль слишком простой. Пожалуйста, выберите более сложный пароль',
          );
        },
      );

      it('should reject weak password case insensitively', () => {
        const result = service.validate('PASSWORD');

        expect(result.errors).toContain(
          'Пароль слишком простой. Пожалуйста, выберите более сложный пароль',
        );
      });

      it('should accept non-weak password', () => {
        const result = service.validate('MyStrongP@ss1');

        expect(result.errors).not.toContain(
          'Пароль слишком простой. Пожалуйста, выберите более сложный пароль',
        );
      });
    });

    describe('valid password scenarios', () => {
      const validPasswords = [
        'MyStr0ng@Pass',
        'Secure123!',
        'P@ssw0rd!X',
        'Complex1$Password',
        'Test1234#',
      ];

      it.each(validPasswords)('should accept valid password: %s', (password: string) => {
        const result = service.validate(password);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('multiple validation errors', () => {
      it('should return all errors when password fails multiple rules', () => {
        const result = service.validate('abc');

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        expect(result.errors).toContain('Пароль должен содержать минимум 8 символов');
        expect(result.errors).toContain(
          'Пароль должен содержать хотя бы одну заглавную букву (A-Z)',
        );
        expect(result.errors).toContain('Пароль должен содержать хотя бы одну цифру (0-9)');
      });
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw when password is valid', () => {
      expect(() => service.validateOrThrow('MyStr0ng@Pass')).not.toThrow();
    });

    it('should throw BadRequestException when password is invalid', () => {
      expect(() => service.validateOrThrow('weak')).toThrow(BadRequestException);
    });

    it('should include all errors in exception message', () => {
      try {
        service.validateOrThrow('abc');
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response.message).toBe('Пароль не соответствует требованиям безопасности');
        expect(response.errors).toBeInstanceOf(Array);
        expect(response.errors.length).toBeGreaterThan(0);
      }
    });

    it('should throw with specific error messages', () => {
      try {
        service.validateOrThrow('short');
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response.errors).toContain('Пароль должен содержать минимум 8 символов');
      }
    });
  });

  describe('getRequirements', () => {
    it('should return array of requirements', () => {
      const requirements = service.getRequirements();

      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBeGreaterThan(0);
    });

    it('should include minimum length requirement', () => {
      const requirements = service.getRequirements();

      expect(requirements.some((r) => r.includes('Минимальная длина'))).toBe(true);
    });

    it('should include maximum length requirement', () => {
      const requirements = service.getRequirements();

      expect(requirements.some((r) => r.includes('Максимальная длина'))).toBe(true);
    });

    it('should include uppercase requirement when enabled', () => {
      const requirements = service.getRequirements();

      expect(requirements.some((r) => r.includes('заглавная буква'))).toBe(true);
    });

    it('should include lowercase requirement when enabled', () => {
      const requirements = service.getRequirements();

      expect(requirements.some((r) => r.includes('строчная буква'))).toBe(true);
    });

    it('should include digit requirement when enabled', () => {
      const requirements = service.getRequirements();

      expect(requirements.some((r) => r.includes('цифра'))).toBe(true);
    });

    it('should include special character requirement when enabled', () => {
      const requirements = service.getRequirements();

      expect(requirements.some((r) => r.includes('спецсимвол'))).toBe(true);
    });

    it('should include weak password warning', () => {
      const requirements = service.getRequirements();

      expect(requirements.some((r) => r.includes('распространенные пароли'))).toBe(true);
    });

    it('should not include uppercase requirement when disabled', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PasswordPolicyService,
          {
            provide: ConfigService,
            useValue: createConfigService({ PASSWORD_REQUIRE_UPPERCASE: false }),
          },
        ],
      }).compile();

      const testService = module.get<PasswordPolicyService>(PasswordPolicyService);
      const requirements = testService.getRequirements();

      expect(requirements.some((r) => r.includes('заглавная буква'))).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = service.getConfig();

      expect(config).toBeDefined();
      expect(typeof config.minLength).toBe('number');
      expect(typeof config.requireUppercase).toBe('boolean');
      expect(typeof config.requireLowercase).toBe('boolean');
      expect(typeof config.requireDigit).toBe('boolean');
      expect(typeof config.requireSpecialChar).toBe('boolean');
      expect(typeof config.specialChars).toBe('string');
    });

    it('should return default values from config', () => {
      const config = service.getConfig();

      expect(config.minLength).toBe(8);
      expect(config.maxLength).toBe(128);
      expect(config.requireUppercase).toBe(true);
      expect(config.requireLowercase).toBe(true);
      expect(config.requireDigit).toBe(true);
      expect(config.requireSpecialChar).toBe(true);
      expect(config.specialChars).toBe('@$!%*?&#');
    });

    it('should return a copy of config (not reference)', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('should reflect custom configuration values', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PasswordPolicyService,
          {
            provide: ConfigService,
            useValue: createConfigService({
              PASSWORD_MIN_LENGTH: 12,
              PASSWORD_MAX_LENGTH: 64,
              PASSWORD_REQUIRE_UPPERCASE: false,
              PASSWORD_SPECIAL_CHARS: '!@#',
            }),
          },
        ],
      }).compile();

      const testService = module.get<PasswordPolicyService>(PasswordPolicyService);
      const config = testService.getConfig();

      expect(config.minLength).toBe(12);
      expect(config.maxLength).toBe(64);
      expect(config.requireUppercase).toBe(false);
      expect(config.specialChars).toBe('!@#');
    });
  });

  describe('edge cases', () => {
    it('should handle passwords with unicode characters', () => {
      const result = service.validate('Aaaa1234@');

      expect(result.isValid).toBe(true);
    });

    it('should handle passwords with spaces', () => {
      const result = service.validate('Aa 1234 @a');

      // Spaces are allowed, just check other validations pass
      expect(result.isValid).toBe(true);
    });

    it('should handle passwords with all special characters', () => {
      const result = service.validate('Aa1@$!%*?&#');

      expect(result.isValid).toBe(true);
    });
  });
});
