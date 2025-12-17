import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { PasswordPolicyService } from '../services/password-policy.service';

/**
 * Custom validator for password policy
 *
 * REQ-AUTH-41: Password Policy Validation
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
@Injectable()
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  constructor(private readonly passwordPolicyService: PasswordPolicyService) {}

  /**
   * Validate password against policy
   *
   * @param value - Password value
   * @returns true if valid, false otherwise
   */
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    const result = this.passwordPolicyService.validate(value);
    return result.isValid;
  }

  /**
   * Get default error message
   *
   * @param args - Validation arguments
   * @returns Error message
   */
  defaultMessage(args: ValidationArguments): string {
    const value = args.value;
    if (typeof value !== 'string') {
      return 'Пароль должен быть строкой';
    }

    const result = this.passwordPolicyService.validate(value);
    if (!result.isValid && result.errors.length > 0) {
      return result.errors.join('; ');
    }

    return 'Пароль не соответствует требованиям безопасности';
  }
}

/**
 * Custom decorator to validate password strength
 *
 * Uses PasswordPolicyService for centralized validation
 *
 * @param validationOptions - Custom validation options
 * @returns PropertyDecorator
 *
 * @example
 * ```typescript
 * export class CreateUserDto {
 *   @IsStrongPassword()
 *   password: string;
 * }
 * ```
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
