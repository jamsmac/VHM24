import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from '../services/attendance.service';
import { Attendance, AttendanceStatus } from '../entities/attendance.entity';
import { CheckInDto, CheckOutDto, MarkAbsentDto } from '../dto/attendance.dto';

describe('AttendanceController', () => {
  let controller: AttendanceController;
  let mockAttendanceService: jest.Mocked<AttendanceService>;

  const mockAttendance: Partial<Attendance> = {
    id: 'att-123',
    employee_id: 'emp-123',
    date: new Date('2025-01-15'),
    check_in: new Date('2025-01-15T09:00:00Z'),
    check_out: new Date('2025-01-15T18:00:00Z'),
    status: AttendanceStatus.PRESENT,
    total_hours: 540,
    overtime_hours: 60,
    break_duration: 0,
    notes: null,
    location: null,
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    mockAttendanceService = {
      checkIn: jest.fn(),
      checkOut: jest.fn(),
      markAbsent: jest.fn(),
      getAttendanceByEmployee: jest.fn(),
      getAttendanceByDate: jest.fn(),
      getAttendanceSummary: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        {
          provide: AttendanceService,
          useValue: mockAttendanceService,
        },
      ],
    }).compile();

    controller = module.get<AttendanceController>(AttendanceController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkIn', () => {
    it('should check in an employee', async () => {
      const dto: CheckInDto = {
        employee_id: 'emp-123',
        date: new Date('2025-01-15'),
        location: 'Office',
      };

      mockAttendanceService.checkIn.mockResolvedValue(mockAttendance as Attendance);

      const result = await controller.checkIn(dto);

      expect(result).toEqual(mockAttendance);
      expect(mockAttendanceService.checkIn).toHaveBeenCalledWith(dto);
    });
  });

  describe('checkOut', () => {
    it('should check out an employee', async () => {
      const dto: CheckOutDto = {
        employee_id: 'emp-123',
        date: new Date('2025-01-15'),
      };
      const checkedOutAttendance = {
        ...mockAttendance,
        check_out: new Date('2025-01-15T18:00:00Z'),
      };

      mockAttendanceService.checkOut.mockResolvedValue(checkedOutAttendance as Attendance);

      const result = await controller.checkOut(dto);

      expect(result).toEqual(checkedOutAttendance);
      expect(mockAttendanceService.checkOut).toHaveBeenCalledWith(dto.employee_id, dto.date);
    });
  });

  describe('markAbsent', () => {
    it('should mark an employee as absent', async () => {
      const dto: MarkAbsentDto = {
        employee_id: 'emp-123',
        date: new Date('2025-01-16'),
        notes: 'Sick leave',
      };
      const absentAttendance = {
        ...mockAttendance,
        date: new Date('2025-01-16'),
        status: AttendanceStatus.ABSENT,
        check_in: null,
        check_out: null,
        notes: 'Sick leave',
      };

      mockAttendanceService.markAbsent.mockResolvedValue(absentAttendance as any);

      const result = await controller.markAbsent(dto);

      expect(result).toEqual(absentAttendance);
      expect(mockAttendanceService.markAbsent).toHaveBeenCalledWith(
        dto.employee_id,
        dto.date,
        dto.notes,
      );
    });

    it('should mark absent without notes', async () => {
      const dto: MarkAbsentDto = {
        employee_id: 'emp-123',
        date: new Date('2025-01-16'),
      };

      mockAttendanceService.markAbsent.mockResolvedValue({} as Attendance);

      await controller.markAbsent(dto);

      expect(mockAttendanceService.markAbsent).toHaveBeenCalledWith(
        dto.employee_id,
        dto.date,
        undefined,
      );
    });
  });

  describe('getByEmployee', () => {
    it('should return attendance records for an employee within date range', async () => {
      const records = [
        mockAttendance,
        { ...mockAttendance, id: 'att-456', date: new Date('2025-01-16') },
      ];
      mockAttendanceService.getAttendanceByEmployee.mockResolvedValue(records as Attendance[]);

      const result = await controller.getByEmployee('emp-123', '2025-01-01', '2025-01-31');

      expect(result).toEqual(records);
      expect(mockAttendanceService.getAttendanceByEmployee).toHaveBeenCalledWith(
        'emp-123',
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );
    });
  });

  describe('getByDate', () => {
    it('should return attendance records for a specific date', async () => {
      const records = [
        mockAttendance,
        { ...mockAttendance, id: 'att-789', employee_id: 'emp-456' },
      ];
      mockAttendanceService.getAttendanceByDate.mockResolvedValue(records as Attendance[]);

      const result = await controller.getByDate('2025-01-15');

      expect(result).toEqual(records);
      expect(mockAttendanceService.getAttendanceByDate).toHaveBeenCalledWith(
        new Date('2025-01-15'),
      );
    });
  });

  describe('getSummary', () => {
    it('should return attendance summary for an employee for a month', async () => {
      const summary = {
        total_days: 22,
        present_days: 20,
        absent_days: 2,
        late_days: 1,
        total_hours: 10800,
        overtime_hours: 600,
      };
      mockAttendanceService.getAttendanceSummary.mockResolvedValue(summary);

      const result = await controller.getSummary('emp-123', '2025-01');

      expect(result).toEqual(summary);
      expect(mockAttendanceService.getAttendanceSummary).toHaveBeenCalledWith('emp-123', '2025-01');
    });
  });
});
