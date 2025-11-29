import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { Employee, EmploymentStatus, EmploymentType } from '../entities/employee.entity';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let repository: jest.Mocked<Repository<Employee>>;

  const mockEmployee: Partial<Employee> = {
    id: 'employee-uuid',
    user_id: 'user-uuid',
    employee_number: 'EMP2501',
    first_name: 'John',
    last_name: 'Doe',
    middle_name: null,
    email: 'john.doe@example.com',
    phone: '+1234567890',
    date_of_birth: new Date('1990-01-01'),
    gender: 'male',
    address: '123 Main St',
    department_id: 'dept-uuid',
    position_id: 'position-uuid',
    manager_id: null,
    employment_type: EmploymentType.FULL_TIME,
    employment_status: EmploymentStatus.ACTIVE,
    hire_date: new Date('2020-01-01'),
    termination_date: null,
    base_salary: 50000,
    salary_period: 'monthly',
    bank_account: null,
    tax_id: null,
    emergency_contact: {},
    metadata: {},
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        {
          provide: getRepositoryToken(Employee),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
    repository = module.get(getRepositoryToken(Employee));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all employees without filters', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEmployee]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAll();

      expect(result).toEqual([mockEmployee]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('employee.deleted_at IS NULL');
    });

    it('should filter by department_id', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEmployee]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findAll({ department_id: 'dept-uuid' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'employee.department_id = :departmentId',
        { departmentId: 'dept-uuid' },
      );
    });

    it('should filter by position_id', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEmployee]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findAll({ position_id: 'position-uuid' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('employee.position_id = :positionId', {
        positionId: 'position-uuid',
      });
    });

    it('should filter by employment_status', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEmployee]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findAll({ employment_status: EmploymentStatus.ACTIVE });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'employee.employment_status = :status',
        {
          status: EmploymentStatus.ACTIVE,
        },
      );
    });
  });

  describe('findOne', () => {
    it('should return employee when found', async () => {
      repository.findOne.mockResolvedValue(mockEmployee as Employee);

      const result = await service.findOne('employee-uuid');

      expect(result).toEqual(mockEmployee);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'employee-uuid' },
        relations: ['department', 'position'],
      });
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return employee when found by employee number', async () => {
      repository.findOne.mockResolvedValue(mockEmployee as Employee);

      const result = await service.findByEmployeeNumber('EMP2501');

      expect(result).toEqual(mockEmployee);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { employee_number: 'EMP2501' },
        relations: ['department', 'position'],
      });
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findByEmployeeNumber('INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUserId', () => {
    it('should return employee when found by user ID', async () => {
      repository.findOne.mockResolvedValue(mockEmployee as Employee);

      const result = await service.findByUserId('user-uuid');

      expect(result).toEqual(mockEmployee);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { user_id: 'user-uuid' },
        relations: ['department', 'position'],
      });
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findByUserId('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActiveEmployees', () => {
    it('should return only active employees', async () => {
      repository.find.mockResolvedValue([mockEmployee] as Employee[]);

      const result = await service.getActiveEmployees();

      expect(result).toEqual([mockEmployee]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { employment_status: EmploymentStatus.ACTIVE },
        relations: ['department', 'position'],
        order: { last_name: 'ASC' },
      });
    });
  });

  describe('getEmployeesByDepartment', () => {
    it('should return employees by department', async () => {
      repository.find.mockResolvedValue([mockEmployee] as Employee[]);

      const result = await service.getEmployeesByDepartment('dept-uuid');

      expect(result).toEqual([mockEmployee]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { department_id: 'dept-uuid' },
        relations: ['position'],
        order: { last_name: 'ASC' },
      });
    });
  });

  describe('getEmployeesByManager', () => {
    it('should return employees by manager', async () => {
      repository.find.mockResolvedValue([mockEmployee] as Employee[]);

      const result = await service.getEmployeesByManager('manager-uuid');

      expect(result).toEqual([mockEmployee]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { manager_id: 'manager-uuid' },
        relations: ['department', 'position'],
        order: { last_name: 'ASC' },
      });
    });
  });

  describe('updateEmploymentStatus', () => {
    it('should update employment status to ACTIVE', async () => {
      repository.findOne.mockResolvedValue({ ...mockEmployee } as Employee);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Employee));

      const result = await service.updateEmploymentStatus('employee-uuid', EmploymentStatus.ACTIVE);

      expect(result.employment_status).toBe(EmploymentStatus.ACTIVE);
    });

    it('should set termination date when status is TERMINATED', async () => {
      repository.findOne.mockResolvedValue({ ...mockEmployee } as Employee);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Employee));

      const result = await service.updateEmploymentStatus(
        'employee-uuid',
        EmploymentStatus.TERMINATED,
      );

      expect(result.employment_status).toBe(EmploymentStatus.TERMINATED);
      expect(result.termination_date).toBeDefined();
    });

    it('should set termination date when status is RESIGNED', async () => {
      repository.findOne.mockResolvedValue({ ...mockEmployee } as Employee);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Employee));

      const result = await service.updateEmploymentStatus(
        'employee-uuid',
        EmploymentStatus.RESIGNED,
      );

      expect(result.employment_status).toBe(EmploymentStatus.RESIGNED);
      expect(result.termination_date).toBeDefined();
    });

    it('should use provided termination date when given', async () => {
      const customDate = new Date('2025-12-31');
      repository.findOne.mockResolvedValue({ ...mockEmployee } as Employee);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Employee));

      const result = await service.updateEmploymentStatus(
        'employee-uuid',
        EmploymentStatus.TERMINATED,
        customDate,
      );

      expect(result.termination_date).toEqual(customDate);
    });

    it('should throw NotFoundException when employee not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateEmploymentStatus('non-existent', EmploymentStatus.ACTIVE),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
