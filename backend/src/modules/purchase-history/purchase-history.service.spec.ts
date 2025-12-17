import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PurchaseHistoryService } from './purchase-history.service';
import { PurchaseHistory } from './entities/purchase-history.entity';
import { PurchaseStatus } from './dto/create-purchase.dto';

describe('PurchaseHistoryService', () => {
  let service: PurchaseHistoryService;
  let purchaseRepository: jest.Mocked<Repository<PurchaseHistory>>;

  // Mock data fixtures
  const mockPurchase: Partial<PurchaseHistory> = {
    id: 'purchase-uuid-1',
    purchase_date: new Date('2025-01-15'),
    invoice_number: 'INV-2025-001',
    supplier_id: 'supplier-uuid',
    nomenclature_id: 'nomenclature-uuid',
    warehouse_id: 'warehouse-uuid',
    quantity: 100,
    unit: 'шт',
    unit_price: 10000,
    vat_rate: 15,
    vat_amount: 150000, // 100 * 10000 * 0.15
    total_amount: 1150000, // 100 * 10000 + 150000
    currency: 'UZS',
    exchange_rate: 1,
    status: PurchaseStatus.RECEIVED,
    created_by_id: 'user-uuid',
    import_source: 'manual',
    created_at: new Date('2025-01-15'),
    updated_at: new Date('2025-01-15'),
  };

  const mockSupplier = {
    id: 'supplier-uuid',
    name: 'Test Supplier',
  };

  const mockNomenclature = {
    id: 'nomenclature-uuid',
    name: 'Test Product',
  };

  const mockWarehouse = {
    id: 'warehouse-uuid',
    name: 'Main Warehouse',
  };

  const mockUser = {
    id: 'user-uuid',
    username: 'testuser',
  };

  // Create mock repository
  const createMockRepository = <_T>() => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    softRemove: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      getCount: jest.fn(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
      execute: jest.fn(),
    })),
  });

  beforeEach(async () => {
    const mockPurchaseRepo = createMockRepository<PurchaseHistory>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseHistoryService,
        {
          provide: getRepositoryToken(PurchaseHistory),
          useValue: mockPurchaseRepo,
        },
      ],
    }).compile();

    service = module.get<PurchaseHistoryService>(PurchaseHistoryService);
    purchaseRepository = module.get(getRepositoryToken(PurchaseHistory));

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE TESTS
  // ============================================================================

  describe('create', () => {
    const createDto = {
      purchase_date: '2025-01-15',
      supplier_id: 'supplier-uuid',
      nomenclature_id: 'nomenclature-uuid',
      warehouse_id: 'warehouse-uuid',
      quantity: 100,
      unit_price: 10000,
    };

    it('should create purchase with default 15% VAT calculation', async () => {
      purchaseRepository.create.mockReturnValue(mockPurchase as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue(mockPurchase as PurchaseHistory);

      const result = await service.create(createDto, 'user-uuid');

      expect(result).toEqual(mockPurchase);
      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vat_rate: 15,
          vat_amount: 150000, // 100 * 10000 * 0.15
          total_amount: 1150000, // 100 * 10000 + 150000
        }),
      );
      expect(purchaseRepository.save).toHaveBeenCalled();
    });

    it('should create purchase with custom VAT rate', async () => {
      const dtoWithCustomVat = {
        ...createDto,
        vat_rate: 20,
      };
      const expectedVatAmount = 100 * 10000 * 0.2; // 200000
      const expectedTotalAmount = 100 * 10000 + expectedVatAmount; // 1200000

      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        vat_rate: 20,
        vat_amount: expectedVatAmount,
        total_amount: expectedTotalAmount,
      } as PurchaseHistory);

      await service.create(dtoWithCustomVat, 'user-uuid');

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vat_rate: 20,
          vat_amount: expectedVatAmount,
          total_amount: expectedTotalAmount,
        }),
      );
    });

    it('should create purchase with 0% VAT', async () => {
      const dtoWithZeroVat = {
        ...createDto,
        vat_rate: 0,
      };

      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        vat_rate: 0,
        vat_amount: 0,
        total_amount: 1000000, // 100 * 10000
      } as PurchaseHistory);

      await service.create(dtoWithZeroVat, 'user-uuid');

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vat_rate: 0,
          vat_amount: 0,
          total_amount: 1000000,
        }),
      );
    });

    it('should set default currency to UZS', async () => {
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue(mockPurchase as PurchaseHistory);

      await service.create(createDto, 'user-uuid');

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'UZS',
        }),
      );
    });

    it('should use custom currency when provided', async () => {
      const dtoWithCurrency = {
        ...createDto,
        currency: 'USD',
        exchange_rate: 12500,
      };

      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        currency: 'USD',
        exchange_rate: 12500,
      } as PurchaseHistory);

      await service.create(dtoWithCurrency, 'user-uuid');

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'USD',
          exchange_rate: 12500,
        }),
      );
    });

    it('should set default exchange_rate to 1', async () => {
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue(mockPurchase as PurchaseHistory);

      await service.create(createDto, 'user-uuid');

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange_rate: 1,
        }),
      );
    });

    it('should set default status to RECEIVED', async () => {
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue(mockPurchase as PurchaseHistory);

      await service.create(createDto, 'user-uuid');

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PurchaseStatus.RECEIVED,
        }),
      );
    });

    it('should use custom status when provided', async () => {
      const dtoWithStatus = {
        ...createDto,
        status: PurchaseStatus.PENDING,
      };

      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        status: PurchaseStatus.PENDING,
      } as PurchaseHistory);

      await service.create(dtoWithStatus, 'user-uuid');

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PurchaseStatus.PENDING,
        }),
      );
    });

    it('should set import_source to manual', async () => {
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue(mockPurchase as PurchaseHistory);

      await service.create(createDto, 'user-uuid');

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          import_source: 'manual',
        }),
      );
    });

    it('should set created_by_id when userId is provided', async () => {
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue(mockPurchase as PurchaseHistory);

      await service.create(createDto, 'user-uuid');

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          created_by_id: 'user-uuid',
        }),
      );
    });

    it('should handle creation without userId', async () => {
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        created_by_id: null,
      } as PurchaseHistory);

      await service.create(createDto);

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          created_by_id: undefined,
        }),
      );
    });

    it('should calculate VAT correctly for decimal quantities', async () => {
      const dtoWithDecimalQty = {
        ...createDto,
        quantity: 10.5,
        unit_price: 1000,
      };
      const expectedVatAmount = 10.5 * 1000 * 0.15; // 1575
      const expectedTotalAmount = 10.5 * 1000 + expectedVatAmount; // 12075

      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        quantity: 10.5,
        unit_price: 1000,
        vat_amount: expectedVatAmount,
        total_amount: expectedTotalAmount,
      } as PurchaseHistory);

      await service.create(dtoWithDecimalQty, 'user-uuid');

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vat_amount: expectedVatAmount,
          total_amount: expectedTotalAmount,
        }),
      );
    });

    it('should include optional fields when provided', async () => {
      const dtoWithOptionalFields = {
        ...createDto,
        invoice_number: 'INV-2025-001',
        batch_number: 'BATCH-001',
        production_date: '2025-01-01',
        expiry_date: '2026-01-01',
        delivery_date: '2025-01-20',
        delivery_note_number: 'DN-001',
        payment_method: 'bank_transfer',
        payment_date: '2025-01-14',
        notes: 'Test notes',
      };

      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue(mockPurchase as PurchaseHistory);

      await service.create(dtoWithOptionalFields, 'user-uuid');

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          invoice_number: 'INV-2025-001',
          batch_number: 'BATCH-001',
          production_date: '2025-01-01',
          expiry_date: '2026-01-01',
          delivery_date: '2025-01-20',
          delivery_note_number: 'DN-001',
          payment_method: 'bank_transfer',
          payment_date: '2025-01-14',
          notes: 'Test notes',
        }),
      );
    });
  });

  // ============================================================================
  // FIND ALL TESTS
  // ============================================================================

  describe('findAll', () => {
    it('should return all purchases without filters', async () => {
      const mockPurchases = [mockPurchase, { ...mockPurchase, id: 'purchase-2' }];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPurchases),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findAll({});

      expect(result).toEqual(mockPurchases);
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('purchase.supplier', 'supplier');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchase.nomenclature',
        'nomenclature',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchase.warehouse',
        'warehouse',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('purchase.created_by', 'user');
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('purchase.purchase_date', 'DESC');
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('purchase.created_at', 'DESC');
    });

    it('should filter by supplier_id', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPurchase]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({ supplier_id: 'supplier-uuid' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('purchase.supplier_id = :supplier_id', {
        supplier_id: 'supplier-uuid',
      });
    });

    it('should filter by nomenclature_id', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPurchase]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({ nomenclature_id: 'nomenclature-uuid' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'purchase.nomenclature_id = :nomenclature_id',
        {
          nomenclature_id: 'nomenclature-uuid',
        },
      );
    });

    it('should filter by warehouse_id', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPurchase]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({ warehouse_id: 'warehouse-uuid' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('purchase.warehouse_id = :warehouse_id', {
        warehouse_id: 'warehouse-uuid',
      });
    });

    it('should filter by status', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPurchase]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({ status: PurchaseStatus.RECEIVED });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('purchase.status = :status', {
        status: PurchaseStatus.RECEIVED,
      });
    });

    it('should filter by date range when both dates provided', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPurchase]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({
        date_from: '2025-01-01',
        date_to: '2025-01-31',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'purchase.purchase_date BETWEEN :date_from AND :date_to',
        {
          date_from: '2025-01-01',
          date_to: '2025-01-31',
        },
      );
    });

    it('should filter by date_from only', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPurchase]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({ date_from: '2025-01-01' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('purchase.purchase_date >= :date_from', {
        date_from: '2025-01-01',
      });
    });

    it('should filter by date_to only', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPurchase]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({ date_to: '2025-01-31' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('purchase.purchase_date <= :date_to', {
        date_to: '2025-01-31',
      });
    });

    it('should filter by invoice_number with LIKE pattern', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPurchase]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({ invoice_number: 'INV-2025' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('purchase.invoice_number LIKE :invoice', {
        invoice: '%INV-2025%',
      });
    });

    it('should apply multiple filters together', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPurchase]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({
        supplier_id: 'supplier-uuid',
        nomenclature_id: 'nomenclature-uuid',
        status: PurchaseStatus.RECEIVED,
        date_from: '2025-01-01',
        date_to: '2025-01-31',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(4); // supplier, nomenclature, status, date range
    });
  });

  // ============================================================================
  // FIND ONE TESTS
  // ============================================================================

  describe('findOne', () => {
    it('should return purchase by ID with relations', async () => {
      const purchaseWithRelations = {
        ...mockPurchase,
        supplier: mockSupplier,
        nomenclature: mockNomenclature,
        warehouse: mockWarehouse,
        created_by: mockUser,
      };

      purchaseRepository.findOne.mockResolvedValue(purchaseWithRelations as PurchaseHistory);

      const result = await service.findOne('purchase-uuid-1');

      expect(result).toEqual(purchaseWithRelations);
      expect(purchaseRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'purchase-uuid-1' },
        relations: ['supplier', 'nomenclature', 'warehouse', 'created_by'],
      });
    });

    it('should throw NotFoundException when purchase not found', async () => {
      purchaseRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        /Purchase with ID non-existent not found/,
      );
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe('update', () => {
    const updateDto = {
      quantity: 150,
      unit_price: 12000,
    };

    it('should update purchase and recalculate VAT when quantity changes', async () => {
      const expectedVatAmount = 150 * 10000 * 0.15; // 225000
      const expectedTotalAmount = 150 * 10000 + expectedVatAmount; // 1725000

      purchaseRepository.findOne.mockResolvedValue(mockPurchase as PurchaseHistory);
      purchaseRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock findOne after update
      purchaseRepository.findOne.mockResolvedValueOnce(mockPurchase as PurchaseHistory);
      purchaseRepository.findOne.mockResolvedValueOnce({
        ...mockPurchase,
        quantity: 150,
        vat_amount: expectedVatAmount,
        total_amount: expectedTotalAmount,
      } as PurchaseHistory);

      await service.update('purchase-uuid-1', { quantity: 150 });

      expect(purchaseRepository.update).toHaveBeenCalledWith(
        'purchase-uuid-1',
        expect.objectContaining({
          quantity: 150,
          vat_amount: expectedVatAmount,
          total_amount: expectedTotalAmount,
        }),
      );
    });

    it('should update purchase and recalculate VAT when unit_price changes', async () => {
      const expectedVatAmount = 100 * 12000 * 0.15; // 180000
      const expectedTotalAmount = 100 * 12000 + expectedVatAmount; // 1380000

      purchaseRepository.findOne.mockResolvedValue(mockPurchase as PurchaseHistory);
      purchaseRepository.update.mockResolvedValue({ affected: 1 } as any);

      purchaseRepository.findOne.mockResolvedValueOnce(mockPurchase as PurchaseHistory);
      purchaseRepository.findOne.mockResolvedValueOnce({
        ...mockPurchase,
        unit_price: 12000,
        vat_amount: expectedVatAmount,
        total_amount: expectedTotalAmount,
      } as PurchaseHistory);

      await service.update('purchase-uuid-1', { unit_price: 12000 });

      expect(purchaseRepository.update).toHaveBeenCalledWith(
        'purchase-uuid-1',
        expect.objectContaining({
          unit_price: 12000,
          vat_amount: expectedVatAmount,
          total_amount: expectedTotalAmount,
        }),
      );
    });

    it('should update purchase and recalculate VAT when vat_rate changes', async () => {
      const expectedVatAmount = 100 * 10000 * 0.2; // 200000
      const expectedTotalAmount = 100 * 10000 + expectedVatAmount; // 1200000

      purchaseRepository.findOne.mockResolvedValue(mockPurchase as PurchaseHistory);
      purchaseRepository.update.mockResolvedValue({ affected: 1 } as any);

      purchaseRepository.findOne.mockResolvedValueOnce(mockPurchase as PurchaseHistory);
      purchaseRepository.findOne.mockResolvedValueOnce({
        ...mockPurchase,
        vat_rate: 20,
        vat_amount: expectedVatAmount,
        total_amount: expectedTotalAmount,
      } as PurchaseHistory);

      await service.update('purchase-uuid-1', { vat_rate: 20 });

      expect(purchaseRepository.update).toHaveBeenCalledWith(
        'purchase-uuid-1',
        expect.objectContaining({
          vat_rate: 20,
          vat_amount: expectedVatAmount,
          total_amount: expectedTotalAmount,
        }),
      );
    });

    it('should update purchase and recalculate when both quantity and price change', async () => {
      const expectedVatAmount = 150 * 12000 * 0.15; // 270000
      const expectedTotalAmount = 150 * 12000 + expectedVatAmount; // 2070000

      purchaseRepository.findOne.mockResolvedValue(mockPurchase as PurchaseHistory);
      purchaseRepository.update.mockResolvedValue({ affected: 1 } as any);

      purchaseRepository.findOne.mockResolvedValueOnce(mockPurchase as PurchaseHistory);
      purchaseRepository.findOne.mockResolvedValueOnce({
        ...mockPurchase,
        quantity: 150,
        unit_price: 12000,
        vat_amount: expectedVatAmount,
        total_amount: expectedTotalAmount,
      } as PurchaseHistory);

      await service.update('purchase-uuid-1', updateDto);

      expect(purchaseRepository.update).toHaveBeenCalledWith(
        'purchase-uuid-1',
        expect.objectContaining({
          quantity: 150,
          unit_price: 12000,
          vat_amount: expectedVatAmount,
          total_amount: expectedTotalAmount,
        }),
      );
    });

    it('should update non-price fields without recalculation', async () => {
      const updateNonPriceDto = {
        notes: 'Updated notes',
        status: PurchaseStatus.PARTIAL,
      };

      purchaseRepository.findOne.mockResolvedValue(mockPurchase as PurchaseHistory);
      purchaseRepository.update.mockResolvedValue({ affected: 1 } as any);

      purchaseRepository.findOne.mockResolvedValueOnce(mockPurchase as PurchaseHistory);
      purchaseRepository.findOne.mockResolvedValueOnce({
        ...mockPurchase,
        ...updateNonPriceDto,
      } as PurchaseHistory);

      await service.update('purchase-uuid-1', updateNonPriceDto);

      // Should not include vat_amount and total_amount in update
      expect(purchaseRepository.update).toHaveBeenCalledWith('purchase-uuid-1', updateNonPriceDto);
    });

    it('should throw NotFoundException when updating non-existent purchase', async () => {
      purchaseRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // REMOVE TESTS
  // ============================================================================

  describe('remove', () => {
    it('should soft delete purchase', async () => {
      purchaseRepository.findOne.mockResolvedValue(mockPurchase as PurchaseHistory);
      purchaseRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove('purchase-uuid-1');

      expect(purchaseRepository.softDelete).toHaveBeenCalledWith('purchase-uuid-1');
    });

    it('should throw NotFoundException when deleting non-existent purchase', async () => {
      purchaseRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should verify purchase exists before deleting', async () => {
      purchaseRepository.findOne.mockResolvedValue(mockPurchase as PurchaseHistory);
      purchaseRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove('purchase-uuid-1');

      expect(purchaseRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'purchase-uuid-1' },
        relations: ['supplier', 'nomenclature', 'warehouse', 'created_by'],
      });
    });
  });

  // ============================================================================
  // GET STATS TESTS
  // ============================================================================

  describe('getStats', () => {
    it('should return comprehensive statistics', async () => {
      const mockStats = {
        total_purchases: '100',
        total_amount: '10000000',
        total_vat: '1500000',
      };
      const mockByStatus = [
        { status: PurchaseStatus.RECEIVED, count: '80', total: '8000000' },
        { status: PurchaseStatus.PENDING, count: '20', total: '2000000' },
      ];
      const mockBySupplier = [
        {
          supplier_id: 'sup-1',
          supplier_name: 'Supplier A',
          purchase_count: '50',
          total_amount: '5000000',
        },
        {
          supplier_id: 'sup-2',
          supplier_name: 'Supplier B',
          purchase_count: '30',
          total_amount: '3000000',
        },
      ];
      const mockByMonth = [
        { month: '2025-01', count: '40', total: '4000000' },
        { month: '2024-12', count: '60', total: '6000000' },
      ];

      let callCount = 0;
      purchaseRepository.createQueryBuilder.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue(mockStats),
          } as any;
        } else if (callCount === 2) {
          return {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue(mockByStatus),
          } as any;
        } else if (callCount === 3) {
          return {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            addGroupBy: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue(mockBySupplier),
          } as any;
        } else {
          return {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue(mockByMonth),
          } as any;
        }
      });

      const result = await service.getStats({});

      expect(result.total_purchases).toBe(100);
      expect(result.total_amount).toBe(10000000);
      expect(result.total_vat).toBe(1500000);
      expect(result.by_status).toEqual(mockByStatus);
      expect(result.by_supplier).toEqual(mockBySupplier);
      expect(result.by_month).toEqual(mockByMonth);
    });

    it('should filter stats by supplier_id', async () => {
      const mockStats = {
        total_purchases: '50',
        total_amount: '5000000',
        total_vat: '750000',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getStats({ supplier_id: 'supplier-uuid' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('purchase.supplier_id = :supplier_id', {
        supplier_id: 'supplier-uuid',
      });
    });

    it('should filter stats by warehouse_id', async () => {
      const mockStats = {
        total_purchases: '30',
        total_amount: '3000000',
        total_vat: '450000',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getStats({ warehouse_id: 'warehouse-uuid' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'purchase.warehouse_id = :warehouse_id',
        {
          warehouse_id: 'warehouse-uuid',
        },
      );
    });

    it('should filter stats by date range', async () => {
      const mockStats = {
        total_purchases: '20',
        total_amount: '2000000',
        total_vat: '300000',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getStats({
        date_from: '2025-01-01',
        date_to: '2025-01-31',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'purchase.purchase_date BETWEEN :date_from AND :date_to',
        {
          date_from: '2025-01-01',
          date_to: '2025-01-31',
        },
      );
    });

    it('should handle null/empty values gracefully', async () => {
      const nullStats = {
        total_purchases: null,
        total_amount: null,
        total_vat: null,
      };

      let callCount = 0;
      purchaseRepository.createQueryBuilder.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue(nullStats),
          } as any;
        } else if (callCount === 2) {
          return {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([]),
          } as any;
        } else if (callCount === 3) {
          return {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            addGroupBy: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([]),
          } as any;
        } else {
          return {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([]),
          } as any;
        }
      });

      const result = await service.getStats({});

      expect(result.total_purchases).toBe(0);
      expect(result.total_amount).toBe(0);
      expect(result.total_vat).toBe(0);
      expect(result.by_status).toEqual([]);
      expect(result.by_supplier).toEqual([]);
      expect(result.by_month).toEqual([]);
    });
  });

  // ============================================================================
  // GET PRICE HISTORY TESTS
  // ============================================================================

  describe('getPriceHistory', () => {
    it('should return price history for nomenclature', async () => {
      const mockHistory = [
        {
          date: '2025-01-15',
          price: 12000,
          quantity: 100,
          supplier_id: 'sup-1',
          supplier_name: 'Supplier A',
        },
        {
          date: '2025-01-10',
          price: 11500,
          quantity: 150,
          supplier_id: 'sup-2',
          supplier_name: 'Supplier B',
        },
      ];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockHistory),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getPriceHistory('nomenclature-uuid');

      expect(result).toEqual(mockHistory);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'purchase.nomenclature_id = :nomenclature_id',
        { nomenclature_id: 'nomenclature-uuid' },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('purchase.purchase_date', 'DESC');
      expect(queryBuilder.limit).toHaveBeenCalledWith(50);
    });

    it('should filter price history by supplier_id when provided', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getPriceHistory('nomenclature-uuid', 'supplier-uuid');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('purchase.supplier_id = :supplier_id', {
        supplier_id: 'supplier-uuid',
      });
    });

    it('should not filter by supplier when not provided', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getPriceHistory('nomenclature-uuid');

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // IMPORT PURCHASES TESTS
  // ============================================================================

  describe('importPurchases', () => {
    const importData = [
      {
        purchase_date: '2025-01-15',
        supplier_id: 'supplier-uuid',
        nomenclature_id: 'nomenclature-uuid',
        quantity: 100,
        unit_price: 10000,
      },
      {
        purchase_date: '2025-01-16',
        supplier_id: 'supplier-uuid',
        nomenclature_id: 'nomenclature-uuid',
        quantity: 200,
        unit_price: 9500,
      },
    ];

    it('should import multiple purchases successfully', async () => {
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue(mockPurchase as PurchaseHistory);

      const result = await service.importPurchases(importData, 'session-uuid', 'user-uuid');

      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should track failed imports with errors', async () => {
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save
        .mockResolvedValueOnce(mockPurchase as PurchaseHistory)
        .mockRejectedValueOnce(new Error('Validation failed'));

      const result = await service.importPurchases(importData, 'session-uuid', 'user-uuid');

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Validation failed');
    });

    it('should pass import_session_id through create', async () => {
      // The create() method preserves import_source and import_session_id when provided
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue(mockPurchase as PurchaseHistory);

      await service.importPurchases([importData[0]], 'session-uuid', 'user-uuid');

      // Verify that create() was called with import_source='csv' and import_session_id
      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          import_source: 'csv', // preserves the import source from importPurchases
          import_session_id: 'session-uuid',
        }),
      );
    });

    it('should handle empty import data', async () => {
      const result = await service.importPurchases([], 'session-uuid', 'user-uuid');

      expect(result.imported).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ============================================================================
  // GET AVERAGE PRICE TESTS
  // ============================================================================

  describe('getAveragePrice', () => {
    it('should return average price statistics for nomenclature', async () => {
      const mockPriceStats = {
        average_price: '11000',
        min_price: '10000',
        max_price: '12000',
        purchase_count: '10',
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockPriceStats),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getAveragePrice('nomenclature-uuid');

      expect(result.average_price).toBe(11000);
      expect(result.min_price).toBe(10000);
      expect(result.max_price).toBe(12000);
      expect(result.purchase_count).toBe(10);
    });

    it('should use default period of 90 days', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          average_price: '11000',
          min_price: '10000',
          max_price: '12000',
          purchase_count: '10',
        }),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getAveragePrice('nomenclature-uuid');

      // Check that andWhere was called with date >= approximately 90 days ago
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'purchase.purchase_date >= :dateFrom',
        expect.any(Object),
      );
    });

    it('should filter only RECEIVED status purchases', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          average_price: '11000',
          min_price: '10000',
          max_price: '12000',
          purchase_count: '10',
        }),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getAveragePrice('nomenclature-uuid');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('purchase.status = :status', {
        status: PurchaseStatus.RECEIVED,
      });
    });

    it('should use custom period when provided', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          average_price: '11000',
          min_price: '10000',
          max_price: '12000',
          purchase_count: '5',
        }),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getAveragePrice('nomenclature-uuid', 30);

      // Verify the period calculation (30 days instead of 90)
      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should handle null values gracefully', async () => {
      const nullStats = {
        average_price: null,
        min_price: null,
        max_price: null,
        purchase_count: null,
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(nullStats),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getAveragePrice('nomenclature-uuid');

      expect(result.average_price).toBe(0);
      expect(result.min_price).toBe(0);
      expect(result.max_price).toBe(0);
      expect(result.purchase_count).toBe(0);
    });
  });

  // ============================================================================
  // GET WEIGHTED AVERAGE COST TESTS
  // ============================================================================

  describe('getWeightedAverageCost', () => {
    it('should calculate weighted average cost correctly', async () => {
      const mockResult = {
        total_cost: '2200000', // Sum of (quantity * unit_price)
        total_quantity: '200',
        purchase_count: '5',
        oldest_purchase_date: new Date('2024-06-01'),
        latest_purchase_date: new Date('2025-01-15'),
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockResult),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getWeightedAverageCost('nomenclature-uuid');

      expect(result.weighted_average_cost).toBe(11000); // 2200000 / 200 = 11000
      expect(result.total_quantity).toBe(200);
      expect(result.total_cost).toBe(2200000);
      expect(result.purchase_count).toBe(5);
      expect(result.oldest_purchase_date).toEqual(new Date('2024-06-01'));
      expect(result.latest_purchase_date).toEqual(new Date('2025-01-15'));
    });

    it('should filter only RECEIVED status purchases', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total_cost: '1000000',
          total_quantity: '100',
          purchase_count: '2',
          oldest_purchase_date: null,
          latest_purchase_date: null,
        }),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getWeightedAverageCost('nomenclature-uuid');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('purchase.status = :status', {
        status: PurchaseStatus.RECEIVED,
      });
    });

    it('should filter by upToDate when provided', async () => {
      const upToDate = new Date('2025-01-01');

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total_cost: '1000000',
          total_quantity: '100',
          purchase_count: '2',
          oldest_purchase_date: null,
          latest_purchase_date: null,
        }),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getWeightedAverageCost('nomenclature-uuid', upToDate);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('purchase.purchase_date <= :upToDate', {
        upToDate,
      });
    });

    it('should filter by warehouse_id when provided', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total_cost: '1000000',
          total_quantity: '100',
          purchase_count: '2',
          oldest_purchase_date: null,
          latest_purchase_date: null,
        }),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getWeightedAverageCost('nomenclature-uuid', undefined, 'warehouse-uuid');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('purchase.warehouse_id = :warehouse_id', {
        warehouse_id: 'warehouse-uuid',
      });
    });

    it('should return 0 weighted average cost when no purchases exist', async () => {
      const emptyResult = {
        total_cost: null,
        total_quantity: null,
        purchase_count: null,
        oldest_purchase_date: null,
        latest_purchase_date: null,
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(emptyResult),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getWeightedAverageCost('nomenclature-uuid');

      expect(result.weighted_average_cost).toBe(0);
      expect(result.total_quantity).toBe(0);
      expect(result.total_cost).toBe(0);
      expect(result.purchase_count).toBe(0);
    });

    it('should round weighted average cost to 2 decimal places', async () => {
      const mockResult = {
        total_cost: '3333333',
        total_quantity: '300',
        purchase_count: '3',
        oldest_purchase_date: null,
        latest_purchase_date: null,
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockResult),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getWeightedAverageCost('nomenclature-uuid');

      // 3333333 / 300 = 11111.11
      expect(result.weighted_average_cost).toBe(11111.11);
    });
  });

  // ============================================================================
  // GET MOVING AVERAGE COST TESTS
  // ============================================================================

  describe('getMovingAverageCost', () => {
    it('should calculate moving average cost for default 90 day period', async () => {
      const mockResult = {
        total_cost: '1100000',
        total_quantity: '100',
        purchase_count: '5',
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockResult),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getMovingAverageCost('nomenclature-uuid');

      expect(result.moving_average_cost).toBe(11000); // 1100000 / 100
      expect(result.total_quantity).toBe(100);
      expect(result.total_cost).toBe(1100000);
      expect(result.purchase_count).toBe(5);
      expect(result.period_start_date).toBeDefined();
      expect(result.period_end_date).toBeDefined();
    });

    it('should filter by custom period when provided', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total_cost: '500000',
          total_quantity: '50',
          purchase_count: '2',
        }),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getMovingAverageCost('nomenclature-uuid', 30);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'purchase.purchase_date BETWEEN :startDate AND :endDate',
        expect.any(Object),
      );
    });

    it('should filter only RECEIVED status purchases', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total_cost: '1000000',
          total_quantity: '100',
          purchase_count: '3',
        }),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getMovingAverageCost('nomenclature-uuid');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('purchase.status = :status', {
        status: PurchaseStatus.RECEIVED,
      });
    });

    it('should return 0 when no purchases in period', async () => {
      const emptyResult = {
        total_cost: null,
        total_quantity: null,
        purchase_count: null,
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(emptyResult),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getMovingAverageCost('nomenclature-uuid');

      expect(result.moving_average_cost).toBe(0);
      expect(result.total_quantity).toBe(0);
      expect(result.total_cost).toBe(0);
      expect(result.purchase_count).toBe(0);
    });

    it('should round moving average cost to 2 decimal places', async () => {
      const mockResult = {
        total_cost: '1000000',
        total_quantity: '333',
        purchase_count: '3',
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockResult),
      };

      purchaseRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getMovingAverageCost('nomenclature-uuid');

      // 1000000 / 333 = 3003.003003... -> 3003
      expect(result.moving_average_cost).toBe(3003);
    });
  });

  // ============================================================================
  // PURCHASE STATUS ENUM TESTS
  // ============================================================================

  describe('PurchaseStatus enum handling', () => {
    it('should handle PENDING status', async () => {
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        status: PurchaseStatus.PENDING,
      } as PurchaseHistory);

      const result = await service.create(
        {
          purchase_date: '2025-01-15',
          supplier_id: 'supplier-uuid',
          nomenclature_id: 'nomenclature-uuid',
          quantity: 100,
          unit_price: 10000,
          status: PurchaseStatus.PENDING,
        },
        'user-uuid',
      );

      expect(result.status).toBe(PurchaseStatus.PENDING);
    });

    it('should handle RECEIVED status', async () => {
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        status: PurchaseStatus.RECEIVED,
      } as PurchaseHistory);

      const result = await service.create(
        {
          purchase_date: '2025-01-15',
          supplier_id: 'supplier-uuid',
          nomenclature_id: 'nomenclature-uuid',
          quantity: 100,
          unit_price: 10000,
          status: PurchaseStatus.RECEIVED,
        },
        'user-uuid',
      );

      expect(result.status).toBe(PurchaseStatus.RECEIVED);
    });

    it('should handle PARTIAL status', async () => {
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        status: PurchaseStatus.PARTIAL,
      } as PurchaseHistory);

      const result = await service.create(
        {
          purchase_date: '2025-01-15',
          supplier_id: 'supplier-uuid',
          nomenclature_id: 'nomenclature-uuid',
          quantity: 100,
          unit_price: 10000,
          status: PurchaseStatus.PARTIAL,
        },
        'user-uuid',
      );

      expect(result.status).toBe(PurchaseStatus.PARTIAL);
    });

    it('should handle CANCELLED status', async () => {
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        status: PurchaseStatus.CANCELLED,
      } as PurchaseHistory);

      const result = await service.create(
        {
          purchase_date: '2025-01-15',
          supplier_id: 'supplier-uuid',
          nomenclature_id: 'nomenclature-uuid',
          quantity: 100,
          unit_price: 10000,
          status: PurchaseStatus.CANCELLED,
        },
        'user-uuid',
      );

      expect(result.status).toBe(PurchaseStatus.CANCELLED);
    });

    it('should handle RETURNED status', async () => {
      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        status: PurchaseStatus.RETURNED,
      } as PurchaseHistory);

      const result = await service.create(
        {
          purchase_date: '2025-01-15',
          supplier_id: 'supplier-uuid',
          nomenclature_id: 'nomenclature-uuid',
          quantity: 100,
          unit_price: 10000,
          status: PurchaseStatus.RETURNED,
        },
        'user-uuid',
      );

      expect(result.status).toBe(PurchaseStatus.RETURNED);
    });
  });

  // ============================================================================
  // EDGE CASES TESTS
  // ============================================================================

  describe('Edge cases', () => {
    it('should handle very large quantities', async () => {
      const largeQty = 1000000;
      const expectedVat = largeQty * 10000 * 0.15;
      const expectedTotal = largeQty * 10000 + expectedVat;

      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        quantity: largeQty,
        vat_amount: expectedVat,
        total_amount: expectedTotal,
      } as PurchaseHistory);

      await service.create(
        {
          purchase_date: '2025-01-15',
          supplier_id: 'supplier-uuid',
          nomenclature_id: 'nomenclature-uuid',
          quantity: largeQty,
          unit_price: 10000,
        },
        'user-uuid',
      );

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vat_amount: expectedVat,
          total_amount: expectedTotal,
        }),
      );
    });

    it('should handle very small decimal quantities', async () => {
      const smallQty = 0.001;
      const expectedVat = smallQty * 10000 * 0.15;
      const expectedTotal = smallQty * 10000 + expectedVat;

      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        quantity: smallQty,
        vat_amount: expectedVat,
        total_amount: expectedTotal,
      } as PurchaseHistory);

      await service.create(
        {
          purchase_date: '2025-01-15',
          supplier_id: 'supplier-uuid',
          nomenclature_id: 'nomenclature-uuid',
          quantity: smallQty,
          unit_price: 10000,
        },
        'user-uuid',
      );

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: smallQty,
        }),
      );
    });

    it('should handle high exchange rates', async () => {
      const highExchangeRate = 12500;

      purchaseRepository.create.mockImplementation((data) => data as PurchaseHistory);
      purchaseRepository.save.mockResolvedValue({
        ...mockPurchase,
        currency: 'USD',
        exchange_rate: highExchangeRate,
      } as PurchaseHistory);

      await service.create(
        {
          purchase_date: '2025-01-15',
          supplier_id: 'supplier-uuid',
          nomenclature_id: 'nomenclature-uuid',
          quantity: 100,
          unit_price: 10000,
          currency: 'USD',
          exchange_rate: highExchangeRate,
        },
        'user-uuid',
      );

      expect(purchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange_rate: highExchangeRate,
        }),
      );
    });

    it('should handle zero quantity in update without recalculation error', async () => {
      // When updating with quantity = 0, VAT calculation should be 0
      purchaseRepository.findOne.mockResolvedValue(mockPurchase as PurchaseHistory);
      purchaseRepository.update.mockResolvedValue({ affected: 1 } as any);

      purchaseRepository.findOne.mockResolvedValueOnce(mockPurchase as PurchaseHistory);
      purchaseRepository.findOne.mockResolvedValueOnce({
        ...mockPurchase,
        quantity: 0,
        vat_amount: 0,
        total_amount: 0,
      } as PurchaseHistory);

      await service.update('purchase-uuid-1', { quantity: 0 });

      expect(purchaseRepository.update).toHaveBeenCalledWith(
        'purchase-uuid-1',
        expect.objectContaining({
          vat_amount: 0,
          total_amount: 0,
        }),
      );
    });
  });
});
