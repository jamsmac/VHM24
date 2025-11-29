import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OperatorDashboardService } from './operator-dashboard.service';
import { Task, TaskStatus, TaskPriority } from '@modules/tasks/entities/task.entity';
import { OperatorRating } from '@modules/operator-ratings/entities/operator-rating.entity';
import { Machine } from '@modules/machines/entities/machine.entity';
import { Incident } from '@modules/incidents/entities/incident.entity';

describe('OperatorDashboardService', () => {
  let service: OperatorDashboardService;
  let mockTaskRepository: any;
  let mockOperatorRatingRepository: any;
  let mockMachineRepository: any;
  let mockIncidentRepository: any;

  const operatorId = 'operator-123';
  const operatorName = 'John Doe';
  const operatorRole = 'operator';

  let taskQb: any;

  beforeEach(async () => {
    taskQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    mockTaskRepository = {
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn().mockReturnValue(taskQb),
    };

    mockOperatorRatingRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockMachineRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockIncidentRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperatorDashboardService,
        { provide: getRepositoryToken(Task), useValue: mockTaskRepository },
        { provide: getRepositoryToken(OperatorRating), useValue: mockOperatorRatingRepository },
        { provide: getRepositoryToken(Machine), useValue: mockMachineRepository },
        { provide: getRepositoryToken(Incident), useValue: mockIncidentRepository },
      ],
    }).compile();

    service = module.get<OperatorDashboardService>(OperatorDashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDashboard', () => {
    it('should generate a complete operator dashboard', async () => {
      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result).toBeDefined();
      expect(result.operator.operator_id).toBe(operatorId);
      expect(result.operator.operator_name).toBe(operatorName);
      expect(result.operator.role).toBe(operatorRole);
      expect(result.period.current_date).toBeInstanceOf(Date);
      expect(result.my_tasks).toBeDefined();
      expect(result.my_performance).toBeDefined();
      expect(result.my_machines).toBeDefined();
      expect(result.my_schedule).toBeDefined();
      expect(result.alerts).toBeDefined();
      expect(result.recent_activity).toBeDefined();
      expect(result.generated_at).toBeInstanceOf(Date);
    });

    it('should count pending tasks correctly', async () => {
      mockTaskRepository.count
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(2) // in progress
        .mockResolvedValueOnce(3) // completed today
        .mockResolvedValueOnce(10) // completed this week
        .mockResolvedValueOnce(25) // completed this month
        .mockResolvedValueOnce(25) // tasks this month (for performance)
        .mockResolvedValueOnce(30); // all tasks this month

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.my_tasks.total_pending).toBe(5);
      expect(result.my_tasks.total_in_progress).toBe(2);
      expect(result.my_tasks.completed_today).toBe(3);
      expect(result.my_tasks.completed_this_week).toBe(10);
      expect(result.my_tasks.completed_this_month).toBe(25);
    });

    it('should count overdue tasks correctly', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const pendingTasks = [
        {
          id: 'task-1',
          due_date: pastDate,
          status: TaskStatus.PENDING,
          priority: TaskPriority.NORMAL,
          machine: { status: 'active' },
        },
        {
          id: 'task-2',
          due_date: pastDate,
          status: TaskStatus.PENDING,
          priority: TaskPriority.NORMAL,
          machine: { status: 'active' },
        },
        {
          id: 'task-3',
          due_date: futureDate,
          status: TaskStatus.PENDING,
          priority: TaskPriority.NORMAL,
          machine: { status: 'active' },
        },
        {
          id: 'task-4',
          due_date: null,
          status: TaskStatus.PENDING,
          priority: TaskPriority.NORMAL,
          machine: { status: 'active' },
        },
      ];

      mockTaskRepository.count.mockResolvedValue(0);
      // Since methods run in parallel with Promise.all, use default return value for find
      mockTaskRepository.find.mockImplementation((options: any) => {
        // Check if this is a query for pending tasks or for alerts
        if (options && options.where && options.where.status === TaskStatus.PENDING) {
          return Promise.resolve(pendingTasks);
        }
        return Promise.resolve([]);
      });

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.my_tasks.overdue).toBe(2); // Only tasks with past due_date
      expect(result.alerts.overdue_tasks).toBe(2);
    });

    it('should map upcoming tasks correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      const pendingTasks = [
        {
          id: 'task-1',
          type_code: 'refill',
          machine: {
            machine_number: 'M-001',
            name: 'Machine 1',
            location: { name: 'Location A', address: '123 Main St' },
          },
          priority: TaskPriority.HIGH,
          due_date: futureDate,
          status: TaskStatus.PENDING,
        },
      ];

      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.find
        .mockResolvedValueOnce(pendingTasks)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValue([]);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.my_tasks.upcoming_tasks).toHaveLength(1);
      expect(result.my_tasks.upcoming_tasks[0].task_id).toBe('task-1');
      expect(result.my_tasks.upcoming_tasks[0].task_type).toBe('refill');
      expect(result.my_tasks.upcoming_tasks[0].machine_number).toBe('M-001');
      expect(result.my_tasks.upcoming_tasks[0].location_name).toBe('Location A');
      expect(result.my_tasks.upcoming_tasks[0].priority).toBe(TaskPriority.HIGH);
    });

    it('should map in-progress tasks correctly', async () => {
      const startedAt = new Date();
      startedAt.setHours(startedAt.getHours() - 1);

      const inProgressTasks = [
        {
          id: 'task-2',
          type_code: 'collection',
          machine: {
            machine_number: 'M-002',
            name: 'Machine 2',
            location: { name: 'Location B' },
          },
          started_at: startedAt,
          created_at: new Date(),
        },
      ];

      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(inProgressTasks)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValue([]);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.my_tasks.in_progress_tasks).toHaveLength(1);
      expect(result.my_tasks.in_progress_tasks[0].task_id).toBe('task-2');
      expect(result.my_tasks.in_progress_tasks[0].started_at).toEqual(startedAt);
    });

    it('should calculate performance metrics correctly', async () => {
      const rating = {
        operator_id: operatorId,
        overall_score: 85,
        rating_grade: 'A',
        rank: 3,
        timeliness_score: 90,
        photo_quality_score: 80,
        data_accuracy_score: 85,
        discipline_score: 75,
        tasks_on_time: 18,
        total_tasks: 20,
        photo_compliance_rate: 95,
        avg_completion_time_hours: 2.5,
      };

      mockTaskRepository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(18) // tasks this month
        .mockResolvedValueOnce(20); // all tasks this month

      mockOperatorRatingRepository.findOne.mockResolvedValue(rating);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.my_performance.current_rating).toBe(85);
      expect(result.my_performance.rating_grade).toBe('A');
      expect(result.my_performance.rank).toBe(3);
      expect(result.my_performance.tasks_completed_this_month).toBe(18);
      expect(result.my_performance.completion_rate_percent).toBe(90); // 18/20 * 100
      expect(result.my_performance.avg_completion_time_hours).toBe(2.5);
      expect(result.my_performance.punctuality_rate_percent).toBe(90); // 18/20 * 100
      expect(result.my_performance.photo_compliance_rate_percent).toBe(95);
    });

    it('should return null for performance when no rating exists', async () => {
      mockTaskRepository.count.mockResolvedValue(0);
      mockOperatorRatingRepository.findOne.mockResolvedValue(null);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.my_performance.current_rating).toBeNull();
      expect(result.my_performance.rating_grade).toBeNull();
      expect(result.my_performance.rank).toBeNull();
      expect(result.my_performance.avg_completion_time_hours).toBe(0);
      expect(result.my_performance.punctuality_rate_percent).toBe(0);
    });

    it('should generate improvement suggestions for low scores', async () => {
      const rating = {
        operator_id: operatorId,
        overall_score: 55,
        rating_grade: 'D',
        timeliness_score: 60,
        photo_quality_score: 65,
        data_accuracy_score: 60,
        discipline_score: 60,
        tasks_on_time: 10,
        total_tasks: 20,
        photo_compliance_rate: 50,
      };

      mockTaskRepository.count.mockResolvedValue(0);
      mockOperatorRatingRepository.findOne.mockResolvedValue(rating);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.my_performance.improvement_suggestions.length).toBeGreaterThan(0);
      expect(result.my_performance.improvement_suggestions).toContain(
        'Улучшите пунктуальность выполнения задач',
      );
    });

    it('should show positive message when all scores are good', async () => {
      const rating = {
        operator_id: operatorId,
        overall_score: 95,
        rating_grade: 'A+',
        timeliness_score: 95,
        photo_quality_score: 90,
        data_accuracy_score: 95,
        discipline_score: 92,
        tasks_on_time: 19,
        total_tasks: 20,
        photo_compliance_rate: 98,
      };

      mockTaskRepository.count.mockResolvedValue(0);
      mockOperatorRatingRepository.findOne.mockResolvedValue(rating);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.my_performance.improvement_suggestions).toContain(
        'Отличная работа! Продолжайте в том же духе!',
      );
    });

    it('should return empty machines list when no machines assigned', async () => {
      mockTaskRepository.count.mockResolvedValue(0);
      taskQb.getRawMany.mockResolvedValue([]);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.my_machines.total_assigned).toBe(0);
      expect(result.my_machines.machines_list).toHaveLength(0);
    });

    it('should return assigned machines with details', async () => {
      const machineData = [
        { machine_id: 'machine-1', machine_machine_number: 'M-001' },
        { machine_id: 'machine-2', machine_machine_number: 'M-002' },
      ];

      const machines = [
        {
          id: 'machine-1',
          machine_number: 'M-001',
          name: 'Machine 1',
          status: 'active',
          location: { name: 'Location A' },
        },
        {
          id: 'machine-2',
          machine_number: 'M-002',
          name: 'Machine 2',
          status: 'low_stock',
          location: { name: 'Location B' },
        },
      ];

      mockTaskRepository.count.mockResolvedValue(0);
      taskQb.getRawMany.mockResolvedValue(machineData);
      mockMachineRepository.find.mockResolvedValue(machines);
      mockTaskRepository.findOne.mockResolvedValue(null);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.my_machines.total_assigned).toBe(2);
      expect(result.my_machines.machines_list).toHaveLength(2);
      expect(result.my_machines.machines_list[0].machine_number).toBe('M-001');
      expect(result.my_machines.machines_list[0].status).toBe('active');
    });

    it('should calculate today schedule correctly', async () => {
      const todayTask = {
        id: 'task-today',
        type_code: 'refill',
        machine: {
          machine_number: 'M-001',
          location: { name: 'Location A', address: '123 Street' },
        },
        scheduled_date: new Date(),
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        due_date: new Date(),
      };

      mockTaskRepository.count.mockResolvedValue(0);
      // Use implementation mock to handle parallel calls
      // TypeORM's In() creates an object with _type and _value properties
      mockTaskRepository.find.mockImplementation((options: any) => {
        // Check if this is the schedule query (has In status - TypeORM wraps it in a special object)
        if (
          options &&
          options.where &&
          options.where.status &&
          options.where.status._type === 'in'
        ) {
          return Promise.resolve([todayTask]);
        }
        if (options && options.where && options.where.status === TaskStatus.PENDING) {
          return Promise.resolve([todayTask]); // For alerts
        }
        return Promise.resolve([]);
      });

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.my_schedule.today_route).toHaveLength(1);
      expect(result.my_schedule.today_route[0].task_id).toBe('task-today');
      expect(result.my_schedule.estimated_total_duration_minutes).toBe(60);
      expect(result.my_schedule.estimated_completion_time).toBeInstanceOf(Date);
    });

    it('should return null completion time when no tasks scheduled', async () => {
      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.find.mockResolvedValue([]);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.my_schedule.today_route).toHaveLength(0);
      expect(result.my_schedule.estimated_completion_time).toBeNull();
    });

    it('should count high priority tasks for alerts', async () => {
      const pendingTasks = [
        {
          id: 'task-1',
          priority: TaskPriority.HIGH,
          due_date: new Date(),
          machine: { status: 'active' },
        },
        {
          id: 'task-2',
          priority: TaskPriority.URGENT,
          due_date: new Date(),
          machine: { status: 'active' },
        },
        {
          id: 'task-3',
          priority: TaskPriority.NORMAL,
          due_date: new Date(),
          machine: { status: 'active' },
        },
        {
          id: 'task-4',
          priority: TaskPriority.LOW,
          due_date: new Date(),
          machine: { status: 'active' },
        },
      ];

      mockTaskRepository.count.mockResolvedValue(0);
      // Use implementation mock to handle parallel calls
      mockTaskRepository.find.mockImplementation((options: any) => {
        if (options && options.where && options.where.status === TaskStatus.PENDING) {
          return Promise.resolve(pendingTasks);
        }
        return Promise.resolve([]);
      });

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.alerts.high_priority_tasks).toBe(2); // HIGH + URGENT
    });

    it('should count machines needing attention', async () => {
      const pendingTasks = [
        {
          id: 'task-1',
          machine_id: 'machine-1',
          machine: { status: 'error' },
          due_date: new Date(),
          priority: TaskPriority.NORMAL,
        },
        {
          id: 'task-2',
          machine_id: 'machine-2',
          machine: { status: 'maintenance' },
          due_date: new Date(),
          priority: TaskPriority.NORMAL,
        },
        {
          id: 'task-3',
          machine_id: 'machine-1',
          machine: { status: 'error' },
          due_date: new Date(),
          priority: TaskPriority.NORMAL,
        }, // Same machine
        {
          id: 'task-4',
          machine_id: 'machine-3',
          machine: { status: 'active' },
          due_date: new Date(),
          priority: TaskPriority.NORMAL,
        },
      ];

      mockTaskRepository.count.mockResolvedValue(0);
      // Use implementation mock to handle parallel calls
      mockTaskRepository.find.mockImplementation((options: any) => {
        if (options && options.where && options.where.status === TaskStatus.PENDING) {
          return Promise.resolve(pendingTasks);
        }
        return Promise.resolve([]);
      });

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.alerts.machines_needing_attention).toBe(2); // Unique machines with non-active status
    });

    it('should detect rating below threshold', async () => {
      const lowRating = {
        operator_id: operatorId,
        overall_score: 55,
        rating_grade: 'D',
      };

      mockTaskRepository.count.mockResolvedValue(0);
      mockOperatorRatingRepository.findOne.mockResolvedValue(lowRating);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.alerts.rating_below_threshold).toBe(true);
    });

    it('should not flag rating below threshold when score is good', async () => {
      const goodRating = {
        operator_id: operatorId,
        overall_score: 75,
        rating_grade: 'B',
      };

      mockTaskRepository.count.mockResolvedValue(0);
      mockOperatorRatingRepository.findOne.mockResolvedValue(goodRating);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.alerts.rating_below_threshold).toBe(false);
    });

    it('should return recent completed tasks', async () => {
      const completedAt = new Date();
      const startedAt = new Date(completedAt.getTime() - 30 * 60 * 1000); // 30 minutes earlier

      const completedTasks = [
        {
          id: 'task-completed-1',
          type_code: 'refill',
          machine: { machine_number: 'M-001' },
          started_at: startedAt,
          completed_at: completedAt,
        },
      ];

      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(completedTasks)
        .mockResolvedValue([]);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.recent_activity.completed_tasks).toHaveLength(1);
      expect(result.recent_activity.completed_tasks[0].task_id).toBe('task-completed-1');
      expect(result.recent_activity.completed_tasks[0].duration_minutes).toBe(30);
    });

    it('should return recent reported incidents', async () => {
      const reportedAt = new Date();
      const incidents = [
        {
          id: 'incident-1',
          machine: { machine_number: 'M-001' },
          incident_type: 'malfunction',
          reported_at: reportedAt,
          status: 'open',
        },
      ];

      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.find.mockResolvedValue([]);
      mockIncidentRepository.find.mockResolvedValue(incidents);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.recent_activity.reported_incidents).toHaveLength(1);
      expect(result.recent_activity.reported_incidents[0].incident_id).toBe('incident-1');
      expect(result.recent_activity.reported_incidents[0].incident_type).toBe('malfunction');
    });

    it('should handle missing machine data gracefully', async () => {
      const pendingTasks = [
        {
          id: 'task-1',
          type_code: 'refill',
          machine: null,
          priority: TaskPriority.NORMAL,
          due_date: new Date(),
          status: TaskStatus.PENDING,
        },
      ];

      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.find
        .mockResolvedValueOnce(pendingTasks)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValue([]);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.my_tasks.upcoming_tasks[0].machine_number).toBe('Unknown');
      expect(result.my_tasks.upcoming_tasks[0].machine_name).toBe('Unknown');
      expect(result.my_tasks.upcoming_tasks[0].location_name).toBe('Unknown');
    });

    it('should calculate zero duration when task has no started_at', async () => {
      const completedTasks = [
        {
          id: 'task-1',
          type_code: 'refill',
          machine: { machine_number: 'M-001' },
          started_at: null,
          completed_at: new Date(),
        },
      ];

      mockTaskRepository.count.mockResolvedValue(0);
      mockTaskRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(completedTasks)
        .mockResolvedValue([]);

      const result = await service.generateDashboard(operatorId, operatorName, operatorRole);

      expect(result.recent_activity.completed_tasks[0].duration_minutes).toBe(0);
    });
  });
});
