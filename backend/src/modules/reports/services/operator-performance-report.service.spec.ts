import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { OperatorPerformanceReportService } from './operator-performance-report.service';
import { User } from '@modules/users/entities/user.entity';
import { Task } from '@modules/tasks/entities/task.entity';
import { OperatorRating } from '@modules/operator-ratings/entities/operator-rating.entity';

describe('OperatorPerformanceReportService', () => {
  let service: OperatorPerformanceReportService;
  let mockUserRepository: any;
  let mockTaskRepository: any;
  let mockRatingRepository: any;
  let taskQueryBuilder: any;
  let userQueryBuilder: any;

  const operatorId = 'operator-123';
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-31');

  beforeEach(async () => {
    taskQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(null),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
    };

    userQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockUserRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn().mockReturnValue(userQueryBuilder),
    };

    mockTaskRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(taskQueryBuilder),
    };

    mockRatingRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperatorPerformanceReportService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(OperatorRating),
          useValue: mockRatingRepository,
        },
      ],
    }).compile();

    service = module.get<OperatorPerformanceReportService>(OperatorPerformanceReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOperatorReport', () => {
    it('should throw NotFoundException when operator not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.generateOperatorReport(operatorId, startDate, endDate)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should generate a complete report', async () => {
      const mockOperator = {
        id: operatorId,
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'operator',
        phone: '+1234567890',
      };

      mockUserRepository.findOne.mockResolvedValue(mockOperator);
      taskQueryBuilder.getRawOne.mockResolvedValue({
        total: '10',
        completed: '8',
        pending: '1',
        in_progress: '1',
        cancelled: '0',
      });
      taskQueryBuilder.getRawMany.mockResolvedValue([]);
      taskQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateOperatorReport(operatorId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.operator.id).toBe(operatorId);
      expect(result.operator.full_name).toBe('John Doe');
      expect(result.operator.phone).toBe('+1234567890');
      expect(result.period.start_date).toEqual(startDate);
      expect(result.period.end_date).toEqual(endDate);
      expect(result.generated_at).toBeInstanceOf(Date);
    });

    it('should handle operator without phone', async () => {
      const mockOperator = {
        id: operatorId,
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'operator',
        phone: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockOperator);
      taskQueryBuilder.getRawOne.mockResolvedValue({});
      taskQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateOperatorReport(operatorId, startDate, endDate);

      expect(result.operator.phone).toBe('');
    });

    it('should return null rating when no rating found', async () => {
      const mockOperator = {
        id: operatorId,
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'operator',
        phone: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockOperator);
      mockRatingRepository.findOne.mockResolvedValue(null);
      taskQueryBuilder.getRawOne.mockResolvedValue({});
      taskQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateOperatorReport(operatorId, startDate, endDate);

      expect(result.rating).toBeNull();
    });

    it('should return rating data when rating exists', async () => {
      const mockOperator = {
        id: operatorId,
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'operator',
        phone: null,
      };

      const mockRating = {
        overall_score: 4.5,
        rating_grade: 'A',
        rank: 5,
        timeliness_score: 4.8,
        photo_quality_score: 4.2,
        data_accuracy_score: 4.6,
        customer_feedback_score: 4.3,
        discipline_score: 4.7,
      };

      mockUserRepository.findOne.mockResolvedValue(mockOperator);
      mockRatingRepository.findOne.mockResolvedValue(mockRating);
      taskQueryBuilder.getRawOne.mockResolvedValue({});
      taskQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateOperatorReport(operatorId, startDate, endDate);

      expect(result.rating).toBeDefined();
      expect(result.rating?.overall_score).toBe(4.5);
      expect(result.rating?.rating_grade).toBe('A');
      expect(result.rating?.rank).toBe(5);
    });

    it('should handle null rank in rating', async () => {
      const mockOperator = {
        id: operatorId,
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'operator',
        phone: null,
      };

      const mockRating = {
        overall_score: 4.5,
        rating_grade: 'A',
        rank: null,
        timeliness_score: 4.8,
        photo_quality_score: 4.2,
        data_accuracy_score: 4.6,
        customer_feedback_score: 4.3,
        discipline_score: 4.7,
      };

      mockUserRepository.findOne.mockResolvedValue(mockOperator);
      mockRatingRepository.findOne.mockResolvedValue(mockRating);
      taskQueryBuilder.getRawOne.mockResolvedValue({});
      taskQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateOperatorReport(operatorId, startDate, endDate);

      expect(result.rating?.rank).toBe(0);
    });

    it('should calculate tasks data correctly', async () => {
      const mockOperator = {
        id: operatorId,
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'operator',
        phone: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockOperator);
      taskQueryBuilder.getRawOne.mockResolvedValue({
        total: '20',
        completed: '15',
        pending: '3',
        in_progress: '2',
        cancelled: '0',
      });
      taskQueryBuilder.getRawMany.mockResolvedValue([
        { type: 'refill', count: '10', completed: '8' },
        { type: 'collection', count: '6', completed: '5' },
        { type: 'maintenance', count: '4', completed: '2' },
      ]);
      taskQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateOperatorReport(operatorId, startDate, endDate);

      expect(result.tasks.total).toBe(20);
      expect(result.tasks.completed).toBe(15);
      expect(result.tasks.pending).toBe(3);
      expect(result.tasks.in_progress).toBe(2);
      expect(result.tasks.cancelled).toBe(0);
      expect(result.tasks.completion_rate).toBe(75);
      expect(result.tasks.by_type).toHaveLength(3);
      expect(result.tasks.by_type[0].type).toBe('refill');
      expect(result.tasks.by_type[0].count).toBe(10);
      expect(result.tasks.by_type[0].completed).toBe(8);
      expect(result.tasks.by_type[0].percentage).toBe(50);
    });

    it('should handle zero tasks', async () => {
      const mockOperator = {
        id: operatorId,
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'operator',
        phone: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockOperator);
      taskQueryBuilder.getRawOne.mockResolvedValue({
        total: '0',
        completed: '0',
        pending: '0',
        in_progress: '0',
        cancelled: '0',
      });
      taskQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateOperatorReport(operatorId, startDate, endDate);

      expect(result.tasks.total).toBe(0);
      expect(result.tasks.completion_rate).toBe(0);
      expect(result.efficiency.avg_completion_time_hours).toBe(0);
      expect(result.efficiency.punctuality_rate).toBe(0);
      expect(result.efficiency.productivity_score).toBe(0);
    });

    it('should calculate efficiency data correctly', async () => {
      const mockOperator = {
        id: operatorId,
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'operator',
        phone: null,
      };

      const now = new Date();
      const createdAt = new Date(now);
      createdAt.setHours(createdAt.getHours() - 5);
      const completedAt = new Date(now);
      const dueDate = new Date(now);
      dueDate.setHours(dueDate.getHours() + 1);

      const lateDueDate = new Date(now);
      lateDueDate.setHours(lateDueDate.getHours() - 2);

      const mockTasks = [
        {
          created_at: createdAt,
          completed_at: completedAt,
          due_date: dueDate,
        },
        {
          created_at: createdAt,
          completed_at: completedAt,
          due_date: lateDueDate, // Late task
        },
      ];

      mockUserRepository.findOne.mockResolvedValue(mockOperator);
      taskQueryBuilder.getRawOne.mockResolvedValue({ total: '2', completed: '2' });
      taskQueryBuilder.getMany.mockResolvedValue(mockTasks);

      const result = await service.generateOperatorReport(operatorId, startDate, endDate);

      expect(result.efficiency.tasks_on_time).toBe(1);
      expect(result.efficiency.tasks_late).toBe(1);
      expect(result.efficiency.punctuality_rate).toBe(50);
      expect(result.efficiency.avg_completion_time_hours).toBeGreaterThan(0);
    });

    it('should handle tasks without completion data', async () => {
      const mockOperator = {
        id: operatorId,
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'operator',
        phone: null,
      };

      const mockTasks = [
        {
          created_at: null,
          completed_at: null,
          due_date: null,
        },
      ];

      mockUserRepository.findOne.mockResolvedValue(mockOperator);
      taskQueryBuilder.getRawOne.mockResolvedValue({ total: '1', completed: '1' });
      taskQueryBuilder.getMany.mockResolvedValue(mockTasks);

      const result = await service.generateOperatorReport(operatorId, startDate, endDate);

      expect(result.efficiency.avg_completion_time_hours).toBe(0);
      expect(result.efficiency.tasks_on_time).toBe(0);
      expect(result.efficiency.tasks_late).toBe(0);
      expect(result.efficiency.punctuality_rate).toBe(0);
    });
  });

  describe('generateAllOperatorsReport', () => {
    it('should generate report for all operators', async () => {
      const mockOperators = [
        { id: 'op-1', full_name: 'Operator 1' },
        { id: 'op-2', full_name: 'Operator 2' },
        { id: 'op-3', full_name: 'Operator 3' },
      ];

      userQueryBuilder.getMany.mockResolvedValue(mockOperators);
      mockRatingRepository.findOne.mockResolvedValue({
        overall_score: 4.0,
        rating_grade: 'B',
        rank: 1,
      });
      taskQueryBuilder.getRawOne.mockResolvedValue({
        total: '10',
        completed: '8',
      });
      taskQueryBuilder.getRawMany.mockResolvedValue([]);
      taskQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateAllOperatorsReport(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.period.start_date).toEqual(startDate);
      expect(result.period.end_date).toEqual(endDate);
      expect(result.summary.total_operators).toBe(3);
      expect(result.operators).toHaveLength(3);
      expect(result.top_performers).toHaveLength(3); // All operators (less than 5)
      expect(result.low_performers).toHaveLength(3);
      expect(result.generated_at).toBeInstanceOf(Date);
    });

    it('should handle empty operators list', async () => {
      userQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateAllOperatorsReport(startDate, endDate);

      expect(result.summary.total_operators).toBe(0);
      expect(result.summary.avg_overall_score).toBe(0);
      expect(result.operators).toHaveLength(0);
      expect(result.top_performers).toHaveLength(0);
      expect(result.low_performers).toHaveLength(0);
    });

    it('should sort operators by overall score', async () => {
      const mockOperators = [
        { id: 'op-1', full_name: 'Operator 1' },
        { id: 'op-2', full_name: 'Operator 2' },
        { id: 'op-3', full_name: 'Operator 3' },
      ];

      userQueryBuilder.getMany.mockResolvedValue(mockOperators);

      let ratingCallCount = 0;
      mockRatingRepository.findOne.mockImplementation(() => {
        ratingCallCount++;
        const scores = [3.0, 5.0, 4.0];
        return Promise.resolve({
          overall_score: scores[ratingCallCount - 1],
          rating_grade: 'B',
          rank: ratingCallCount,
        });
      });

      taskQueryBuilder.getRawOne.mockResolvedValue({ total: '10', completed: '8' });
      taskQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateAllOperatorsReport(startDate, endDate);

      // Should be sorted by score descending
      expect(result.operators[0].overall_score).toBe(5.0);
      expect(result.operators[1].overall_score).toBe(4.0);
      expect(result.operators[2].overall_score).toBe(3.0);
    });

    it('should handle operators without ratings', async () => {
      const mockOperators = [{ id: 'op-1', full_name: 'Operator 1' }];

      userQueryBuilder.getMany.mockResolvedValue(mockOperators);
      mockRatingRepository.findOne.mockResolvedValue(null);
      taskQueryBuilder.getRawOne.mockResolvedValue({ total: '10', completed: '8' });
      taskQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateAllOperatorsReport(startDate, endDate);

      expect(result.operators[0].overall_score).toBe(0);
      expect(result.operators[0].rating_grade).toBe('unrated');
      expect(result.operators[0].rank).toBe(0);
    });

    it('should calculate averages correctly', async () => {
      const mockOperators = [
        { id: 'op-1', full_name: 'Operator 1' },
        { id: 'op-2', full_name: 'Operator 2' },
      ];

      userQueryBuilder.getMany.mockResolvedValue(mockOperators);

      let ratingCallCount = 0;
      mockRatingRepository.findOne.mockImplementation(() => {
        ratingCallCount++;
        return Promise.resolve({
          overall_score: ratingCallCount === 1 ? 4.0 : 5.0,
          rating_grade: 'A',
          rank: 1,
        });
      });

      let taskCallCount = 0;
      taskQueryBuilder.getRawOne.mockImplementation(() => {
        taskCallCount++;
        // First two calls for op-1 tasks, then op-2 tasks
        if (taskCallCount === 1 || taskCallCount === 3) {
          return Promise.resolve({ total: '10', completed: '8' });
        }
        return Promise.resolve({ total: '20', completed: '18' });
      });

      taskQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateAllOperatorsReport(startDate, endDate);

      expect(result.summary.avg_overall_score).toBe(4.5); // (4 + 5) / 2
    });

    it('should limit top and low performers to 5', async () => {
      const mockOperators = Array.from({ length: 10 }, (_, i) => ({
        id: `op-${i}`,
        full_name: `Operator ${i}`,
      }));

      userQueryBuilder.getMany.mockResolvedValue(mockOperators);
      mockRatingRepository.findOne.mockResolvedValue({
        overall_score: 4.0,
        rating_grade: 'B',
        rank: 1,
      });
      taskQueryBuilder.getRawOne.mockResolvedValue({ total: '10', completed: '8' });
      taskQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateAllOperatorsReport(startDate, endDate);

      expect(result.top_performers).toHaveLength(5);
      expect(result.low_performers).toHaveLength(5);
    });
  });
});
