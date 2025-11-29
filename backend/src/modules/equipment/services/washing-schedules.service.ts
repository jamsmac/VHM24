import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { WashingSchedule, WashingFrequency } from '../entities/washing-schedule.entity';
import {
  CreateWashingScheduleDto,
  UpdateWashingScheduleDto,
  CompleteWashingDto,
} from '../dto/washing-schedule.dto';

@Injectable()
export class WashingSchedulesService {
  constructor(
    @InjectRepository(WashingSchedule)
    private readonly scheduleRepository: Repository<WashingSchedule>,
  ) {}

  async create(dto: CreateWashingScheduleDto): Promise<WashingSchedule> {
    const schedule = this.scheduleRepository.create(dto);
    return this.scheduleRepository.save(schedule);
  }

  async findAll(machineId?: string, isActive?: boolean): Promise<WashingSchedule[]> {
    const query = this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.machine', 'machine');

    if (machineId) {
      query.andWhere('schedule.machine_id = :machineId', { machineId });
    }

    if (isActive !== undefined) {
      query.andWhere('schedule.is_active = :isActive', { isActive });
    }

    query.orderBy('schedule.next_wash_date', 'ASC');

    return query.getMany();
  }

  async findOne(id: string): Promise<WashingSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: ['machine'],
    });

    if (!schedule) {
      throw new NotFoundException(`Washing schedule ${id} not found`);
    }

    return schedule;
  }

  async update(id: string, dto: UpdateWashingScheduleDto): Promise<WashingSchedule> {
    const schedule = await this.findOne(id);

    Object.assign(schedule, dto);

    return this.scheduleRepository.save(schedule);
  }

  async remove(id: string): Promise<void> {
    const schedule = await this.findOne(id);
    await this.scheduleRepository.softRemove(schedule);
  }

  async completeWashing(id: string, dto: CompleteWashingDto): Promise<WashingSchedule> {
    const schedule = await this.findOne(id);

    schedule.last_wash_date = new Date();
    schedule.last_washed_by_user_id = dto.performed_by_user_id;
    schedule.last_wash_task_id = dto.task_id || null;

    // Calculate next wash date
    schedule.next_wash_date = this.calculateNextWashDate(
      schedule.frequency,
      schedule.interval_days ?? undefined,
    );

    if (dto.notes) {
      schedule.notes = `${new Date().toISOString()}: ${dto.notes}\n${schedule.notes || ''}`;
    }

    return this.scheduleRepository.save(schedule);
  }

  async getOverdueSchedules(): Promise<WashingSchedule[]> {
    const today = new Date();

    return this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.machine', 'machine')
      .where('schedule.next_wash_date < :today', { today })
      .andWhere('schedule.is_active = :active', { active: true })
      .orderBy('schedule.next_wash_date', 'ASC')
      .getMany();
  }

  async getUpcomingSchedules(daysAhead: number = 7): Promise<WashingSchedule[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.machine', 'machine')
      .where('schedule.next_wash_date >= :today', { today })
      .andWhere('schedule.next_wash_date <= :futureDate', { futureDate })
      .andWhere('schedule.is_active = :active', { active: true })
      .orderBy('schedule.next_wash_date', 'ASC')
      .getMany();
  }

  private calculateNextWashDate(frequency: WashingFrequency, intervalDays?: number): Date {
    const nextDate = new Date();

    switch (frequency) {
      case WashingFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case WashingFrequency.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case WashingFrequency.BIWEEKLY:
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case WashingFrequency.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case WashingFrequency.CUSTOM:
        if (intervalDays) {
          nextDate.setDate(nextDate.getDate() + intervalDays);
        } else {
          nextDate.setDate(nextDate.getDate() + 7); // Default to weekly
        }
        break;
    }

    return nextDate;
  }

  async getStats(machineId?: string) {
    const query = this.scheduleRepository.createQueryBuilder('schedule');

    if (machineId) {
      query.where('schedule.machine_id = :machineId', { machineId });
    }

    const total = await query.getCount();
    const active = await query
      .clone()
      .andWhere('schedule.is_active = :active', { active: true })
      .getCount();

    const overdue = await this.scheduleRepository.count({
      where: {
        next_wash_date: LessThan(new Date()),
        is_active: true,
      },
    });

    const byFrequency = await query
      .select('schedule.frequency', 'frequency')
      .addSelect('COUNT(*)', 'count')
      .groupBy('schedule.frequency')
      .getRawMany();

    return {
      total,
      active,
      overdue,
      by_frequency: byFrequency.map((item) => ({
        frequency: item.frequency,
        count: parseInt(item.count),
      })),
    };
  }
}
