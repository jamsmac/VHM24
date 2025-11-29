import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Password Policy Configuration
 */
export interface PasswordPolicyConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecialChar: boolean;
  specialChars: string;
  maxLength?: number;
}

/**
 * Password Policy Service
 *
 * REQ-AUTH-41: Password Policy Validation
 *
 * Provides centralized password validation logic with configurable rules:
 * - Minimum length (default 8)
 * - Character requirements (uppercase, lowercase, digits, special chars)
 * - Weak password blacklist
 * - Configuration via environment variables
 *
 * Used in:
 * - User registration
 * - Password change
 * - Password reset
 */
@Injectable()
export class PasswordPolicyService {
  private readonly config: PasswordPolicyConfig;

  /**
   * Common weak passwords blacklist
   * Based on common password lists and security best practices
   */
  private readonly weakPasswords = new Set([
    'password',
    'password1',
    'password123',
    '12345678',
    '123456789',
    '1234567890',
    'qwerty',
    'qwerty123',
    'abc123',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    'master',
    'sunshine',
    'princess',
    'football',
    'baseball',
    'shadow',
    'superman',
    'batman',
    'trustno1',
    'starwars',
    'admin',
    'admin123',
    'root',
    'root123',
    'user',
    'user123',
    'test',
    'test123',
    'guest',
    'guest123',
    'vendhub',
    'vendhub123',
  ]);

  constructor(private readonly configService: ConfigService) {
    // Load configuration from environment variables
    this.config = {
      minLength: this.configService.get<number>('PASSWORD_MIN_LENGTH', 8),
      requireUppercase: this.configService.get<boolean>('PASSWORD_REQUIRE_UPPERCASE', true),
      requireLowercase: this.configService.get<boolean>('PASSWORD_REQUIRE_LOWERCASE', true),
      requireDigit: this.configService.get<boolean>('PASSWORD_REQUIRE_DIGIT', true),
      requireSpecialChar: this.configService.get<boolean>('PASSWORD_REQUIRE_SPECIAL_CHAR', true),
      specialChars: this.configService.get<string>('PASSWORD_SPECIAL_CHARS', '@$!%*?&#'),
      maxLength: this.configService.get<number>('PASSWORD_MAX_LENGTH', 128),
    };
  }

  /**
   * Validate password against policy
   *
   * @param password - Password to validate
   * @returns Validation result with errors
   */
  validate(password: string): PasswordValidationResult {
    const errors: string[] = [];

    // Check minimum length
    if (password.length < this.config.minLength) {
      errors.push(`Пароль должен содержать минимум ${this.config.minLength} символов`);
    }

    // Check maximum length
    if (this.config.maxLength && password.length > this.config.maxLength) {
      errors.push(`Пароль должен содержать максимум ${this.config.maxLength} символов`);
    }

    // Check uppercase requirement
    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Пароль должен содержать хотя бы одну заглавную букву (A-Z)');
    }

    // Check lowercase requirement
    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Пароль должен содержать хотя бы одну строчную букву (a-z)');
    }

    // Check digit requirement
    if (this.config.requireDigit && !/\d/.test(password)) {
      errors.push('Пароль должен содержать хотя бы одну цифру (0-9)');
    }

    // Check special character requirement
    if (this.config.requireSpecialChar) {
      const specialCharRegex = new RegExp(`[${this.escapeRegex(this.config.specialChars)}]`);
      if (!specialCharRegex.test(password)) {
        errors.push(
          `Пароль должен содержать хотя бы один спецсимвол (${this.config.specialChars})`,
        );
      }
    }

    // Check against weak password blacklist (case-insensitive)
    if (this.weakPasswords.has(password.toLowerCase())) {
      errors.push('Пароль слишком простой. Пожалуйста, выберите более сложный пароль');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate password and throw exception if invalid
   *
   * @param password - Password to validate
   * @throws BadRequestException if password is invalid
   */
  validateOrThrow(password: string): void {
    const result = this.validate(password);
    if (!result.isValid) {
      throw new BadRequestException({
        message: 'Пароль не соответствует требованиям безопасности',
        errors: result.errors,
      });
    }
  }

  /**
   * Get password requirements description
   *
   * @returns Human-readable password requirements
   */
  getRequirements(): string[] {
    const requirements: string[] = [];

    requirements.push(`Минимальная длина: ${this.config.minLength} символов`);

    if (this.config.maxLength) {
      requirements.push(`Максимальная длина: ${this.config.maxLength} символов`);
    }

    if (this.config.requireUppercase) {
      requirements.push('Хотя бы одна заглавная буква (A-Z)');
    }

    if (this.config.requireLowercase) {
      requirements.push('Хотя бы одна строчная буква (a-z)');
    }

    if (this.config.requireDigit) {
      requirements.push('Хотя бы одна цифра (0-9)');
    }

    if (this.config.requireSpecialChar) {
      requirements.push(`Хотя бы один спецсимвол (${this.config.specialChars})`);
    }

    requirements.push('Не использовать распространенные пароли');

    return requirements;
  }

  /**
   * Get current password policy configuration
   *
   * @returns Current policy configuration
   */
  getConfig(): PasswordPolicyConfig {
    return { ...this.config };
  }

  /**
   * Escape special regex characters
   *
   * @param str - String to escape
   * @returns Escaped string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
