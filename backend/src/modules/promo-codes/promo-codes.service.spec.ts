import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PromoCodesService } from './promo-codes.service';
import { PromoCode, PromoCodeRedemption } from './entities';
import { PromoCodeType, PromoCodeStatus } from './enums';
import { CreatePromoCodeDto, ValidatePromoCodeDto } from './dto';

describe('PromoCodesService', () => {
  let service: PromoCodesService;
  let promoCodeRepository: jest.Mocked<Repository<PromoCode>>;
  let redemptionRepository: jest.Mocked<Repository<PromoCodeRedemption>>;
  let dataSource: jest.Mocked<DataSource>;
  let mockQueryBuilder: any;

  const mockPromoCode: PromoCode = {
    id: 'promo-uuid-1',
    code: 'TEST20',
    type: PromoCodeType.PERCENTAGE,
    value: 20,
    valid_from: new Date('2024-01-01'),
    valid_until: new Date('2025-12-31'),
    status: PromoCodeStatus.ACTIVE,
    max_uses: 100,
    max_uses_per_user: 1,
    current_uses: 10,
    minimum_order_amount: 10000,
    maximum_discount: 5000,
    applicable_products: null,
    applicable_locations: null,
    applicable_machines: null,
    name: 'Test Promo',
    description: 'Test description',
    organization_id: null,
    organization: null,
    created_by_id: 'user-uuid-1',
    created_by: null,
    redemptions: [],
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    isValid: jest.fn().mockReturnValue(true),
  };

  const mockRedemption: PromoCodeRedemption = {
    id: 'redemption-uuid-1',
    promo_code_id: 'promo-uuid-1',
    promo_code: mockPromoCode,
    client_user_id: 'client-uuid-1',
    client_user: null as any,
    order_id: 'order-uuid-1',
    order: null,
    discount_applied: 2000,
    loyalty_bonus_awarded: 0,
    created_at: new Date(),
  };

  const createMockPromoCode = (overrides: Partial<PromoCode> = {}): PromoCode => ({
    ...mockPromoCode,
    isValid: jest.fn().mockReturnValue(true),
    ...overrides,
  });

  beforeEach(async () => {
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockPromoCode], 1]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoCodesService,
        {
          provide: getRepositoryToken(PromoCode),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softRemove: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            increment: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PromoCodeRedemption),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PromoCodesService>(PromoCodesService);
    promoCodeRepository = module.get(getRepositoryToken(PromoCode));
    redemptionRepository = module.get(getRepositoryToken(PromoCodeRedemption));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreatePromoCodeDto = {
      code: 'NEWCODE',
      type: PromoCodeType.PERCENTAGE,
      value: 15,
      valid_from: '2024-01-01',
      valid_until: '2025-12-31',
    };

    it('should create a new promo code', async () => {
      promoCodeRepository.findOne.mockResolvedValue(null);
      promoCodeRepository.create.mockReturnValue(createMockPromoCode({ code: 'NEWCODE' }));
      promoCodeRepository.save.mockResolvedValue(createMockPromoCode({ code: 'NEWCODE' }));

      const result = await service.create(createDto, 'user-uuid-1');

      expect(promoCodeRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'NEWCODE' },
        withDeleted: true,
      });
      expect(promoCodeRepository.create).toHaveBeenCalled();
      expect(promoCodeRepository.save).toHaveBeenCalled();
      expect(result.code).toBe('NEWCODE');
    });

    it('should throw ConflictException if code already exists', async () => {
      promoCodeRepository.findOne.mockResolvedValue(mockPromoCode);

      await expect(service.create(createDto, 'user-uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if percentage > 100', async () => {
      promoCodeRepository.findOne.mockResolvedValue(null);
      const dto = { ...createDto, value: 150 };

      await expect(service.create(dto, 'user-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should convert code to uppercase', async () => {
      promoCodeRepository.findOne.mockResolvedValue(null);
      promoCodeRepository.create.mockImplementation((data) => data as PromoCode);
      promoCodeRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as PromoCode),
      );

      const dto = { ...createDto, code: 'lowercase' };
      await service.create(dto, 'user-uuid-1');

      expect(promoCodeRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'LOWERCASE' },
        withDeleted: true,
      });
    });

    it('should set default status to DRAFT', async () => {
      promoCodeRepository.findOne.mockResolvedValue(null);
      promoCodeRepository.create.mockImplementation((data) => data as PromoCode);
      promoCodeRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as PromoCode),
      );

      const dto = { ...createDto };
      delete (dto as any).status;

      await service.create(dto, 'user-uuid-1');

      expect(promoCodeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PromoCodeStatus.DRAFT,
        }),
      );
    });

    it('should create promo code without valid_until', async () => {
      promoCodeRepository.findOne.mockResolvedValue(null);
      promoCodeRepository.create.mockImplementation((data) => data as PromoCode);
      promoCodeRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as PromoCode),
      );

      const dto = { ...createDto };
      delete (dto as any).valid_until;

      await service.create(dto, 'user-uuid-1');

      expect(promoCodeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          valid_until: null,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated promo codes', async () => {
      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({ data: [mockPromoCode], total: 1 });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should apply search filter', async () => {
      await service.findAll({ search: 'test' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(promo.code ILIKE :search OR promo.name ILIKE :search)',
        { search: '%test%' },
      );
    });

    it('should apply status filter', async () => {
      await service.findAll({ status: PromoCodeStatus.ACTIVE });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('promo.status = :status', {
        status: PromoCodeStatus.ACTIVE,
      });
    });

    it('should apply type filter', async () => {
      await service.findAll({ type: PromoCodeType.PERCENTAGE });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('promo.type = :type', {
        type: PromoCodeType.PERCENTAGE,
      });
    });

    it('should apply organization filter', async () => {
      await service.findAll({ organization_id: 'org-uuid-1' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'promo.organization_id = :organization_id',
        { organization_id: 'org-uuid-1' },
      );
    });

    it('should apply active_only filter', async () => {
      await service.findAll({ active_only: true });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('promo.status = :activeStatus', {
        activeStatus: PromoCodeStatus.ACTIVE,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('promo.valid_from <= :now', expect.any(Object));
    });

    it('should apply sorting', async () => {
      await service.findAll({ sort_by: 'code', sort_order: 'ASC' });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('promo.code', 'ASC');
    });

    it('should use default sort field for invalid sort_by', async () => {
      await service.findAll({ sort_by: 'invalid_field' });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('promo.created_at', 'DESC');
    });

    it('should calculate correct skip offset for pagination', async () => {
      await service.findAll({ page: 3, limit: 10 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('findOne', () => {
    it('should return a promo code by id', async () => {
      promoCodeRepository.findOne.mockResolvedValue(mockPromoCode);

      const result = await service.findOne('promo-uuid-1');

      expect(result).toEqual(mockPromoCode);
      expect(promoCodeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'promo-uuid-1' },
        relations: ['created_by', 'organization'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      promoCodeRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    it('should return promo code by code string', async () => {
      promoCodeRepository.findOne.mockResolvedValue(mockPromoCode);

      const result = await service.findByCode('test20');

      expect(result).toEqual(mockPromoCode);
      expect(promoCodeRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'TEST20' },
      });
    });

    it('should return null if not found', async () => {
      promoCodeRepository.findOne.mockResolvedValue(null);

      const result = await service.findByCode('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a promo code', async () => {
      promoCodeRepository.findOne.mockResolvedValue(createMockPromoCode());
      promoCodeRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as PromoCode),
      );

      const result = await service.update('promo-uuid-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw BadRequestException if percentage > 100 on update', async () => {
      promoCodeRepository.findOne.mockResolvedValue(createMockPromoCode());

      await expect(
        service.update('promo-uuid-1', {
          type: PromoCodeType.PERCENTAGE,
          value: 150,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update dates when provided', async () => {
      promoCodeRepository.findOne.mockResolvedValue(createMockPromoCode());
      promoCodeRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as PromoCode),
      );

      await service.update('promo-uuid-1', {
        valid_from: '2025-01-01',
        valid_until: '2025-06-30',
      });

      expect(promoCodeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          valid_from: new Date('2025-01-01'),
          valid_until: new Date('2025-06-30'),
        }),
      );
    });

    it('should throw NotFoundException if promo code not found', async () => {
      promoCodeRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft remove a promo code', async () => {
      promoCodeRepository.findOne.mockResolvedValue(mockPromoCode);
      promoCodeRepository.softRemove.mockResolvedValue(mockPromoCode);

      await service.remove('promo-uuid-1');

      expect(promoCodeRepository.softRemove).toHaveBeenCalledWith(mockPromoCode);
    });

    it('should throw NotFoundException if not found', async () => {
      promoCodeRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validate', () => {
    const validateDto: ValidatePromoCodeDto = {
      code: 'TEST20',
      order_amount: 50000,
    };

    it('should return valid response for valid promo code', async () => {
      const validPromoCode = {
        ...mockPromoCode,
        isValid: () => true,
      };
      promoCodeRepository.findOne.mockResolvedValue(validPromoCode);
      redemptionRepository.count.mockResolvedValue(0);

      const result = await service.validate(validateDto, 'client-uuid-1');

      expect(result.valid).toBe(true);
      expect(result.promo_code_id).toBe('promo-uuid-1');
      expect(result.discount_amount).toBeDefined();
    });

    it('should return invalid if code not found', async () => {
      promoCodeRepository.findOne.mockResolvedValue(null);

      const result = await service.validate(validateDto, 'client-uuid-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промокод не найден');
    });

    it('should return invalid if code is draft', async () => {
      const draftPromoCode = {
        ...mockPromoCode,
        status: PromoCodeStatus.DRAFT,
        isValid: () => false,
      };
      promoCodeRepository.findOne.mockResolvedValue(draftPromoCode);

      const result = await service.validate(validateDto, 'client-uuid-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промокод ещё не активирован');
    });

    it('should return invalid if code is paused', async () => {
      const pausedPromoCode = {
        ...mockPromoCode,
        status: PromoCodeStatus.PAUSED,
        isValid: () => false,
      };
      promoCodeRepository.findOne.mockResolvedValue(pausedPromoCode);

      const result = await service.validate(validateDto, 'client-uuid-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промокод временно приостановлен');
    });

    it('should return invalid if code is expired', async () => {
      const expiredPromoCode = {
        ...mockPromoCode,
        status: PromoCodeStatus.EXPIRED,
        isValid: () => false,
      };
      promoCodeRepository.findOne.mockResolvedValue(expiredPromoCode);

      const result = await service.validate(validateDto, 'client-uuid-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Срок действия промокода истёк');
    });

    it('should return invalid if max uses reached', async () => {
      const maxedPromoCode = {
        ...mockPromoCode,
        max_uses: 100,
        current_uses: 100,
        status: PromoCodeStatus.ACTIVE,
        isValid: () => false,
      };
      promoCodeRepository.findOne.mockResolvedValue(maxedPromoCode);

      const result = await service.validate(validateDto, 'client-uuid-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Лимит использования промокода исчерпан');
    });

    it('should return invalid if user already used code', async () => {
      const validPromoCode = {
        ...mockPromoCode,
        isValid: () => true,
      };
      promoCodeRepository.findOne.mockResolvedValue(validPromoCode);
      redemptionRepository.count.mockResolvedValue(1);

      const result = await service.validate(validateDto, 'client-uuid-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Вы уже использовали этот промокод');
    });

    it('should return invalid if order amount below minimum', async () => {
      const validPromoCode = {
        ...mockPromoCode,
        minimum_order_amount: 100000,
        isValid: () => true,
      };
      promoCodeRepository.findOne.mockResolvedValue(validPromoCode);
      redemptionRepository.count.mockResolvedValue(0);

      const result = await service.validate(
        { ...validateDto, order_amount: 5000 },
        'client-uuid-1',
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Минимальная сумма заказа');
    });

    it('should return invalid if machine not in applicable list', async () => {
      const validPromoCode = {
        ...mockPromoCode,
        applicable_machines: ['machine-1', 'machine-2'],
        isValid: () => true,
      };
      promoCodeRepository.findOne.mockResolvedValue(validPromoCode);
      redemptionRepository.count.mockResolvedValue(0);

      const result = await service.validate(
        { ...validateDto, machine_id: 'machine-3' },
        'client-uuid-1',
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промокод недействителен для этого автомата');
    });

    it('should return invalid if location not in applicable list', async () => {
      const validPromoCode = {
        ...mockPromoCode,
        applicable_locations: ['loc-1', 'loc-2'],
        isValid: () => true,
      };
      promoCodeRepository.findOne.mockResolvedValue(validPromoCode);
      redemptionRepository.count.mockResolvedValue(0);

      const result = await service.validate(
        { ...validateDto, location_id: 'loc-3' },
        'client-uuid-1',
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промокод недействителен для этой локации');
    });

    it('should return invalid if products not in applicable list', async () => {
      const validPromoCode = {
        ...mockPromoCode,
        applicable_products: ['prod-1', 'prod-2'],
        isValid: () => true,
      };
      promoCodeRepository.findOne.mockResolvedValue(validPromoCode);
      redemptionRepository.count.mockResolvedValue(0);

      const result = await service.validate(
        { ...validateDto, product_ids: ['prod-3', 'prod-4'] },
        'client-uuid-1',
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промокод не применим к товарам в заказе');
    });

    it('should return valid if product is in applicable list', async () => {
      const validPromoCode = {
        ...mockPromoCode,
        applicable_products: ['prod-1', 'prod-2'],
        isValid: () => true,
      };
      promoCodeRepository.findOne.mockResolvedValue(validPromoCode);
      redemptionRepository.count.mockResolvedValue(0);

      const result = await service.validate(
        { ...validateDto, product_ids: ['prod-1', 'prod-3'] },
        'client-uuid-1',
      );

      expect(result.valid).toBe(true);
    });

    it('should return bonus points for loyalty bonus type', async () => {
      const bonusPromoCode = {
        ...mockPromoCode,
        type: PromoCodeType.LOYALTY_BONUS,
        value: 500,
        isValid: () => true,
      };
      promoCodeRepository.findOne.mockResolvedValue(bonusPromoCode);
      redemptionRepository.count.mockResolvedValue(0);

      const result = await service.validate(validateDto, 'client-uuid-1');

      expect(result.valid).toBe(true);
      expect(result.bonus_points).toBe(500);
      expect(result.discount_amount).toBe(0);
    });
  });

  describe('calculateDiscount', () => {
    it('should calculate percentage discount', () => {
      const promoCode = createMockPromoCode({
        type: PromoCodeType.PERCENTAGE,
        value: 20,
        maximum_discount: null,
      });

      const result = service.calculateDiscount(promoCode, 10000);

      expect(result).toBe(2000);
    });

    it('should cap percentage discount at maximum_discount', () => {
      const promoCode = createMockPromoCode({
        type: PromoCodeType.PERCENTAGE,
        value: 50,
        maximum_discount: 3000,
      });

      const result = service.calculateDiscount(promoCode, 10000);

      expect(result).toBe(3000);
    });

    it('should calculate fixed amount discount', () => {
      const promoCode = createMockPromoCode({
        type: PromoCodeType.FIXED_AMOUNT,
        value: 5000,
      });

      const result = service.calculateDiscount(promoCode, 10000);

      expect(result).toBe(5000);
    });

    it('should cap fixed amount at order amount', () => {
      const promoCode = createMockPromoCode({
        type: PromoCodeType.FIXED_AMOUNT,
        value: 15000,
      });

      const result = service.calculateDiscount(promoCode, 10000);

      expect(result).toBe(10000);
    });

    it('should return 0 for loyalty bonus type', () => {
      const promoCode = createMockPromoCode({
        type: PromoCodeType.LOYALTY_BONUS,
        value: 500,
      });

      const result = service.calculateDiscount(promoCode, 10000);

      expect(result).toBe(0);
    });

    it('should return 0 for unknown type', () => {
      const promoCode = createMockPromoCode({
        type: 'unknown' as PromoCodeType,
        value: 100,
      });

      const result = service.calculateDiscount(promoCode, 10000);

      expect(result).toBe(0);
    });
  });

  describe('applyToOrder', () => {
    it('should create redemption and increment usage', async () => {
      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === PromoCode) {
            return {
              findOne: jest.fn().mockResolvedValue(mockPromoCode),
              increment: jest.fn().mockResolvedValue(undefined),
              update: jest.fn().mockResolvedValue(undefined),
            };
          }
          return {
            create: jest.fn().mockReturnValue(mockRedemption),
            save: jest.fn().mockResolvedValue(mockRedemption),
          };
        }),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(async (cb: (manager: EntityManager) => Promise<any>) => {
        return cb(mockManager as unknown as EntityManager);
      });

      const result = await service.applyToOrder(
        'promo-uuid-1',
        'client-uuid-1',
        'order-uuid-1',
        2000,
        0,
      );

      expect(result).toEqual(mockRedemption);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should auto-expire code if max uses reached', async () => {
      const almostMaxedCode = {
        ...mockPromoCode,
        max_uses: 100,
        current_uses: 99,
      };

      const mockPromoCodeRepo = {
        findOne: jest.fn().mockResolvedValue(almostMaxedCode),
        increment: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
      };

      const mockRedemptionRepo = {
        create: jest.fn().mockReturnValue(mockRedemption),
        save: jest.fn().mockResolvedValue(mockRedemption),
      };

      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === PromoCode) {
            return mockPromoCodeRepo;
          }
          return mockRedemptionRepo;
        }),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(async (cb: (manager: EntityManager) => Promise<any>) => {
        return cb(mockManager as unknown as EntityManager);
      });

      await service.applyToOrder('promo-uuid-1', 'client-uuid-1', 'order-uuid-1', 2000, 0);

      expect(mockPromoCodeRepo.update).toHaveBeenCalledWith('promo-uuid-1', {
        status: PromoCodeStatus.EXPIRED,
      });
    });

    it('should throw NotFoundException if promo code not found', async () => {
      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
        }),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(async (cb: (manager: EntityManager) => Promise<any>) => {
        return cb(mockManager as unknown as EntityManager);
      });

      await expect(
        service.applyToOrder('non-existent', 'client-uuid-1', 'order-uuid-1', 2000, 0),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include loyalty bonus in redemption', async () => {
      const mockRedemptionWithBonus = {
        ...mockRedemption,
        loyalty_bonus_awarded: 100,
      };

      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === PromoCode) {
            return {
              findOne: jest.fn().mockResolvedValue(mockPromoCode),
              increment: jest.fn().mockResolvedValue(undefined),
              update: jest.fn().mockResolvedValue(undefined),
            };
          }
          return {
            create: jest.fn().mockReturnValue(mockRedemptionWithBonus),
            save: jest.fn().mockResolvedValue(mockRedemptionWithBonus),
          };
        }),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(async (cb: (manager: EntityManager) => Promise<any>) => {
        return cb(mockManager as unknown as EntityManager);
      });

      const result = await service.applyToOrder(
        'promo-uuid-1',
        'client-uuid-1',
        'order-uuid-1',
        0,
        100,
      );

      expect(result.loyalty_bonus_awarded).toBe(100);
    });
  });

  describe('getStats', () => {
    it('should return promo code statistics', async () => {
      promoCodeRepository.findOne.mockResolvedValue(mockPromoCode);
      redemptionRepository.find.mockResolvedValue([
        {
          ...mockRedemption,
          client_user_id: 'client-1',
          discount_applied: 1000,
          loyalty_bonus_awarded: 50,
          created_at: new Date('2024-06-15'),
        },
        {
          ...mockRedemption,
          client_user_id: 'client-2',
          discount_applied: 2000,
          loyalty_bonus_awarded: 100,
          created_at: new Date('2024-06-15'),
        },
        {
          ...mockRedemption,
          client_user_id: 'client-1',
          discount_applied: 1500,
          loyalty_bonus_awarded: 0,
          created_at: new Date('2024-06-16'),
        },
      ]);

      const result = await service.getStats('promo-uuid-1');

      expect(result.total_redemptions).toBe(3);
      expect(result.total_discount_given).toBe(4500);
      expect(result.total_bonus_awarded).toBe(150);
      expect(result.unique_users).toBe(2);
      expect(result.redemptions_by_day.length).toBe(2);
    });

    it('should throw NotFoundException if promo code not found', async () => {
      promoCodeRepository.findOne.mockResolvedValue(null);

      await expect(service.getStats('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return empty stats for code with no redemptions', async () => {
      promoCodeRepository.findOne.mockResolvedValue(mockPromoCode);
      redemptionRepository.find.mockResolvedValue([]);

      const result = await service.getStats('promo-uuid-1');

      expect(result.total_redemptions).toBe(0);
      expect(result.total_discount_given).toBe(0);
      expect(result.unique_users).toBe(0);
      expect(result.redemptions_by_day).toEqual([]);
    });
  });

  describe('activate', () => {
    it('should activate a draft promo code', async () => {
      const draftCode = createMockPromoCode({ status: PromoCodeStatus.DRAFT });
      promoCodeRepository.findOne.mockResolvedValue(draftCode);
      promoCodeRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as PromoCode),
      );

      const result = await service.activate('promo-uuid-1');

      expect(result.status).toBe(PromoCodeStatus.ACTIVE);
    });

    it('should throw BadRequestException if already active', async () => {
      promoCodeRepository.findOne.mockResolvedValue(mockPromoCode);

      await expect(service.activate('promo-uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if not found', async () => {
      promoCodeRepository.findOne.mockResolvedValue(null);

      await expect(service.activate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('pause', () => {
    it('should pause an active promo code', async () => {
      promoCodeRepository.findOne.mockResolvedValue(createMockPromoCode());
      promoCodeRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as PromoCode),
      );

      const result = await service.pause('promo-uuid-1');

      expect(result.status).toBe(PromoCodeStatus.PAUSED);
    });

    it('should throw BadRequestException if not active', async () => {
      const draftCode = createMockPromoCode({ status: PromoCodeStatus.DRAFT });
      promoCodeRepository.findOne.mockResolvedValue(draftCode);

      await expect(service.pause('promo-uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if not found', async () => {
      promoCodeRepository.findOne.mockResolvedValue(null);

      await expect(service.pause('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('expireOutdatedCodes', () => {
    it('should expire outdated codes and return count', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 5 });

      const result = await service.expireOutdatedCodes();

      expect(result).toBe(5);
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        status: PromoCodeStatus.EXPIRED,
      });
    });

    it('should return 0 if no codes expired', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      const result = await service.expireOutdatedCodes();

      expect(result).toBe(0);
    });

    it('should return 0 if affected is undefined', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: undefined });

      const result = await service.expireOutdatedCodes();

      expect(result).toBe(0);
    });
  });
});
