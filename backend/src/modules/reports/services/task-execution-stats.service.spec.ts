import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskExecutionStatsService } from './task-execution-stats.service';
import { Task } from '@modules/tasks/entities/task.entity';

describe('TaskExecutionStatsService', () => {
  let service: TaskExecutionStatsService;
  let taskRepository: jest.Mocked<Repository<Task>>;

  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-31');

  // Track query builder calls to return different values
  let queryBuilderCallCount = 0;

  const createMockQueryBuilder = (
    overrides: {
      getRawOne?: any;
      getRawMany?: any;
    } = {},
  ) => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(overrides.getRawOne || null),
    getRawMany: jest.fn().mockResolvedValue(overrides.getRawMany || []),
  });

  beforeEach(async () => {
    queryBuilderCallCount = 0;

    const mockTaskRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskExecutionStatsService,
        { provide: getRepositoryToken(Task), useValue: mockTaskRepository },
      ],
    }).compile();

    service = module.get<TaskExecutionStatsService>(TaskExecutionStatsService);
    taskRepository = module.get(getRepositoryToken(Task));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    it('should include period in report', async () => {
      setupDefaultMocks();

      const result = await service.generateReport(startDate, endDate);

      expect(result.period.start_date).toEqual(startDate);
      expect(result.period.end_date).toEqual(endDate);
      expect(result.generated_at).toBeInstanceOf(Date);
    });

    it('should include all required sections in report', async () => {
      setupDefaultMocks();

      const result = await service.generateReport(startDate, endDate);

      expect(result.overall).toBeDefined();
      expect(result.by_type).toBeDefined();
      expect(result.by_status).toBeDefined();
      expect(result.by_priority).toBeDefined();
      expect(result.timeline).toBeDefined();
    });

    describe('overall stats', () => {
      it('should calculate overall task statistics', async () => {
        // Setup mock to return stats for overall query (first query builder call)
        taskRepository.createQueryBuilder.mockImplementation(() => {
          queryBuilderCallCount++;
          if (queryBuilderCallCount === 1) {
            // Overall stats (getRawOne)
            return createMockQueryBuilder({
              getRawOne: {
                total: '100',
                completed: '75',
                pending: '10',
                in_progress: '10',
                cancelled: '5',
                overdue: '3',
                avg_completion_hours: '4.5',
              },
            }) as any;
          }
          // All other queries return empty arrays
          return createMockQueryBuilder() as any;
        });

        const result = await service.generateReport(startDate, endDate);

        expect(result.overall.total_tasks).toBe(100);
        expect(result.overall.completed).toBe(75);
        expect(result.overall.pending).toBe(10);
        expect(result.overall.in_progress).toBe(10);
        expect(result.overall.cancelled).toBe(5);
        expect(result.overall.overdue).toBe(3);
        expect(result.overall.avg_completion_time_hours).toBe(4.5);
      });

      it('should calculate completion rate', async () => {
        taskRepository.createQueryBuilder.mockImplementation(() => {
          queryBuilderCallCount++;
          if (queryBuilderCallCount === 1) {
            return createMockQueryBuilder({
              getRawOne: {
                total: '80',
                completed: '60',
                pending: '10',
                in_progress: '5',
                cancelled: '5',
                overdue: '2',
                avg_completion_hours: '3.0',
              },
            }) as any;
          }
          return createMockQueryBuilder() as any;
        });

        const result = await service.generateReport(startDate, endDate);

        expect(result.overall.completion_rate).toBe(75); // 60/80 * 100
      });

      it('should return 0 completion rate when no tasks', async () => {
        setupDefaultMocks();

        const result = await service.generateReport(startDate, endDate);

        expect(result.overall.completion_rate).toBe(0);
      });

      it('should handle null values in overall stats', async () => {
        taskRepository.createQueryBuilder.mockImplementation(() => {
          queryBuilderCallCount++;
          if (queryBuilderCallCount === 1) {
            return createMockQueryBuilder({
              getRawOne: {
                total: null,
                completed: null,
                pending: null,
                in_progress: null,
                cancelled: null,
                overdue: null,
                avg_completion_hours: null,
              },
            }) as any;
          }
          return createMockQueryBuilder() as any;
        });

        const result = await service.generateReport(startDate, endDate);

        expect(result.overall.total_tasks).toBe(0);
        expect(result.overall.avg_completion_time_hours).toBe(0);
      });
    });

    describe('stats by type', () => {
      it('should aggregate statistics by task type', async () => {
        taskRepository.createQueryBuilder.mockImplementation(() => {
          queryBuilderCallCount++;
          if (queryBuilderCallCount === 2) {
            // by_type is second query
            return createMockQueryBuilder({
              getRawMany: [
                {
                  type: 'refill',
                  total: '50',
                  completed: '45',
                  pending: '3',
                  in_progress: '2',
                  cancelled: '0',
                  avg_completion_hours: '2.0',
                },
                {
                  type: 'collection',
                  total: '30',
                  completed: '28',
                  pending: '1',
                  in_progress: '1',
                  cancelled: '0',
                  avg_completion_hours: '1.5',
                },
              ],
            }) as any;
          }
          return createMockQueryBuilder() as any;
        });

        const result = await service.generateReport(startDate, endDate);

        expect(result.by_type).toHaveLength(2);
        expect(result.by_type[0].type).toBe('refill');
        expect(result.by_type[0].total).toBe(50);
        expect(result.by_type[0].completed).toBe(45);
        expect(result.by_type[0].completion_rate).toBe(90); // 45/50 * 100
      });

      it('should return empty array when no tasks by type', async () => {
        setupDefaultMocks();

        const result = await service.generateReport(startDate, endDate);

        expect(result.by_type).toHaveLength(0);
      });
    });

    describe('stats by status', () => {
      it('should aggregate statistics by status', async () => {
        taskRepository.createQueryBuilder.mockImplementation(() => {
          queryBuilderCallCount++;
          if (queryBuilderCallCount === 3) {
            // by_status is third query
            return createMockQueryBuilder({
              getRawMany: [
                { status: 'completed', count: '70' },
                { status: 'pending', count: '20' },
                { status: 'in_progress', count: '10' },
              ],
            }) as any;
          }
          return createMockQueryBuilder() as any;
        });

        const result = await service.generateReport(startDate, endDate);

        expect(result.by_status).toHaveLength(3);
        expect(result.by_status[0].status).toBe('completed');
        expect(result.by_status[0].count).toBe(70);
        expect(result.by_status[0].percentage).toBe(70); // 70/100 * 100
      });

      it('should return empty array when no tasks by status', async () => {
        setupDefaultMocks();

        const result = await service.generateReport(startDate, endDate);

        expect(result.by_status).toHaveLength(0);
      });
    });

    describe('stats by priority', () => {
      it('should aggregate statistics by priority', async () => {
        taskRepository.createQueryBuilder.mockImplementation(() => {
          queryBuilderCallCount++;
          if (queryBuilderCallCount === 4) {
            // by_priority is fourth query
            return createMockQueryBuilder({
              getRawMany: [
                { priority: 'high', count: '20', completed: '18', avg_completion_hours: '1.5' },
                { priority: 'normal', count: '60', completed: '50', avg_completion_hours: '3.0' },
              ],
            }) as any;
          }
          return createMockQueryBuilder() as any;
        });

        const result = await service.generateReport(startDate, endDate);

        expect(result.by_priority).toHaveLength(2);
        expect(result.by_priority[0].priority).toBe('high');
        expect(result.by_priority[0].count).toBe(20);
        expect(result.by_priority[0].avg_completion_time_hours).toBe(1.5);
      });

      it('should handle null priority as normal', async () => {
        taskRepository.createQueryBuilder.mockImplementation(() => {
          queryBuilderCallCount++;
          if (queryBuilderCallCount === 4) {
            return createMockQueryBuilder({
              getRawMany: [
                { priority: null, count: '10', completed: '8', avg_completion_hours: '2.0' },
              ],
            }) as any;
          }
          return createMockQueryBuilder() as any;
        });

        const result = await service.generateReport(startDate, endDate);

        expect(result.by_priority[0].priority).toBe('normal');
      });

      it('should return empty array when no tasks by priority', async () => {
        setupDefaultMocks();

        const result = await service.generateReport(startDate, endDate);

        expect(result.by_priority).toHaveLength(0);
      });
    });

    describe('timeline', () => {
      it('should merge created, completed, and cancelled timelines', async () => {
        taskRepository.createQueryBuilder.mockImplementation(() => {
          queryBuilderCallCount++;
          if (queryBuilderCallCount === 5) {
            // created timeline
            return createMockQueryBuilder({
              getRawMany: [
                { date: '2025-01-01', count: '5' },
                { date: '2025-01-02', count: '3' },
              ],
            }) as any;
          }
          if (queryBuilderCallCount === 6) {
            // completed timeline
            return createMockQueryBuilder({
              getRawMany: [
                { date: '2025-01-01', count: '4' },
                { date: '2025-01-03', count: '2' },
              ],
            }) as any;
          }
          if (queryBuilderCallCount === 7) {
            // cancelled timeline
            return createMockQueryBuilder({
              getRawMany: [{ date: '2025-01-02', count: '1' }],
            }) as any;
          }
          return createMockQueryBuilder() as any;
        });

        const result = await service.generateReport(startDate, endDate);

        expect(result.timeline).toHaveLength(3);

        const jan1 = result.timeline.find((t) => t.date === '2025-01-01');
        expect(jan1?.created).toBe(5);
        expect(jan1?.completed).toBe(4);
        expect(jan1?.cancelled).toBe(0);

        const jan2 = result.timeline.find((t) => t.date === '2025-01-02');
        expect(jan2?.created).toBe(3);
        expect(jan2?.completed).toBe(0);
        expect(jan2?.cancelled).toBe(1);

        const jan3 = result.timeline.find((t) => t.date === '2025-01-03');
        expect(jan3?.created).toBe(0);
        expect(jan3?.completed).toBe(2);
        expect(jan3?.cancelled).toBe(0);
      });

      it('should sort timeline by date ascending', async () => {
        taskRepository.createQueryBuilder.mockImplementation(() => {
          queryBuilderCallCount++;
          if (queryBuilderCallCount === 5) {
            return createMockQueryBuilder({
              getRawMany: [
                { date: '2025-01-03', count: '1' },
                { date: '2025-01-01', count: '2' },
                { date: '2025-01-02', count: '3' },
              ],
            }) as any;
          }
          return createMockQueryBuilder() as any;
        });

        const result = await service.generateReport(startDate, endDate);

        expect(result.timeline[0].date).toBe('2025-01-01');
        expect(result.timeline[1].date).toBe('2025-01-02');
        expect(result.timeline[2].date).toBe('2025-01-03');
      });

      it('should return empty array when no timeline data', async () => {
        setupDefaultMocks();

        const result = await service.generateReport(startDate, endDate);

        expect(result.timeline).toHaveLength(0);
      });
    });
  });

  // Helper function to setup default empty mocks
  function setupDefaultMocks() {
    taskRepository.createQueryBuilder.mockImplementation(() => createMockQueryBuilder() as any);
  }
});
