import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmploymentStatus } from '../entities/employee.entity';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async findAll(filters?: {
    department_id?: string;
    position_id?: string;
    employment_status?: EmploymentStatus;
  }): Promise<Employee[]> {
    const query = this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.position', 'position')
      .where('employee.deleted_at IS NULL');

    if (filters?.department_id) {
      query.andWhere('employee.department_id = :departmentId', {
        departmentId: filters.department_id,
      });
    }

    if (filters?.position_id) {
      query.andWhere('employee.position_id = :positionId', {
        positionId: filters.position_id,
      });
    }

    if (filters?.employment_status) {
      query.andWhere('employee.employment_status = :status', {
        status: filters.employment_status,
      });
    }

    return query.orderBy('employee.last_name', 'ASC').getMany();
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['department', 'position'],
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { employee_number: employeeNumber },
      relations: ['department', 'position'],
    });

    if (!employee) {
      throw new NotFoundException(`Employee with number ${employeeNumber} not found`);
    }

    return employee;
  }

  async findByUserId(userId: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { user_id: userId },
      relations: ['department', 'position'],
    });

    if (!employee) {
      throw new NotFoundException(`Employee with user ID ${userId} not found`);
    }

    return employee;
  }

  async getActiveEmployees(): Promise<Employee[]> {
    return this.employeeRepository.find({
      where: { employment_status: EmploymentStatus.ACTIVE },
      relations: ['department', 'position'],
      order: { last_name: 'ASC' },
    });
  }

  async getEmployeesByDepartment(departmentId: string): Promise<Employee[]> {
    return this.employeeRepository.find({
      where: { department_id: departmentId },
      relations: ['position'],
      order: { last_name: 'ASC' },
    });
  }

  async getEmployeesByManager(managerId: string): Promise<Employee[]> {
    return this.employeeRepository.find({
      where: { manager_id: managerId },
      relations: ['department', 'position'],
      order: { last_name: 'ASC' },
    });
  }

  async updateEmploymentStatus(
    id: string,
    status: EmploymentStatus,
    terminationDate?: Date,
  ): Promise<Employee> {
    const employee = await this.findOne(id);

    employee.employment_status = status;

    if (status === EmploymentStatus.TERMINATED || status === EmploymentStatus.RESIGNED) {
      employee.termination_date = terminationDate || new Date();
    }

    return this.employeeRepository.save(employee);
  }

  private async generateEmployeeNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `EMP${year}${random}`;
  }
}
