import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValidationArguments } from 'class-validator';
import { IsDictionaryCodeConstraint } from './is-dictionary-code.validator';
import { DictionaryItem } from '@modules/dictionaries/entities/dictionary-item.entity';

describe('IsDictionaryCodeConstraint', () => {
  let validator: IsDictionaryCodeConstraint;
  let repository: jest.Mocked<Repository<DictionaryItem>>;

  beforeEach(async () => {
    const mockRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsDictionaryCodeConstraint,
        {
          provide: getRepositoryToken(DictionaryItem),
          useValue: mockRepository,
        },
      ],
    }).compile();

    validator = module.get<IsDictionaryCodeConstraint>(IsDictionaryCodeConstraint);
    repository = module.get(getRepositoryToken(DictionaryItem));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockQueryBuilder = (getOneResult: any) => {
    const mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(getOneResult),
    };
    return mockQueryBuilder;
  };

  describe('validate', () => {
    const mockValidationArgs: ValidationArguments = {
      constraints: ['machine_types'],
      property: 'type_code',
      targetName: 'CreateMachineDto',
      value: 'coffee_machine',
      object: {},
    };

    it('should return true for valid dictionary code', async () => {
      const mockItem = { id: 'item-1', code: 'coffee_machine' };
      const mockQueryBuilder = createMockQueryBuilder(mockItem);
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await validator.validate('coffee_machine', mockValidationArgs);

      expect(result).toBe(true);
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('di.dictionary', 'd');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('d.code = :dictionaryCode', {
        dictionaryCode: 'machine_types',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('di.code = :code', {
        code: 'coffee_machine',
      });
    });

    it('should return false for invalid dictionary code', async () => {
      const mockQueryBuilder = createMockQueryBuilder(null);
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await validator.validate('invalid_code', mockValidationArgs);

      expect(result).toBe(false);
    });

    it('should return true for empty code (optional fields)', async () => {
      const result = await validator.validate('', mockValidationArgs);

      expect(result).toBe(true);
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return true for null code (optional fields)', async () => {
      const result = await validator.validate(null as any, mockValidationArgs);

      expect(result).toBe(true);
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return true for undefined code (optional fields)', async () => {
      const result = await validator.validate(undefined as any, mockValidationArgs);

      expect(result).toBe(true);
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should check that dictionary item is active', async () => {
      const mockItem = { id: 'item-1', code: 'coffee_machine', is_active: true };
      const mockQueryBuilder = createMockQueryBuilder(mockItem);
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await validator.validate('coffee_machine', mockValidationArgs);

      // Verify that is_active check is included
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('di.is_active = :isActive', {
        isActive: true,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.is_active = :isActive', {
        isActive: true,
      });
    });

    it('should validate with different dictionary codes', async () => {
      const mockItem = { id: 'item-1', code: 'office' };
      const mockQueryBuilder = createMockQueryBuilder(mockItem);
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const locationTypeArgs: ValidationArguments = {
        constraints: ['location_types'],
        property: 'type_code',
        targetName: 'CreateLocationDto',
        value: 'office',
        object: {},
      };

      const result = await validator.validate('office', locationTypeArgs);

      expect(result).toBe(true);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('d.code = :dictionaryCode', {
        dictionaryCode: 'location_types',
      });
    });

    it('should return false when dictionary code is not specified', async () => {
      const argsWithoutDictionaryCode: ValidationArguments = {
        constraints: [], // Empty constraints - no dictionary code
        property: 'type_code',
        targetName: 'CreateMachineDto',
        value: 'coffee_machine',
        object: {},
      };

      const result = await validator.validate('coffee_machine', argsWithoutDictionaryCode);

      expect(result).toBe(false);
    });

    it('should return false when database query throws error', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await validator.validate('coffee_machine', {
        constraints: ['machine_types'],
        property: 'type_code',
        targetName: 'CreateMachineDto',
        value: 'coffee_machine',
        object: {},
      });

      expect(result).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return correct error message', () => {
      const mockValidationArgs: ValidationArguments = {
        constraints: ['machine_types'],
        property: 'type_code',
        targetName: 'CreateMachineDto',
        value: 'invalid_code',
        object: {},
      };

      const message = validator.defaultMessage(mockValidationArgs);

      expect(message).toBe("type_code must be a valid code from 'machine_types' dictionary");
    });

    it('should include property name in error message', () => {
      const mockValidationArgs: ValidationArguments = {
        constraints: ['location_types'],
        property: 'location_type',
        targetName: 'CreateLocationDto',
        value: 'invalid',
        object: {},
      };

      const message = validator.defaultMessage(mockValidationArgs);

      expect(message).toContain('location_type');
    });

    it('should include dictionary code in error message', () => {
      const mockValidationArgs: ValidationArguments = {
        constraints: ['product_categories'],
        property: 'category_code',
        targetName: 'CreateNomenclatureDto',
        value: 'invalid',
        object: {},
      };

      const message = validator.defaultMessage(mockValidationArgs);

      expect(message).toContain('product_categories');
    });
  });

  describe('New Dictionary Validation', () => {
    it('should validate spare_part_types codes', async () => {
      const mockItem = { id: 'item-1', code: 'mechanical' };
      const mockQueryBuilder = createMockQueryBuilder(mockItem);
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const args: ValidationArguments = {
        constraints: ['spare_part_types'],
        property: 'type_code',
        targetName: 'CreateSparePartDto',
        value: 'mechanical',
        object: {},
      };

      const result = await validator.validate('mechanical', args);

      expect(result).toBe(true);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('d.code = :dictionaryCode', {
        dictionaryCode: 'spare_part_types',
      });
    });

    it('should validate writeoff_reasons codes', async () => {
      const mockItem = { id: 'item-1', code: 'expired' };
      const mockQueryBuilder = createMockQueryBuilder(mockItem);
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const args: ValidationArguments = {
        constraints: ['writeoff_reasons'],
        property: 'reason_code',
        targetName: 'CreateWriteoffDto',
        value: 'expired',
        object: {},
      };

      const result = await validator.validate('expired', args);

      expect(result).toBe(true);
    });

    it('should validate postpone_reasons codes', async () => {
      const mockItem = { id: 'item-1', code: 'location_closed' };
      const mockQueryBuilder = createMockQueryBuilder(mockItem);
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const args: ValidationArguments = {
        constraints: ['postpone_reasons'],
        property: 'reason_code',
        targetName: 'PostponeTaskDto',
        value: 'location_closed',
        object: {},
      };

      const result = await validator.validate('location_closed', args);

      expect(result).toBe(true);
    });

    it('should validate complaint_sources codes', async () => {
      const mockItem = { id: 'item-1', code: 'qr_scan' };
      const mockQueryBuilder = createMockQueryBuilder(mockItem);
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const args: ValidationArguments = {
        constraints: ['complaint_sources'],
        property: 'source_code',
        targetName: 'CreateComplaintDto',
        value: 'qr_scan',
        object: {},
      };

      const result = await validator.validate('qr_scan', args);

      expect(result).toBe(true);
    });

    it('should validate vat_groups codes', async () => {
      const mockItem = { id: 'item-1', code: 'vat_15' };
      const mockQueryBuilder = createMockQueryBuilder(mockItem);
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const args: ValidationArguments = {
        constraints: ['vat_groups'],
        property: 'vat_code',
        targetName: 'CreateInvoiceDto',
        value: 'vat_15',
        object: {},
      };

      const result = await validator.validate('vat_15', args);

      expect(result).toBe(true);
    });

    it('should validate user_roles codes', async () => {
      const mockItem = { id: 'item-1', code: 'operator' };
      const mockQueryBuilder = createMockQueryBuilder(mockItem);
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const args: ValidationArguments = {
        constraints: ['user_roles'],
        property: 'role_code',
        targetName: 'AssignRoleDto',
        value: 'operator',
        object: {},
      };

      const result = await validator.validate('operator', args);

      expect(result).toBe(true);
    });

    it('should validate income_categories codes', async () => {
      const mockItem = { id: 'item-1', code: 'product_sales' };
      const mockQueryBuilder = createMockQueryBuilder(mockItem);
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const args: ValidationArguments = {
        constraints: ['income_categories'],
        property: 'category_code',
        targetName: 'CreateIncomeDto',
        value: 'product_sales',
        object: {},
      };

      const result = await validator.validate('product_sales', args);

      expect(result).toBe(true);
    });

    it('should validate inventory_movement_types codes', async () => {
      const mockItem = { id: 'item-1', code: 'refill' };
      const mockQueryBuilder = createMockQueryBuilder(mockItem);
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const args: ValidationArguments = {
        constraints: ['inventory_movement_types'],
        property: 'movement_type',
        targetName: 'CreateMovementDto',
        value: 'refill',
        object: {},
      };

      const result = await validator.validate('refill', args);

      expect(result).toBe(true);
    });
  });
});
