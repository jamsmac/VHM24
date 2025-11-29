import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RulesEngineService } from '../engines/rules-engine.service';
import { ValidationRule } from '../entities/validation-rule.entity';
import { DomainType, RuleType, ValidationSeverity } from '../interfaces/common.interface';

describe('RulesEngineService', () => {
  let service: RulesEngineService;
  let repository: Repository<ValidationRule>;

  const mockRequiredRule: Partial<ValidationRule> = {
    id: 'rule-1',
    domain: DomainType.SALES,
    rule_name: 'amount_required',
    rule_type: RuleType.REQUIRED,
    rule_definition: {
      field: 'amount',
      message: 'Amount is required',
    },
    severity: ValidationSeverity.ERROR,
    priority: 1,
    active: true,
  };

  const mockRangeRule: Partial<ValidationRule> = {
    id: 'rule-2',
    domain: DomainType.SALES,
    rule_name: 'amount_range',
    rule_type: RuleType.RANGE,
    rule_definition: {
      field: 'amount',
      min: 0,
      max: 1000000,
      message: 'Amount must be between 0 and 1,000,000',
    },
    severity: ValidationSeverity.ERROR,
    priority: 2,
    active: true,
  };

  const mockRegexRule: Partial<ValidationRule> = {
    id: 'rule-3',
    domain: DomainType.SALES,
    rule_name: 'machine_format',
    rule_type: RuleType.REGEX,
    rule_definition: {
      field: 'machine_number',
      pattern: '^M-\\d{3}$',
      message: 'Machine number must be in format M-XXX',
    },
    severity: ValidationSeverity.WARNING,
    priority: 3,
    active: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesEngineService,
        {
          provide: getRepositoryToken(ValidationRule),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RulesEngineService>(RulesEngineService);
    repository = module.get<Repository<ValidationRule>>(getRepositoryToken(ValidationRule));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRules', () => {
    it('should retrieve active rules for domain sorted by priority', async () => {
      jest
        .spyOn(repository, 'find')
        .mockResolvedValue([
          mockRequiredRule as ValidationRule,
          mockRangeRule as ValidationRule,
          mockRegexRule as ValidationRule,
        ]);

      const result = await service.getRules(DomainType.SALES);

      expect(result).toHaveLength(3);
      expect(result[0].priority).toBe(1); // Sorted by priority DESC
      expect(repository.find).toHaveBeenCalledWith({
        where: { domain: DomainType.SALES, active: true },
        order: { priority: 'DESC' },
      });
    });

    it('should return empty array if no rules found', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([]);

      const result = await service.getRules(DomainType.INVENTORY);

      expect(result).toHaveLength(0);
    });
  });

  describe('executeRule', () => {
    it('should validate REQUIRED rule - pass', async () => {
      const row = { amount: 100 };
      const result = await (service as any).executeRule(row, mockRequiredRule);

      expect(result.passed).toBe(true);
    });

    it('should validate REQUIRED rule - fail', async () => {
      const row = { amount: null };
      const result = await (service as any).executeRule(row, mockRequiredRule);

      expect(result.passed).toBe(false);
    });

    it('should validate RANGE rule - pass', async () => {
      const row = { amount: 500 };
      const result = await (service as any).executeRule(row, mockRangeRule);

      expect(result.passed).toBe(true);
    });

    it('should validate RANGE rule - fail min', async () => {
      const row = { amount: -100 };
      const result = await (service as any).executeRule(row, mockRangeRule);

      expect(result.passed).toBe(false);
    });

    it('should validate RANGE rule - fail max', async () => {
      const row = { amount: 2000000 };
      const result = await (service as any).executeRule(row, mockRangeRule);

      expect(result.passed).toBe(false);
    });

    it('should validate REGEX rule - pass', async () => {
      const row = { machine_number: 'M-001' };
      const result = await (service as any).executeRule(row, mockRegexRule);

      expect(result.passed).toBe(true);
    });

    it('should validate REGEX rule - fail', async () => {
      const row = { machine_number: 'INVALID' };
      const result = await (service as any).executeRule(row, mockRegexRule);

      expect(result.passed).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate row with multiple rules - all pass', async () => {
      const row = {
        amount: 500,
        machine_number: 'M-001',
      };

      const rules = [
        mockRequiredRule as ValidationRule,
        mockRangeRule as ValidationRule,
        mockRegexRule as ValidationRule,
      ];

      const result = await service.validate(row, rules);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should validate row with multiple rules - some fail', async () => {
      const row = {
        amount: -100, // Fails range rule
        machine_number: 'M-001',
      };

      const rules = [
        mockRequiredRule as ValidationRule,
        mockRangeRule as ValidationRule,
        mockRegexRule as ValidationRule,
      ];

      const result = await service.validate(row, rules);

      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('amount_range');
    });

    it('should categorize errors and warnings by severity', async () => {
      const row = {
        amount: -100, // Error
        machine_number: 'INVALID', // Warning
      };

      const rules = [
        mockRangeRule as ValidationRule, // ERROR severity
        mockRegexRule as ValidationRule, // WARNING severity
      ];

      const result = await service.validate(row, rules);

      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.errors[0].severity).toBe(ValidationSeverity.ERROR);
      expect(result.warnings[0].severity).toBe(ValidationSeverity.WARNING);
    });
  });

  describe('addRule', () => {
    it('should create new validation rule', async () => {
      const newRule = {
        domain: DomainType.SALES,
        rule_name: 'test_rule',
        rule_type: RuleType.REQUIRED,
        rule_definition: { field: 'test', message: 'Test required' },
        severity: ValidationSeverity.ERROR,
      };

      jest.spyOn(repository, 'create').mockReturnValue(mockRequiredRule as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockRequiredRule as any);

      const result = await service.addRule(
        newRule.domain,
        newRule.rule_name,
        newRule.rule_type,
        newRule.rule_definition,
        newRule.severity,
      );

      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should use default severity and priority if not provided', async () => {
      jest.spyOn(repository, 'create').mockReturnValue(mockRequiredRule as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockRequiredRule as any);

      await service.addRule(DomainType.SALES, 'test_rule', RuleType.REQUIRED, { field: 'test' });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: ValidationSeverity.ERROR,
          priority: 1,
        }),
      );
    });
  });

  describe('executeRule - ENUM rule', () => {
    const mockEnumRule: Partial<ValidationRule> = {
      id: 'rule-enum',
      domain: DomainType.SALES,
      rule_name: 'payment_method_enum',
      rule_type: RuleType.ENUM,
      rule_definition: {
        field: 'payment_method',
        values: ['cash', 'card', 'qr'],
        message: 'Invalid payment method',
      },
      severity: ValidationSeverity.ERROR,
      priority: 1,
      active: true,
    };

    it('should validate ENUM rule - pass when value is in list', async () => {
      const row = { payment_method: 'cash' };
      const result = await (service as any).executeRule(row, mockEnumRule);
      expect(result.passed).toBe(true);
    });

    it('should validate ENUM rule - fail when value is not in list', async () => {
      const row = { payment_method: 'bitcoin' };
      const result = await (service as any).executeRule(row, mockEnumRule);
      expect(result.passed).toBe(false);
    });

    it('should validate ENUM rule with case insensitive matching', async () => {
      const caseInsensitiveEnumRule: Partial<ValidationRule> = {
        ...mockEnumRule,
        rule_definition: {
          field: 'payment_method',
          values: ['cash', 'card', 'qr'],
          caseInsensitive: true,
          message: 'Invalid payment method',
        },
      };

      const row = { payment_method: 'CASH' };
      const result = await (service as any).executeRule(row, caseInsensitiveEnumRule);
      expect(result.passed).toBe(true);
    });

    it('should support enum key in rule_definition', async () => {
      const enumKeyRule: Partial<ValidationRule> = {
        ...mockEnumRule,
        rule_definition: {
          field: 'payment_method',
          enum: ['cash', 'card', 'qr'],
          message: 'Invalid payment method',
        },
      };

      const row = { payment_method: 'card' };
      const result = await (service as any).executeRule(row, enumKeyRule);
      expect(result.passed).toBe(true);
    });
  });

  describe('executeRule - CUSTOM rule', () => {
    const mockCustomRule: Partial<ValidationRule> = {
      id: 'rule-custom',
      domain: DomainType.SALES,
      rule_name: 'custom_validation',
      rule_type: RuleType.CUSTOM,
      rule_definition: {
        field: 'amount',
        expression: 'row.amount > 0 && row.amount < 1000',
        message: 'Amount must be between 0 and 1000',
      },
      severity: ValidationSeverity.ERROR,
      priority: 1,
      active: true,
    };

    it('should validate CUSTOM rule - pass when expression is true', async () => {
      const row = { amount: 500 };
      const result = await (service as any).executeRule(row, mockCustomRule);
      expect(result.passed).toBe(true);
    });

    it('should validate CUSTOM rule - fail when expression is false', async () => {
      const row = { amount: 1500 };
      const result = await (service as any).executeRule(row, mockCustomRule);
      expect(result.passed).toBe(false);
    });

    it('should handle errors in custom expression gracefully', async () => {
      const invalidCustomRule: Partial<ValidationRule> = {
        ...mockCustomRule,
        rule_definition: {
          field: 'amount',
          expression: 'row.nonexistent.deeply.nested',
          message: 'This will fail',
        },
      };

      const row = { amount: 500 };
      const result = await (service as any).executeRule(row, invalidCustomRule);
      expect(result.passed).toBe(false);
    });
  });

  describe('executeRule - UNIQUE rule', () => {
    const mockUniqueRule: Partial<ValidationRule> = {
      id: 'rule-unique',
      domain: DomainType.SALES,
      rule_name: 'unique_transaction_id',
      rule_type: RuleType.UNIQUE,
      rule_definition: {
        field: 'transaction_id',
        message: 'Transaction ID must be unique',
      },
      severity: ValidationSeverity.ERROR,
      priority: 1,
      active: true,
    };

    it('should always pass UNIQUE rule (handled separately)', async () => {
      const row = { transaction_id: 'TX-001' };
      const result = await (service as any).executeRule(row, mockUniqueRule);
      expect(result.passed).toBe(true);
    });
  });

  describe('executeRule - FOREIGN_KEY rule', () => {
    const mockFKRule: Partial<ValidationRule> = {
      id: 'rule-fk',
      domain: DomainType.SALES,
      rule_name: 'machine_exists',
      rule_type: RuleType.FOREIGN_KEY,
      rule_definition: {
        field: 'machine_id',
        table: 'machines',
        message: 'Machine must exist',
      },
      severity: ValidationSeverity.ERROR,
      priority: 1,
      active: true,
    };

    it('should always pass FOREIGN_KEY rule (handled separately)', async () => {
      const row = { machine_id: 'machine-123' };
      const result = await (service as any).executeRule(row, mockFKRule);
      expect(result.passed).toBe(true);
    });
  });

  describe('executeRule - Unknown rule type', () => {
    it('should pass for unknown rule type and log warning', async () => {
      const unknownRule: Partial<ValidationRule> = {
        id: 'rule-unknown',
        domain: DomainType.SALES,
        rule_name: 'unknown_rule',
        rule_type: 'UNKNOWN_TYPE' as RuleType,
        rule_definition: {
          field: 'test',
          message: 'Unknown rule',
        },
        severity: ValidationSeverity.ERROR,
        priority: 1,
        active: true,
      };

      const row = { test: 'value' };
      const result = await (service as any).executeRule(row, unknownRule);
      expect(result.passed).toBe(true);
    });
  });

  describe('executeRule - RANGE edge cases', () => {
    it('should fail when value is not a number', async () => {
      const rangeRule: Partial<ValidationRule> = {
        id: 'rule-range',
        domain: DomainType.SALES,
        rule_name: 'amount_range',
        rule_type: RuleType.RANGE,
        rule_definition: {
          field: 'amount',
          min: 0,
          max: 100,
        },
        severity: ValidationSeverity.ERROR,
        priority: 1,
        active: true,
      };

      const row = { amount: 'not-a-number' };
      const result = await (service as any).executeRule(row, rangeRule);
      expect(result.passed).toBe(false);
    });

    it('should pass when only max is specified and value is below', async () => {
      const rangeRule: Partial<ValidationRule> = {
        id: 'rule-range',
        domain: DomainType.SALES,
        rule_name: 'amount_max',
        rule_type: RuleType.RANGE,
        rule_definition: {
          field: 'amount',
          max: 100,
        },
        severity: ValidationSeverity.ERROR,
        priority: 1,
        active: true,
      };

      const row = { amount: -50 };
      const result = await (service as any).executeRule(row, rangeRule);
      expect(result.passed).toBe(true);
    });

    it('should pass when only min is specified and value is above', async () => {
      const rangeRule: Partial<ValidationRule> = {
        id: 'rule-range',
        domain: DomainType.SALES,
        rule_name: 'amount_min',
        rule_type: RuleType.RANGE,
        rule_definition: {
          field: 'amount',
          min: 0,
        },
        severity: ValidationSeverity.ERROR,
        priority: 1,
        active: true,
      };

      const row = { amount: 5000 };
      const result = await (service as any).executeRule(row, rangeRule);
      expect(result.passed).toBe(true);
    });
  });

  describe('executeRule - REGEX edge cases', () => {
    it('should fail when value is not a string', async () => {
      const regexRule: Partial<ValidationRule> = {
        id: 'rule-regex',
        domain: DomainType.SALES,
        rule_name: 'format_check',
        rule_type: RuleType.REGEX,
        rule_definition: {
          field: 'code',
          pattern: '^[A-Z]+$',
        },
        severity: ValidationSeverity.ERROR,
        priority: 1,
        active: true,
      };

      const row = { code: 12345 };
      const result = await (service as any).executeRule(row, regexRule);
      expect(result.passed).toBe(false);
    });

    it('should apply regex flags correctly', async () => {
      const regexRule: Partial<ValidationRule> = {
        id: 'rule-regex',
        domain: DomainType.SALES,
        rule_name: 'format_check',
        rule_type: RuleType.REGEX,
        rule_definition: {
          field: 'code',
          pattern: '^[a-z]+$',
          flags: 'i',
        },
        severity: ValidationSeverity.ERROR,
        priority: 1,
        active: true,
      };

      const row = { code: 'ABC' };
      const result = await (service as any).executeRule(row, regexRule);
      expect(result.passed).toBe(true);
    });
  });

  describe('executeRule - REQUIRED edge cases', () => {
    it('should fail for undefined value', async () => {
      const row = {};
      const result = await (service as any).executeRule(row, mockRequiredRule);
      expect(result.passed).toBe(false);
    });

    it('should fail for empty string', async () => {
      const row = { amount: '' };
      const result = await (service as any).executeRule(row, mockRequiredRule);
      expect(result.passed).toBe(false);
    });

    it('should pass for zero value', async () => {
      const row = { amount: 0 };
      const result = await (service as any).executeRule(row, mockRequiredRule);
      expect(result.passed).toBe(true);
    });
  });

  describe('validate - edge cases', () => {
    it('should handle empty rules array', async () => {
      const row = { amount: 100 };
      const result = await service.validate(row, []);
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should set correct error fields from rule_definition', async () => {
      const row = { amount: null };
      const rules = [mockRequiredRule as ValidationRule];

      const result = await service.validate(row, rules);

      expect(result.errors[0].field).toBe('amount');
      expect(result.errors[0].code).toBe('amount_required');
      expect(result.errors[0].message).toBe('Amount is required');
    });

    it('should use default message when not specified in rule', async () => {
      const ruleWithoutMessage: Partial<ValidationRule> = {
        ...mockRequiredRule,
        rule_definition: {
          field: 'amount',
        },
      };

      const row = { amount: null };
      const result = await service.validate(row, [ruleWithoutMessage as ValidationRule]);

      expect(result.errors[0].message).toBe('Rule amount_required failed');
    });

    it('should use unknown as default field when not specified', async () => {
      const ruleWithoutField: Partial<ValidationRule> = {
        ...mockRequiredRule,
        rule_definition: {},
      };

      const row = { amount: null };
      const result = await service.validate(row, [ruleWithoutField as ValidationRule]);

      expect(result.errors[0].field).toBe('unknown');
    });
  });

  describe('seedDefaultRules', () => {
    it('should seed all default validation rules', async () => {
      jest.spyOn(repository, 'create').mockImplementation((data) => data as any);
      jest.spyOn(repository, 'save').mockResolvedValue({} as any);

      await service.seedDefaultRules();

      // Should have created multiple rules for SALES, INVENTORY, and MACHINES domains
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();

      // Verify it was called multiple times (6 SALES + 2 INVENTORY + 2 MACHINES = 10)
      expect((repository.save as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(9);
    });

    it('should create sales domain rules with correct configuration', async () => {
      const createdRules: any[] = [];
      jest.spyOn(repository, 'create').mockImplementation((data) => {
        createdRules.push(data);
        return data as any;
      });
      jest.spyOn(repository, 'save').mockResolvedValue({} as any);

      await service.seedDefaultRules();

      // Verify amount_positive rule
      const amountRule = createdRules.find((r) => r.rule_name === 'amount_positive');
      expect(amountRule).toBeDefined();
      expect(amountRule.domain).toBe(DomainType.SALES);
      expect(amountRule.rule_type).toBe(RuleType.RANGE);
      expect(amountRule.rule_definition.min).toBe(0.01);
      expect(amountRule.rule_definition.max).toBe(1000000);

      // Verify payment_method_valid rule
      const paymentRule = createdRules.find((r) => r.rule_name === 'payment_method_valid');
      expect(paymentRule).toBeDefined();
      expect(paymentRule.rule_type).toBe(RuleType.ENUM);
      expect(paymentRule.rule_definition.values).toContain('cash');
      expect(paymentRule.rule_definition.caseInsensitive).toBe(true);

      // Verify machine_number_required rule
      const machineNumberRule = createdRules.find((r) => r.rule_name === 'machine_number_required');
      expect(machineNumberRule).toBeDefined();
      expect(machineNumberRule.rule_type).toBe(RuleType.REQUIRED);
    });

    it('should create inventory domain rules', async () => {
      const createdRules: any[] = [];
      jest.spyOn(repository, 'create').mockImplementation((data) => {
        createdRules.push(data);
        return data as any;
      });
      jest.spyOn(repository, 'save').mockResolvedValue({} as any);

      await service.seedDefaultRules();

      const quantityRule = createdRules.find((r) => r.rule_name === 'quantity_non_negative');
      expect(quantityRule).toBeDefined();
      expect(quantityRule.domain).toBe(DomainType.INVENTORY);

      const productNameRule = createdRules.find((r) => r.rule_name === 'product_name_required');
      expect(productNameRule).toBeDefined();
      expect(productNameRule.domain).toBe(DomainType.INVENTORY);
    });

    it('should create machines domain rules', async () => {
      const createdRules: any[] = [];
      jest.spyOn(repository, 'create').mockImplementation((data) => {
        createdRules.push(data);
        return data as any;
      });
      jest.spyOn(repository, 'save').mockResolvedValue({} as any);

      await service.seedDefaultRules();

      const formatRule = createdRules.find((r) => r.rule_name === 'machine_number_format');
      expect(formatRule).toBeDefined();
      expect(formatRule.domain).toBe(DomainType.MACHINES);
      expect(formatRule.rule_type).toBe(RuleType.REGEX);
      expect(formatRule.severity).toBe(ValidationSeverity.WARNING);

      const nameRule = createdRules.find((r) => r.rule_name === 'machine_name_required');
      expect(nameRule).toBeDefined();
      expect(nameRule.domain).toBe(DomainType.MACHINES);
    });

    it('should create custom rules for date validation', async () => {
      const createdRules: any[] = [];
      jest.spyOn(repository, 'create').mockImplementation((data) => {
        createdRules.push(data);
        return data as any;
      });
      jest.spyOn(repository, 'save').mockResolvedValue({} as any);

      await service.seedDefaultRules();

      const futureDateRule = createdRules.find((r) => r.rule_name === 'sale_date_not_future');
      expect(futureDateRule).toBeDefined();
      expect(futureDateRule.rule_type).toBe(RuleType.CUSTOM);
      expect(futureDateRule.rule_definition.expression).toContain('new Date()');

      const oldDateRule = createdRules.find((r) => r.rule_name === 'sale_date_not_too_old');
      expect(oldDateRule).toBeDefined();
      expect(oldDateRule.severity).toBe(ValidationSeverity.WARNING);
    });
  });
});
