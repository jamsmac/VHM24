import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { StockReservationService } from './stock-reservation.service';
import { StockReservation, ReservationStatus } from '../entities/stock-reservation.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';

describe('StockReservationService', () => {
  let service: StockReservationService;
  let reservationRepository: jest.Mocked<Repository<StockReservation>>;
  let batchRepository: jest.Mocked<Repository<InventoryBatch>>;

  // Mock fixtures
  const mockReservation: Partial<StockReservation> = {
    id: 'reservation-uuid',
    reservation_number: 'RSV-20251127-0001',
    warehouse_id: 'warehouse-uuid',
    product_id: 'product-uuid',
    batch_id: 'batch-uuid',
    quantity_reserved: 50,
    quantity_fulfilled: 0,
    unit: 'pcs',
    status: ReservationStatus.PENDING,
    reserved_for: 'ORDER-001',
    reserved_by_id: 'user-uuid',
    reserved_at: new Date(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    fulfilled_at: null,
    metadata: {},
  };

  const mockBatch: Partial<InventoryBatch> = {
    id: 'batch-uuid',
    batch_number: 'BATCH-001',
    warehouse_id: 'warehouse-uuid',
    product_id: 'product-uuid',
    initial_quantity: 100,
    current_quantity: 100,
    reserved_quantity: 0,
    available_quantity: 100,
    unit: 'pcs',
    is_active: true,
    is_quarantined: false,
    metadata: {},
  };

  const createMockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  });

  beforeEach(async () => {
    const mockReservationRepo = createMockRepository();
    const mockBatchRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockReservationService,
        {
          provide: getRepositoryToken(StockReservation),
          useValue: mockReservationRepo,
        },
        {
          provide: getRepositoryToken(InventoryBatch),
          useValue: mockBatchRepo,
        },
      ],
    }).compile();

    service = module.get<StockReservationService>(StockReservationService);
    reservationRepository = module.get(getRepositoryToken(StockReservation));
    batchRepository = module.get(getRepositoryToken(InventoryBatch));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE RESERVATION TESTS
  // ============================================================================

  describe('createReservation', () => {
    const reservationData = {
      warehouse_id: 'warehouse-uuid',
      product_id: 'product-uuid',
      quantity: 50,
      unit: 'pcs',
      reserved_for: 'ORDER-001',
      reserved_by_id: 'user-uuid',
      expires_in_hours: 24,
      batch_id: 'batch-uuid',
    };

    it('should create reservation when sufficient stock available', async () => {
      batchRepository.findOne.mockResolvedValue(mockBatch as InventoryBatch);
      batchRepository.find.mockResolvedValue([mockBatch as InventoryBatch]);
      reservationRepository.create.mockReturnValue(mockReservation as StockReservation);
      reservationRepository.save.mockResolvedValue(mockReservation as StockReservation);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      const result = await service.createReservation(reservationData);

      expect(reservationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouse_id: 'warehouse-uuid',
          product_id: 'product-uuid',
          quantity_reserved: 50,
          reserved_for: 'ORDER-001',
        }),
      );
      expect(result).toEqual(mockReservation);
    });

    it('should generate reservation number with RSV prefix', async () => {
      batchRepository.findOne.mockResolvedValue(mockBatch as InventoryBatch);
      batchRepository.find.mockResolvedValue([mockBatch as InventoryBatch]);
      reservationRepository.create.mockReturnValue(mockReservation as StockReservation);
      reservationRepository.save.mockResolvedValue(mockReservation as StockReservation);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      await service.createReservation(reservationData);

      expect(reservationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reservation_number: expect.stringMatching(/^RSV-\d{8}-\d{4}$/),
        }),
      );
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      const lowStockBatch = { ...mockBatch, available_quantity: 10 };
      batchRepository.findOne.mockResolvedValue(lowStockBatch as InventoryBatch);

      await expect(service.createReservation(reservationData)).rejects.toThrow(BadRequestException);
      await expect(service.createReservation(reservationData)).rejects.toThrow(
        /Insufficient stock/,
      );
    });

    it('should calculate expiration date based on expires_in_hours', async () => {
      // When batch_id is provided, getAvailableQuantity calls findOne first
      const batchWithStock = { ...mockBatch, available_quantity: 100 };
      batchRepository.findOne.mockResolvedValue(batchWithStock as InventoryBatch);
      batchRepository.find.mockResolvedValue([batchWithStock as InventoryBatch]);
      reservationRepository.create.mockReturnValue(mockReservation as StockReservation);
      reservationRepository.save.mockResolvedValue(mockReservation as StockReservation);
      batchRepository.save.mockResolvedValue(batchWithStock as InventoryBatch);

      await service.createReservation({ ...reservationData, expires_in_hours: 48 });

      expect(reservationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: expect.any(Date),
        }),
      );
    });

    it('should set expires_at to null when expires_in_hours not provided', async () => {
      const dataWithoutExpiry = { ...reservationData, expires_in_hours: undefined };
      const batchWithStock = { ...mockBatch, available_quantity: 100 };
      batchRepository.findOne.mockResolvedValue(batchWithStock as InventoryBatch);
      batchRepository.find.mockResolvedValue([batchWithStock as InventoryBatch]);
      reservationRepository.create.mockReturnValue(mockReservation as StockReservation);
      reservationRepository.save.mockResolvedValue(mockReservation as StockReservation);
      batchRepository.save.mockResolvedValue(batchWithStock as InventoryBatch);

      await service.createReservation(dataWithoutExpiry);

      expect(reservationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: null,
        }),
      );
    });

    it('should update batch reserved quantity when batch_id provided', async () => {
      const batchWithStock = {
        ...mockBatch,
        available_quantity: 100,
        reserved_quantity: 0,
        current_quantity: 100,
      };
      batchRepository.findOne.mockResolvedValue(batchWithStock as InventoryBatch);
      batchRepository.find.mockResolvedValue([batchWithStock as InventoryBatch]);
      reservationRepository.create.mockReturnValue(mockReservation as StockReservation);
      reservationRepository.save.mockResolvedValue(mockReservation as StockReservation);
      batchRepository.save.mockImplementation((batch) => Promise.resolve(batch as InventoryBatch));

      await service.createReservation(reservationData);

      expect(batchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          reserved_quantity: 50, // 0 + 50
          available_quantity: 50, // 100 - 50
        }),
      );
    });

    it('should calculate available quantity from all batches when batch_id not provided', async () => {
      const dataWithoutBatch = { ...reservationData, batch_id: undefined };
      batchRepository.find.mockResolvedValue([
        { ...mockBatch, available_quantity: 30 },
        { ...mockBatch, id: 'batch-2', available_quantity: 40 },
      ] as InventoryBatch[]);
      reservationRepository.create.mockReturnValue(mockReservation as StockReservation);
      reservationRepository.save.mockResolvedValue(mockReservation as StockReservation);

      await service.createReservation(dataWithoutBatch);

      // Total available = 30 + 40 = 70, requested = 50 => OK
      expect(reservationRepository.save).toHaveBeenCalled();
    });

    it('should check specific batch quantity when batch_id provided', async () => {
      const specificBatch = { ...mockBatch, available_quantity: 30 };
      batchRepository.findOne.mockResolvedValue(specificBatch as InventoryBatch);

      // Request more than available in specific batch
      await expect(service.createReservation({ ...reservationData, quantity: 50 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================================
  // FULFILL RESERVATION TESTS
  // ============================================================================

  describe('fulfillReservation', () => {
    it('should partially fulfill reservation', async () => {
      const pendingReservation = { ...mockReservation, quantity_fulfilled: 0 };
      reservationRepository.findOne.mockResolvedValue(pendingReservation as StockReservation);
      reservationRepository.save.mockImplementation((reservation) =>
        Promise.resolve(reservation as StockReservation),
      );
      batchRepository.findOne.mockResolvedValue(mockBatch as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      const result = await service.fulfillReservation('reservation-uuid', 25);

      expect(result.quantity_fulfilled).toBe(25);
      expect(result.status).toBe(ReservationStatus.PARTIALLY_FULFILLED);
    });

    it('should fully fulfill reservation when quantity reaches reserved amount', async () => {
      const pendingReservation = { ...mockReservation, quantity_fulfilled: 25 };
      reservationRepository.findOne.mockResolvedValue(pendingReservation as StockReservation);
      reservationRepository.save.mockImplementation((reservation) =>
        Promise.resolve(reservation as StockReservation),
      );
      batchRepository.findOne.mockResolvedValue(mockBatch as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      const result = await service.fulfillReservation('reservation-uuid', 25);

      expect(result.quantity_fulfilled).toBe(50);
      expect(result.status).toBe(ReservationStatus.FULFILLED);
      expect(result.fulfilled_at).toBeDefined();
    });

    it('should throw error when reservation not found', async () => {
      reservationRepository.findOne.mockResolvedValue(null);

      await expect(service.fulfillReservation('non-existent', 10)).rejects.toThrow(
        'Reservation with ID non-existent not found',
      );
    });

    it('should release reserved quantity from batch when fulfilling', async () => {
      const reservation = {
        ...mockReservation,
        quantity_fulfilled: 0,
        batch_id: 'batch-uuid',
      };
      const batchWithReservation = {
        ...mockBatch,
        reserved_quantity: 50,
        available_quantity: 50,
        current_quantity: 100,
      };
      reservationRepository.findOne.mockResolvedValue(reservation as StockReservation);
      reservationRepository.save.mockImplementation((r) => Promise.resolve(r as StockReservation));
      batchRepository.findOne.mockResolvedValue(batchWithReservation as InventoryBatch);
      batchRepository.save.mockImplementation((batch) => Promise.resolve(batch as InventoryBatch));

      await service.fulfillReservation('reservation-uuid', 25);

      expect(batchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          reserved_quantity: 25, // 50 - 25
          available_quantity: 75, // 100 - 25
        }),
      );
    });
  });

  // ============================================================================
  // CANCEL RESERVATION TESTS
  // ============================================================================

  describe('cancelReservation', () => {
    it('should cancel pending reservation', async () => {
      const pendingReservation = { ...mockReservation, status: ReservationStatus.PENDING };
      reservationRepository.findOne.mockResolvedValue(pendingReservation as StockReservation);
      reservationRepository.save.mockImplementation((reservation) =>
        Promise.resolve(reservation as StockReservation),
      );
      batchRepository.findOne.mockResolvedValue({
        ...mockBatch,
        reserved_quantity: 50,
      } as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      const result = await service.cancelReservation('reservation-uuid');

      expect(result.status).toBe(ReservationStatus.CANCELLED);
    });

    it('should throw error when reservation not found', async () => {
      reservationRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelReservation('non-existent')).rejects.toThrow(
        'Reservation with ID non-existent not found',
      );
    });

    it('should release only unfulfilled quantity from batch', async () => {
      const partiallyFulfilledReservation = {
        ...mockReservation,
        quantity_reserved: 50,
        quantity_fulfilled: 20,
        batch_id: 'batch-uuid',
      };
      const batchWithReservation = {
        ...mockBatch,
        reserved_quantity: 30, // Only 30 remaining reserved (50 - 20 already fulfilled)
        current_quantity: 100,
      };
      reservationRepository.findOne.mockResolvedValue(
        partiallyFulfilledReservation as StockReservation,
      );
      reservationRepository.save.mockImplementation((r) => Promise.resolve(r as StockReservation));
      batchRepository.findOne.mockResolvedValue(batchWithReservation as InventoryBatch);
      batchRepository.save.mockImplementation((batch) => Promise.resolve(batch as InventoryBatch));

      await service.cancelReservation('reservation-uuid');

      // Should release 30 (50 reserved - 20 fulfilled)
      expect(batchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          reserved_quantity: 0, // 30 - 30
        }),
      );
    });

    it('should not update batch if no batch_id on reservation', async () => {
      const reservationWithoutBatch = { ...mockReservation, batch_id: null };
      reservationRepository.findOne.mockResolvedValue(reservationWithoutBatch as StockReservation);
      reservationRepository.save.mockImplementation((r) => Promise.resolve(r as StockReservation));

      await service.cancelReservation('reservation-uuid');

      expect(batchRepository.findOne).not.toHaveBeenCalled();
    });

    it('should not update batch if quantity to release is 0', async () => {
      const fullyFulfilledReservation = {
        ...mockReservation,
        quantity_reserved: 50,
        quantity_fulfilled: 50,
        batch_id: 'batch-uuid',
      };
      reservationRepository.findOne.mockResolvedValue(
        fullyFulfilledReservation as StockReservation,
      );
      reservationRepository.save.mockImplementation((r) => Promise.resolve(r as StockReservation));

      await service.cancelReservation('reservation-uuid');

      // No quantity to release
      expect(batchRepository.save).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // GET ACTIVE RESERVATIONS TESTS
  // ============================================================================

  describe('getActiveReservations', () => {
    it('should return confirmed reservations for warehouse', async () => {
      const activeReservations = [
        { ...mockReservation, status: ReservationStatus.CONFIRMED },
        {
          ...mockReservation,
          id: 'res-2',
          status: ReservationStatus.CONFIRMED,
        },
      ];
      reservationRepository.find.mockResolvedValue(activeReservations as StockReservation[]);

      const result = await service.getActiveReservations('warehouse-uuid');

      expect(reservationRepository.find).toHaveBeenCalledWith({
        where: {
          warehouse_id: 'warehouse-uuid',
          status: ReservationStatus.CONFIRMED,
        },
        order: { reserved_at: 'DESC' },
      });
      expect(result).toEqual(activeReservations);
    });

    it('should return empty array when no active reservations', async () => {
      reservationRepository.find.mockResolvedValue([]);

      const result = await service.getActiveReservations('warehouse-uuid');

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // EXPIRE OLD RESERVATIONS TESTS
  // ============================================================================

  describe('expireOldReservations', () => {
    it('should expire pending reservations past their expires_at date', async () => {
      const expiredReservation = {
        ...mockReservation,
        status: ReservationStatus.PENDING,
        expires_at: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        batch_id: 'batch-uuid',
      };
      reservationRepository.find.mockResolvedValue([expiredReservation as StockReservation]);
      reservationRepository.save.mockImplementation((r) => Promise.resolve(r as StockReservation));
      batchRepository.findOne.mockResolvedValue({
        ...mockBatch,
        reserved_quantity: 50,
        current_quantity: 100,
      } as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      const result = await service.expireOldReservations();

      expect(result).toBe(1);
      expect(reservationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReservationStatus.EXPIRED,
        }),
      );
    });

    it('should not expire reservations without expires_at date', async () => {
      const reservationWithoutExpiry = {
        ...mockReservation,
        status: ReservationStatus.PENDING,
        expires_at: null,
      };
      reservationRepository.find.mockResolvedValue([reservationWithoutExpiry as StockReservation]);

      const result = await service.expireOldReservations();

      expect(result).toBe(0);
      expect(reservationRepository.save).not.toHaveBeenCalled();
    });

    it('should not expire reservations with future expires_at date', async () => {
      const futureReservation = {
        ...mockReservation,
        status: ReservationStatus.PENDING,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };
      reservationRepository.find.mockResolvedValue([futureReservation as StockReservation]);

      const result = await service.expireOldReservations();

      expect(result).toBe(0);
    });

    it('should release reserved quantity when expiring', async () => {
      const expiredReservation = {
        ...mockReservation,
        status: ReservationStatus.PENDING,
        expires_at: new Date(Date.now() - 1000),
        quantity_reserved: 50,
        quantity_fulfilled: 20,
        batch_id: 'batch-uuid',
      };
      const batch = {
        ...mockBatch,
        reserved_quantity: 30,
        current_quantity: 100,
      };
      reservationRepository.find.mockResolvedValue([expiredReservation as StockReservation]);
      reservationRepository.save.mockImplementation((r) => Promise.resolve(r as StockReservation));
      batchRepository.findOne.mockResolvedValue(batch as InventoryBatch);
      batchRepository.save.mockImplementation((b) => Promise.resolve(b as InventoryBatch));

      await service.expireOldReservations();

      // Should release 30 (50 reserved - 20 fulfilled)
      expect(batchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          reserved_quantity: 0,
        }),
      );
    });

    it('should process multiple expired reservations', async () => {
      const expiredReservations = [
        {
          ...mockReservation,
          id: 'res-1',
          status: ReservationStatus.PENDING,
          expires_at: new Date(Date.now() - 1000),
          batch_id: 'batch-uuid',
        },
        {
          ...mockReservation,
          id: 'res-2',
          status: ReservationStatus.PENDING,
          expires_at: new Date(Date.now() - 2000),
          batch_id: 'batch-uuid',
        },
      ];
      reservationRepository.find.mockResolvedValue(expiredReservations as StockReservation[]);
      reservationRepository.save.mockImplementation((r) => Promise.resolve(r as StockReservation));
      batchRepository.findOne.mockResolvedValue({
        ...mockBatch,
        reserved_quantity: 100,
        current_quantity: 200,
      } as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      const result = await service.expireOldReservations();

      expect(result).toBe(2);
    });

    it('should only find PENDING reservations', async () => {
      reservationRepository.find.mockResolvedValue([]);

      await service.expireOldReservations();

      expect(reservationRepository.find).toHaveBeenCalledWith({
        where: { status: ReservationStatus.PENDING },
      });
    });
  });

  // ============================================================================
  // GENERATE RESERVATION NUMBER TESTS
  // ============================================================================

  describe('generateReservationNumber', () => {
    it('should generate number with RSV prefix and date format', async () => {
      batchRepository.findOne.mockResolvedValue(mockBatch as InventoryBatch);
      batchRepository.find.mockResolvedValue([mockBatch as InventoryBatch]);
      reservationRepository.create.mockReturnValue(mockReservation as StockReservation);
      reservationRepository.save.mockResolvedValue(mockReservation as StockReservation);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      await service.createReservation({
        warehouse_id: 'wh',
        product_id: 'prod',
        quantity: 10,
        unit: 'pcs',
        reserved_for: 'TEST',
      });

      expect(reservationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reservation_number: expect.stringMatching(/^RSV-\d{8}-\d{4}$/),
        }),
      );
    });
  });
});
