import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LeaveRequest, LeaveStatus, LeaveType } from '../entities/leave-request.entity';
import { differenceInDays } from 'date-fns';

@Injectable()
export class LeaveRequestService {
  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRepository: Repository<LeaveRequest>,
  ) {}

  async createLeaveRequest(data: {
    employee_id: string;
    leave_type: LeaveType;
    start_date: Date;
    end_date: Date;
    reason: string;
    metadata?: Record<string, any>;
  }): Promise<LeaveRequest> {
    // Calculate total days
    const totalDays = differenceInDays(new Date(data.end_date), new Date(data.start_date)) + 1;

    if (totalDays <= 0) {
      throw new BadRequestException('Invalid date range');
    }

    // Check for overlapping leave requests
    const overlapping = await this.leaveRepository
      .createQueryBuilder('leave')
      .where('leave.employee_id = :employeeId', { employeeId: data.employee_id })
      .andWhere('leave.status IN (:...statuses)', {
        statuses: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
      })
      .andWhere(
        '(leave.start_date BETWEEN :start AND :end OR leave.end_date BETWEEN :start AND :end)',
        { start: data.start_date, end: data.end_date },
      )
      .getOne();

    if (overlapping) {
      throw new BadRequestException('Overlapping leave request exists');
    }

    const leave = this.leaveRepository.create({
      ...data,
      total_days: totalDays,
    });

    return this.leaveRepository.save(leave);
  }

  async approveLeave(id: string, approvedById: string): Promise<LeaveRequest> {
    const leave = await this.leaveRepository.findOne({ where: { id } });

    if (!leave) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave request is not pending');
    }

    leave.status = LeaveStatus.APPROVED;
    leave.approved_by_id = approvedById;
    leave.approved_at = new Date();

    return this.leaveRepository.save(leave);
  }

  async rejectLeave(
    id: string,
    approvedById: string,
    rejectionReason: string,
  ): Promise<LeaveRequest> {
    const leave = await this.leaveRepository.findOne({ where: { id } });

    if (!leave) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave request is not pending');
    }

    leave.status = LeaveStatus.REJECTED;
    leave.approved_by_id = approvedById;
    leave.approved_at = new Date();
    leave.rejection_reason = rejectionReason;

    return this.leaveRepository.save(leave);
  }

  async cancelLeave(id: string): Promise<LeaveRequest> {
    const leave = await this.leaveRepository.findOne({ where: { id } });

    if (!leave) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    leave.status = LeaveStatus.CANCELLED;

    return this.leaveRepository.save(leave);
  }

  async getLeavesByEmployee(employeeId: string, year?: number): Promise<LeaveRequest[]> {
    const query = this.leaveRepository
      .createQueryBuilder('leave')
      .where('leave.employee_id = :employeeId', { employeeId });

    if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      query.andWhere('leave.start_date BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      });
    }

    return query.orderBy('leave.start_date', 'DESC').getMany();
  }

  async getPendingLeaves(): Promise<LeaveRequest[]> {
    return this.leaveRepository.find({
      where: { status: LeaveStatus.PENDING },
      relations: ['employee'],
      order: { created_at: 'ASC' },
    });
  }

  async getLeaveBalance(
    employeeId: string,
    year: number,
  ): Promise<
    {
      leave_type: LeaveType;
      total_days_taken: number;
      total_days_pending: number;
    }[]
  > {
    const leaves = await this.getLeavesByEmployee(employeeId, year);

    const balance: Record<string, any> = {};

    Object.values(LeaveType).forEach((type) => {
      balance[type] = {
        leave_type: type,
        total_days_taken: 0,
        total_days_pending: 0,
      };
    });

    leaves.forEach((leave) => {
      if (leave.status === LeaveStatus.APPROVED) {
        balance[leave.leave_type].total_days_taken += Number(leave.total_days);
      } else if (leave.status === LeaveStatus.PENDING) {
        balance[leave.leave_type].total_days_pending += Number(leave.total_days);
      }
    });

    return Object.values(balance);
  }
}
