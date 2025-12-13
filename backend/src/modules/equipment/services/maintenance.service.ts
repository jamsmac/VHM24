import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComponentMaintenance, MaintenanceType } from '../entities/component-maintenance.entity';
import { CreateMaintenanceDto, MaintenanceFiltersDto } from '../dto/maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(ComponentMaintenance)
    private readonly maintenanceRepository: Repository<ComponentMaintenance>,
  ) {}

  async create(dto: CreateMaintenanceDto): Promise<ComponentMaintenance> {
    const maintenance = this.maintenanceRepository.create({
      ...dto,
      performed_at: new Date(),
    });

    // Calculate total cost
    const laborCost = dto.labor_cost || 0;
    const partsCost = dto.parts_cost || 0;
    maintenance.total_cost = laborCost + partsCost;

    return this.maintenanceRepository.save(maintenance);
  }

  async findAll(filters: MaintenanceFiltersDto): Promise<ComponentMaintenance[]> {
    const query = this.maintenanceRepository
      .createQueryBuilder('maintenance')
      .leftJoinAndSelect('maintenance.component', 'component')
      .leftJoinAndSelect('component.machine', 'machine')
      .leftJoinAndSelect('maintenance.performed_by', 'user');

    if (filters.component_id) {
      query.andWhere('maintenance.component_id = :componentId', {
        componentId: filters.component_id,
      });
    }

    if (filters.maintenance_type) {
      query.andWhere('maintenance.maintenance_type = :type', {
        type: filters.maintenance_type,
      });
    }

    if (filters.from_date && filters.to_date) {
      query.andWhere('maintenance.performed_at BETWEEN :from AND :to', {
        from: new Date(filters.from_date),
        to: new Date(filters.to_date),
      });
    } else if (filters.from_date) {
      query.andWhere('maintenance.performed_at >= :from', {
        from: new Date(filters.from_date),
      });
    } else if (filters.to_date) {
      query.andWhere('maintenance.performed_at <= :to', {
        to: new Date(filters.to_date),
      });
    }

    query.orderBy('maintenance.performed_at', 'DESC');

    return query.getMany();
  }

  async findOne(id: string): Promise<ComponentMaintenance> {
    const maintenance = await this.maintenanceRepository.findOne({
      where: { id },
      relations: ['component', 'component.machine', 'performed_by'],
    });

    if (!maintenance) {
      throw new NotFoundException(`Maintenance record ${id} not found`);
    }

    return maintenance;
  }

  async getComponentHistory(componentId: string): Promise<ComponentMaintenance[]> {
    return this.maintenanceRepository.find({
      where: { component_id: componentId },
      relations: ['performed_by'],
      order: { performed_at: 'DESC' },
    });
  }

  async getMachineMaintenanceHistory(
    machineId: string,
    maintenanceType?: MaintenanceType,
  ): Promise<ComponentMaintenance[]> {
    const query = this.maintenanceRepository
      .createQueryBuilder('maintenance')
      .leftJoinAndSelect('maintenance.component', 'component')
      .leftJoinAndSelect('maintenance.performed_by', 'user')
      .where('component.machine_id = :machineId', { machineId });

    if (maintenanceType) {
      query.andWhere('maintenance.maintenance_type = :type', {
        type: maintenanceType,
      });
    }

    query.orderBy('maintenance.performed_at', 'DESC');

    return query.getMany();
  }

  async getStats(componentId?: string, fromDate?: string, toDate?: string) {
    const query = this.maintenanceRepository.createQueryBuilder('maintenance');

    if (componentId) {
      query.where('maintenance.component_id = :componentId', { componentId });
    }

    if (fromDate && toDate) {
      query.andWhere('maintenance.performed_at BETWEEN :from AND :to', {
        from: new Date(fromDate),
        to: new Date(toDate),
      });
    }

    const total = await query.getCount();

    const byType = await query
      .select('maintenance.maintenance_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('maintenance.maintenance_type')
      .getRawMany();

    const costs = await query
      .select('SUM(maintenance.total_cost)', 'total_cost')
      .addSelect('SUM(maintenance.labor_cost)', 'total_labor_cost')
      .addSelect('SUM(maintenance.parts_cost)', 'total_parts_cost')
      .getRawOne();

    const avgDuration = await query
      .select('AVG(maintenance.duration_minutes)', 'avg_duration')
      .where('maintenance.duration_minutes IS NOT NULL')
      .getRawOne();

    const successRate = await query
      .select(
        'SUM(CASE WHEN maintenance.is_successful THEN 1 ELSE 0 END)::float / COUNT(*) * 100',
        'success_rate',
      )
      .getRawOne();

    return {
      total,
      by_type: byType.map((item) => ({
        type: item.type,
        count: parseInt(item.count),
      })),
      total_cost: parseFloat(costs?.total_cost) || 0,
      total_labor_cost: parseFloat(costs?.total_labor_cost) || 0,
      total_parts_cost: parseFloat(costs?.total_parts_cost) || 0,
      avg_duration_minutes: parseFloat(avgDuration?.avg_duration) || 0,
      success_rate: parseFloat(successRate?.success_rate) || 0,
    };
  }
}
