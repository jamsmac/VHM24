import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NetworkSummaryService } from './network-summary.service';
import { Machine, MachineStatus } from '@modules/machines/entities/machine.entity';
import { Transaction, TransactionType } from '@modules/transactions/entities/transaction.entity';
import { Task, TaskStatus } from '@modules/tasks/entities/task.entity';
import { Incident } from '@modules/incidents/entities/incident.entity';

describe('NetworkSummaryService', () => {
  let service: NetworkSummaryService;
  let machineRepository: jest.Mocked<Repository<Machine>>;
  let transactionRepository: jest.Mocked<Repository<Transaction>>;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let incidentRepository: jest.Mocked<Repository<Incident>>;

  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-31');

  const createMockQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  });

  beforeEach(async () => {
    const mockMachineRepository = {
      find: jest.fn(),
      count: jest.fn(),
    };

    const mockTransactionRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockTaskRepository = {
      find: jest.fn(),
    };

    const mockIncidentRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworkSummaryService,
        { provide: getRepositoryToken(Machine), useValue: mockMachineRepository },
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionRepository },
        { provide: getRepositoryToken(Task), useValue: mockTaskRepository },
        { provide: getRepositoryToken(Incident), useValue: mockIncidentRepository },
      ],
    }).compile();

    service = module.get<NetworkSummaryService>(NetworkSummaryService);
    machineRepository = module.get(getRepositoryToken(Machine));
    transactionRepository = module.get(getRepositoryToken(Transaction));
    taskRepository = module.get(getRepositoryToken(Task));
    incidentRepository = module.get(getRepositoryToken(Incident));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    beforeEach(() => {
      // Setup default mocks
      machineRepository.find.mockResolvedValue([]);
      machineRepository.count.mockResolvedValue(0);
      transactionRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([]);
      incidentRepository.find.mockResolvedValue([]);
      const qb = createMockQueryBuilder();
      qb.getRawMany.mockResolvedValue([]);
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);
    });

    it('should include period in report', async () => {
      const result = await service.generateReport(startDate, endDate);

      expect(result.period.start_date).toEqual(startDate);
      expect(result.period.end_date).toEqual(endDate);
      expect(result.generated_at).toBeInstanceOf(Date);
    });

    describe('machine statistics', () => {
      it('should aggregate machine statistics by status', async () => {
        const machines = [
          { id: '1', status: 'active' },
          { id: '2', status: 'active' },
          { id: '3', status: 'offline' },
          { id: '4', status: 'disabled' },
          { id: '5', status: 'low_stock' },
        ];
        machineRepository.find.mockResolvedValue(machines as Machine[]);
        machineRepository.count.mockResolvedValue(2);

        const result = await service.generateReport(startDate, endDate);

        expect(result.machines.total).toBe(5);
        expect(result.machines.active).toBe(2);
        expect(result.machines.offline).toBe(1);
        expect(result.machines.disabled).toBe(1);
        expect(result.machines.low_stock).toBe(1);
      });

      it('should handle empty machines list', async () => {
        machineRepository.find.mockResolvedValue([]);

        const result = await service.generateReport(startDate, endDate);

        expect(result.machines.total).toBe(0);
        expect(result.machines.active).toBe(0);
      });
    });

    describe('financial statistics', () => {
      it('should aggregate financial statistics', async () => {
        const transactions = [
          { transaction_type: TransactionType.SALE, amount: 50000 },
          { transaction_type: TransactionType.SALE, amount: 30000 },
          { transaction_type: TransactionType.EXPENSE, amount: 10000 },
          { transaction_type: TransactionType.COLLECTION, amount: 70000 },
        ];
        transactionRepository.find.mockResolvedValue(transactions as Transaction[]);
        machineRepository.count.mockResolvedValue(2);

        const result = await service.generateReport(startDate, endDate);

        expect(result.financial.total_revenue).toBe(80000);
        expect(result.financial.total_sales_count).toBe(2);
        expect(result.financial.total_expenses).toBe(10000);
        expect(result.financial.total_collections).toBe(70000);
        expect(result.financial.net_profit).toBe(70000); // revenue - expenses
        expect(result.financial.average_revenue_per_machine).toBe(40000); // 80000 / 2
      });

      it('should handle zero active machines for average calculation', async () => {
        const transactions = [{ transaction_type: TransactionType.SALE, amount: 50000 }];
        transactionRepository.find.mockResolvedValue(transactions as Transaction[]);
        machineRepository.count.mockResolvedValue(0);

        const result = await service.generateReport(startDate, endDate);

        expect(result.financial.average_revenue_per_machine).toBe(0);
      });

      it('should handle no transactions', async () => {
        transactionRepository.find.mockResolvedValue([]);

        const result = await service.generateReport(startDate, endDate);

        expect(result.financial.total_revenue).toBe(0);
        expect(result.financial.total_sales_count).toBe(0);
        expect(result.financial.net_profit).toBe(0);
      });
    });

    describe('task statistics', () => {
      it('should aggregate task statistics', async () => {
        const now = new Date();
        const pastDueDate = new Date(now.getTime() - 86400000); // Yesterday
        const tasks = [
          { status: TaskStatus.COMPLETED },
          { status: TaskStatus.COMPLETED },
          { status: TaskStatus.PENDING },
          { status: TaskStatus.IN_PROGRESS },
          { status: TaskStatus.PENDING, due_date: pastDueDate }, // Overdue
        ];
        taskRepository.find.mockResolvedValue(tasks as Task[]);

        const result = await service.generateReport(startDate, endDate);

        expect(result.tasks.total).toBe(5);
        expect(result.tasks.completed).toBe(2);
        expect(result.tasks.pending).toBe(2);
        expect(result.tasks.in_progress).toBe(1);
        expect(result.tasks.overdue).toBe(1);
      });

      it('should calculate completion rate', async () => {
        const tasks = [
          { status: TaskStatus.COMPLETED },
          { status: TaskStatus.COMPLETED },
          { status: TaskStatus.PENDING },
          { status: TaskStatus.PENDING },
        ];
        taskRepository.find.mockResolvedValue(tasks as Task[]);

        const result = await service.generateReport(startDate, endDate);

        expect(result.tasks.completion_rate).toBe(50); // 2/4 * 100
      });

      it('should return 0% completion rate for empty tasks', async () => {
        taskRepository.find.mockResolvedValue([]);

        const result = await service.generateReport(startDate, endDate);

        expect(result.tasks.completion_rate).toBe(0);
      });

      it('should not count completed tasks as overdue', async () => {
        const pastDueDate = new Date(Date.now() - 86400000);
        const tasks = [{ status: TaskStatus.COMPLETED, due_date: pastDueDate }];
        taskRepository.find.mockResolvedValue(tasks as Task[]);

        const result = await service.generateReport(startDate, endDate);

        expect(result.tasks.overdue).toBe(0);
      });
    });

    describe('incident statistics', () => {
      it('should aggregate incident statistics', async () => {
        const now = new Date();
        const incidents = [
          { status: 'resolved', created_at: now, resolved_at: new Date(now.getTime() + 3600000) }, // 1 hour
          { status: 'resolved', created_at: now, resolved_at: new Date(now.getTime() + 7200000) }, // 2 hours
          { status: 'open' },
          { status: 'in_progress' },
        ];
        incidentRepository.find.mockResolvedValue(incidents as Incident[]);

        const result = await service.generateReport(startDate, endDate);

        expect(result.incidents.total).toBe(4);
        expect(result.incidents.resolved).toBe(2);
        expect(result.incidents.open).toBe(2);
      });

      it('should calculate average resolution time', async () => {
        const now = new Date();
        const incidents = [
          {
            status: 'resolved',
            created_at: now,
            resolved_at: new Date(now.getTime() + 3600000 * 2),
          }, // 2 hours
          {
            status: 'resolved',
            created_at: now,
            resolved_at: new Date(now.getTime() + 3600000 * 4),
          }, // 4 hours
        ];
        incidentRepository.find.mockResolvedValue(incidents as Incident[]);

        const result = await service.generateReport(startDate, endDate);

        expect(result.incidents.average_resolution_time_hours).toBe(3); // (2+4)/2
      });

      it('should handle incidents without resolved_at', async () => {
        const incidents = [
          { status: 'resolved', created_at: new Date(), resolved_at: null },
          { status: 'resolved', created_at: new Date(), resolved_at: new Date() },
        ];
        incidentRepository.find.mockResolvedValue(incidents as Incident[]);

        const result = await service.generateReport(startDate, endDate);

        expect(result.incidents.resolved).toBe(2);
        // Only one incident has resolved_at, so avg is based on that one
      });

      it('should return 0 average resolution time when no resolved incidents', async () => {
        const incidents = [{ status: 'open' }];
        incidentRepository.find.mockResolvedValue(incidents as Incident[]);

        const result = await service.generateReport(startDate, endDate);

        expect(result.incidents.average_resolution_time_hours).toBe(0);
      });
    });

    describe('top machines', () => {
      it('should return top 5 machines by revenue', async () => {
        const qb = createMockQueryBuilder();
        qb.getRawMany.mockResolvedValue([
          {
            machine_number: 'M-001',
            location_name: 'Location 1',
            total_revenue: '100000',
            sales_count: '50',
          },
          {
            machine_number: 'M-002',
            location_name: 'Location 2',
            total_revenue: '80000',
            sales_count: '40',
          },
        ]);
        transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport(startDate, endDate);

        expect(result.top_machines).toHaveLength(2);
        expect(result.top_machines[0].machine_number).toBe('M-001');
        expect(result.top_machines[0].total_revenue).toBe(100000);
        expect(result.top_machines[0].sales_count).toBe(50);
      });

      it('should handle null values in top machines', async () => {
        const qb = createMockQueryBuilder();
        qb.getRawMany.mockResolvedValue([
          { machine_number: null, location_name: null, total_revenue: null, sales_count: null },
        ]);
        transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport(startDate, endDate);

        expect(result.top_machines[0].machine_number).toBe('N/A');
        expect(result.top_machines[0].location_name).toBe('N/A');
        expect(result.top_machines[0].total_revenue).toBe(0);
        expect(result.top_machines[0].sales_count).toBe(0);
      });

      it('should return empty array when no sales', async () => {
        const qb = createMockQueryBuilder();
        qb.getRawMany.mockResolvedValue([]);
        transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport(startDate, endDate);

        expect(result.top_machines).toHaveLength(0);
      });
    });
  });
});
