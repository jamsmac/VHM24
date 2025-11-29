import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InventoryCalculationService } from './inventory-calculation.service';
import { InventoryConsumptionCalculatorService } from './inventory-consumption-calculator.service';
import { InventoryMovement, MovementType } from '../entities/inventory-movement.entity';
import { StockOpeningBalance } from '../../opening-balances/entities/opening-balance.entity';
import { PurchaseHistory } from '../../purchase-history/entities/purchase-history.entity';
import { InventoryLevelType } from '../entities/inventory-actual-count.entity';
import { createMockRepository } from '@/test/helpers';

/**
 * Unit Tests for InventoryCalculationService
 *
 * Tests the calculation of inventory balances based on:
 * - Opening balances
 * - Purchases
 * - Inventory movements
 * - Theoretical consumption (for machine level)
 */
describe('InventoryCalculationService', () => {
  let service: InventoryCalculationService;
  let movementRepo: any;
  let openingBalanceRepo: any;
  let purchaseRepo: any;
  let consumptionCalculator: any;

  // Test fixtures
  const testNomenclatureId = '11111111-1111-1111-1111-111111111111';
  const testWarehouseId = '22222222-2222-2222-2222-222222222222';
  const testOperatorId = '33333333-3333-3333-3333-333333333333';
  const testMachineId = '44444444-4444-4444-4444-444444444444';

  beforeEach(async () => {
    movementRepo = createMockRepository<InventoryMovement>();
    openingBalanceRepo = createMockRepository<StockOpeningBalance>();
    purchaseRepo = createMockRepository<PurchaseHistory>();

    consumptionCalculator = {
      calculateTheoreticalConsumption: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryCalculationService,
        {
          provide: getRepositoryToken(InventoryMovement),
          useValue: movementRepo,
        },
        {
          provide: getRepositoryToken(StockOpeningBalance),
          useValue: openingBalanceRepo,
        },
        {
          provide: getRepositoryToken(PurchaseHistory),
          useValue: purchaseRepo,
        },
        {
          provide: InventoryConsumptionCalculatorService,
          useValue: consumptionCalculator,
        },
      ],
    }).compile();

    service = module.get<InventoryCalculationService>(InventoryCalculationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateBalance', () => {
    describe('Warehouse Level', () => {
      it('should calculate warehouse balance from opening balance, purchases, and movements', async () => {
        // Arrange
        const asOfDate = new Date('2025-06-15');

        // Mock opening balance
        const mockOpeningBalance = {
          quantity: 100,
          balance_date: new Date('2025-01-01'),
        };
        const openingBalanceQB = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockOpeningBalance),
        };
        openingBalanceRepo.createQueryBuilder.mockReturnValue(openingBalanceQB);

        // Mock purchases
        const purchaseQB = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '50' }),
        };
        purchaseRepo.createQueryBuilder.mockReturnValue(purchaseQB);

        // Mock movements (inbound and outbound)
        const movementQB = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest
            .fn()
            .mockResolvedValueOnce({ total: '30' }) // Inbound
            .mockResolvedValueOnce({ total: '20' }), // Outbound
        };
        movementRepo.createQueryBuilder.mockReturnValue(movementQB);

        // Act
        const result = await service.calculateBalance(
          testNomenclatureId,
          InventoryLevelType.WAREHOUSE,
          testWarehouseId,
          asOfDate,
        );

        // Assert
        // Balance = Opening(100) + Purchases(50) + Inbound(30) - Outbound(20) = 160
        expect(result).toBe(160);
        expect(openingBalanceRepo.createQueryBuilder).toHaveBeenCalled();
        expect(purchaseRepo.createQueryBuilder).toHaveBeenCalled();
        expect(movementRepo.createQueryBuilder).toHaveBeenCalled();
      });

      it('should return 0 when no opening balance exists', async () => {
        // Arrange
        const asOfDate = new Date('2025-06-15');

        const openingBalanceQB = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };
        openingBalanceRepo.createQueryBuilder.mockReturnValue(openingBalanceQB);

        const purchaseQB = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
        };
        purchaseRepo.createQueryBuilder.mockReturnValue(purchaseQB);

        const movementQB = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
        };
        movementRepo.createQueryBuilder.mockReturnValue(movementQB);

        // Act
        const result = await service.calculateBalance(
          testNomenclatureId,
          InventoryLevelType.WAREHOUSE,
          testWarehouseId,
          asOfDate,
        );

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('Operator Level', () => {
      it('should calculate operator balance from movements only', async () => {
        // Arrange
        const asOfDate = new Date('2025-06-15');

        const movementQB = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest
            .fn()
            .mockResolvedValueOnce({ total: '50' }) // Inbound (warehouse_to_operator, machine_to_operator)
            .mockResolvedValueOnce({ total: '30' }), // Outbound (operator_to_warehouse, operator_to_machine)
        };
        movementRepo.createQueryBuilder.mockReturnValue(movementQB);

        // Act
        const result = await service.calculateBalance(
          testNomenclatureId,
          InventoryLevelType.OPERATOR,
          testOperatorId,
          asOfDate,
        );

        // Assert
        // Balance = Inbound(50) - Outbound(30) = 20
        expect(result).toBe(20);
        // Should not query opening balance or purchases for operator level
        expect(openingBalanceRepo.createQueryBuilder).not.toHaveBeenCalled();
        expect(purchaseRepo.createQueryBuilder).not.toHaveBeenCalled();
      });

      it('should filter movements by operator_id', async () => {
        // Arrange
        const asOfDate = new Date('2025-06-15');

        const movementQB = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
        };
        movementRepo.createQueryBuilder.mockReturnValue(movementQB);

        // Act
        await service.calculateBalance(
          testNomenclatureId,
          InventoryLevelType.OPERATOR,
          testOperatorId,
          asOfDate,
        );

        // Assert
        expect(movementQB.andWhere).toHaveBeenCalledWith('m.operator_id = :levelRefId', {
          levelRefId: testOperatorId,
        });
      });
    });

    describe('Machine Level', () => {
      it('should calculate machine balance including theoretical consumption', async () => {
        // Arrange
        const asOfDate = new Date('2025-06-15');

        const movementQB = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest
            .fn()
            .mockResolvedValueOnce({ total: '100' }) // Inbound (operator_to_machine)
            .mockResolvedValueOnce({ total: '20' }), // Outbound (machine_to_operator, machine_sale)
        };
        movementRepo.createQueryBuilder.mockReturnValue(movementQB);

        // Mock theoretical consumption
        const consumptionMap = new Map<string, number>();
        consumptionMap.set(testNomenclatureId, 30);
        consumptionCalculator.calculateTheoreticalConsumption.mockResolvedValue(consumptionMap);

        // Act
        const result = await service.calculateBalance(
          testNomenclatureId,
          InventoryLevelType.MACHINE,
          testMachineId,
          asOfDate,
        );

        // Assert
        // Balance = Inbound(100) - Outbound(20) - Consumption(30) = 50
        expect(result).toBe(50);
        expect(consumptionCalculator.calculateTheoreticalConsumption).toHaveBeenCalledWith(
          testMachineId,
          expect.any(Date), // fromDate (start of year)
          asOfDate,
        );
      });

      it('should return 0 consumption if nomenclature not in consumption map', async () => {
        // Arrange
        const asOfDate = new Date('2025-06-15');

        const movementQB = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest
            .fn()
            .mockResolvedValueOnce({ total: '50' })
            .mockResolvedValueOnce({ total: '10' }),
        };
        movementRepo.createQueryBuilder.mockReturnValue(movementQB);

        // Empty consumption map
        const consumptionMap = new Map<string, number>();
        consumptionCalculator.calculateTheoreticalConsumption.mockResolvedValue(consumptionMap);

        // Act
        const result = await service.calculateBalance(
          testNomenclatureId,
          InventoryLevelType.MACHINE,
          testMachineId,
          asOfDate,
        );

        // Assert
        // Balance = Inbound(50) - Outbound(10) - Consumption(0) = 40
        expect(result).toBe(40);
      });

      it('should filter movements by machine_id', async () => {
        // Arrange
        const asOfDate = new Date('2025-06-15');

        const movementQB = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
        };
        movementRepo.createQueryBuilder.mockReturnValue(movementQB);

        consumptionCalculator.calculateTheoreticalConsumption.mockResolvedValue(new Map());

        // Act
        await service.calculateBalance(
          testNomenclatureId,
          InventoryLevelType.MACHINE,
          testMachineId,
          asOfDate,
        );

        // Assert
        expect(movementQB.andWhere).toHaveBeenCalledWith('m.machine_id = :levelRefId', {
          levelRefId: testMachineId,
        });
      });
    });

    describe('Default date handling', () => {
      it('should use current date if asOfDate not provided', async () => {
        // Arrange
        const movementQB = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
        };
        movementRepo.createQueryBuilder.mockReturnValue(movementQB);

        // Act
        await service.calculateBalance(
          testNomenclatureId,
          InventoryLevelType.OPERATOR,
          testOperatorId,
        );

        // Assert - Should have been called with a date close to now
        expect(movementQB.andWhere).toHaveBeenCalled();
      });
    });
  });

  describe('calculateBalancesForLevel', () => {
    it('should calculate balances for all nomenclatures at a level', async () => {
      // Arrange
      const asOfDate = new Date('2025-06-15');
      const nomenclature1 = 'nom-1';
      const nomenclature2 = 'nom-2';

      // Mock getting nomenclatures for level
      const movementNomenclaturesQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([
            { nomenclature_id: nomenclature1 },
            { nomenclature_id: nomenclature2 },
          ]),
      };

      // Mock for balance calculation
      const balanceQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '25' }),
      };

      movementRepo.createQueryBuilder
        .mockReturnValueOnce(movementNomenclaturesQB)
        .mockReturnValue(balanceQB);

      // Act
      const result = await service.calculateBalancesForLevel(
        InventoryLevelType.OPERATOR,
        testOperatorId,
        asOfDate,
      );

      // Assert
      expect(result.size).toBe(2);
      expect(result.has(nomenclature1)).toBe(true);
      expect(result.has(nomenclature2)).toBe(true);
    });

    it('should include nomenclatures from opening balances and purchases for warehouse', async () => {
      // Arrange
      const asOfDate = new Date('2025-06-15');

      // Mock opening balances
      openingBalanceRepo.find.mockResolvedValue([{ nomenclature_id: 'nom-from-opening' }]);

      // Mock purchases
      purchaseRepo.find.mockResolvedValue([{ nomenclature_id: 'nom-from-purchase' }]);

      // Mock movements
      const movementNomenclaturesQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ nomenclature_id: 'nom-from-movement' }]),
      };

      const balanceQB = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '10' }),
      };

      movementRepo.createQueryBuilder
        .mockReturnValueOnce(movementNomenclaturesQB)
        .mockReturnValue(balanceQB);

      openingBalanceRepo.createQueryBuilder.mockReturnValue(balanceQB);
      purchaseRepo.createQueryBuilder.mockReturnValue(balanceQB);

      // Act
      const result = await service.calculateBalancesForLevel(
        InventoryLevelType.WAREHOUSE,
        testWarehouseId,
        asOfDate,
      );

      // Assert
      expect(result.size).toBe(3); // All three sources combined
      expect(openingBalanceRepo.find).toHaveBeenCalled();
      expect(purchaseRepo.find).toHaveBeenCalled();
    });

    it('should return empty map if no nomenclatures found', async () => {
      // Arrange
      const movementNomenclaturesQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      movementRepo.createQueryBuilder.mockReturnValue(movementNomenclaturesQB);

      // Act
      const result = await service.calculateBalancesForLevel(
        InventoryLevelType.OPERATOR,
        testOperatorId,
      );

      // Assert
      expect(result.size).toBe(0);
    });
  });

  describe('Movement type mapping', () => {
    it('should use correct movement types for warehouse level', async () => {
      // Arrange
      const asOfDate = new Date('2025-06-15');

      const openingBalanceQB = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      openingBalanceRepo.createQueryBuilder.mockReturnValue(openingBalanceQB);

      const purchaseQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      };
      purchaseRepo.createQueryBuilder.mockReturnValue(purchaseQB);

      const movementQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      };
      movementRepo.createQueryBuilder.mockReturnValue(movementQB);

      // Act
      await service.calculateBalance(
        testNomenclatureId,
        InventoryLevelType.WAREHOUSE,
        testWarehouseId,
        asOfDate,
      );

      // Assert - Check that correct movement types are used
      // Inbound: WAREHOUSE_IN, OPERATOR_TO_WAREHOUSE
      // Outbound: WAREHOUSE_OUT, WAREHOUSE_TO_OPERATOR
      expect(movementQB.andWhere).toHaveBeenCalledWith(
        'm.movement_type IN (:...inboundTypes)',
        expect.objectContaining({
          inboundTypes: expect.arrayContaining([
            MovementType.WAREHOUSE_IN,
            MovementType.OPERATOR_TO_WAREHOUSE,
          ]),
        }),
      );
    });

    it('should use correct movement types for operator level', async () => {
      // Arrange
      const asOfDate = new Date('2025-06-15');

      const movementQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      };
      movementRepo.createQueryBuilder.mockReturnValue(movementQB);

      // Act
      await service.calculateBalance(
        testNomenclatureId,
        InventoryLevelType.OPERATOR,
        testOperatorId,
        asOfDate,
      );

      // Assert
      // Inbound: WAREHOUSE_TO_OPERATOR, MACHINE_TO_OPERATOR
      // Outbound: OPERATOR_TO_WAREHOUSE, OPERATOR_TO_MACHINE
      expect(movementQB.andWhere).toHaveBeenCalledWith(
        'm.movement_type IN (:...inboundTypes)',
        expect.objectContaining({
          inboundTypes: expect.arrayContaining([
            MovementType.WAREHOUSE_TO_OPERATOR,
            MovementType.MACHINE_TO_OPERATOR,
          ]),
        }),
      );
    });

    it('should use correct movement types for machine level', async () => {
      // Arrange
      const asOfDate = new Date('2025-06-15');

      const movementQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      };
      movementRepo.createQueryBuilder.mockReturnValue(movementQB);

      consumptionCalculator.calculateTheoreticalConsumption.mockResolvedValue(new Map());

      // Act
      await service.calculateBalance(
        testNomenclatureId,
        InventoryLevelType.MACHINE,
        testMachineId,
        asOfDate,
      );

      // Assert
      // Inbound: OPERATOR_TO_MACHINE
      // Outbound: MACHINE_TO_OPERATOR, MACHINE_SALE
      expect(movementQB.andWhere).toHaveBeenCalledWith(
        'm.movement_type IN (:...inboundTypes)',
        expect.objectContaining({
          inboundTypes: expect.arrayContaining([MovementType.OPERATOR_TO_MACHINE]),
        }),
      );
    });
  });

  describe('Null/undefined handling', () => {
    it('should handle null query results gracefully', async () => {
      // Arrange
      const movementQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      movementRepo.createQueryBuilder.mockReturnValue(movementQB);

      // Act
      const result = await service.calculateBalance(
        testNomenclatureId,
        InventoryLevelType.OPERATOR,
        testOperatorId,
      );

      // Assert
      expect(result).toBe(0);
    });
  });
});
