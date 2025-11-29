import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { WashingSchedulesService } from './washing-schedules.service';
import { WashingSchedule, WashingFrequency } from '../entities/washing-schedule.entity';

describe('WashingSchedulesService', () => {
  let service: WashingSchedulesService;
  let mockRepository: any;
  let mockQueryBuilder: any;

  const mockSchedule: Partial<WashingSchedule> = {
    id: 'schedule-1',
    machine_id: 'machine-1',
    name: 'Weekly Washing',
    frequency: WashingFrequency.WEEKLY,
    interval_days: null,
    is_active: true,
    next_wash_date: new Date(),
    last_wash_date: null,
    last_washed_by_user_id: null,
    last_wash_task_id: null,
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
      getRawMany: jest.fn().mockResolvedValue([]),
      clone: jest.fn().mockReturnThis(),
    };

    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      softRemove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WashingSchedulesService,
        {
          provide: getRepositoryToken(WashingSchedule),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<WashingSchedulesService>(WashingSchedulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a washing schedule', async () => {
      const dto = {
        machine_id: 'machine-1',
        name: 'Weekly Washing',
        frequency: WashingFrequency.WEEKLY,
      };
      mockRepository.create.mockReturnValue(mockSchedule);
      mockRepository.save.mockResolvedValue(mockSchedule);

      const result = await service.create(dto as any);

      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('findAll', () => {
    it('should return all schedules without filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      const result = await service.findAll();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('schedule');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'schedule.machine',
        'machine',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('schedule.next_wash_date', 'ASC');
      expect(result).toEqual([mockSchedule]);
    });

    it('should filter by machineId when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      await service.findAll('machine-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.machine_id = :machineId', {
        machineId: 'machine-1',
      });
    });

    it('should filter by isActive when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      await service.findAll(undefined, true);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.is_active = :isActive', {
        isActive: true,
      });
    });

    it('should apply both filters when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      await service.findAll('machine-1', false);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe('findOne', () => {
    it('should return schedule when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockSchedule);

      const result = await service.findOne('schedule-1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        relations: ['machine'],
      });
      expect(result).toEqual(mockSchedule);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and save schedule', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockSchedule });
      mockRepository.save.mockResolvedValue({ ...mockSchedule, name: 'Updated Name' });

      const result = await service.update('schedule-1', { name: 'Updated Name' } as any);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('remove', () => {
    it('should soft remove schedule', async () => {
      mockRepository.findOne.mockResolvedValue(mockSchedule);
      mockRepository.softRemove.mockResolvedValue(undefined);

      await service.remove('schedule-1');

      expect(mockRepository.softRemove).toHaveBeenCalledWith(mockSchedule);
    });
  });

  describe('completeWashing', () => {
    it('should complete washing and calculate next wash date', async () => {
      const schedule = { ...mockSchedule };
      mockRepository.findOne.mockResolvedValue(schedule);
      mockRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const dto = {
        performed_by_user_id: 'user-1',
        task_id: 'task-1',
      };

      const result = await service.completeWashing('schedule-1', dto);

      expect(result.last_washed_by_user_id).toBe('user-1');
      expect(result.last_wash_task_id).toBe('task-1');
      expect(result.last_wash_date).toBeDefined();
      expect(result.next_wash_date).toBeDefined();
    });

    it('should append notes when provided', async () => {
      const schedule = { ...mockSchedule, notes: 'Existing notes' };
      mockRepository.findOne.mockResolvedValue(schedule);
      mockRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const dto = {
        performed_by_user_id: 'user-1',
        notes: 'New washing notes',
      };

      const result = await service.completeWashing('schedule-1', dto);

      expect(result.notes).toContain('New washing notes');
      expect(result.notes).toContain('Existing notes');
    });

    it('should handle empty task_id', async () => {
      const schedule = { ...mockSchedule };
      mockRepository.findOne.mockResolvedValue(schedule);
      mockRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const dto = {
        performed_by_user_id: 'user-1',
      };

      const result = await service.completeWashing('schedule-1', dto);

      expect(result.last_wash_task_id).toBeNull();
    });
  });

  describe('getOverdueSchedules', () => {
    it('should return overdue schedules', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      const result = await service.getOverdueSchedules();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('schedule.next_wash_date < :today', {
        today: expect.any(Date),
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.is_active = :active', {
        active: true,
      });
      expect(result).toEqual([mockSchedule]);
    });
  });

  describe('getUpcomingSchedules', () => {
    it('should return upcoming schedules within default 7 days', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      const result = await service.getUpcomingSchedules();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('schedule.next_wash_date >= :today', {
        today: expect.any(Date),
      });
      expect(result).toEqual([mockSchedule]);
    });

    it('should use custom daysAhead parameter', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      await service.getUpcomingSchedules(14);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'schedule.next_wash_date <= :futureDate',
        { futureDate: expect.any(Date) },
      );
    });
  });

  describe('getStats', () => {
    it('should return stats without machineId filter', async () => {
      mockQueryBuilder.getCount.mockResolvedValueOnce(10).mockResolvedValueOnce(8);
      mockRepository.count.mockResolvedValue(2);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { frequency: WashingFrequency.WEEKLY, count: '5' },
        { frequency: WashingFrequency.MONTHLY, count: '3' },
      ]);

      const result = await service.getStats();

      expect(result.total).toBe(10);
      expect(result.active).toBe(8);
      expect(result.overdue).toBe(2);
      expect(result.by_frequency).toHaveLength(2);
    });

    it('should filter by machineId when provided', async () => {
      mockQueryBuilder.getCount.mockResolvedValueOnce(5).mockResolvedValueOnce(4);
      mockRepository.count.mockResolvedValue(1);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.getStats('machine-1');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('schedule.machine_id = :machineId', {
        machineId: 'machine-1',
      });
    });
  });

  describe('calculateNextWashDate (via completeWashing)', () => {
    const testFrequencies = [
      { frequency: WashingFrequency.DAILY, expectedDays: 1 },
      { frequency: WashingFrequency.WEEKLY, expectedDays: 7 },
      { frequency: WashingFrequency.BIWEEKLY, expectedDays: 14 },
    ];

    testFrequencies.forEach(({ frequency, expectedDays }) => {
      it(`should calculate correct next date for ${frequency}`, async () => {
        const schedule = { ...mockSchedule, frequency };
        mockRepository.findOne.mockResolvedValue(schedule);
        mockRepository.save.mockImplementation((s: any) => Promise.resolve(s));

        const beforeComplete = new Date();
        const result = await service.completeWashing('schedule-1', {
          performed_by_user_id: 'user-1',
        });

        const diffDays = Math.round(
          (result.next_wash_date!.getTime() - beforeComplete.getTime()) / (1000 * 60 * 60 * 24),
        );
        expect(diffDays).toBeGreaterThanOrEqual(expectedDays - 1);
        expect(diffDays).toBeLessThanOrEqual(expectedDays + 1);
      });
    });

    it('should handle MONTHLY frequency', async () => {
      const schedule = { ...mockSchedule, frequency: WashingFrequency.MONTHLY };
      mockRepository.findOne.mockResolvedValue(schedule);
      mockRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const beforeComplete = new Date();
      const result = await service.completeWashing('schedule-1', {
        performed_by_user_id: 'user-1',
      });

      // Should be roughly 28-31 days ahead
      const diffDays = Math.round(
        (result.next_wash_date!.getTime() - beforeComplete.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(27);
      expect(diffDays).toBeLessThanOrEqual(32);
    });

    it('should handle CUSTOM frequency with interval_days', async () => {
      const schedule = { ...mockSchedule, frequency: WashingFrequency.CUSTOM, interval_days: 10 };
      mockRepository.findOne.mockResolvedValue(schedule);
      mockRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const beforeComplete = new Date();
      const result = await service.completeWashing('schedule-1', {
        performed_by_user_id: 'user-1',
      });

      const diffDays = Math.round(
        (result.next_wash_date!.getTime() - beforeComplete.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(9);
      expect(diffDays).toBeLessThanOrEqual(11);
    });

    it('should default to weekly for CUSTOM without interval_days', async () => {
      const schedule = { ...mockSchedule, frequency: WashingFrequency.CUSTOM, interval_days: null };
      mockRepository.findOne.mockResolvedValue(schedule);
      mockRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const beforeComplete = new Date();
      const result = await service.completeWashing('schedule-1', {
        performed_by_user_id: 'user-1',
      });

      const diffDays = Math.round(
        (result.next_wash_date!.getTime() - beforeComplete.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(6);
      expect(diffDays).toBeLessThanOrEqual(8);
    });
  });
});
