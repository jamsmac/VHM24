import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { AttendanceService } from './attendance.service';
import { Payroll, PayrollStatus } from '../entities/payroll.entity';

describe('PayrollService', () => {
  let service: PayrollService;
  let repository: jest.Mocked<Repository<Payroll>>;
  let attendanceService: jest.Mocked<AttendanceService>;

  const mockPayroll: Partial<Payroll> = {
    id: 'payroll-uuid',
    employee_id: 'employee-uuid',
    period: '2025-01',
    pay_date: new Date('2025-01-31'),
    base_salary: 50000,
    overtime_pay: 1500,
    bonuses: 0,
    allowances: 0,
    deductions: 0,
    tax: 7725,
    net_salary: 43775,
    status: PayrollStatus.CALCULATED,
    working_days: 22,
    absent_days: 0,
    overtime_hours: 120,
    notes: null,
    metadata: {},
  };

  const mockAttendanceSummary = {
    total_days: 22,
    present_days: 22,
    absent_days: 0,
    late_days: 0,
    total_hours: 10560,
    overtime_hours: 120,
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockAttendanceService = {
      getAttendanceSummary: jest.fn().mockResolvedValue(mockAttendanceSummary),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        {
          provide: getRepositoryToken(Payroll),
          useValue: mockRepository,
        },
        {
          provide: AttendanceService,
          useValue: mockAttendanceService,
        },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
    repository = module.get(getRepositoryToken(Payroll));
    attendanceService = module.get(AttendanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculatePayroll', () => {
    it('should calculate payroll for an employee', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockPayroll as Payroll);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Payroll));

      const result = await service.calculatePayroll('employee-uuid', '2025-01', 50000);

      expect(result.status).toBe(PayrollStatus.CALCULATED);
      expect(attendanceService.getAttendanceSummary).toHaveBeenCalledWith(
        'employee-uuid',
        '2025-01',
      );
      expect(repository.save).toHaveBeenCalled();
    });

    it('should update existing draft payroll', async () => {
      const draftPayroll = { ...mockPayroll, status: PayrollStatus.DRAFT };
      repository.findOne.mockResolvedValue(draftPayroll as Payroll);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Payroll));

      const result = await service.calculatePayroll('employee-uuid', '2025-01', 50000);

      expect(result).toBeDefined();
    });

    it('should throw error if payroll exists and is not draft', async () => {
      repository.findOne.mockResolvedValue({
        ...mockPayroll,
        status: PayrollStatus.APPROVED,
      } as Payroll);

      await expect(service.calculatePayroll('employee-uuid', '2025-01', 50000)).rejects.toThrow(
        'Payroll already exists and is not in draft status',
      );
    });

    it('should calculate overtime pay correctly', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockPayroll as Payroll);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Payroll));

      const result = await service.calculatePayroll('employee-uuid', '2025-01', 50000);

      expect(result.overtime_pay).toBeGreaterThan(0);
    });

    it('should calculate tax and net salary', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockPayroll as Payroll);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Payroll));

      const result = await service.calculatePayroll('employee-uuid', '2025-01', 50000);

      expect(result.tax).toBeGreaterThan(0);
      expect(result.net_salary).toBeLessThan(50000);
    });

    it('should set correct pay date for the month', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockPayroll as Payroll);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Payroll));

      const result = await service.calculatePayroll('employee-uuid', '2025-02', 50000);

      expect(result.pay_date.getMonth()).toBe(1); // February (0-indexed)
    });
  });

  describe('approvePayroll', () => {
    it('should approve payroll', async () => {
      repository.findOne.mockResolvedValue(mockPayroll as Payroll);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Payroll));

      const result = await service.approvePayroll('payroll-uuid');

      expect(result.status).toBe(PayrollStatus.APPROVED);
    });

    it('should throw NotFoundException when payroll not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.approvePayroll('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsPaid', () => {
    it('should mark approved payroll as paid', async () => {
      repository.findOne.mockResolvedValue({
        ...mockPayroll,
        status: PayrollStatus.APPROVED,
      } as Payroll);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Payroll));

      const result = await service.markAsPaid('payroll-uuid');

      expect(result.status).toBe(PayrollStatus.PAID);
    });

    it('should throw NotFoundException when payroll not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.markAsPaid('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw error when payroll is not approved', async () => {
      repository.findOne.mockResolvedValue({
        ...mockPayroll,
        status: PayrollStatus.CALCULATED,
      } as Payroll);

      await expect(service.markAsPaid('payroll-uuid')).rejects.toThrow(
        'Payroll must be approved before marking as paid',
      );
    });
  });

  describe('getPayrollByEmployee', () => {
    it('should return payrolls for an employee', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPayroll]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getPayrollByEmployee('employee-uuid');

      expect(result).toEqual([mockPayroll]);
    });

    it('should filter by year when provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPayroll]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getPayrollByEmployee('employee-uuid', 2025);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('payroll.period LIKE :year', {
        year: '2025-%',
      });
    });
  });

  describe('getPayrollByPeriod', () => {
    it('should return all payrolls for a period', async () => {
      repository.find.mockResolvedValue([mockPayroll] as Payroll[]);

      const result = await service.getPayrollByPeriod('2025-01');

      expect(result).toEqual([mockPayroll]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { period: '2025-01' },
        relations: ['employee'],
        order: { employee_id: 'ASC' },
      });
    });
  });

  describe('getTotalPayrollCost', () => {
    it('should calculate total payroll cost for a period', async () => {
      const payrolls = [
        {
          ...mockPayroll,
          base_salary: 50000,
          overtime_pay: 1000,
          bonuses: 500,
          allowances: 200,
          net_salary: 43000,
          tax: 8700,
        },
        {
          ...mockPayroll,
          base_salary: 60000,
          overtime_pay: 2000,
          bonuses: 1000,
          allowances: 300,
          net_salary: 53000,
          tax: 10300,
        },
      ];
      repository.find.mockResolvedValue(payrolls as Payroll[]);

      const result = await service.getTotalPayrollCost('2025-01');

      expect(result.employee_count).toBe(2);
      expect(result.total_gross).toBe(115000); // (50000+1000+500+200) + (60000+2000+1000+300)
      expect(result.total_net).toBe(96000); // 43000 + 53000
      expect(result.total_tax).toBe(19000); // 8700 + 10300
    });

    it('should return zero totals when no payrolls found', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.getTotalPayrollCost('2025-01');

      expect(result.employee_count).toBe(0);
      expect(result.total_gross).toBe(0);
      expect(result.total_net).toBe(0);
      expect(result.total_tax).toBe(0);
    });
  });
});
