import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payroll, PayrollStatus } from '../entities/payroll.entity';
import { AttendanceService } from './attendance.service';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Payroll)
    private payrollRepository: Repository<Payroll>,
    private attendanceService: AttendanceService,
  ) {}

  async calculatePayroll(employeeId: string, period: string, baseSalary: number): Promise<Payroll> {
    // Check if payroll already exists
    const existing = await this.payrollRepository.findOne({
      where: {
        employee_id: employeeId,
        period: period,
      },
    });

    if (existing && existing.status !== PayrollStatus.DRAFT) {
      throw new Error('Payroll already exists and is not in draft status');
    }

    // Get attendance summary
    const attendanceSummary = await this.attendanceService.getAttendanceSummary(employeeId, period);

    // Calculate overtime pay (assuming hourly rate = monthly salary / 160)
    const hourlyRate = baseSalary / 160;
    const overtimeRate = hourlyRate * 1.5; // 1.5x for overtime
    const overtimePay = (attendanceSummary.overtime_hours / 60) * overtimeRate;

    // Calculate net salary (simplified)
    const grossSalary = baseSalary + overtimePay;
    const tax = grossSalary * 0.15; // 15% tax example
    const netSalary = grossSalary - tax;

    const payroll =
      existing ||
      this.payrollRepository.create({
        employee_id: employeeId,
        period: period,
      });

    payroll.base_salary = baseSalary;
    payroll.overtime_pay = overtimePay;
    payroll.tax = tax;
    payroll.net_salary = netSalary;
    payroll.working_days = attendanceSummary.present_days;
    payroll.absent_days = attendanceSummary.absent_days;
    payroll.overtime_hours = attendanceSummary.overtime_hours;
    payroll.status = PayrollStatus.CALCULATED;

    const [year, month] = period.split('-');
    const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    payroll.pay_date = new Date(parseInt(year), parseInt(month) - 1, lastDayOfMonth);

    return this.payrollRepository.save(payroll);
  }

  async approvePayroll(id: string): Promise<Payroll> {
    const payroll = await this.payrollRepository.findOne({ where: { id } });

    if (!payroll) {
      throw new NotFoundException(`Payroll with ID ${id} not found`);
    }

    payroll.status = PayrollStatus.APPROVED;

    return this.payrollRepository.save(payroll);
  }

  async markAsPaid(id: string): Promise<Payroll> {
    const payroll = await this.payrollRepository.findOne({ where: { id } });

    if (!payroll) {
      throw new NotFoundException(`Payroll with ID ${id} not found`);
    }

    if (payroll.status !== PayrollStatus.APPROVED) {
      throw new Error('Payroll must be approved before marking as paid');
    }

    payroll.status = PayrollStatus.PAID;

    return this.payrollRepository.save(payroll);
  }

  async getPayrollByEmployee(employeeId: string, year?: number): Promise<Payroll[]> {
    const query = this.payrollRepository
      .createQueryBuilder('payroll')
      .where('payroll.employee_id = :employeeId', { employeeId });

    if (year) {
      query.andWhere('payroll.period LIKE :year', { year: `${year}-%` });
    }

    return query.orderBy('payroll.period', 'DESC').getMany();
  }

  async getPayrollByPeriod(period: string): Promise<Payroll[]> {
    return this.payrollRepository.find({
      where: { period },
      relations: ['employee'],
      order: { employee_id: 'ASC' },
    });
  }

  async getTotalPayrollCost(period: string): Promise<{
    total_gross: number;
    total_net: number;
    total_tax: number;
    employee_count: number;
  }> {
    const payrolls = await this.getPayrollByPeriod(period);

    const summary = {
      total_gross: 0,
      total_net: 0,
      total_tax: 0,
      employee_count: payrolls.length,
    };

    payrolls.forEach((payroll) => {
      const gross =
        Number(payroll.base_salary) +
        Number(payroll.overtime_pay) +
        Number(payroll.bonuses) +
        Number(payroll.allowances);

      summary.total_gross += gross;
      summary.total_net += Number(payroll.net_salary);
      summary.total_tax += Number(payroll.tax);
    });

    return summary;
  }
}
