import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

/**
 * Service for generating unique usernames for user accounts
 *
 * Username format: firstname_lastname_randomsuffix
 * Example: john_doe_12345, ivan_petrov_67890
 */
@Injectable()
export class UsernameGeneratorService {
  /**
   * Generate a unique username from email
   *
   * Format: firstname_lastname_suffix
   * - firstname: first part of email (before @)
   * - lastname: generated as random digits
   * - suffix: 5-digit random number for uniqueness
   *
   * @param email - User email address
   * @returns Generated username
   */
  generateUsername(email: string): string {
    // Extract local part of email (everything before @)
    const emailLocalPart = email.split('@')[0];

    // Remove special characters, keep only alphanumeric and underscores
    // Replace dots and hyphens with underscores
    let cleanedEmail = emailLocalPart
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '') // Remove invalid chars
      .replace(/[-]/g, '_'); // Replace hyphens with underscores

    // Generate random 5-digit suffix for uniqueness
    const randomSuffix = this.generateRandomSuffix(5);

    // Combine into username
    let username = `${cleanedEmail}_${randomSuffix}`;

    // Ensure username doesn't exceed max length (50 chars)
    if (username.length > 50) {
      // Trim email part to fit within limit
      const maxEmailLength = 50 - randomSuffix.length - 1; // -1 for underscore
      cleanedEmail = cleanedEmail.substring(0, maxEmailLength);
      username = `${cleanedEmail}_${randomSuffix}`;
    }

    return username;
  }

  /**
   * Generate random numeric suffix for uniqueness
   *
   * @param length - Length of the suffix (number of digits)
   * @returns Random numeric string
   */
  private generateRandomSuffix(length: number): string {
    // Generate random bytes and convert to digits
    const randomBytes_result = randomBytes(Math.ceil(length / 2));
    const hex = randomBytes_result.toString('hex');

    // Extract first 'length' characters and ensure they're digits
    let suffix = '';
    for (let i = 0; i < length; i++) {
      const charCode = hex.charCodeAt(i % hex.length);
      // Convert hex char to digit (0-9)
      suffix += String.fromCharCode((charCode % 10) + 48); // ASCII 48 is '0'
    }

    return suffix.substring(0, length);
  }
}
