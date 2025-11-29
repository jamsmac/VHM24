import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DictionaryItem } from '@modules/dictionaries/entities/dictionary-item.entity';

/**
 * Custom validator to check if a code exists in a specific dictionary
 *
 * @example
 * ```typescript
 * export class CreateTaskDto {
 *   @IsDictionaryCode('task_types')
 *   type_code: string;
 *
 *   @IsDictionaryCode('task_statuses', { message: 'Invalid status code' })
 *   status_code: string;
 * }
 * ```
 */
@ValidatorConstraint({ name: 'IsDictionaryCode', async: true })
@Injectable()
export class IsDictionaryCodeConstraint implements ValidatorConstraintInterface {
  private readonly logger = new Logger(IsDictionaryCodeConstraint.name);

  constructor(
    @InjectRepository(DictionaryItem)
    private readonly dictionaryItemRepository: Repository<DictionaryItem>,
  ) {}

  /**
   * Validates that the code exists in the specified dictionary
   *
   * @param code - The code to validate
   * @param args - Validation arguments, args.constraints[0] is the dictionary code
   * @returns true if valid, false otherwise
   */
  async validate(code: string, args: ValidationArguments): Promise<boolean> {
    // Allow empty values (use @IsOptional to make field optional)
    if (!code) {
      return true;
    }

    const dictionaryCode = args.constraints[0];

    if (!dictionaryCode) {
      this.logger.warn('IsDictionaryCode: dictionary code not specified');
      return false;
    }

    try {
      const item = await this.dictionaryItemRepository
        .createQueryBuilder('di')
        .innerJoin('di.dictionary', 'd')
        .where('d.code = :dictionaryCode', { dictionaryCode })
        .andWhere('di.code = :code', { code })
        .andWhere('di.is_active = :isActive', { isActive: true })
        .andWhere('d.is_active = :isActive', { isActive: true })
        .getOne();

      return !!item;
    } catch (error) {
      this.logger.error('IsDictionaryCode validation error:', error);
      return false;
    }
  }

  /**
   * Default error message
   *
   * @param args - Validation arguments
   * @returns Error message string
   */
  defaultMessage(args: ValidationArguments): string {
    const dictionaryCode = args.constraints[0];
    return `${args.property} must be a valid code from '${dictionaryCode}' dictionary`;
  }
}

/**
 * Decorator to validate that a value is a valid dictionary code
 *
 * @param dictionaryCode - The code of the dictionary to validate against (e.g., 'task_types')
 * @param validationOptions - Optional validation options
 *
 * @example
 * ```typescript
 * export class CreateMachineDto {
 *   @IsDictionaryCode('machine_types')
 *   type_code: string;
 *
 *   @IsDictionaryCode('machine_statuses', { message: 'Invalid machine status' })
 *   status_code: string;
 * }
 * ```
 */
export function IsDictionaryCode(dictionaryCode: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [dictionaryCode],
      validator: IsDictionaryCodeConstraint,
    });
  };
}
