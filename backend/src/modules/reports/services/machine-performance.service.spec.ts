import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MachinePerformanceService, MachinePerformanceReport } from './machine-performance.service';
import { Transaction } from '@modules/transactions/entities/transaction.entity';
import { Task } from '@modules/tasks/entities/task.entity';
import { Incident } from '@modules/incidents/entities/incident.entity';
import { Machine, MachineStatus } from '@modules/machines/entities/machine.entity';

describe('MachinePerformanceService', () => {
  let service: MachinePerformanceService;
  let transactionRepository: jest.Mocked<Repository<Transaction>>;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let incidentRepository: jest.Mocked<Repository<Incident>>;
  let machineRepository: jest.Mocked<Repository<Machine>>;

  // Mock data fixtures
  const mockLocation = {
    id: 'location-uuid',
    name: 'Test Location',
    address: '123 Test Street',
  };

  const mockMachine: Partial<Machine> = {
    id: 'machine-uuid',
    machine_number: 'M-001',
    name: 'Test Coffee Machine',
    status: MachineStatus.ACTIVE,
    location_id: 'location-uuid',
    location: mockLocation as any,
    installation_date: new Date('2024-01-15'),
    purchase_price: 1000000,
    accumulated_depreciation: 100000,
  };

  const mockMachineWithoutLocation = {
    ...mockMachine,
    location: null,
  } as unknown as Partial<Machine>;

  const mockMachineWithoutPurchasePrice: Partial<Machine> = {
    ...mockMachine,
    purchase_price: null,
  };

  // Date range for testing
  // Using Jan 1 to Feb 1 to get exactly 31 days (Math.ceil calculation)
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-02-01');

  // Helper function to create mock query builder
  const createMockQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  });

  beforeEach(async () => {
    // Create mock repositories
    const mockTransactionRepository = {
      createQueryBuilder: jest.fn(),
    };

    const mockTaskRepository = {
      createQueryBuilder: jest.fn(),
    };

    const mockIncidentRepository = {
      createQueryBuilder: jest.fn(),
    };

    const mockMachineRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachinePerformanceService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(Incident),
          useValue: mockIncidentRepository,
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepository,
        },
      ],
    }).compile();

    service = module.get<MachinePerformanceService>(MachinePerformanceService);
    transactionRepository = module.get(getRepositoryToken(Transaction));
    taskRepository = module.get(getRepositoryToken(Task));
    incidentRepository = module.get(getRepositoryToken(Incident));
    machineRepository = module.get(getRepositoryToken(Machine));

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // GENERATE REPORT - MACHINE LOOKUP TESTS
  // ============================================================================

  describe('generateReport - Machine Lookup', () => {
    it('should lookup machine with location relation', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupDefaultQueryBuilders();

      // Act
      await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(machineRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'machine-uuid' },
        relations: ['location'],
      });
    });

    it('should throw Error when machine not found', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateReport('non-existent-uuid', startDate, endDate)).rejects.toThrow(
        'Machine with ID non-existent-uuid not found',
      );
    });

    it('should include machine data in report', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupDefaultQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.machine).toEqual({
        id: 'machine-uuid',
        machine_number: 'M-001',
        name: 'Test Coffee Machine',
        location_name: 'Test Location',
        location_address: '123 Test Street',
        status: MachineStatus.ACTIVE,
        installed_at: new Date('2024-01-15'),
      });
    });

    it('should handle machine without location (use default values)', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachineWithoutLocation as Machine);
      setupDefaultQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.machine.location_name).toBe('Unknown');
      expect(result.machine.location_address).toBe('Unknown');
    });

    it('should handle machine without installation_date (use current date)', async () => {
      // Arrange
      const machineNoInstallDate = { ...mockMachine, installation_date: null };
      machineRepository.findOne.mockResolvedValue(machineNoInstallDate as Machine);
      setupDefaultQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.machine.installed_at).toBeInstanceOf(Date);
    });
  });

  // ============================================================================
  // GENERATE REPORT - PERIOD DATA TESTS
  // ============================================================================

  describe('generateReport - Period Data', () => {
    it('should include period data in report', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupDefaultQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.period).toEqual({
        start_date: startDate,
        end_date: endDate,
      });
    });

    it('should include generated_at timestamp', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupDefaultQueryBuilders();
      const beforeGeneration = new Date();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);
      const afterGeneration = new Date();

      // Assert
      expect(result.generated_at).toBeInstanceOf(Date);
      expect(result.generated_at.getTime()).toBeGreaterThanOrEqual(beforeGeneration.getTime());
      expect(result.generated_at.getTime()).toBeLessThanOrEqual(afterGeneration.getTime());
    });
  });

  // ============================================================================
  // GENERATE REPORT - SALES DATA TESTS
  // ============================================================================

  describe('generateReport - Sales Data', () => {
    it('should aggregate total revenue and transactions', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);

      const totalStatsQb = createMockQueryBuilder();
      totalStatsQb.getRawOne.mockResolvedValue({
        total_revenue: '150000',
        total_transactions: '50',
      });

      const paymentBreakdownQb = createMockQueryBuilder();
      paymentBreakdownQb.getRawMany.mockResolvedValue([
        { payment_method: 'cash', amount: '100000', transaction_count: '30' },
        { payment_method: 'card', amount: '50000', transaction_count: '20' },
      ]);

      const topProductsQb = createMockQueryBuilder();
      topProductsQb.getRawMany.mockResolvedValue([
        { product_name: 'Americano', quantity_sold: '25', revenue: '75000' },
        { product_name: 'Latte', quantity_sold: '15', revenue: '60000' },
      ]);

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(totalStatsQb as any)
        .mockReturnValueOnce(paymentBreakdownQb as any)
        .mockReturnValueOnce(topProductsQb as any);

      setupTaskQueryBuilder();
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.sales.total_revenue).toBe(150000);
      expect(result.sales.total_transactions).toBe(50);
      expect(result.sales.average_transaction).toBe(3000); // 150000 / 50
    });

    it('should calculate average transaction correctly when transactions exist', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);

      const totalStatsQb = createMockQueryBuilder();
      totalStatsQb.getRawOne.mockResolvedValue({
        total_revenue: '250000',
        total_transactions: '100',
      });

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(totalStatsQb as any)
        .mockReturnValueOnce(createEmptyPaymentBreakdownQb() as any)
        .mockReturnValueOnce(createEmptyTopProductsQb() as any);

      setupTaskQueryBuilder();
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.sales.average_transaction).toBe(2500); // 250000 / 100
    });

    it('should return 0 average transaction when no transactions', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);

      const totalStatsQb = createMockQueryBuilder();
      totalStatsQb.getRawOne.mockResolvedValue({
        total_revenue: '0',
        total_transactions: '0',
      });

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(totalStatsQb as any)
        .mockReturnValueOnce(createEmptyPaymentBreakdownQb() as any)
        .mockReturnValueOnce(createEmptyTopProductsQb() as any);

      setupTaskQueryBuilder();
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.sales.average_transaction).toBe(0);
    });

    it('should aggregate payment breakdown with percentages', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);

      const totalStatsQb = createMockQueryBuilder();
      totalStatsQb.getRawOne.mockResolvedValue({
        total_revenue: '100000',
        total_transactions: '40',
      });

      const paymentBreakdownQb = createMockQueryBuilder();
      paymentBreakdownQb.getRawMany.mockResolvedValue([
        { payment_method: 'cash', amount: '60000', transaction_count: '24' },
        { payment_method: 'card', amount: '40000', transaction_count: '16' },
      ]);

      const topProductsQb = createMockQueryBuilder();
      topProductsQb.getRawMany.mockResolvedValue([]);

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(totalStatsQb as any)
        .mockReturnValueOnce(paymentBreakdownQb as any)
        .mockReturnValueOnce(topProductsQb as any);

      setupTaskQueryBuilder();
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.sales.payment_breakdown).toHaveLength(2);
      expect(result.sales.payment_breakdown[0]).toEqual({
        payment_method: 'cash',
        amount: 60000,
        transaction_count: 24,
        percentage: 60, // 60000 / 100000 * 100
      });
      expect(result.sales.payment_breakdown[1]).toEqual({
        payment_method: 'card',
        amount: 40000,
        transaction_count: 16,
        percentage: 40, // 40000 / 100000 * 100
      });
    });

    it('should handle payment breakdown with zero total revenue', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);

      const totalStatsQb = createMockQueryBuilder();
      totalStatsQb.getRawOne.mockResolvedValue({
        total_revenue: '0',
        total_transactions: '0',
      });

      const paymentBreakdownQb = createMockQueryBuilder();
      paymentBreakdownQb.getRawMany.mockResolvedValue([
        { payment_method: 'cash', amount: '0', transaction_count: '0' },
      ]);

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(totalStatsQb as any)
        .mockReturnValueOnce(paymentBreakdownQb as any)
        .mockReturnValueOnce(createEmptyTopProductsQb() as any);

      setupTaskQueryBuilder();
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.sales.payment_breakdown[0].percentage).toBe(0);
    });

    it('should aggregate top products', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);

      const totalStatsQb = createMockQueryBuilder();
      totalStatsQb.getRawOne.mockResolvedValue({
        total_revenue: '200000',
        total_transactions: '80',
      });

      const paymentBreakdownQb = createMockQueryBuilder();
      paymentBreakdownQb.getRawMany.mockResolvedValue([]);

      const topProductsQb = createMockQueryBuilder();
      topProductsQb.getRawMany.mockResolvedValue([
        { product_name: 'Americano', quantity_sold: '30', revenue: '90000' },
        { product_name: 'Latte', quantity_sold: '25', revenue: '75000' },
        { product_name: 'Espresso', quantity_sold: '25', revenue: '35000' },
      ]);

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(totalStatsQb as any)
        .mockReturnValueOnce(paymentBreakdownQb as any)
        .mockReturnValueOnce(topProductsQb as any);

      setupTaskQueryBuilder();
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.sales.top_products).toHaveLength(3);
      expect(result.sales.top_products[0]).toEqual({
        product_name: 'Americano',
        quantity_sold: 30,
        revenue: 90000,
      });
    });

    it('should handle null values in sales data', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);

      const totalStatsQb = createMockQueryBuilder();
      totalStatsQb.getRawOne.mockResolvedValue({
        total_revenue: null,
        total_transactions: null,
      });

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(totalStatsQb as any)
        .mockReturnValueOnce(createEmptyPaymentBreakdownQb() as any)
        .mockReturnValueOnce(createEmptyTopProductsQb() as any);

      setupTaskQueryBuilder();
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.sales.total_revenue).toBe(0);
      expect(result.sales.total_transactions).toBe(0);
    });
  });

  // ============================================================================
  // GENERATE REPORT - TASKS DATA TESTS
  // ============================================================================

  describe('generateReport - Tasks Data', () => {
    it('should aggregate tasks by type', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();

      const tasksQb = createMockQueryBuilder();
      tasksQb.getRawOne.mockResolvedValue({
        total: '20',
        refills: '8',
        collections: '4',
        maintenance: '5',
        repairs: '3',
        completed: '18',
        avg_completion_hours: '2.5',
      });

      taskRepository.createQueryBuilder.mockReturnValue(tasksQb as any);
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.tasks.total).toBe(20);
      expect(result.tasks.refills).toBe(8);
      expect(result.tasks.collections).toBe(4);
      expect(result.tasks.maintenance).toBe(5);
      expect(result.tasks.repairs).toBe(3);
    });

    it('should calculate task completion rate correctly', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();

      const tasksQb = createMockQueryBuilder();
      tasksQb.getRawOne.mockResolvedValue({
        total: '20',
        refills: '8',
        collections: '4',
        maintenance: '5',
        repairs: '3',
        completed: '15',
        avg_completion_hours: '3.0',
      });

      taskRepository.createQueryBuilder.mockReturnValue(tasksQb as any);
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.tasks.completion_rate).toBe(75); // 15 / 20 * 100
    });

    it('should return 0% completion rate when no tasks', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();

      const tasksQb = createMockQueryBuilder();
      tasksQb.getRawOne.mockResolvedValue({
        total: '0',
        refills: '0',
        collections: '0',
        maintenance: '0',
        repairs: '0',
        completed: '0',
        avg_completion_hours: null,
      });

      taskRepository.createQueryBuilder.mockReturnValue(tasksQb as any);
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.tasks.completion_rate).toBe(0);
      expect(result.tasks.total).toBe(0);
    });

    it('should calculate average completion time', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();

      const tasksQb = createMockQueryBuilder();
      tasksQb.getRawOne.mockResolvedValue({
        total: '10',
        refills: '5',
        collections: '3',
        maintenance: '2',
        repairs: '0',
        completed: '8',
        avg_completion_hours: '4.5',
      });

      taskRepository.createQueryBuilder.mockReturnValue(tasksQb as any);
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.tasks.average_completion_time_hours).toBe(4.5);
    });

    it('should handle null avg_completion_hours', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();

      const tasksQb = createMockQueryBuilder();
      tasksQb.getRawOne.mockResolvedValue({
        total: '5',
        refills: '2',
        collections: '1',
        maintenance: '1',
        repairs: '1',
        completed: '0',
        avg_completion_hours: null,
      });

      taskRepository.createQueryBuilder.mockReturnValue(tasksQb as any);
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.tasks.average_completion_time_hours).toBe(0);
    });

    it('should handle null task type counts', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();

      const tasksQb = createMockQueryBuilder();
      tasksQb.getRawOne.mockResolvedValue({
        total: null,
        refills: null,
        collections: null,
        maintenance: null,
        repairs: null,
        completed: null,
        avg_completion_hours: null,
      });

      taskRepository.createQueryBuilder.mockReturnValue(tasksQb as any);
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.tasks.total).toBe(0);
      expect(result.tasks.refills).toBe(0);
      expect(result.tasks.collections).toBe(0);
      expect(result.tasks.maintenance).toBe(0);
      expect(result.tasks.repairs).toBe(0);
    });
  });

  // ============================================================================
  // GENERATE REPORT - INCIDENTS DATA TESTS
  // ============================================================================

  describe('generateReport - Incidents Data', () => {
    it('should aggregate incidents by type', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();
      setupTaskQueryBuilder();

      const incidentsByTypeQb = createMockQueryBuilder();
      incidentsByTypeQb.getRawMany.mockResolvedValue([
        { type: 'technical_failure', count: '5' },
        { type: 'out_of_stock', count: '3' },
        { type: 'vandalism', count: '1' },
      ]);

      const resolvedStatsQb = createMockQueryBuilder();
      resolvedStatsQb.getRawOne.mockResolvedValue({
        resolved: '7',
        avg_resolution_hours: '12.5',
      });

      const uptimeQb = createMockQueryBuilder();
      uptimeQb.getRawOne.mockResolvedValue({
        offline_days: '3',
      });

      incidentRepository.createQueryBuilder
        .mockReturnValueOnce(incidentsByTypeQb as any)
        .mockReturnValueOnce(resolvedStatsQb as any)
        .mockReturnValueOnce(uptimeQb as any);

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.incidents.total).toBe(9); // 5 + 3 + 1
      expect(result.incidents.by_type).toHaveLength(3);
      expect(result.incidents.by_type[0]).toEqual({
        type: 'technical_failure',
        count: 5,
      });
    });

    it('should calculate resolved incidents count', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();
      setupTaskQueryBuilder();

      // Since Promise.all is used, queries may execute in any order
      // Use a factory that creates unique query builders for each call
      setupIncidentQueryBuildersForTest({
        incidentsByType: [{ type: 'technical_failure', count: '10' }],
        resolvedStats: { resolved: '8', avg_resolution_hours: '6.0' },
        offlineDays: '2',
      });

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.incidents.resolved).toBe(8);
    });

    it('should calculate average resolution time', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();
      setupTaskQueryBuilder();

      setupIncidentQueryBuildersForTest({
        incidentsByType: [{ type: 'technical_failure', count: '5' }],
        resolvedStats: { resolved: '5', avg_resolution_hours: '24.5' },
        offlineDays: '1',
      });

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.incidents.average_resolution_time_hours).toBe(24.5);
    });

    it('should handle no incidents', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();
      setupTaskQueryBuilder();

      const incidentsByTypeQb = createMockQueryBuilder();
      incidentsByTypeQb.getRawMany.mockResolvedValue([]);

      const resolvedStatsQb = createMockQueryBuilder();
      resolvedStatsQb.getRawOne.mockResolvedValue({
        resolved: '0',
        avg_resolution_hours: null,
      });

      const uptimeQb = createMockQueryBuilder();
      uptimeQb.getRawOne.mockResolvedValue({
        offline_days: '0',
      });

      incidentRepository.createQueryBuilder
        .mockReturnValueOnce(incidentsByTypeQb as any)
        .mockReturnValueOnce(resolvedStatsQb as any)
        .mockReturnValueOnce(uptimeQb as any);

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.incidents.total).toBe(0);
      expect(result.incidents.by_type).toHaveLength(0);
      expect(result.incidents.resolved).toBe(0);
      expect(result.incidents.average_resolution_time_hours).toBe(0);
    });

    it('should handle null resolved stats', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();
      setupTaskQueryBuilder();

      const incidentsByTypeQb = createMockQueryBuilder();
      incidentsByTypeQb.getRawMany.mockResolvedValue([{ type: 'technical_failure', count: '3' }]);

      const resolvedStatsQb = createMockQueryBuilder();
      resolvedStatsQb.getRawOne.mockResolvedValue({
        resolved: null,
        avg_resolution_hours: null,
      });

      const uptimeQb = createMockQueryBuilder();
      uptimeQb.getRawOne.mockResolvedValue({
        offline_days: '1',
      });

      incidentRepository.createQueryBuilder
        .mockReturnValueOnce(incidentsByTypeQb as any)
        .mockReturnValueOnce(resolvedStatsQb as any)
        .mockReturnValueOnce(uptimeQb as any);

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.incidents.resolved).toBe(0);
      expect(result.incidents.average_resolution_time_hours).toBe(0);
    });
  });

  // ============================================================================
  // GENERATE REPORT - EXPENSES DATA TESTS (Currently Stubbed)
  // ============================================================================

  describe('generateReport - Expenses Data', () => {
    it('should return empty expenses (currently stubbed)', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupDefaultQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.expenses).toEqual({
        total: 0,
        by_category: [],
      });
    });
  });

  // ============================================================================
  // GENERATE REPORT - UPTIME DATA TESTS
  // ============================================================================

  describe('generateReport - Uptime Data', () => {
    it('should calculate total days in period', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();
      setupTaskQueryBuilder();

      const incidentsByTypeQb = createMockQueryBuilder();
      incidentsByTypeQb.getRawMany.mockResolvedValue([]);

      const resolvedStatsQb = createMockQueryBuilder();
      resolvedStatsQb.getRawOne.mockResolvedValue({
        resolved: '0',
        avg_resolution_hours: null,
      });

      const uptimeQb = createMockQueryBuilder();
      uptimeQb.getRawOne.mockResolvedValue({
        offline_days: '5',
      });

      incidentRepository.createQueryBuilder
        .mockReturnValueOnce(incidentsByTypeQb as any) // getIncidentsData - by type
        .mockReturnValueOnce(resolvedStatsQb as any) // getIncidentsData - resolved
        .mockReturnValueOnce(uptimeQb as any); // getUptimeData - offline days

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      // January 1 to February 1: 31 days (Math.ceil of difference)
      expect(result.uptime.total_days).toBe(31);
    });

    it('should calculate active and offline days', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();
      setupTaskQueryBuilder();

      setupIncidentQueryBuildersForTest({
        incidentsByType: [{ type: 'machine_offline', count: '3' }],
        resolvedStats: { resolved: '2', avg_resolution_hours: '8.0' },
        offlineDays: '5',
      });

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.uptime.offline_days).toBe(5);
      expect(result.uptime.active_days).toBe(26); // 31 - 5
    });

    it('should calculate uptime percentage correctly', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();
      setupTaskQueryBuilder();

      setupIncidentQueryBuildersForTest({
        incidentsByType: [],
        resolvedStats: { resolved: '0', avg_resolution_hours: null },
        offlineDays: '10',
      });

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      // (31 - 10) / 31 * 100 = 67.74%
      expect(result.uptime.uptime_percentage).toBeCloseTo(67.74, 1);
    });

    it('should return 100% uptime when no offline days', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();
      setupTaskQueryBuilder();

      const incidentsByTypeQb = createMockQueryBuilder();
      incidentsByTypeQb.getRawMany.mockResolvedValue([]);

      const resolvedStatsQb = createMockQueryBuilder();
      resolvedStatsQb.getRawOne.mockResolvedValue({
        resolved: '0',
        avg_resolution_hours: null,
      });

      const uptimeQb = createMockQueryBuilder();
      uptimeQb.getRawOne.mockResolvedValue({
        offline_days: '0',
      });

      incidentRepository.createQueryBuilder
        .mockReturnValueOnce(incidentsByTypeQb as any) // getIncidentsData - by type
        .mockReturnValueOnce(resolvedStatsQb as any) // getIncidentsData - resolved
        .mockReturnValueOnce(uptimeQb as any); // getUptimeData - offline days

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.uptime.uptime_percentage).toBe(100);
      expect(result.uptime.offline_days).toBe(0);
      expect(result.uptime.active_days).toBe(31);
    });

    it('should handle null offline_days as 0', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupSalesQueryBuilders();
      setupTaskQueryBuilder();

      const incidentsByTypeQb = createMockQueryBuilder();
      incidentsByTypeQb.getRawMany.mockResolvedValue([]);

      const resolvedStatsQb = createMockQueryBuilder();
      resolvedStatsQb.getRawOne.mockResolvedValue({
        resolved: '0',
        avg_resolution_hours: null,
      });

      const uptimeQb = createMockQueryBuilder();
      uptimeQb.getRawOne.mockResolvedValue({
        offline_days: null,
      });

      incidentRepository.createQueryBuilder
        .mockReturnValueOnce(incidentsByTypeQb as any)
        .mockReturnValueOnce(resolvedStatsQb as any)
        .mockReturnValueOnce(uptimeQb as any);

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.uptime.offline_days).toBe(0);
    });
  });

  // ============================================================================
  // GENERATE REPORT - PROFITABILITY CALCULATION TESTS
  // ============================================================================

  describe('generateReport - Profitability Calculation', () => {
    it('should calculate net profit (revenue - expenses)', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);

      const totalStatsQb = createMockQueryBuilder();
      totalStatsQb.getRawOne.mockResolvedValue({
        total_revenue: '500000',
        total_transactions: '100',
      });

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(totalStatsQb as any)
        .mockReturnValueOnce(createEmptyPaymentBreakdownQb() as any)
        .mockReturnValueOnce(createEmptyTopProductsQb() as any);

      setupTaskQueryBuilder();
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      // Expenses are 0 (stubbed), so net profit = revenue
      expect(result.profitability.revenue).toBe(500000);
      expect(result.profitability.expenses).toBe(0);
      expect(result.profitability.net_profit).toBe(500000);
    });

    it('should calculate profit margin correctly', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);

      const totalStatsQb = createMockQueryBuilder();
      totalStatsQb.getRawOne.mockResolvedValue({
        total_revenue: '200000',
        total_transactions: '50',
      });

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(totalStatsQb as any)
        .mockReturnValueOnce(createEmptyPaymentBreakdownQb() as any)
        .mockReturnValueOnce(createEmptyTopProductsQb() as any);

      setupTaskQueryBuilder();
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      // With 0 expenses, margin = (200000 - 0) / 200000 * 100 = 100%
      expect(result.profitability.profit_margin).toBe(100);
    });

    it('should return 0 profit margin when revenue is 0', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);

      const totalStatsQb = createMockQueryBuilder();
      totalStatsQb.getRawOne.mockResolvedValue({
        total_revenue: '0',
        total_transactions: '0',
      });

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(totalStatsQb as any)
        .mockReturnValueOnce(createEmptyPaymentBreakdownQb() as any)
        .mockReturnValueOnce(createEmptyTopProductsQb() as any);

      setupTaskQueryBuilder();
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.profitability.profit_margin).toBe(0);
    });

    it('should calculate ROI based on purchase price', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);

      const totalStatsQb = createMockQueryBuilder();
      totalStatsQb.getRawOne.mockResolvedValue({
        total_revenue: '100000',
        total_transactions: '40',
      });

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(totalStatsQb as any)
        .mockReturnValueOnce(createEmptyPaymentBreakdownQb() as any)
        .mockReturnValueOnce(createEmptyTopProductsQb() as any);

      setupTaskQueryBuilder();
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      // ROI = (100000 - 0) / 1000000 * 100 = 10%
      expect(result.profitability.roi).toBe(10);
    });

    it('should return 0 ROI when purchase price is 0 or null', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachineWithoutPurchasePrice as Machine);

      const totalStatsQb = createMockQueryBuilder();
      totalStatsQb.getRawOne.mockResolvedValue({
        total_revenue: '100000',
        total_transactions: '40',
      });

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(totalStatsQb as any)
        .mockReturnValueOnce(createEmptyPaymentBreakdownQb() as any)
        .mockReturnValueOnce(createEmptyTopProductsQb() as any);

      setupTaskQueryBuilder();
      setupIncidentQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      expect(result.profitability.roi).toBe(0);
    });
  });

  // ============================================================================
  // GENERATE REPORT - CONCURRENT DATA FETCHING TESTS
  // ============================================================================

  describe('generateReport - Concurrent Data Fetching', () => {
    it('should fetch all data concurrently using Promise.all', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupDefaultQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert
      // All sections should be populated in the result
      expect(result.sales).toBeDefined();
      expect(result.tasks).toBeDefined();
      expect(result.incidents).toBeDefined();
      expect(result.expenses).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.profitability).toBeDefined();
    });

    it('should return complete report structure', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      setupDefaultQueryBuilders();

      // Act
      const result = await service.generateReport('machine-uuid', startDate, endDate);

      // Assert - verify all top-level properties exist
      const requiredKeys: (keyof MachinePerformanceReport)[] = [
        'machine',
        'period',
        'sales',
        'tasks',
        'incidents',
        'expenses',
        'profitability',
        'uptime',
        'generated_at',
      ];

      requiredKeys.forEach((key) => {
        expect(result).toHaveProperty(key);
      });
    });
  });

  // ============================================================================
  // HELPER FUNCTIONS FOR SETTING UP QUERY BUILDERS
  // ============================================================================

  function setupDefaultQueryBuilders() {
    setupSalesQueryBuilders();
    setupTaskQueryBuilder();
    setupIncidentQueryBuilders();
  }

  function setupSalesQueryBuilders() {
    const totalStatsQb = createMockQueryBuilder();
    totalStatsQb.getRawOne.mockResolvedValue({
      total_revenue: '0',
      total_transactions: '0',
    });

    const paymentBreakdownQb = createMockQueryBuilder();
    paymentBreakdownQb.getRawMany.mockResolvedValue([]);

    const topProductsQb = createMockQueryBuilder();
    topProductsQb.getRawMany.mockResolvedValue([]);

    transactionRepository.createQueryBuilder
      .mockReturnValueOnce(totalStatsQb as any)
      .mockReturnValueOnce(paymentBreakdownQb as any)
      .mockReturnValueOnce(topProductsQb as any);
  }

  function setupTaskQueryBuilder() {
    const tasksQb = createMockQueryBuilder();
    tasksQb.getRawOne.mockResolvedValue({
      total: '0',
      refills: '0',
      collections: '0',
      maintenance: '0',
      repairs: '0',
      completed: '0',
      avg_completion_hours: null,
    });

    taskRepository.createQueryBuilder.mockReturnValue(tasksQb as any);
  }

  function setupIncidentQueryBuilders() {
    setupIncidentQueryBuildersForTest({
      incidentsByType: [],
      resolvedStats: { resolved: '0', avg_resolution_hours: null },
      offlineDays: '0',
    });
  }

  /**
   * Setup incident query builders with specific test data.
   *
   * The incidentRepository.createQueryBuilder is called 3 times total:
   * - 2 times in getIncidentsData (by type + resolved)
   * - 1 time in getUptimeData (offline days)
   *
   * Due to Promise.all execution order in JavaScript's event loop:
   * 1. getIncidentsData starts first, makes call #1 (by_type), then awaits
   * 2. getUptimeData starts, makes call #2 (offline_days), then awaits
   * 3. After both awaits resolve, getIncidentsData continues to call #3 (resolved_stats)
   *
   * So the order is: by_type, offline_days, resolved_stats
   */
  function setupIncidentQueryBuildersForTest(config: {
    incidentsByType: Array<{ type: string; count: string }>;
    resolvedStats: { resolved: string; avg_resolution_hours: string | null };
    offlineDays: string;
  }) {
    // Create query builders with distinct behaviors
    const byTypeQb = createMockQueryBuilder();
    byTypeQb.getRawMany.mockResolvedValue(config.incidentsByType);

    const uptimeQb = createMockQueryBuilder();
    uptimeQb.getRawOne.mockResolvedValue({ offline_days: config.offlineDays });

    const resolvedQb = createMockQueryBuilder();
    resolvedQb.getRawOne.mockResolvedValue(config.resolvedStats);

    // The order is: by_type, offline_days, resolved_stats
    // (based on Promise.all execution order and await points)
    incidentRepository.createQueryBuilder
      .mockReturnValueOnce(byTypeQb as any) // getIncidentsData - by type query
      .mockReturnValueOnce(uptimeQb as any) // getUptimeData - offline days query
      .mockReturnValueOnce(resolvedQb as any); // getIncidentsData - resolved stats query
  }

  function createEmptyPaymentBreakdownQb() {
    const qb = createMockQueryBuilder();
    qb.getRawMany.mockResolvedValue([]);
    return qb;
  }

  function createEmptyTopProductsQb() {
    const qb = createMockQueryBuilder();
    qb.getRawMany.mockResolvedValue([]);
    return qb;
  }
});
