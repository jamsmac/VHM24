import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ManagerDashboardService } from './manager-dashboard.service';
import { Machine } from '@modules/machines/entities/machine.entity';
import { Transaction } from '@modules/transactions/entities/transaction.entity';
import { Task, TaskStatus } from '@modules/tasks/entities/task.entity';
import { Incident } from '@modules/incidents/entities/incident.entity';
import { Complaint, ComplaintStatus } from '@modules/complaints/entities/complaint.entity';
import { MachineInventory } from '@modules/inventory/entities/machine-inventory.entity';
import { Location } from '@modules/locations/entities/location.entity';

describe('ManagerDashboardService', () => {
  let service: ManagerDashboardService;
  let mockMachineRepository: any;
  let mockTransactionRepository: any;
  let mockTaskRepository: any;
  let mockIncidentRepository: any;
  let mockComplaintRepository: any;
  let mockMachineInventoryRepository: any;
  let mockLocationRepository: any;

  // Query builder mocks for each repository
  let machineQueryBuilder: any;
  let transactionQueryBuilder: any;
  let taskQueryBuilder: any;
  let incidentQueryBuilder: any;
  let complaintQueryBuilder: any;
  let inventoryQueryBuilder: any;
  let locationQueryBuilder: any;

  beforeEach(async () => {
    // Create query builder mocks
    machineQueryBuilder = createQueryBuilderMock();
    transactionQueryBuilder = createQueryBuilderMock();
    taskQueryBuilder = createQueryBuilderMock();
    incidentQueryBuilder = createQueryBuilderMock();
    complaintQueryBuilder = createQueryBuilderMock();
    inventoryQueryBuilder = createQueryBuilderMock();
    locationQueryBuilder = createQueryBuilderMock();

    mockMachineRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(machineQueryBuilder),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };

    mockTransactionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(transactionQueryBuilder),
    };

    mockTaskRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(taskQueryBuilder),
      count: jest.fn().mockResolvedValue(0),
    };

    mockIncidentRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(incidentQueryBuilder),
      count: jest.fn().mockResolvedValue(0),
    };

    mockComplaintRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(complaintQueryBuilder),
    };

    mockMachineInventoryRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(inventoryQueryBuilder),
    };

    mockLocationRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(locationQueryBuilder),
      count: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManagerDashboardService,
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepository,
        },
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
          provide: getRepositoryToken(MachineInventory),
          useValue: mockMachineInventoryRepository,
        },
        {
          provide: getRepositoryToken(Location),
          useValue: mockLocationRepository,
        },
      ],
    }).compile();

    service = module.get<ManagerDashboardService>(ManagerDashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createQueryBuilderMock() {
    const mock: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
      getRawOne: jest.fn().mockResolvedValue(null),
      getRawMany: jest.fn().mockResolvedValue([]),
      clone: jest.fn(),
    };
    mock.clone.mockReturnValue(mock);
    return mock;
  }

  describe('generateDashboard', () => {
    it('should generate a complete dashboard with default empty data', async () => {
      // Setup default empty responses
      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result).toBeDefined();
      expect(result.period).toBeDefined();
      expect(result.period.current_date).toBeInstanceOf(Date);
      expect(result.period.period_start).toBeInstanceOf(Date);
      expect(result.period.period_end).toBeInstanceOf(Date);
      expect(result.operations_summary).toBeDefined();
      expect(result.revenue_overview).toBeDefined();
      expect(result.tasks_management).toBeDefined();
      expect(result.machine_status).toBeDefined();
      expect(result.inventory_status).toBeDefined();
      expect(result.incidents_tracking).toBeDefined();
      expect(result.complaints_tracking).toBeDefined();
      expect(result.location_performance).toBeDefined();
      expect(result.generated_at).toBeInstanceOf(Date);
    });

    it('should filter by location IDs when provided', async () => {
      const locationIds = ['loc-1', 'loc-2'];

      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      await service.generateDashboard(locationIds);

      expect(machineQueryBuilder.where).toHaveBeenCalledWith(
        'machine.location_id IN (:...locationIds)',
        { locationIds },
      );
    });

    it('should calculate operations summary correctly', async () => {
      const mockMachines = [
        { id: 'm-1', status: 'active', machine_number: 'M001' },
        { id: 'm-2', status: 'active', machine_number: 'M002' },
        { id: 'm-3', status: 'low_stock', machine_number: 'M003' },
        { id: 'm-4', status: 'error', machine_number: 'M004' },
        { id: 'm-5', status: 'disabled', machine_number: 'M005' },
      ];

      machineQueryBuilder.getMany.mockResolvedValue(mockMachines);
      mockLocationRepository.count.mockResolvedValue(3);

      // Use mockImplementation to handle parallel calls based on query params
      let _taskGetCountCalls = 0;
      taskQueryBuilder.getCount.mockImplementation(() => {
        _taskGetCountCalls++;
        // The order of Promise.all calls can vary, so we track by andWhere params
        return Promise.resolve(0);
      });

      // Create separate clones that track their own andWhere calls
      const taskClones: any[] = [];
      taskQueryBuilder.clone.mockImplementation(() => {
        const clone = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockImplementation(function (this: any) {
            // Check what status was requested
            const calls = this.andWhere.mock.calls;
            for (const call of calls) {
              if (call[0]?.includes('status = :status')) {
                const status = call[1]?.status;
                if (status === TaskStatus.PENDING) return Promise.resolve(5);
                if (status === TaskStatus.IN_PROGRESS) return Promise.resolve(2);
                if (status === TaskStatus.COMPLETED) return Promise.resolve(10);
              }
            }
            return Promise.resolve(0);
          }),
          getMany: jest.fn().mockResolvedValue([]),
          clone: jest.fn().mockReturnThis(),
        };
        taskClones.push(clone);
        return clone;
      });

      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.operations_summary.total_machines).toBe(5);
      expect(result.operations_summary.active_machines).toBe(2);
      expect(result.operations_summary.machines_needing_attention).toBe(2); // low_stock + error
      expect(result.operations_summary.total_locations).toBe(3);
      expect(result.operations_summary.pending_tasks).toBe(5);
      expect(result.operations_summary.tasks_in_progress).toBe(2);
      expect(result.operations_summary.completed_today).toBe(10);
    });

    it('should calculate revenue overview correctly', async () => {
      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);

      // Mock revenue responses
      let callCount = 0;
      transactionQueryBuilder.getRawOne.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ revenue: '500' }); // today
        if (callCount === 2) return Promise.resolve({ revenue: '2500' }); // week
        if (callCount === 3) return Promise.resolve({ revenue: '10000' }); // month
        return Promise.resolve({ revenue: 0 });
      });

      mockMachineRepository.count.mockResolvedValue(10);

      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.revenue_overview.today_revenue).toBe(500);
      expect(result.revenue_overview.week_revenue).toBe(2500);
      expect(result.revenue_overview.month_revenue).toBe(10000);
      expect(result.revenue_overview.avg_revenue_per_machine).toBe(1000);
    });

    it('should handle zero machines for avg revenue calculation', async () => {
      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: '1000' });
      mockMachineRepository.count.mockResolvedValue(0);

      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.revenue_overview.avg_revenue_per_machine).toBe(0);
    });

    it('should calculate tasks management correctly', async () => {
      const mockTasks = [
        {
          id: 't-1',
          type_code: 'refill',
          priority: 'high',
          due_date: new Date(Date.now() - 86400000), // Yesterday - overdue
          machine: { machine_number: 'M001', name: 'Machine 1' },
          assigned_to: { full_name: 'John Doe' },
        },
        {
          id: 't-2',
          type_code: 'collection',
          priority: 'normal',
          due_date: new Date(Date.now() - 3600000), // 1 hour ago - overdue (triggers urgent)
          machine: { machine_number: 'M002', name: 'Machine 2' },
          assigned_to: null,
        },
      ];

      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });

      // Create separate clones that track their own andWhere calls
      taskQueryBuilder.clone.mockImplementation(() => {
        const clone: any = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockImplementation(function (this: typeof clone) {
            const calls = this.andWhere.mock.calls;
            for (const _call of calls) {
              // Check for type filter
              const typeCall = calls.find((c: any) => c[0]?.includes('type ='));
              const typesCall = calls.find((c: any) => c[0]?.includes('type IN'));

              if (typeCall) {
                const type = typeCall[1]?.type;
                if (type === 'refill') return Promise.resolve(3);
                if (type === 'collection') return Promise.resolve(2);
              }
              if (typesCall) {
                return Promise.resolve(1); // maintenance/repair
              }
            }
            return Promise.resolve(0);
          }),
          getMany: jest.fn().mockResolvedValue(mockTasks),
          clone: jest.fn().mockReturnThis(),
        };
        return clone;
      });

      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.tasks_management.pending_refills).toBe(3);
      expect(result.tasks_management.pending_collections).toBe(2);
      expect(result.tasks_management.pending_maintenance).toBe(1);
      expect(result.tasks_management.overdue_tasks).toBe(2); // Both tasks are overdue
      expect(result.tasks_management.urgent_tasks).toHaveLength(2);
      expect(result.tasks_management.urgent_tasks[0].task_id).toBe('t-1');
      expect(result.tasks_management.urgent_tasks[0].assigned_operator).toBe('John Doe');
      expect(result.tasks_management.urgent_tasks[1].assigned_operator).toBe('Не назначен');
    });

    it('should handle missing machine/operator data in tasks', async () => {
      const mockTasks = [
        {
          id: 't-1',
          type_code: 'refill',
          priority: 'high',
          due_date: null,
          machine: null,
          assigned_to: null,
        },
      ];

      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue(mockTasks);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.tasks_management.urgent_tasks[0].machine_number).toBe('Unknown');
      expect(result.tasks_management.urgent_tasks[0].machine_name).toBe('Unknown');
      expect(result.tasks_management.urgent_tasks[0].assigned_operator).toBe('Не назначен');
    });

    it('should calculate machine status correctly', async () => {
      const mockMachines = [
        {
          id: 'm-1',
          status: 'active',
          machine_number: 'M001',
          name: 'Machine 1',
          location: { name: 'Location 1' },
          updated_at: new Date(),
        },
        {
          id: 'm-2',
          status: 'active',
          machine_number: 'M002',
          name: 'Machine 2',
          location: { name: 'Location 1' },
          updated_at: new Date(),
        },
        {
          id: 'm-3',
          status: 'error',
          machine_number: 'M003',
          name: 'Machine 3',
          location: { name: 'Location 2' },
          updated_at: new Date(),
        },
        {
          id: 'm-4',
          status: 'maintenance',
          machine_number: 'M004',
          name: 'Machine 4',
          location: null,
          updated_at: new Date(),
        },
        {
          id: 'm-5',
          status: 'low_stock',
          machine_number: 'M005',
          name: 'Machine 5',
          location: { name: 'Location 3' },
          updated_at: new Date(),
        },
      ];

      machineQueryBuilder.getMany.mockResolvedValue(mockMachines);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.machine_status.by_status).toHaveLength(4);

      const activeStatus = result.machine_status.by_status.find((s) => s.status === 'active');
      expect(activeStatus?.count).toBe(2);
      expect(activeStatus?.percentage).toBe(40);

      expect(result.machine_status.requiring_service).toHaveLength(3);
      expect(result.machine_status.requiring_service[0].status).toBe('error');

      // Check location name handling
      const maintenanceMachine = result.machine_status.requiring_service.find(
        (m) => m.status === 'maintenance',
      );
      expect(maintenanceMachine?.location_name).toBe('Unknown');
    });

    it('should calculate inventory status correctly', async () => {
      const mockLowStock = [
        {
          machine: { id: 'm-1', machine_number: 'M001' },
          nomenclature: { name: 'Coffee' },
          current_quantity: 5,
          min_stock_level: 10,
        },
      ];

      const mockOutOfStock = [
        {
          machine: { id: 'm-2', machine_number: 'M002' },
          nomenclature: { name: 'Sugar' },
          current_quantity: 0,
          min_stock_level: 20,
        },
      ];

      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue([]);

      let inventoryCallCount = 0;
      inventoryQueryBuilder.getMany.mockImplementation(() => {
        inventoryCallCount++;
        if (inventoryCallCount === 1) return Promise.resolve(mockLowStock);
        if (inventoryCallCount === 2) return Promise.resolve(mockOutOfStock);
        return Promise.resolve([]);
      });

      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.inventory_status.total_low_stock).toBe(1);
      expect(result.inventory_status.total_out_of_stock).toBe(1);
      expect(result.inventory_status.critical_items).toHaveLength(2);
      expect(result.inventory_status.critical_items[0].status).toBe('low');
      expect(result.inventory_status.critical_items[1].status).toBe('out');
    });

    it('should handle missing machine/product data in inventory', async () => {
      const mockLowStock = [
        {
          machine: null,
          nomenclature: null,
          current_quantity: 5,
          min_stock_level: 10,
        },
      ];

      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValueOnce(mockLowStock).mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.inventory_status.critical_items[0].machine_id).toBe('');
      expect(result.inventory_status.critical_items[0].machine_number).toBe('Unknown');
      expect(result.inventory_status.critical_items[0].product_name).toBe('Unknown');
    });

    it('should calculate incidents tracking correctly', async () => {
      const reportedAt = new Date(Date.now() - 3600000 * 5); // 5 hours ago
      const mockHighPriorityIncidents = [
        {
          id: 'inc-1',
          machine: { machine_number: 'M001' },
          incident_type: 'machine_jam',
          priority: 'high',
          reported_at: reportedAt,
        },
        {
          id: 'inc-2',
          machine: null,
          incident_type: 'payment_issue',
          priority: 'critical',
          reported_at: reportedAt,
        },
      ];

      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);

      incidentQueryBuilder.getCount
        .mockResolvedValueOnce(5) // open
        .mockResolvedValueOnce(3) // in_progress
        .mockResolvedValueOnce(2); // resolved_today

      incidentQueryBuilder.getMany.mockResolvedValue(mockHighPriorityIncidents);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.incidents_tracking.open_incidents).toBe(5);
      expect(result.incidents_tracking.in_progress_incidents).toBe(3);
      expect(result.incidents_tracking.resolved_today).toBe(2);
      expect(result.incidents_tracking.high_priority_incidents).toHaveLength(2);
      expect(result.incidents_tracking.high_priority_incidents[0].machine_number).toBe('M001');
      expect(result.incidents_tracking.high_priority_incidents[1].machine_number).toBe('Unknown');
      expect(result.incidents_tracking.high_priority_incidents[0].age_hours).toBeGreaterThan(4);
    });

    it('should calculate complaints tracking correctly', async () => {
      const mockComplaints = [
        {
          id: 'cmp-1',
          machine: { machine_number: 'M001' },
          complaint_type: 'product_quality',
          submitted_at: new Date(),
          status: ComplaintStatus.NEW,
        },
        {
          id: 'cmp-2',
          machine: null,
          complaint_type: 'payment_issue',
          submitted_at: new Date(),
          status: ComplaintStatus.IN_REVIEW,
        },
      ];

      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);

      complaintQueryBuilder.getCount
        .mockResolvedValueOnce(10) // new
        .mockResolvedValueOnce(5) // in_review
        .mockResolvedValueOnce(3); // resolved_today

      complaintQueryBuilder.getMany.mockResolvedValue(mockComplaints);

      const result = await service.generateDashboard();

      expect(result.complaints_tracking.new_complaints).toBe(10);
      expect(result.complaints_tracking.in_review).toBe(5);
      expect(result.complaints_tracking.resolved_today).toBe(3);
      expect(result.complaints_tracking.recent_complaints).toHaveLength(2);
      expect(result.complaints_tracking.recent_complaints[0].machine_number).toBe('M001');
      expect(result.complaints_tracking.recent_complaints[1].machine_number).toBe('Unknown');
    });

    it('should calculate location performance correctly', async () => {
      const mockLocations = [
        { id: 'loc-1', name: 'Location 1' },
        { id: 'loc-2', name: 'Location 2' },
      ];

      const mockMachinesLoc1 = [
        { id: 'm-1', status: 'active' },
        { id: 'm-2', status: 'active' },
        { id: 'm-3', status: 'error' },
      ];

      const mockMachinesLoc2 = [{ id: 'm-4', status: 'active' }];

      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue(mockLocations);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      let findCallCount = 0;
      mockMachineRepository.find.mockImplementation(() => {
        findCallCount++;
        if (findCallCount === 1) return Promise.resolve(mockMachinesLoc1);
        if (findCallCount === 2) return Promise.resolve(mockMachinesLoc2);
        return Promise.resolve([]);
      });

      let taskCountCallCount = 0;
      mockTaskRepository.count.mockImplementation(() => {
        taskCountCallCount++;
        if (taskCountCallCount === 1) return Promise.resolve(5);
        if (taskCountCallCount === 2) return Promise.resolve(2);
        return Promise.resolve(0);
      });

      let incidentCountCallCount = 0;
      mockIncidentRepository.count.mockImplementation(() => {
        incidentCountCallCount++;
        if (incidentCountCallCount === 1) return Promise.resolve(2);
        if (incidentCountCallCount === 2) return Promise.resolve(0);
        return Promise.resolve(0);
      });

      const result = await service.generateDashboard();

      expect(result.location_performance).toHaveLength(2);
      expect(result.location_performance[0].location_name).toBe('Location 1');
      expect(result.location_performance[0].machines_count).toBe(3);
      expect(result.location_performance[0].active_machines).toBe(2);
      expect(result.location_performance[0].pending_tasks).toBe(5);
      expect(result.location_performance[0].open_incidents).toBe(2);

      expect(result.location_performance[1].location_name).toBe('Location 2');
      expect(result.location_performance[1].machines_count).toBe(1);
      expect(result.location_performance[1].active_machines).toBe(1);
    });

    it('should handle null revenue values', async () => {
      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue(null);
      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.revenue_overview.today_revenue).toBe(0);
      expect(result.revenue_overview.week_revenue).toBe(0);
      expect(result.revenue_overview.month_revenue).toBe(0);
    });

    it('should limit urgent tasks to 10', async () => {
      const mockTasks = Array.from({ length: 15 }, (_, i) => ({
        id: `t-${i}`,
        type_code: 'refill',
        priority: 'high',
        due_date: new Date(),
        machine: { machine_number: `M00${i}`, name: `Machine ${i}` },
        assigned_to: { full_name: `Operator ${i}` },
      }));

      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue(mockTasks);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.tasks_management.urgent_tasks).toHaveLength(10);
    });

    it('should limit requiring_service machines to 10', async () => {
      const mockMachines = Array.from({ length: 15 }, (_, i) => ({
        id: `m-${i}`,
        status: 'error',
        machine_number: `M00${i}`,
        name: `Machine ${i}`,
        location: { name: `Location ${i}` },
        updated_at: new Date(),
      }));

      machineQueryBuilder.getMany.mockResolvedValue(mockMachines);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.machine_status.requiring_service).toHaveLength(10);
    });

    it('should limit critical inventory items to 20', async () => {
      const mockItems = Array.from({ length: 25 }, (_, i) => ({
        machine: { id: `m-${i}`, machine_number: `M00${i}` },
        nomenclature: { name: `Product ${i}` },
        current_quantity: i % 2 === 0 ? 0 : 5,
        min_stock_level: 10,
      }));

      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValue(mockItems);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateDashboard();

      expect(result.inventory_status.critical_items).toHaveLength(20);
    });

    it('should use location filter for location count when locationIds provided', async () => {
      const locationIds = ['loc-1', 'loc-2'];

      machineQueryBuilder.getMany.mockResolvedValue([]);
      locationQueryBuilder.getMany.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: 0 });
      taskQueryBuilder.getMany.mockResolvedValue([]);
      inventoryQueryBuilder.getMany.mockResolvedValue([]);
      incidentQueryBuilder.getMany.mockResolvedValue([]);
      complaintQueryBuilder.getMany.mockResolvedValue([]);
      mockLocationRepository.count.mockResolvedValue(2);

      await service.generateDashboard(locationIds);

      expect(mockLocationRepository.count).toHaveBeenCalledWith({
        where: { id: expect.anything() },
      });
    });
  });
});
