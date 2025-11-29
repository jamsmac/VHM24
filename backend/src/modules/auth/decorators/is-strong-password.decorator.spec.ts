import { IsStrongPasswordConstraint } from './is-strong-password.decorator';
import { PasswordPolicyService } from '../services/password-policy.service';
import { ValidationArguments } from 'class-validator';

describe('IsStrongPasswordConstraint', () => {
  let constraint: IsStrongPasswordConstraint;
  let passwordPolicyService: jest.Mocked<PasswordPolicyService>;

  beforeEach(() => {
    passwordPolicyService = {
      validate: jest.fn(),
    } as any;

    constraint = new IsStrongPasswordConstraint(passwordPolicyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return false if value is not a string', () => {
      const result = constraint.validate(123);
      expect(result).toBe(false);
      expect(passwordPolicyService.validate).not.toHaveBeenCalled();
    });

    it('should return false if value is null', () => {
      const result = constraint.validate(null);
      expect(result).toBe(false);
      expect(passwordPolicyService.validate).not.toHaveBeenCalled();
    });

    it('should return false if value is undefined', () => {
      const result = constraint.validate(undefined);
      expect(result).toBe(false);
      expect(passwordPolicyService.validate).not.toHaveBeenCalled();
    });

    it('should return true when password is valid', () => {
      passwordPolicyService.validate.mockReturnValue({
        isValid: true,
        errors: [],
      });

      const result = constraint.validate('StrongPassword123!');
      expect(result).toBe(true);
      expect(passwordPolicyService.validate).toHaveBeenCalledWith('StrongPassword123!');
    });

    it('should return false when password is invalid', () => {
      passwordPolicyService.validate.mockReturnValue({
        isValid: false,
        errors: ['Password too short'],
      });

      const result = constraint.validate('weak');
      expect(result).toBe(false);
      expect(passwordPolicyService.validate).toHaveBeenCalledWith('weak');
    });
  });

  describe('defaultMessage', () => {
    it('should return string type error when value is not a string', () => {
      const args: ValidationArguments = {
        value: 123,
        constraints: [],
        targetName: 'TestClass',
        object: {},
        property: 'password',
      };

      const message = constraint.defaultMessage(args);
      expect(message).toBe('Пароль должен быть строкой');
    });

    it('should return validation errors when password is invalid', () => {
      passwordPolicyService.validate.mockReturnValue({
        isValid: false,
        errors: ['Password too short', 'Must contain uppercase'],
      });

      const args: ValidationArguments = {
        value: 'weak',
        constraints: [],
        targetName: 'TestClass',
        object: {},
        property: 'password',
      };

      const message = constraint.defaultMessage(args);
      expect(message).toBe('Password too short; Must contain uppercase');
    });

    it('should return default error message when no specific errors', () => {
      passwordPolicyService.validate.mockReturnValue({
        isValid: true,
        errors: [],
      });

      const args: ValidationArguments = {
        value: 'test',
        constraints: [],
        targetName: 'TestClass',
        object: {},
        property: 'password',
      };

      const message = constraint.defaultMessage(args);
      expect(message).toBe('Пароль не соответствует требованиям безопасности');
    });
  });
});
