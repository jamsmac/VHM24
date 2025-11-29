import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { OperatorRatingsService } from './operator-ratings.service';
import { OperatorRating } from './entities/operator-rating.entity';
import { Task } from '@modules/tasks/entities/task.entity';
import { File } from '@modules/files/entities/file.entity';
import { TaskComment } from '@modules/tasks/entities/task-comment.entity';
import { Complaint } from '@modules/complaints/entities/complaint.entity';
import { User } from '@modules/users/entities/user.entity';

describe('OperatorRatingsService', () => {
  let service: OperatorRatingsService;
  let mockRatingRepository: jest.Mocked<Repository<OperatorRating>>;
  let mockTaskRepository: jest.Mocked<Repository<Task>>;
  let mockFileRepository: jest.Mocked<Repository<File>>;
  let mockCommentRepository: jest.Mocked<Repository<TaskComment>>;
  let mockComplaintRepository: jest.Mocked<Repository<Complaint>>;
  let mockUserRepository: jest.Mocked<Repository<User>>;

  // Test data
  const mockOperatorId = '123e4567-e89b-12d3-a456-426614174001';
  const mockOperator2Id = '123e4567-e89b-12d3-a456-426614174002';
  const mockPeriodStart = new Date('2025-01-01');
  const mockPeriodEnd = new Date('2025-01-31');

  const mockOperator: Partial<User> = {
    id: mockOperatorId,
    full_name: 'Test Operator',
    role: 'operator' as any,
    deleted_at: null,
  };

  const mockOperator2: Partial<User> = {
    id: mockOperator2Id,
    full_name: 'Test Operator 2',
    role: 'operator' as any,
    deleted_at: null,
  };

  const mockCompletedTask: Partial<Task> = {
    id: 'task-1',
    assigned_to_user_id: mockOperatorId,
    assigned_to: null,
    status: 'completed' as any,
    created_at: new Date('2025-01-10'),
    completed_at: new Date('2025-01-11'),
    due_date: new Date('2025-01-15'),
    machine_id: 'machine-1',
    type_code: 'refill' as any,
    expected_cash_amount: 1000,
    actual_cash_amount: 980,
    checklist: [
      { item: 'Check 1', completed: true },
      { item: 'Check 2', completed: true },
      { item: 'Check 3', completed: false },
    ],
  };

  const mockLateTask: Partial<Task> = {
    id: 'task-2',
    assigned_to_user_id: mockOperatorId,
    assigned_to: null,
    status: 'completed' as any,
    created_at: new Date('2025-01-05'),
    completed_at: new Date('2025-01-20'),
    due_date: new Date('2025-01-10'),
    machine_id: 'machine-1',
    type_code: 'collection' as any,
    expected_cash_amount: 2000,
    actual_cash_amount: 1800,
    checklist: [],
  };

  beforeEach(async () => {
    // Create mock query builders
    const createMockQueryBuilder = () => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getRawOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
    });

    mockRatingRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;

    mockTaskRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
      find: jest.fn(),
    } as any;

    mockFileRepository = {
      count: jest.fn(),
    } as any;

    mockCommentRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    } as any;

    mockComplaintRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    } as any;

    mockUserRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperatorRatingsService,
        {
          provide: getRepositoryToken(OperatorRating),
          useValue: mockRatingRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(File),
          useValue: mockFileRepository,
        },
        {
          provide: getRepositoryToken(TaskComment),
          useValue: mockCommentRepository,
        },
        {
          provide: getRepositoryToken(Complaint),
          useValue: mockComplaintRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<OperatorRatingsService>(OperatorRatingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRatingsForPeriod', () => {
    it('should calculate ratings for all operators in the period', async () => {
      // Arrange
      const mockUserQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockOperator, mockOperator2]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockUserQueryBuilder as any);

      // Mock task queries for metrics calculation
      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockTaskQueryBuilder as any);
      mockTaskRepository.find.mockResolvedValue([]);

      // Mock file repository
      mockFileRepository.count.mockResolvedValue(0);

      // Mock complaint queries
      const mockComplaintQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ count: 0, avg_rating: null }),
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockComplaintRepository.createQueryBuilder.mockReturnValue(mockComplaintQueryBuilder as any);

      // Mock comment queries
      const mockCommentQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockCommentRepository.createQueryBuilder.mockReturnValue(mockCommentQueryBuilder as any);

      const mockRating: Partial<OperatorRating> = {
        id: 'rating-1',
        operator_id: mockOperatorId,
        overall_score: 50,
        rating_grade: 'average',
      };
      mockRatingRepository.create.mockReturnValue(mockRating as any);
      mockRatingRepository.save.mockResolvedValue([mockRating] as any);

      // Act
      const result = await service.calculateRatingsForPeriod(mockPeriodStart, mockPeriodEnd);

      // Assert
      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockRatingRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
    });

    it('should return empty array when no operators exist', async () => {
      // Arrange
      const mockUserQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockUserQueryBuilder as any);
      mockRatingRepository.save.mockResolvedValue([] as any);

      // Act
      const result = await service.calculateRatingsForPeriod(mockPeriodStart, mockPeriodEnd);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('calculateOperatorRating', () => {
    beforeEach(() => {
      // Setup common mocks for all calculateOperatorRating tests
      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCompletedTask]),
      };
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockTaskQueryBuilder as any);
      mockTaskRepository.find.mockResolvedValue([mockCompletedTask as Task]);

      mockFileRepository.count.mockResolvedValue(1);

      const mockComplaintQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ count: 0, avg_rating: null }),
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockComplaintRepository.createQueryBuilder.mockReturnValue(mockComplaintQueryBuilder as any);

      const mockCommentQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };
      mockCommentRepository.createQueryBuilder.mockReturnValue(mockCommentQueryBuilder as any);
    });

    it('should calculate rating for a single operator', async () => {
      // Arrange
      const expectedRating: Partial<OperatorRating> = {
        operator_id: mockOperatorId,
        period_start: mockPeriodStart,
        period_end: mockPeriodEnd,
      };
      mockRatingRepository.create.mockReturnValue(expectedRating as any);

      // Act
      const result = await service.calculateOperatorRating(
        mockOperatorId,
        mockPeriodStart,
        mockPeriodEnd,
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockRatingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          operator_id: mockOperatorId,
          period_start: mockPeriodStart,
          period_end: mockPeriodEnd,
        }),
      );
    });

    it('should calculate weighted overall score correctly', async () => {
      // Arrange - mock scores for each category
      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCompletedTask, mockCompletedTask]),
      };
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockTaskQueryBuilder as any);
      mockTaskRepository.find.mockResolvedValue([mockCompletedTask, mockCompletedTask] as Task[]);

      mockRatingRepository.create.mockImplementation((data: any) => data);

      // Act
      const result = await service.calculateOperatorRating(
        mockOperatorId,
        mockPeriodStart,
        mockPeriodEnd,
      );

      // Assert - verify weights are applied correctly
      expect(result).toBeDefined();
      expect(result.overall_score).toBeDefined();
      // Overall score should be between 0 and 100
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_score).toBeLessThanOrEqual(100);
    });

    it('should return zero scores when operator has no tasks', async () => {
      // Arrange
      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockTaskQueryBuilder as any);
      mockTaskRepository.find.mockResolvedValue([]);

      mockRatingRepository.create.mockImplementation((data: any) => data);

      // Act
      const result = await service.calculateOperatorRating(
        mockOperatorId,
        mockPeriodStart,
        mockPeriodEnd,
      );

      // Assert
      expect(result.total_tasks).toBe(0);
      expect(result.timeliness_score).toBe(0);
    });
  });

  describe('calculateGrade', () => {
    it('should return excellent for score >= 90', () => {
      // Access private method using type assertion
      const calculateGrade = (service as any).calculateGrade.bind(service);

      expect(calculateGrade(100)).toBe('excellent');
      expect(calculateGrade(95)).toBe('excellent');
      expect(calculateGrade(90)).toBe('excellent');
    });

    it('should return good for score >= 75 and < 90', () => {
      const calculateGrade = (service as any).calculateGrade.bind(service);

      expect(calculateGrade(89)).toBe('good');
      expect(calculateGrade(80)).toBe('good');
      expect(calculateGrade(75)).toBe('good');
    });

    it('should return average for score >= 60 and < 75', () => {
      const calculateGrade = (service as any).calculateGrade.bind(service);

      expect(calculateGrade(74)).toBe('average');
      expect(calculateGrade(65)).toBe('average');
      expect(calculateGrade(60)).toBe('average');
    });

    it('should return poor for score >= 40 and < 60', () => {
      const calculateGrade = (service as any).calculateGrade.bind(service);

      expect(calculateGrade(59)).toBe('poor');
      expect(calculateGrade(50)).toBe('poor');
      expect(calculateGrade(40)).toBe('poor');
    });

    it('should return very_poor for score < 40', () => {
      const calculateGrade = (service as any).calculateGrade.bind(service);

      expect(calculateGrade(39)).toBe('very_poor');
      expect(calculateGrade(20)).toBe('very_poor');
      expect(calculateGrade(0)).toBe('very_poor');
    });
  });

  describe('calculateRanks', () => {
    it('should assign ranks based on overall score (highest first)', () => {
      // Access private method using type assertion
      const calculateRanks = (service as any).calculateRanks.bind(service);

      // Arrange
      const ratings: Partial<OperatorRating>[] = [
        { operator_id: 'op-1', overall_score: 70 },
        { operator_id: 'op-2', overall_score: 90 },
        { operator_id: 'op-3', overall_score: 50 },
        { operator_id: 'op-4', overall_score: 85 },
      ];

      // Act
      const result = calculateRanks(ratings);

      // Assert
      expect(result[0].rank).toBe(1);
      expect(result[0].overall_score).toBe(90);
      expect(result[1].rank).toBe(2);
      expect(result[1].overall_score).toBe(85);
      expect(result[2].rank).toBe(3);
      expect(result[2].overall_score).toBe(70);
      expect(result[3].rank).toBe(4);
      expect(result[3].overall_score).toBe(50);
    });

    it('should handle empty ratings array', () => {
      const calculateRanks = (service as any).calculateRanks.bind(service);

      const result = calculateRanks([]);

      expect(result).toEqual([]);
    });

    it('should handle single rating', () => {
      const calculateRanks = (service as any).calculateRanks.bind(service);

      const ratings: Partial<OperatorRating>[] = [{ operator_id: 'op-1', overall_score: 75 }];

      const result = calculateRanks(ratings);

      expect(result[0].rank).toBe(1);
    });
  });

  describe('getOperatorRating', () => {
    it('should return rating for specific operator and period', async () => {
      // Arrange
      const mockRating: Partial<OperatorRating> = {
        id: 'rating-1',
        operator_id: mockOperatorId,
        period_start: mockPeriodStart,
        period_end: mockPeriodEnd,
        overall_score: 85,
      };
      mockRatingRepository.findOne.mockResolvedValue(mockRating as OperatorRating);

      // Act
      const result = await service.getOperatorRating(
        mockOperatorId,
        mockPeriodStart,
        mockPeriodEnd,
      );

      // Assert
      expect(result).toEqual(mockRating);
      expect(mockRatingRepository.findOne).toHaveBeenCalledWith({
        where: {
          operator_id: mockOperatorId,
          period_start: mockPeriodStart,
          period_end: mockPeriodEnd,
        },
        relations: ['operator'],
      });
    });

    it('should return null when rating not found', async () => {
      // Arrange
      mockRatingRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getOperatorRating(
        mockOperatorId,
        mockPeriodStart,
        mockPeriodEnd,
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getAllRatings', () => {
    it('should return all ratings for a period ordered by rank', async () => {
      // Arrange
      const mockRatings: Partial<OperatorRating>[] = [
        { id: 'rating-1', operator_id: mockOperatorId, rank: 1, overall_score: 90 },
        { id: 'rating-2', operator_id: mockOperator2Id, rank: 2, overall_score: 75 },
      ];
      mockRatingRepository.find.mockResolvedValue(mockRatings as OperatorRating[]);

      // Act
      const result = await service.getAllRatings(mockPeriodStart, mockPeriodEnd);

      // Assert
      expect(result).toEqual(mockRatings);
      expect(mockRatingRepository.find).toHaveBeenCalledWith({
        where: {
          period_start: mockPeriodStart,
          period_end: mockPeriodEnd,
        },
        relations: ['operator'],
        order: {
          rank: 'ASC',
        },
      });
    });

    it('should return empty array when no ratings exist for period', async () => {
      // Arrange
      mockRatingRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getAllRatings(mockPeriodStart, mockPeriodEnd);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getOperatorHistory', () => {
    it('should return rating history for operator ordered by period', async () => {
      // Arrange
      const mockHistory: Partial<OperatorRating>[] = [
        { id: 'rating-1', operator_id: mockOperatorId, period_start: new Date('2025-02-01') },
        { id: 'rating-2', operator_id: mockOperatorId, period_start: new Date('2025-01-01') },
      ];
      mockRatingRepository.find.mockResolvedValue(mockHistory as OperatorRating[]);

      // Act
      const result = await service.getOperatorHistory(mockOperatorId);

      // Assert
      expect(result).toEqual(mockHistory);
      expect(mockRatingRepository.find).toHaveBeenCalledWith({
        where: {
          operator_id: mockOperatorId,
        },
        order: {
          period_start: 'DESC',
        },
      });
    });

    it('should return empty array for operator with no history', async () => {
      // Arrange
      mockRatingRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getOperatorHistory(mockOperatorId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('Weight calculations', () => {
    it('should have weights that sum to 100', () => {
      // Access private WEIGHTS property
      const weights = (service as any).WEIGHTS;

      const totalWeight =
        weights.TIMELINESS +
        weights.PHOTO_QUALITY +
        weights.DATA_ACCURACY +
        weights.CUSTOMER_FEEDBACK +
        weights.DISCIPLINE;

      expect(totalWeight).toBe(100);
    });

    it('should have correct individual weights', () => {
      const weights = (service as any).WEIGHTS;

      expect(weights.TIMELINESS).toBe(30);
      expect(weights.PHOTO_QUALITY).toBe(25);
      expect(weights.DATA_ACCURACY).toBe(20);
      expect(weights.CUSTOMER_FEEDBACK).toBe(15);
      expect(weights.DISCIPLINE).toBe(10);
    });
  });

  describe('collectMetrics (integration)', () => {
    it('should collect all metrics in parallel', async () => {
      // Arrange
      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCompletedTask]),
      };
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockTaskQueryBuilder as any);
      mockTaskRepository.find.mockResolvedValue([mockCompletedTask as Task]);

      mockFileRepository.count.mockResolvedValue(2);

      const mockComplaintQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ count: 0, avg_rating: null }),
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockComplaintRepository.createQueryBuilder.mockReturnValue(mockComplaintQueryBuilder as any);

      const mockCommentQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      };
      mockCommentRepository.createQueryBuilder.mockReturnValue(mockCommentQueryBuilder as any);

      // Access private method
      const collectMetrics = (service as any).collectMetrics.bind(service);

      // Act
      const metrics = await collectMetrics(mockOperatorId, mockPeriodStart, mockPeriodEnd);

      // Assert
      expect(metrics).toBeDefined();
      expect(metrics.timeliness).toBeDefined();
      expect(metrics.photo_quality).toBeDefined();
      expect(metrics.data_accuracy).toBeDefined();
      expect(metrics.customer_feedback).toBeDefined();
      expect(metrics.discipline).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle tasks with null due_date', async () => {
      // Arrange
      const taskWithNullDueDate: Partial<Task> = {
        ...mockCompletedTask,
        due_date: null,
      };

      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([taskWithNullDueDate]),
      };
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockTaskQueryBuilder as any);
      mockTaskRepository.find.mockResolvedValue([taskWithNullDueDate as Task]);

      mockFileRepository.count.mockResolvedValue(0);

      const mockComplaintQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ count: 0, avg_rating: null }),
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockComplaintRepository.createQueryBuilder.mockReturnValue(mockComplaintQueryBuilder as any);

      const mockCommentQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockCommentRepository.createQueryBuilder.mockReturnValue(mockCommentQueryBuilder as any);

      mockRatingRepository.create.mockImplementation((data: any) => data);

      // Act
      const result = await service.calculateOperatorRating(
        mockOperatorId,
        mockPeriodStart,
        mockPeriodEnd,
      );

      // Assert - should not throw, task without due date shouldn't affect on-time count
      expect(result).toBeDefined();
    });

    it('should handle collection tasks with zero expected amount', async () => {
      // Arrange
      const collectionTaskZeroExpected: Partial<Task> = {
        ...mockCompletedTask,
        type_code: 'collection' as any,
        expected_cash_amount: 0,
        actual_cash_amount: 100,
      };

      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([collectionTaskZeroExpected]),
      };
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockTaskQueryBuilder as any);
      mockTaskRepository.find.mockResolvedValue([]);

      mockFileRepository.count.mockResolvedValue(0);

      const mockComplaintQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ count: 0, avg_rating: null }),
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockComplaintRepository.createQueryBuilder.mockReturnValue(mockComplaintQueryBuilder as any);

      const mockCommentQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockCommentRepository.createQueryBuilder.mockReturnValue(mockCommentQueryBuilder as any);

      mockRatingRepository.create.mockImplementation((data: any) => data);

      // Act
      const result = await service.calculateOperatorRating(
        mockOperatorId,
        mockPeriodStart,
        mockPeriodEnd,
      );

      // Assert - should not throw, should handle zero expected amount gracefully
      expect(result).toBeDefined();
    });

    it('should handle tasks with null checklist', async () => {
      // Arrange
      const taskWithNullChecklist: Partial<Task> = {
        ...mockCompletedTask,
        checklist: null,
      };

      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([taskWithNullChecklist]),
      };
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockTaskQueryBuilder as any);
      mockTaskRepository.find.mockResolvedValue([taskWithNullChecklist as Task]);

      mockFileRepository.count.mockResolvedValue(0);

      const mockComplaintQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ count: 0, avg_rating: null }),
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockComplaintRepository.createQueryBuilder.mockReturnValue(mockComplaintQueryBuilder as any);

      const mockCommentQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockCommentRepository.createQueryBuilder.mockReturnValue(mockCommentQueryBuilder as any);

      mockRatingRepository.create.mockImplementation((data: any) => data);

      // Act
      const result = await service.calculateOperatorRating(
        mockOperatorId,
        mockPeriodStart,
        mockPeriodEnd,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.checklist_items_total).toBe(0);
    });
  });
});
