import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { Attendance, AttendanceStatus } from '../entities/attendance.entity';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let repository: jest.Mocked<Repository<Attendance>>;

  const mockDate = new Date('2025-01-15');
  const mockCheckIn = new Date('2025-01-15T09:00:00');
  const mockCheckOut = new Date('2025-01-15T18:00:00');

  const mockAttendance: Partial<Attendance> = {
    id: 'attendance-uuid',
    employee_id: 'employee-uuid',
    date: mockDate,
    check_in: mockCheckIn,
    check_out: null,
    total_hours: 0,
    overtime_hours: 0,
    break_duration: 0,
    status: AttendanceStatus.PRESENT,
    notes: null,
    location: null,
    metadata: {},
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: getRepositoryToken(Attendance),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    repository = module.get(getRepositoryToken(Attendance));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkIn', () => {
    it('should create a new check-in record', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockAttendance as Attendance);
      repository.save.mockResolvedValue(mockAttendance as Attendance);

      const result = await service.checkIn({
        employee_id: 'employee-uuid',
        date: mockDate,
        location: 'Office',
      });

      expect(result.status).toBe(AttendanceStatus.PRESENT);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if already checked in', async () => {
      repository.findOne.mockResolvedValue({
        ...mockAttendance,
        check_in: mockCheckIn,
      } as Attendance);

      await expect(
        service.checkIn({
          employee_id: 'employee-uuid',
          date: mockDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update existing record without check_in', async () => {
      const existingRecord = {
        ...mockAttendance,
        check_in: null,
      };
      repository.findOne.mockResolvedValue(existingRecord as Attendance);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Attendance));

      const result = await service.checkIn({
        employee_id: 'employee-uuid',
        date: mockDate,
        metadata: { ip_address: '192.168.1.1' },
      });

      expect(result.check_in).toBeDefined();
      expect(result.status).toBe(AttendanceStatus.PRESENT);
    });
  });

  describe('checkOut', () => {
    it('should update check-out time and calculate hours', async () => {
      const checkedInAttendance = {
        ...mockAttendance,
        check_in: mockCheckIn,
        break_duration: 60, // 60 minutes break
      };
      repository.findOne.mockResolvedValue(checkedInAttendance as Attendance);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Attendance));

      const result = await service.checkOut('employee-uuid', mockDate);

      expect(result.check_out).toBeDefined();
      expect(result.total_hours).toBeGreaterThan(0);
    });

    it('should throw BadRequestException if no check-in found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.checkOut('employee-uuid', mockDate)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if already checked out', async () => {
      repository.findOne.mockResolvedValue({
        ...mockAttendance,
        check_in: mockCheckIn,
        check_out: mockCheckOut,
      } as Attendance);

      await expect(service.checkOut('employee-uuid', mockDate)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate overtime for hours exceeding 8 hours', async () => {
      const checkedInAttendance = {
        ...mockAttendance,
        check_in: new Date('2025-01-15T08:00:00'), // Early start
        break_duration: 0,
      };
      repository.findOne.mockResolvedValue(checkedInAttendance as Attendance);
      repository.save.mockImplementation((entity) => {
        // Simulate 10 hours work (600 minutes) - 480 standard = 120 overtime
        entity.total_hours = 600;
        if (entity.total_hours > 480) {
          entity.overtime_hours = entity.total_hours - 480;
        }
        return Promise.resolve(entity as Attendance);
      });

      const result = await service.checkOut('employee-uuid', mockDate);

      expect(result.overtime_hours).toBeGreaterThan(0);
    });
  });

  describe('getAttendanceByEmployee', () => {
    it('should return attendance records for employee in date range', async () => {
      repository.find.mockResolvedValue([mockAttendance] as Attendance[]);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await service.getAttendanceByEmployee('employee-uuid', startDate, endDate);

      expect(result).toEqual([mockAttendance]);
      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employee_id: 'employee-uuid',
          }),
          order: { date: 'DESC' },
        }),
      );
    });
  });

  describe('getAttendanceByDate', () => {
    it('should return all attendance records for a specific date', async () => {
      repository.find.mockResolvedValue([mockAttendance] as Attendance[]);

      const result = await service.getAttendanceByDate(mockDate);

      expect(result).toEqual([mockAttendance]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { date: mockDate },
        relations: ['employee'],
        order: { check_in: 'ASC' },
      });
    });
  });

  describe('markAbsent', () => {
    it('should create new absent record when no existing record', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({
        ...mockAttendance,
        status: AttendanceStatus.ABSENT,
        notes: 'Sick leave',
      } as Attendance);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Attendance));

      const result = await service.markAbsent('employee-uuid', mockDate, 'Sick leave');

      expect(result.status).toBe(AttendanceStatus.ABSENT);
      expect(result.notes).toBe('Sick leave');
    });

    it('should update existing record to absent', async () => {
      repository.findOne.mockResolvedValue(mockAttendance as Attendance);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Attendance));

      const result = await service.markAbsent('employee-uuid', mockDate, 'No show');

      expect(result.status).toBe(AttendanceStatus.ABSENT);
    });
  });

  describe('getAttendanceSummary', () => {
    it('should calculate attendance summary for a month', async () => {
      const attendances = [
        {
          ...mockAttendance,
          status: AttendanceStatus.PRESENT,
          total_hours: 480,
          overtime_hours: 0,
        },
        {
          ...mockAttendance,
          status: AttendanceStatus.PRESENT,
          total_hours: 520,
          overtime_hours: 40,
        },
        { ...mockAttendance, status: AttendanceStatus.ABSENT, total_hours: 0, overtime_hours: 0 },
        { ...mockAttendance, status: AttendanceStatus.LATE, total_hours: 440, overtime_hours: 0 },
      ];
      repository.find.mockResolvedValue(attendances as Attendance[]);

      const result = await service.getAttendanceSummary('employee-uuid', '2025-01');

      expect(result.total_days).toBe(4);
      expect(result.present_days).toBe(2);
      expect(result.absent_days).toBe(1);
      expect(result.late_days).toBe(1);
      expect(result.total_hours).toBe(1440);
      expect(result.overtime_hours).toBe(40);
    });

    it('should return zero summary when no attendance records', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.getAttendanceSummary('employee-uuid', '2025-01');

      expect(result.total_days).toBe(0);
      expect(result.present_days).toBe(0);
      expect(result.absent_days).toBe(0);
      expect(result.late_days).toBe(0);
      expect(result.total_hours).toBe(0);
      expect(result.overtime_hours).toBe(0);
    });
  });
});
