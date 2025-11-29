import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  EquipmentComponent,
  ComponentType,
  ComponentStatus,
} from '../entities/equipment-component.entity';
import { CreateComponentDto, UpdateComponentDto, ReplaceComponentDto } from '../dto/component.dto';

@Injectable()
export class ComponentsService {
  constructor(
    @InjectRepository(EquipmentComponent)
    private readonly componentRepository: Repository<EquipmentComponent>,
  ) {}

  async create(dto: CreateComponentDto): Promise<EquipmentComponent> {
    const component = this.componentRepository.create(dto);

    // Calculate next maintenance date if interval provided
    if (dto.maintenance_interval_days && dto.installation_date) {
      const nextDate = new Date(dto.installation_date);
      nextDate.setDate(nextDate.getDate() + dto.maintenance_interval_days);
      component.next_maintenance_date = nextDate;
    }

    return this.componentRepository.save(component);
  }

  async findAll(
    machineId?: string,
    componentType?: ComponentType,
    status?: ComponentStatus,
  ): Promise<EquipmentComponent[]> {
    const query = this.componentRepository
      .createQueryBuilder('component')
      .leftJoinAndSelect('component.machine', 'machine');

    if (machineId) {
      query.andWhere('component.machine_id = :machineId', { machineId });
    }

    if (componentType) {
      query.andWhere('component.component_type = :componentType', {
        componentType,
      });
    }

    if (status) {
      query.andWhere('component.status = :status', { status });
    }

    query.orderBy('component.installation_date', 'DESC');

    return query.getMany();
  }

  async findOne(id: string): Promise<EquipmentComponent> {
    const component = await this.componentRepository.findOne({
      where: { id },
      relations: ['machine'],
    });

    if (!component) {
      throw new NotFoundException(`Component ${id} not found`);
    }

    return component;
  }

  async update(id: string, dto: UpdateComponentDto): Promise<EquipmentComponent> {
    const component = await this.findOne(id);

    Object.assign(component, dto);

    // Recalculate next maintenance if interval changed
    if (
      dto.maintenance_interval_days &&
      (dto.last_maintenance_date || component.last_maintenance_date)
    ) {
      const baseDate = dto.last_maintenance_date || component.last_maintenance_date;
      if (baseDate) {
        const nextDate = new Date(baseDate);
        nextDate.setDate(nextDate.getDate() + dto.maintenance_interval_days);
        component.next_maintenance_date = nextDate;
      }
    }

    return this.componentRepository.save(component);
  }

  async remove(id: string): Promise<void> {
    const component = await this.findOne(id);
    await this.componentRepository.softRemove(component);
  }

  async replaceComponent(
    oldComponentId: string,
    dto: ReplaceComponentDto,
  ): Promise<EquipmentComponent> {
    const oldComponent = await this.findOne(oldComponentId);
    const newComponent = await this.findOne(dto.new_component_id);

    // Mark old component as replaced
    oldComponent.status = ComponentStatus.REPLACED;
    oldComponent.replacement_date = new Date();
    oldComponent.replaced_by_component_id = dto.new_component_id;
    oldComponent.notes = `Replaced: ${dto.reason}. ${oldComponent.notes || ''}`;

    // Link new component to old one
    newComponent.replaces_component_id = oldComponentId;

    await this.componentRepository.save(oldComponent);
    return this.componentRepository.save(newComponent);
  }

  async getComponentsNeedingMaintenance(): Promise<EquipmentComponent[]> {
    const today = new Date();

    return this.componentRepository
      .createQueryBuilder('component')
      .leftJoinAndSelect('component.machine', 'machine')
      .where('component.next_maintenance_date <= :today', { today })
      .andWhere('component.status != :replaced', {
        replaced: ComponentStatus.REPLACED,
      })
      .orderBy('component.next_maintenance_date', 'ASC')
      .getMany();
  }

  async getComponentsNearingLifetime(): Promise<EquipmentComponent[]> {
    return this.componentRepository
      .createQueryBuilder('component')
      .leftJoinAndSelect('component.machine', 'machine')
      .where('component.expected_lifetime_hours IS NOT NULL')
      .andWhere('component.working_hours >= component.expected_lifetime_hours * 0.9')
      .andWhere('component.status = :active', {
        active: ComponentStatus.ACTIVE,
      })
      .getMany();
  }

  async getComponentStats(machineId?: string) {
    const query = this.componentRepository.createQueryBuilder('component');

    if (machineId) {
      query.where('component.machine_id = :machineId', { machineId });
    }

    const total = await query.getCount();

    const byType = await query
      .select('component.component_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('component.component_type')
      .getRawMany();

    const byStatus = await query
      .select('component.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('component.status')
      .getRawMany();

    const needingMaintenance = await this.componentRepository.count({
      where: {
        next_maintenance_date: LessThan(new Date()),
        status: ComponentStatus.ACTIVE,
      },
    });

    return {
      total,
      by_type: byType.map((item) => ({
        type: item.type,
        count: parseInt(item.count),
      })),
      by_status: byStatus.map((item) => ({
        status: item.status,
        count: parseInt(item.count),
      })),
      needing_maintenance: needingMaintenance,
    };
  }
}
