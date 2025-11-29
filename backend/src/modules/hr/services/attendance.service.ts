import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance, AttendanceStatus } from '../entities/attendance.entity';
import { differenceInMinutes } from 'date-fns';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  async checkIn(data: {
    employee_id: string;
    date: Date;
    location?: string;
    metadata?: Record<string, any>;
  }): Promise<Attendance> {
    // Check if already checked in today
    const existing = await this.attendanceRepository.findOne({
      where: {
        employee_id: data.employee_id,
        date: data.date,
      },
    });

    if (existing && existing.check_in) {
      throw new BadRequestException('Already checked in today');
    }

    const attendance =
      existing ||
      this.attendanceRepository.create({
        employee_id: data.employee_id,
        date: data.date,
      });

    attendance.check_in = new Date();
    attendance.location = data.location ?? null;
    attendance.metadata = data.metadata || {};
    attendance.status = AttendanceStatus.PRESENT;

    return this.attendanceRepository.save(attendance);
  }

  async checkOut(employeeId: string, date: Date): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: {
        employee_id: employeeId,
        date: date,
      },
    });

    if (!attendance || !attendance.check_in) {
      throw new BadRequestException('No check-in found for today');
    }

    if (attendance.check_out) {
      throw new BadRequestException('Already checked out');
    }

    attendance.check_out = new Date();

    // Calculate total hours
    const totalMinutes = differenceInMinutes(attendance.check_out, new Date(attendance.check_in));
    attendance.total_hours = totalMinutes - attendance.break_duration;

    // Calculate overtime (assuming 8 hours = 480 minutes standard)
    const standardMinutes = 480;
    if (attendance.total_hours > standardMinutes) {
      attendance.overtime_hours = attendance.total_hours - standardMinutes;
    }

    return this.attendanceRepository.save(attendance);
  }

  async getAttendanceByEmployee(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Attendance[]> {
    return this.attendanceRepository.find({
      where: {
        employee_id: employeeId,
        date: Between(startDate, endDate),
      },
      order: { date: 'DESC' },
    });
  }

  async getAttendanceByDate(date: Date): Promise<Attendance[]> {
    return this.attendanceRepository.find({
      where: { date },
      relations: ['employee'],
      order: { check_in: 'ASC' },
    });
  }

  async markAbsent(employeeId: string, date: Date, notes?: string): Promise<Attendance> {
    const existing = await this.attendanceRepository.findOne({
      where: {
        employee_id: employeeId,
        date: date,
      },
    });

    if (existing) {
      existing.status = AttendanceStatus.ABSENT;
      existing.notes = notes ?? null;
      return this.attendanceRepository.save(existing);
    }

    const attendance = this.attendanceRepository.create({
      employee_id: employeeId,
      date: date,
      status: AttendanceStatus.ABSENT,
      notes: notes,
    });

    return this.attendanceRepository.save(attendance);
  }

  async getAttendanceSummary(
    employeeId: string,
    month: string,
  ): Promise<{
    total_days: number;
    present_days: number;
    absent_days: number;
    late_days: number;
    total_hours: number;
    overtime_hours: number;
  }> {
    const [year, monthNum] = month.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0);

    const attendances = await this.getAttendanceByEmployee(employeeId, startDate, endDate);

    const summary = {
      total_days: attendances.length,
      present_days: 0,
      absent_days: 0,
      late_days: 0,
      total_hours: 0,
      overtime_hours: 0,
    };

    attendances.forEach((att) => {
      if (att.status === AttendanceStatus.PRESENT) summary.present_days++;
      if (att.status === AttendanceStatus.ABSENT) summary.absent_days++;
      if (att.status === AttendanceStatus.LATE) summary.late_days++;
      summary.total_hours += att.total_hours;
      summary.overtime_hours += att.overtime_hours;
    });

    return summary;
  }
}
