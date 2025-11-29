import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValidationRule } from '../entities/validation-rule.entity';
import {
  DomainType,
  RuleType,
  ValidationSeverity,
  ValidationError,
} from '../interfaces/common.interface';

export interface RuleResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Rules Engine Service
 *
 * Executes business logic validation rules on data
 */
@Injectable()
export class RulesEngineService {
  private readonly logger = new Logger(RulesEngineService.name);

  constructor(
    @InjectRepository(ValidationRule)
    private readonly ruleRepo: Repository<ValidationRule>,
  ) {}

  /**
   * Get all active rules for a domain
   */
  async getRules(domain: DomainType): Promise<ValidationRule[]> {
    return await this.ruleRepo.find({
      where: { domain, active: true },
      order: { priority: 'DESC' },
    });
  }

  /**
   * Validate a single row against all rules
   */
  async validate(row: Record<string, unknown>, rules: ValidationRule[]): Promise<RuleResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    for (const rule of rules) {
      const result = await this.executeRule(row, rule);

      if (!result.passed) {
        const error: ValidationError = {
          rowIndex: -1, // Will be set by caller
          field: rule.rule_definition.field || 'unknown',
          value: row[rule.rule_definition.field],
          code: rule.rule_name,
          message: rule.rule_definition.message || `Rule ${rule.rule_name} failed`,
          severity: rule.severity,
        };

        if (rule.severity === ValidationSeverity.ERROR) {
          errors.push(error);
        } else if (rule.severity === ValidationSeverity.WARNING) {
          warnings.push(error);
        }
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Execute a single rule
   */
  private async executeRule(
    row: Record<string, unknown>,
    rule: ValidationRule,
  ): Promise<{ passed: boolean }> {
    const def = rule.rule_definition;
    const field = def.field;
    const value = row[field];

    switch (rule.rule_type) {
      case RuleType.REQUIRED:
        return { passed: value !== null && value !== undefined && value !== '' };

      case RuleType.RANGE:
        return this.executeRangeRule(value, def);

      case RuleType.REGEX:
        return this.executeRegexRule(value, def);

      case RuleType.ENUM:
        return this.executeEnumRule(value, def);

      case RuleType.UNIQUE:
        // Unique validation requires database access - handled separately
        return { passed: true };

      case RuleType.FOREIGN_KEY:
        // FK validation requires database access - handled separately
        return { passed: true };

      case RuleType.CUSTOM:
        return this.executeCustomRule(row, def);

      default:
        this.logger.warn(`Unknown rule type: ${rule.rule_type}`);
        return { passed: true };
    }
  }

  /**
   * Execute range rule (min/max validation)
   */
  private executeRangeRule(value: unknown, def: Record<string, unknown>): { passed: boolean } {
    const numValue = parseFloat(String(value));

    if (isNaN(numValue)) {
      return { passed: false };
    }

    const min = def.min as number | undefined;
    const max = def.max as number | undefined;

    if (min !== undefined && min !== null && numValue < min) {
      return { passed: false };
    }

    if (max !== undefined && max !== null && numValue > max) {
      return { passed: false };
    }

    return { passed: true };
  }

  /**
   * Execute regex rule
   */
  private executeRegexRule(value: unknown, def: Record<string, unknown>): { passed: boolean } {
    if (typeof value !== 'string') {
      return { passed: false };
    }

    const pattern = def.pattern as string;
    const flags = (def.flags as string) || '';
    const regex = new RegExp(pattern, flags);
    return { passed: regex.test(value) };
  }

  /**
   * Execute enum rule
   */
  private executeEnumRule(value: unknown, def: Record<string, unknown>): { passed: boolean } {
    const allowedValues = (def.values || def.enum || []) as unknown[];

    if (def.caseInsensitive) {
      const lowerValue = String(value).toLowerCase();
      return {
        passed: allowedValues.some((v) => String(v).toLowerCase() === lowerValue),
      };
    }

    return { passed: allowedValues.includes(value) };
  }

  /**
   * Execute custom rule (JavaScript expression)
   */
  private executeCustomRule(
    row: Record<string, unknown>,
    def: Record<string, unknown>,
  ): { passed: boolean } {
    try {
      // SECURITY: Be very careful with eval!
      // In production, use a sandboxed interpreter or AST-based evaluation
      const fn = new Function('row', `return ${def.expression}`);
      return { passed: Boolean(fn(row)) };
    } catch (error) {
      this.logger.error('Custom rule execution failed:', error);
      return { passed: false };
    }
  }

  /**
   * Add a new validation rule
   */
  async addRule(
    domain: DomainType,
    ruleName: string,
    ruleType: RuleType,
    ruleDefinition: Record<string, unknown>,
    severity: ValidationSeverity = ValidationSeverity.ERROR,
    priority: number = 1,
  ): Promise<ValidationRule> {
    const rule = this.ruleRepo.create({
      domain,
      rule_name: ruleName,
      rule_type: ruleType,
      rule_definition: ruleDefinition,
      severity,
      priority,
    });

    return await this.ruleRepo.save(rule);
  }

  /**
   * Seed default validation rules
   */
  async seedDefaultRules(): Promise<void> {
    // SALES domain rules
    await this.addRule(
      DomainType.SALES,
      'amount_positive',
      RuleType.RANGE,
      {
        field: 'amount',
        min: 0.01,
        max: 1000000,
        message: 'Amount must be positive and less than 1,000,000',
      },
      ValidationSeverity.ERROR,
      10,
    );

    await this.addRule(
      DomainType.SALES,
      'sale_date_not_future',
      RuleType.CUSTOM,
      {
        field: 'sale_date',
        expression: 'new Date(row.sale_date) <= new Date()',
        message: 'Sale date cannot be in the future',
      },
      ValidationSeverity.ERROR,
      9,
    );

    await this.addRule(
      DomainType.SALES,
      'sale_date_not_too_old',
      RuleType.CUSTOM,
      {
        field: 'sale_date',
        expression: `
          const saleDate = new Date(row.sale_date);
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          return saleDate >= oneYearAgo;
        `,
        message: 'Sale date is more than 1 year old',
      },
      ValidationSeverity.WARNING,
      5,
    );

    await this.addRule(
      DomainType.SALES,
      'payment_method_valid',
      RuleType.ENUM,
      {
        field: 'payment_method',
        values: ['cash', 'card', 'qr', 'mobile', 'online'],
        caseInsensitive: true,
        message: 'Invalid payment method',
      },
      ValidationSeverity.ERROR,
      8,
    );

    await this.addRule(
      DomainType.SALES,
      'quantity_positive',
      RuleType.RANGE,
      {
        field: 'quantity',
        min: 1,
        max: 10000,
        message: 'Quantity must be at least 1',
      },
      ValidationSeverity.ERROR,
      7,
    );

    await this.addRule(
      DomainType.SALES,
      'machine_number_required',
      RuleType.REQUIRED,
      {
        field: 'machine_number',
        message: 'Machine number is required',
      },
      ValidationSeverity.ERROR,
      10,
    );

    // INVENTORY domain rules
    await this.addRule(
      DomainType.INVENTORY,
      'quantity_non_negative',
      RuleType.RANGE,
      {
        field: 'quantity',
        min: 0,
        message: 'Inventory quantity cannot be negative',
      },
      ValidationSeverity.ERROR,
      10,
    );

    await this.addRule(
      DomainType.INVENTORY,
      'product_name_required',
      RuleType.REQUIRED,
      {
        field: 'product_name',
        message: 'Product name is required',
      },
      ValidationSeverity.ERROR,
      10,
    );

    // MACHINES domain rules
    await this.addRule(
      DomainType.MACHINES,
      'machine_number_format',
      RuleType.REGEX,
      {
        field: 'machine_number',
        pattern: '^[A-Z0-9-]+$',
        flags: 'i',
        message: 'Machine number must contain only letters, numbers, and hyphens',
      },
      ValidationSeverity.WARNING,
      5,
    );

    await this.addRule(
      DomainType.MACHINES,
      'machine_name_required',
      RuleType.REQUIRED,
      {
        field: 'name',
        message: 'Machine name is required',
      },
      ValidationSeverity.ERROR,
      10,
    );

    this.logger.log('Default validation rules seeded successfully');
  }
}
