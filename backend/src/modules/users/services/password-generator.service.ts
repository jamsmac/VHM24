import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

/**
 * Service for generating cryptographically secure temporary passwords
 *
 * Password characteristics:
 * - 12 characters long
 * - Mix of uppercase, lowercase, digits, and special characters
 * - Cryptographically random using randomBytes()
 * - Designed to be easy to type (avoids confusing characters like O, 0, l, 1)
 */
@Injectable()
export class PasswordGeneratorService {
  private readonly UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private readonly LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
  private readonly DIGITS = '0123456789';
  private readonly SPECIAL = '!@#$%^&*-_=+';

  private readonly PASSWORD_LENGTH = 12;

  /**
   * Generate a cryptographically secure temporary password
   *
   * Ensures at least one character from each character set:
   * - Uppercase letter
   * - Lowercase letter
   * - Digit
   * - Special character
   *
   * @returns Generated password (12 characters)
   */
  generatePassword(): string {
    const allChars = `${this.UPPERCASE}${this.LOWERCASE}${this.DIGITS}${this.SPECIAL}`;

    // Generate random bytes
    const randomValues = randomBytes(this.PASSWORD_LENGTH);

    // Ensure we have at least one of each character type
    let password = '';
    password += this.UPPERCASE[randomValues[0] % this.UPPERCASE.length];
    password += this.LOWERCASE[randomValues[1] % this.LOWERCASE.length];
    password += this.DIGITS[randomValues[2] % this.DIGITS.length];
    password += this.SPECIAL[randomValues[3] % this.SPECIAL.length];

    // Fill remaining positions with random characters from all sets
    for (let i = 4; i < this.PASSWORD_LENGTH; i++) {
      password += allChars[randomValues[i] % allChars.length];
    }

    // Shuffle the password to avoid predictable pattern
    password = this.shuffleString(password);

    return password;
  }

  /**
   * Shuffle a string using Fisher-Yates algorithm with cryptographic randomness
   *
   * @param str - String to shuffle
   * @returns Shuffled string
   */
  private shuffleString(str: string): string {
    const arr = str.split('');
    const randomBytes_result = randomBytes(arr.length);

    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randomBytes_result[i] % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr.join('');
  }

  /**
   * Validate password strength
   *
   * Returns true if password contains:
   * - At least 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one digit
   * - At least one special character
   *
   * @param password - Password to validate
   * @returns true if password meets strength requirements
   */
  validatePasswordStrength(password: string): boolean {
    if (password.length < 8) {
      return false;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*\-_=+]/.test(password);

    return hasUppercase && hasLowercase && hasDigit && hasSpecial;
  }
}
