import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminDashboardService } from './admin-dashboard.service';
import { Machine } from '@modules/machines/entities/machine.entity';
import { Transaction } from '@modules/transactions/entities/transaction.entity';
import { Task, TaskStatus } from '@modules/tasks/entities/task.entity';
import { Incident, IncidentStatus } from '@modules/incidents/entities/incident.entity';
import { Complaint } from '@modules/complaints/entities/complaint.entity';
import { User } from '@modules/users/entities/user.entity';
import { Location } from '@modules/locations/entities/location.entity';
import { MachineInventory } from '@modules/inventory/entities/machine-inventory.entity';
import { OperatorRating } from '@modules/operator-ratings/entities/operator-rating.entity';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let mockMachineRepository: any;
  let mockTransactionRepository: any;
  let mockTaskRepository: any;
  let mockIncidentRepository: any;
  let mockComplaintRepository: any;
  let mockUserRepository: any;
  let mockLocationRepository: any;
  let mockMachineInventoryRepository: any;
  let mockOperatorRatingRepository: any;

  // Shared query builder mock that persists across calls
  let transactionQb: any;
  let machineInventoryQb: any;
  let taskQb: any;
  let incidentQb: any;
  let operatorRatingQb: any;

  beforeEach(async () => {
    // Create persistent query builder mocks
    transactionQb = {
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ revenue: 0, count: 0 }),
      getRawMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
    };

    machineInventoryQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
    };

    taskQb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    incidentQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ avg_hours: 0 }),
    };

    operatorRatingQb = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    mockMachineRepository = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };

    mockTransactionRepository = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(transactionQb),
    };

    mockTaskRepository = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue(taskQb),
    };

    mockIncidentRepository = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue(incidentQb),
    };

    mockComplaintRepository = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };

    mockUserRepository = {
      count: jest.fn().mockResolvedValue(0),
    };

    mockLocationRepository = {
      count: jest.fn().mockResolvedValue(0),
    };

    mockMachineInventoryRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(machineInventoryQb),
    };

    mockOperatorRatingRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(operatorRatingQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: getRepositoryToken(Machine), useValue: mockMachineRepository },
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionRepository },
        { provide: getRepositoryToken(Task), useValue: mockTaskRepository },
        { provide: getRepositoryToken(Incident), useValue: mockIncidentRepository },
        { provide: getRepositoryToken(Complaint), useValue: mockComplaintRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Location), useValue: mockLocationRepository },
        { provide: getRepositoryToken(MachineInventory), useValue: mockMachineInventoryRepository },
        { provide: getRepositoryToken(OperatorRating), useValue: mockOperatorRatingRepository },
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDashboard', () => {
    it('should generate a complete admin dashboard', async () => {
      const result = await service.generateDashboard();

      expect(result).toBeDefined();
      expect(result.period).toBeDefined();
      expect(result.network_overview).toBeDefined();
      expect(result.financial_summary).toBeDefined();
      expect(result.revenue_trends).toBeDefined();
      expect(result.top_performers).toBeDefined();
      expect(result.critical_alerts).toBeDefined();
      expect(result.tasks_overview).toBeDefined();
      expect(result.incidents_summary).toBeDefined();
      expect(result.complaints_summary).toBeDefined();
      expect(result.inventory_alerts).toBeDefined();
      expect(result.generated_at).toBeDefined();
    });

    it('should include period information', async () => {
      const result = await service.generateDashboard();

      expect(result.period.current_date).toBeInstanceOf(Date);
      expect(result.period.period_start).toBeInstanceOf(Date);
      expect(result.period.period_end).toBeInstanceOf(Date);
    });

    it('should calculate network overview correctly', async () => {
      const mockMachines = [
        { status: 'active' },
        { status: 'active' },
        { status: 'offline' },
        { status: 'disabled' },
        { status: 'error' },
        { status: 'maintenance' },
      ];

      mockMachineRepository.find.mockResolvedValue(mockMachines);
      mockLocationRepository.count.mockResolvedValue(10);
      mockUserRepository.count.mockResolvedValue(5);

      const result = await service.generateDashboard();

      expect(result.network_overview.total_machines).toBe(6);
      expect(result.network_overview.active_machines).toBe(2);
      expect(result.network_overview.offline_machines).toBe(2);
      expect(result.network_overview.machines_with_issues).toBe(2);
      expect(result.network_overview.total_locations).toBe(10);
      expect(result.network_overview.total_operators).toBe(5);
    });

    it('should calculate financial summary with revenue change', async () => {
      transactionQb.getRawOne
        .mockResolvedValueOnce({ revenue: 1000, count: 50 }) // today
        .mockResolvedValueOnce({ revenue: 800, count: 40 }) // yesterday
        .mockResolvedValueOnce({ revenue: 5000, count: 200 }) // week
        .mockResolvedValueOnce({ revenue: 20000, count: 800 }); // month

      const result = await service.generateDashboard();

      expect(result.financial_summary.today_revenue).toBe(1000);
      expect(result.financial_summary.yesterday_revenue).toBe(800);
      expect(result.financial_summary.revenue_change_percent).toBe(25); // (1000-800)/800 * 100
      expect(result.financial_summary.total_transactions_today).toBe(50);
    });

    it('should handle zero yesterday revenue without division error', async () => {
      transactionQb.getRawOne
        .mockResolvedValueOnce({ revenue: 1000, count: 50 }) // today
        .mockResolvedValueOnce({ revenue: 0, count: 0 }) // yesterday
        .mockResolvedValueOnce({ revenue: 5000, count: 200 }) // week
        .mockResolvedValueOnce({ revenue: 20000, count: 800 }); // month

      const result = await service.generateDashboard();

      expect(result.financial_summary.revenue_change_percent).toBe(0);
    });

    it('should return top performers data', async () => {
      transactionQb.getRawMany.mockResolvedValue([
        {
          machine_id: 'm1',
          machine_number: 'M-001',
          machine_name: 'Machine 1',
          location_name: 'Location 1',
          revenue: '5000',
          transactions: '100',
        },
      ]);

      const result = await service.generateDashboard();

      expect(result.top_performers.machines).toBeDefined();
      expect(result.top_performers.locations).toBeDefined();
      expect(result.top_performers.operators).toBeDefined();
    });

    it('should count critical alerts correctly', async () => {
      const mockIncidents = [
        { status: IncidentStatus.OPEN, priority: 'critical' },
        { status: IncidentStatus.OPEN, priority: 'high' },
        { status: IncidentStatus.IN_PROGRESS, priority: 'critical' },
      ];

      const mockTasks = [
        { status: TaskStatus.PENDING, due_date: new Date('2020-01-01') }, // overdue
        { status: TaskStatus.PENDING, due_date: new Date('2030-01-01') }, // not overdue
      ];

      mockIncidentRepository.find.mockResolvedValue(mockIncidents);
      mockComplaintRepository.count.mockResolvedValue(5);
      machineInventoryQb.getRawMany.mockResolvedValue([{ machine_id: 'm1' }, { machine_id: 'm2' }]);
      mockTaskRepository.find.mockResolvedValue(mockTasks);
      mockMachineRepository.count.mockResolvedValue(3);

      const result = await service.generateDashboard();

      expect(result.critical_alerts.open_incidents).toBe(3);
      expect(result.critical_alerts.critical_incidents).toBe(2);
      expect(result.critical_alerts.unresolved_complaints).toBe(5);
      expect(result.critical_alerts.low_stock_machines).toBe(2);
      expect(result.critical_alerts.overdue_tasks).toBe(1);
    });

    it('should calculate tasks overview', async () => {
      mockTaskRepository.count
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(5) // in progress
        .mockResolvedValueOnce(3); // completed today

      mockTaskRepository.find.mockResolvedValue([
        { status: TaskStatus.PENDING, due_date: new Date('2020-01-01') },
      ]);

      const result = await service.generateDashboard();

      expect(result.tasks_overview.total_pending).toBe(10);
      expect(result.tasks_overview.total_in_progress).toBe(5);
      expect(result.tasks_overview.total_completed_today).toBe(3);
      expect(result.tasks_overview.total_overdue).toBe(1);
    });

    it('should calculate incidents summary', async () => {
      mockIncidentRepository.count
        .mockResolvedValueOnce(8) // open
        .mockResolvedValueOnce(4) // in progress
        .mockResolvedValueOnce(2); // resolved today

      incidentQb.getRawOne.mockResolvedValue({ avg_hours: 12.5 });

      const result = await service.generateDashboard();

      expect(result.incidents_summary.open).toBe(8);
      expect(result.incidents_summary.in_progress).toBe(4);
      expect(result.incidents_summary.resolved_today).toBe(2);
      expect(result.incidents_summary.avg_resolution_time_hours).toBe(12.5);
    });

    it('should calculate complaints summary with NPS', async () => {
      // The count mock is called multiple times in the dashboard generation
      // So we need to reset it specifically for this test
      mockComplaintRepository.count.mockReset();
      mockComplaintRepository.count
        .mockResolvedValueOnce(10) // new (for complaints summary)
        .mockResolvedValueOnce(3) // in review (for complaints summary)
        .mockResolvedValueOnce(5) // resolved today (for complaints summary)
        .mockResolvedValueOnce(5); // unresolved (for critical alerts)

      // NPS calculation: 2 promoters (rating 5), 1 detractor (rating 1-3)
      mockComplaintRepository.find.mockResolvedValue([
        { rating: 5 },
        { rating: 5 },
        { rating: 2 },
        { rating: 4 }, // passive
      ]);

      const result = await service.generateDashboard();

      // NPS = (50% promoters - 25% detractors) = 25
      expect(result.complaints_summary.nps_score).toBe(25);
    });

    it('should handle no ratings for NPS calculation', async () => {
      mockComplaintRepository.find.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.complaints_summary.nps_score).toBe(0);
    });

    it('should calculate inventory alerts', async () => {
      machineInventoryQb.getCount
        .mockResolvedValueOnce(5) // low stock
        .mockResolvedValueOnce(2); // out of stock

      const result = await service.generateDashboard();

      expect(result.inventory_alerts.total_low_stock).toBe(5);
      expect(result.inventory_alerts.total_out_of_stock).toBe(2);
      expect(result.inventory_alerts.expiring_soon).toBe(0);
    });

    it('should include generated_at timestamp', async () => {
      const beforeGeneration = new Date();
      const result = await service.generateDashboard();
      const afterGeneration = new Date();

      expect(result.generated_at.getTime()).toBeGreaterThanOrEqual(beforeGeneration.getTime());
      expect(result.generated_at.getTime()).toBeLessThanOrEqual(afterGeneration.getTime());
    });

    it('should handle null values in top machines data', async () => {
      transactionQb.getRawMany.mockResolvedValue([
        {
          machine_id: 'm1',
          machine_number: null,
          machine_name: null,
          location_name: null,
          revenue: null,
          transactions: null,
        },
      ]);

      const result = await service.generateDashboard();

      expect(result.top_performers.machines[0].machine_number).toBe('Unknown');
      expect(result.top_performers.machines[0].machine_name).toBe('Unknown');
      expect(result.top_performers.machines[0].location_name).toBe('Unknown');
      expect(result.top_performers.machines[0].revenue).toBe(0);
      expect(result.top_performers.machines[0].transactions).toBe(0);
    });

    it('should handle null values in top locations data', async () => {
      // All getRawMany calls in order: daily, weekly, monthly, machines, locations
      transactionQb.getRawMany
        .mockResolvedValueOnce([]) // daily revenue
        .mockResolvedValueOnce([]) // weekly revenue
        .mockResolvedValueOnce([]) // monthly revenue
        .mockResolvedValueOnce([]) // top machines
        .mockResolvedValueOnce([
          {
            location_id: 'loc1',
            location_name: null,
            machines_count: null,
            revenue: null,
            transactions: null,
          },
        ]) // top locations
        .mockResolvedValue([]); // any other calls

      const result = await service.generateDashboard();

      expect(result.top_performers.locations[0].location_name).toBe('Unknown');
      expect(result.top_performers.locations[0].machines_count).toBe(0);
      expect(result.top_performers.locations[0].revenue).toBe(0);
      expect(result.top_performers.locations[0].transactions).toBe(0);
    });

    it('should handle null values in top operators data', async () => {
      operatorRatingQb.getRawMany.mockResolvedValue([
        {
          operator_id: 'op1',
          operator_name: null,
          tasks_completed: null,
          overall_rating: null,
          rating_grade: 'Unknown',
        },
      ]);

      const result = await service.generateDashboard();

      expect(result.top_performers.operators[0].operator_name).toBe('Unknown');
      expect(result.top_performers.operators[0].tasks_completed).toBe(0);
      expect(result.top_performers.operators[0].overall_rating).toBe(0);
    });

    it('should handle tasks without due dates in overdue calculation', async () => {
      mockTaskRepository.find.mockResolvedValue([
        { status: TaskStatus.PENDING, due_date: null }, // no due date - not overdue
        { status: TaskStatus.PENDING, due_date: undefined }, // undefined - not overdue
        { status: TaskStatus.PENDING, due_date: new Date('2020-01-01') }, // past date - overdue
      ]);

      const result = await service.generateDashboard();

      expect(result.critical_alerts.overdue_tasks).toBe(1);
    });

    it('should handle null revenue result in getRevenueData', async () => {
      transactionQb.getRawOne.mockResolvedValue({ revenue: null, count: null });

      const result = await service.generateDashboard();

      expect(result.financial_summary.today_revenue).toBe(0);
      expect(result.financial_summary.total_transactions_today).toBe(0);
    });

    it('should handle null avg_hours in incident resolution time', async () => {
      incidentQb.getRawOne.mockResolvedValue({ avg_hours: null });

      const result = await service.generateDashboard();

      expect(result.incidents_summary.avg_resolution_time_hours).toBe(0);
    });

    it('should filter out invalid ratings in NPS calculation', async () => {
      mockComplaintRepository.find.mockResolvedValue([
        { rating: 5 }, // valid promoter
        { rating: null }, // invalid - should be filtered
        { rating: 0 }, // invalid - out of range
        { rating: 6 }, // invalid - out of range
        { rating: 1 }, // valid detractor
      ]);

      const result = await service.generateDashboard();

      // NPS with 1 promoter (50%) and 1 detractor (50%) = 0
      expect(result.complaints_summary.nps_score).toBe(0);
    });

    it('should handle null values in daily revenue trend data', async () => {
      transactionQb.getRawMany
        .mockResolvedValueOnce([{ date: '2025-01-01', revenue: null, transactions: null }])
        .mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.revenue_trends.daily[0].revenue).toBe(0);
      expect(result.revenue_trends.daily[0].transactions).toBe(0);
    });

    it('should handle null values in weekly revenue trend data', async () => {
      transactionQb.getRawMany
        .mockResolvedValueOnce([]) // daily
        .mockResolvedValueOnce([{ week_start: '2025-01-01', revenue: null }]) // weekly
        .mockResolvedValue([]); // monthly and others

      const result = await service.generateDashboard();

      expect(result.revenue_trends.weekly[0].revenue).toBe(0);
    });

    it('should handle null values in monthly revenue trend data', async () => {
      transactionQb.getRawMany
        .mockResolvedValueOnce([]) // daily
        .mockResolvedValueOnce([]) // weekly
        .mockResolvedValueOnce([{ month: '2025-01', revenue: null }]) // monthly
        .mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.revenue_trends.monthly[0].revenue).toBe(0);
    });

    it('should handle null values in tasks by type', async () => {
      taskQb.getRawMany.mockResolvedValue([
        { type: 'refill', pending: null, in_progress: null, completed_today: null },
      ]);

      const result = await service.generateDashboard();

      expect(result.tasks_overview.by_type[0].pending).toBe(0);
      expect(result.tasks_overview.by_type[0].in_progress).toBe(0);
      expect(result.tasks_overview.by_type[0].completed_today).toBe(0);
    });
  });
});
