import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ReportsService } from './reports.service';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Task, TaskStatus } from '../tasks/entities/task.entity';
import { Incident } from '../incidents/entities/incident.entity';
import { Complaint } from '../complaints/entities/complaint.entity';
import { Machine } from '../machines/entities/machine.entity';
import { ReportFiltersDto } from './dto/report-filters.dto';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockTransactionRepository: jest.Mocked<Repository<Transaction>>;
  let mockTaskRepository: jest.Mocked<Repository<Task>>;
  let mockIncidentRepository: jest.Mocked<Repository<Incident>>;
  let mockComplaintRepository: jest.Mocked<Repository<Complaint>>;
  let mockMachineRepository: jest.Mocked<Repository<Machine>>;

  // Helper to create mock query builder
  const createMockQueryBuilder = (returnValue: any): Partial<SelectQueryBuilder<any>> => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(returnValue),
    getRawMany: jest.fn().mockResolvedValue(returnValue),
    getCount: jest.fn().mockResolvedValue(returnValue),
    getOne: jest.fn().mockResolvedValue(returnValue),
    getMany: jest.fn().mockResolvedValue(returnValue),
  });

  beforeEach(async () => {
    mockTransactionRepository = {
      createQueryBuilder: jest.fn(),
    } as any;

    mockTaskRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockIncidentRepository = {
      count: jest.fn(),
    } as any;

    mockComplaintRepository = {
      count: jest.fn(),
    } as any;

    mockMachineRepository = {
      count: jest.fn(),
      findOne: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
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
          provide: getRepositoryToken(Complaint),
          useValue: mockComplaintRepository,
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepository,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return aggregated dashboard data successfully', async () => {
      // Arrange
      const filters: ReportFiltersDto = {
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      };

      // Mock revenue query
      const revenueQueryBuilder = createMockQueryBuilder({ total: '15000.50' });
      // Mock expenses query
      const expensesQueryBuilder = createMockQueryBuilder({ total: '3000.25' });
      // Mock collections query
      const collectionsQueryBuilder = createMockQueryBuilder({ total: '12000.00' });
      // Mock overdue tasks query
      const overdueTasksQueryBuilder = createMockQueryBuilder(5);

      mockTransactionRepository.createQueryBuilder
        .mockReturnValueOnce(revenueQueryBuilder as any)
        .mockReturnValueOnce(expensesQueryBuilder as any)
        .mockReturnValueOnce(collectionsQueryBuilder as any);

      mockTaskRepository.count
        .mockResolvedValueOnce(100) // total tasks
        .mockResolvedValueOnce(75); // completed tasks

      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueTasksQueryBuilder as any);

      mockIncidentRepository.count
        .mockResolvedValueOnce(10) // open incidents
        .mockResolvedValueOnce(2); // critical incidents

      mockComplaintRepository.count.mockResolvedValue(5); // new complaints

      mockMachineRepository.count
        .mockResolvedValueOnce(45) // active machines
        .mockResolvedValueOnce(50); // total machines

      // Act
      const result = await service.getDashboard(filters);

      // Assert
      expect(result).toBeDefined();
      expect(result.period.from).toBeDefined();
      expect(result.period.to).toBeDefined();

      // Financial assertions
      expect(result.financial.revenue).toBe(15000.5);
      expect(result.financial.expenses).toBe(3000.25);
      expect(result.financial.collections).toBe(12000.0);
      expect(result.financial.net_profit).toBe(12000.25); // 15000.50 - 3000.25

      // Tasks assertions
      expect(result.tasks.total).toBe(100);
      expect(result.tasks.completed).toBe(75);
      expect(result.tasks.overdue).toBe(5);
      expect(result.tasks.completion_rate).toBe(75.0);

      // Incidents assertions
      expect(result.incidents.open).toBe(10);
      expect(result.incidents.critical).toBe(2);

      // Complaints assertions
      expect(result.complaints.new).toBe(5);

      // Machines assertions
      expect(result.machines.active).toBe(45);
      expect(result.machines.total).toBe(50);
    });

    it('should handle null values in financial data', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};

      const nullQueryBuilder = createMockQueryBuilder({ total: null });
      const overdueQueryBuilder = createMockQueryBuilder(0);

      mockTransactionRepository.createQueryBuilder.mockReturnValue(nullQueryBuilder as any);
      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);
      mockMachineRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getDashboard(filters);

      // Assert
      expect(result.financial.revenue).toBe(0);
      expect(result.financial.expenses).toBe(0);
      expect(result.financial.collections).toBe(0);
      expect(result.financial.net_profit).toBe(0);
    });

    it('should handle zero tasks correctly for completion rate', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};

      const nullQueryBuilder = createMockQueryBuilder({ total: '0' });
      const zeroQueryBuilder = createMockQueryBuilder(0);

      mockTransactionRepository.createQueryBuilder.mockReturnValue(nullQueryBuilder as any);
      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(zeroQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);
      mockMachineRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getDashboard(filters);

      // Assert
      expect(result.tasks.total).toBe(0);
      expect(result.tasks.completion_rate).toBe(0);
    });

    it('should use correct date filters for transactions', async () => {
      // Arrange
      const filters: ReportFiltersDto = {
        start_date: '2025-03-01',
        end_date: '2025-03-31',
      };

      const mockQueryBuilder = createMockQueryBuilder({ total: '100' });
      const overdueQueryBuilder = createMockQueryBuilder(0);

      mockTransactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);
      mockMachineRepository.count.mockResolvedValue(0);

      // Act
      await service.getDashboard(filters);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        't.transaction_date BETWEEN :from AND :to',
        expect.objectContaining({
          from: expect.any(Date),
          to: expect.any(Date),
        }),
      );
    });

    it('should run all queries in parallel using Promise.all', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};

      const mockQueryBuilder = createMockQueryBuilder({ total: '0' });
      const overdueQueryBuilder = createMockQueryBuilder(0);

      mockTransactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);
      mockMachineRepository.count.mockResolvedValue(0);

      // Act
      await service.getDashboard(filters);

      // Assert - All repositories should be called
      expect(mockTransactionRepository.createQueryBuilder).toHaveBeenCalledTimes(3); // revenue, expenses, collections
      expect(mockTaskRepository.count).toHaveBeenCalledTimes(2); // total, completed
      expect(mockTaskRepository.createQueryBuilder).toHaveBeenCalledTimes(1); // overdue
      expect(mockIncidentRepository.count).toHaveBeenCalledTimes(2); // open, critical
      expect(mockComplaintRepository.count).toHaveBeenCalledTimes(1); // new
      expect(mockMachineRepository.count).toHaveBeenCalledTimes(2); // active, total
    });
  });

  describe('getMachineReport', () => {
    const machineId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return machine report when machine exists', async () => {
      // Arrange
      const filters: ReportFiltersDto = {
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      };

      const mockMachine = {
        id: machineId,
        machine_number: 'M-001',
        name: 'Coffee Machine',
        location: { name: 'Office Building' },
      };

      mockMachineRepository.findOne.mockResolvedValue(mockMachine as any);

      // Mock sales query
      const salesQueryBuilder = createMockQueryBuilder({ count: '50', total: '2500.00' });
      // Mock collections query
      const collectionsQueryBuilder = createMockQueryBuilder({ total: '2000.00' });
      // Mock tasks query
      const tasksQueryBuilder = createMockQueryBuilder([
        { type: 'refill', count: '10' },
        { type: 'maintenance', count: '3' },
      ]);

      mockTransactionRepository.createQueryBuilder
        .mockReturnValueOnce(salesQueryBuilder as any)
        .mockReturnValueOnce(collectionsQueryBuilder as any);

      mockTaskRepository.createQueryBuilder.mockReturnValue(tasksQueryBuilder as any);

      mockIncidentRepository.count.mockResolvedValue(5);
      mockComplaintRepository.count.mockResolvedValue(2);

      // Act
      const result = await service.getMachineReport(machineId, filters);

      // Assert
      expect(result.machine).toBeDefined();
      expect(result.machine.id).toBe(machineId);
      expect(result.machine.machine_number).toBe('M-001');
      expect(result.machine.name).toBe('Coffee Machine');
      expect(result.machine.location).toEqual({ name: 'Office Building' });

      expect(result.sales.count).toBe(50);
      expect(result.sales.total).toBe(2500.0);
      expect(result.collections.total).toBe(2000.0);

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].type).toBe('refill');
      expect(result.tasks[0].count).toBe(10);

      expect(result.incidents).toBe(5);
      expect(result.complaints).toBe(2);
    });

    it('should throw error when machine not found', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};
      mockMachineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getMachineReport(machineId, filters)).rejects.toThrow(
        'Machine not found',
      );
    });

    it('should handle null sales data', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};
      const mockMachine = {
        id: machineId,
        machine_number: 'M-001',
        name: 'Test Machine',
        location: null,
      };

      mockMachineRepository.findOne.mockResolvedValue(mockMachine as any);

      const nullSalesQueryBuilder = createMockQueryBuilder({ count: null, total: null });
      const nullCollectionsQueryBuilder = createMockQueryBuilder({ total: null });
      const emptyTasksQueryBuilder = createMockQueryBuilder([]);

      mockTransactionRepository.createQueryBuilder
        .mockReturnValueOnce(nullSalesQueryBuilder as any)
        .mockReturnValueOnce(nullCollectionsQueryBuilder as any);

      mockTaskRepository.createQueryBuilder.mockReturnValue(emptyTasksQueryBuilder as any);

      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getMachineReport(machineId, filters);

      // Assert
      expect(result.sales.count).toBe(0);
      expect(result.sales.total).toBe(0);
      expect(result.collections.total).toBe(0);
      expect(result.machine.location).toBeUndefined();
    });

    it('should handle machine without location', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};
      const mockMachine = {
        id: machineId,
        machine_number: 'M-002',
        name: 'Standalone Machine',
        location: undefined,
      };

      mockMachineRepository.findOne.mockResolvedValue(mockMachine as any);

      const queryBuilder = createMockQueryBuilder({ total: '0', count: '0' });
      const emptyTasksQueryBuilder = createMockQueryBuilder([]);

      mockTransactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      mockTaskRepository.createQueryBuilder.mockReturnValue(emptyTasksQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getMachineReport(machineId, filters);

      // Assert
      expect(result.machine.location).toBeUndefined();
    });

    it('should filter by machine_id in all queries', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};
      const mockMachine = {
        id: machineId,
        machine_number: 'M-001',
        name: 'Test Machine',
      };

      mockMachineRepository.findOne.mockResolvedValue(mockMachine as any);

      const salesQueryBuilder = createMockQueryBuilder({ count: '0', total: '0' });
      const collectionsQueryBuilder = createMockQueryBuilder({ total: '0' });
      const tasksQueryBuilder = createMockQueryBuilder([]);

      mockTransactionRepository.createQueryBuilder
        .mockReturnValueOnce(salesQueryBuilder as any)
        .mockReturnValueOnce(collectionsQueryBuilder as any);

      mockTaskRepository.createQueryBuilder.mockReturnValue(tasksQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);

      // Act
      await service.getMachineReport(machineId, filters);

      // Assert
      expect(salesQueryBuilder.where).toHaveBeenCalledWith('t.machine_id = :machineId', {
        machineId,
      });
      expect(collectionsQueryBuilder.where).toHaveBeenCalledWith('t.machine_id = :machineId', {
        machineId,
      });
      expect(tasksQueryBuilder.where).toHaveBeenCalledWith('task.machine_id = :machineId', {
        machineId,
      });
      expect(mockIncidentRepository.count).toHaveBeenCalledWith({
        where: { machine_id: machineId },
      });
      expect(mockComplaintRepository.count).toHaveBeenCalledWith({
        where: { machine_id: machineId },
      });
    });
  });

  describe('getUserReport', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174001';

    it('should return user report successfully', async () => {
      // Arrange
      const filters: ReportFiltersDto = {
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      };

      mockTaskRepository.count.mockResolvedValue(25); // completed tasks

      const overdueQueryBuilder = createMockQueryBuilder(3);
      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueQueryBuilder as any);

      const collectionsQueryBuilder = createMockQueryBuilder({ count: '15', total: '5000.00' });
      mockTransactionRepository.createQueryBuilder.mockReturnValue(collectionsQueryBuilder as any);

      // Act
      const result = await service.getUserReport(userId, filters);

      // Assert
      expect(result.tasks.completed).toBe(25);
      expect(result.tasks.overdue).toBe(3);
      expect(result.collections.count).toBe(15);
      expect(result.collections.total).toBe(5000.0);
      expect(result.period.from).toBeDefined();
      expect(result.period.to).toBeDefined();
    });

    it('should handle user with no activity', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};

      mockTaskRepository.count.mockResolvedValue(0);

      const overdueQueryBuilder = createMockQueryBuilder(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueQueryBuilder as any);

      const collectionsQueryBuilder = createMockQueryBuilder({ count: null, total: null });
      mockTransactionRepository.createQueryBuilder.mockReturnValue(collectionsQueryBuilder as any);

      // Act
      const result = await service.getUserReport(userId, filters);

      // Assert
      expect(result.tasks.completed).toBe(0);
      expect(result.tasks.overdue).toBe(0);
      expect(result.collections.count).toBe(0);
      expect(result.collections.total).toBe(0);
    });

    it('should filter by assigned_to_user_id for tasks', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};

      mockTaskRepository.count.mockResolvedValue(0);

      const overdueQueryBuilder = createMockQueryBuilder(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueQueryBuilder as any);

      const collectionsQueryBuilder = createMockQueryBuilder({ count: '0', total: '0' });
      mockTransactionRepository.createQueryBuilder.mockReturnValue(collectionsQueryBuilder as any);

      // Act
      await service.getUserReport(userId, filters);

      // Assert
      expect(mockTaskRepository.count).toHaveBeenCalledWith({
        where: {
          assigned_to_user_id: userId,
          status: TaskStatus.COMPLETED,
        },
      });
      expect(overdueQueryBuilder.where).toHaveBeenCalledWith('task.assigned_to_user_id = :userId', {
        userId,
      });
    });
  });

  describe('getDateRange', () => {
    it('should use provided start_date and end_date', async () => {
      // Arrange
      const filters: ReportFiltersDto = {
        start_date: '2025-02-15',
        end_date: '2025-02-28',
      };

      const queryBuilder = createMockQueryBuilder({ total: '0' });
      const overdueQueryBuilder = createMockQueryBuilder(0);

      mockTransactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);
      mockMachineRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getDashboard(filters);

      // Assert
      expect(result.period.from.getFullYear()).toBe(2025);
      expect(result.period.from.getMonth()).toBe(1); // February (0-indexed)
      expect(result.period.from.getDate()).toBe(15);
      expect(result.period.from.getHours()).toBe(0);
      expect(result.period.from.getMinutes()).toBe(0);

      expect(result.period.to.getFullYear()).toBe(2025);
      expect(result.period.to.getMonth()).toBe(1);
      expect(result.period.to.getDate()).toBe(28);
      expect(result.period.to.getHours()).toBe(23);
      expect(result.period.to.getMinutes()).toBe(59);
    });

    it('should default to today when no dates provided', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};
      const now = new Date();

      const queryBuilder = createMockQueryBuilder({ total: '0' });
      const overdueQueryBuilder = createMockQueryBuilder(0);

      mockTransactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);
      mockMachineRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getDashboard(filters);

      // Assert
      expect(result.period.from.getFullYear()).toBe(now.getFullYear());
      expect(result.period.from.getMonth()).toBe(now.getMonth());
      expect(result.period.from.getDate()).toBe(now.getDate());
      expect(result.period.from.getHours()).toBe(0);

      expect(result.period.to.getFullYear()).toBe(now.getFullYear());
      expect(result.period.to.getMonth()).toBe(now.getMonth());
      expect(result.period.to.getDate()).toBe(now.getDate());
      expect(result.period.to.getHours()).toBe(23);
    });

    it('should use only start_date when end_date not provided', async () => {
      // Arrange
      const now = new Date();
      const filters: ReportFiltersDto = {
        start_date: '2025-01-01',
      };

      const queryBuilder = createMockQueryBuilder({ total: '0' });
      const overdueQueryBuilder = createMockQueryBuilder(0);

      mockTransactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);
      mockMachineRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getDashboard(filters);

      // Assert
      expect(result.period.from.getFullYear()).toBe(2025);
      expect(result.period.from.getMonth()).toBe(0); // January
      expect(result.period.from.getDate()).toBe(1);

      // End date defaults to today
      expect(result.period.to.getFullYear()).toBe(now.getFullYear());
      expect(result.period.to.getMonth()).toBe(now.getMonth());
      expect(result.period.to.getDate()).toBe(now.getDate());
    });

    it('should use only end_date when start_date not provided', async () => {
      // Arrange
      const now = new Date();
      const filters: ReportFiltersDto = {
        end_date: '2025-12-31',
      };

      const queryBuilder = createMockQueryBuilder({ total: '0' });
      const overdueQueryBuilder = createMockQueryBuilder(0);

      mockTransactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);
      mockMachineRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getDashboard(filters);

      // Assert
      // Start date defaults to today
      expect(result.period.from.getFullYear()).toBe(now.getFullYear());
      expect(result.period.from.getMonth()).toBe(now.getMonth());
      expect(result.period.from.getDate()).toBe(now.getDate());

      expect(result.period.to.getFullYear()).toBe(2025);
      expect(result.period.to.getMonth()).toBe(11); // December
      expect(result.period.to.getDate()).toBe(31);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle NaN values in financial calculations', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};

      const nanQueryBuilder = createMockQueryBuilder({ total: 'not-a-number' });
      const overdueQueryBuilder = createMockQueryBuilder(0);

      mockTransactionRepository.createQueryBuilder.mockReturnValue(nanQueryBuilder as any);
      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);
      mockMachineRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getDashboard(filters);

      // Assert - NaN should be converted to 0
      expect(result.financial.revenue).toBe(0);
      expect(result.financial.expenses).toBe(0);
      expect(result.financial.net_profit).toBe(0);
    });

    it('should handle undefined raw query results', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};

      const undefinedQueryBuilder = createMockQueryBuilder(undefined);

      mockTransactionRepository.createQueryBuilder.mockReturnValue(undefinedQueryBuilder as any);
      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(undefinedQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);
      mockMachineRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getDashboard(filters);

      // Assert
      expect(result.financial.revenue).toBe(0);
      expect(result.financial.expenses).toBe(0);
      expect(result.financial.collections).toBe(0);
    });

    it('should handle very large financial numbers', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};

      const largeNumberQueryBuilder = createMockQueryBuilder({ total: '999999999.99' });
      const overdueQueryBuilder = createMockQueryBuilder(0);

      mockTransactionRepository.createQueryBuilder.mockReturnValue(largeNumberQueryBuilder as any);
      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);
      mockMachineRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getDashboard(filters);

      // Assert
      expect(result.financial.revenue).toBe(999999999.99);
    });

    it('should handle negative financial values', async () => {
      // Arrange
      const filters: ReportFiltersDto = {};

      // First call (revenue) returns positive, second (expenses) returns large negative
      mockTransactionRepository.createQueryBuilder
        .mockReturnValueOnce(createMockQueryBuilder({ total: '1000.00' }) as any)
        .mockReturnValueOnce(createMockQueryBuilder({ total: '5000.00' }) as any)
        .mockReturnValueOnce(createMockQueryBuilder({ total: '0' }) as any);

      const overdueQueryBuilder = createMockQueryBuilder(0);
      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.createQueryBuilder.mockReturnValue(overdueQueryBuilder as any);
      mockIncidentRepository.count.mockResolvedValue(0);
      mockComplaintRepository.count.mockResolvedValue(0);
      mockMachineRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getDashboard(filters);

      // Assert
      expect(result.financial.net_profit).toBe(-4000.0); // 1000 - 5000
    });
  });
});
