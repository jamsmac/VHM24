import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Incident,
  IncidentStatus,
  IncidentType,
  IncidentPriority,
} from './entities/incident.entity';
import {
  CreateIncidentDto,
  UpdateIncidentDto,
  ResolveIncidentDto,
} from './dto/create-incident.dto';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
  ) {}

  /**
   * Создание инцидента
   */
  async create(dto: CreateIncidentDto): Promise<Incident> {
    const incident = this.incidentRepository.create({
      ...dto,
      status: IncidentStatus.OPEN,
      reported_at: new Date(),
    });

    return this.incidentRepository.save(incident);
  }

  /**
   * Получение всех инцидентов с фильтрацией
   */
  async findAll(
    status?: IncidentStatus,
    type?: IncidentType,
    machineId?: string,
    priority?: IncidentPriority,
    assignedToUserId?: string,
  ): Promise<Incident[]> {
    const query = this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.machine', 'machine')
      .leftJoinAndSelect('incident.reported_by', 'reported_by')
      .leftJoinAndSelect('incident.assigned_to', 'assigned_to');

    if (status) {
      query.andWhere('incident.status = :status', { status });
    }

    if (type) {
      query.andWhere('incident.incident_type = :type', { type });
    }

    if (machineId) {
      query.andWhere('incident.machine_id = :machineId', { machineId });
    }

    if (priority) {
      query.andWhere('incident.priority = :priority', { priority });
    }

    if (assignedToUserId) {
      query.andWhere('incident.assigned_to_user_id = :assignedToUserId', {
        assignedToUserId,
      });
    }

    query.orderBy('incident.priority', 'DESC').addOrderBy('incident.reported_at', 'DESC');

    return query.getMany();
  }

  /**
   * Получение инцидента по ID
   */
  async findOne(id: string): Promise<Incident> {
    const incident = await this.incidentRepository.findOne({
      where: { id },
      relations: ['machine', 'machine.location', 'reported_by', 'assigned_to'],
    });

    if (!incident) {
      throw new NotFoundException(`Инцидент с ID ${id} не найден`);
    }

    return incident;
  }

  /**
   * Обновление инцидента
   */
  async update(id: string, dto: UpdateIncidentDto): Promise<Incident> {
    const incident = await this.findOne(id);
    Object.assign(incident, dto);
    return this.incidentRepository.save(incident);
  }

  /**
   * Назначение инцидента специалисту
   */
  async assign(id: string, userId: string): Promise<Incident> {
    const incident = await this.findOne(id);

    if (incident.status !== IncidentStatus.OPEN) {
      throw new BadRequestException('Можно назначить только открытые инциденты');
    }

    incident.assigned_to_user_id = userId;
    incident.status = IncidentStatus.IN_PROGRESS;
    incident.started_at = new Date();

    return this.incidentRepository.save(incident);
  }

  /**
   * Решение инцидента
   */
  async resolve(id: string, dto: ResolveIncidentDto): Promise<Incident> {
    const incident = await this.findOne(id);

    if (incident.status === IncidentStatus.RESOLVED || incident.status === IncidentStatus.CLOSED) {
      throw new BadRequestException('Инцидент уже решен или закрыт');
    }

    incident.status = IncidentStatus.RESOLVED;
    incident.resolved_at = new Date();
    incident.resolution_notes = dto.resolution_notes;
    incident.repair_cost = dto.repair_cost || null;
    incident.repair_task_id = dto.repair_task_id || null;

    return this.incidentRepository.save(incident);
  }

  /**
   * Закрытие инцидента
   */
  async close(id: string): Promise<Incident> {
    const incident = await this.findOne(id);

    if (incident.status !== IncidentStatus.RESOLVED) {
      throw new BadRequestException('Можно закрыть только решенные инциденты');
    }

    incident.status = IncidentStatus.CLOSED;
    incident.closed_at = new Date();

    return this.incidentRepository.save(incident);
  }

  /**
   * Повторное открытие инцидента
   */
  async reopen(id: string, reason: string): Promise<Incident> {
    const incident = await this.findOne(id);

    if (incident.status !== IncidentStatus.CLOSED) {
      throw new BadRequestException('Можно переоткрыть только закрытые инциденты');
    }

    incident.status = IncidentStatus.OPEN;
    incident.resolved_at = null;
    incident.closed_at = null;

    // Добавляем причину переоткрытия в метаданные
    incident.metadata = {
      ...incident.metadata,
      reopen_reason: reason,
      reopened_at: new Date().toISOString(),
    };

    return this.incidentRepository.save(incident);
  }

  /**
   * Удаление инцидента
   */
  async remove(id: string): Promise<void> {
    const incident = await this.findOne(id);
    await this.incidentRepository.softRemove(incident);
  }

  /**
   * Статистика инцидентов
   */
  async getStats() {
    const total = await this.incidentRepository.count();

    const byStatus = await this.incidentRepository
      .createQueryBuilder('incident')
      .select('incident.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('incident.status')
      .getRawMany();

    const byType = await this.incidentRepository
      .createQueryBuilder('incident')
      .select('incident.incident_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('incident.incident_type')
      .getRawMany();

    const byPriority = await this.incidentRepository
      .createQueryBuilder('incident')
      .select('incident.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('incident.priority')
      .getRawMany();

    // Среднее время решения
    const avgResolutionTime = await this.incidentRepository
      .createQueryBuilder('incident')
      .select(
        'AVG(EXTRACT(EPOCH FROM (incident.resolved_at - incident.reported_at)))',
        'avg_seconds',
      )
      .where('incident.status = :status', { status: IncidentStatus.RESOLVED })
      .getRawOne();

    // Общая стоимость ремонтов
    const totalRepairCost = await this.incidentRepository
      .createQueryBuilder('incident')
      .select('SUM(incident.repair_cost)', 'total')
      .getRawOne();

    return {
      total,
      by_status: byStatus.map((item) => ({
        status: item.status,
        count: parseInt(item.count),
      })),
      by_type: byType.map((item) => ({
        type: item.type,
        count: parseInt(item.count),
      })),
      by_priority: byPriority.map((item) => ({
        priority: item.priority,
        count: parseInt(item.count),
      })),
      avg_resolution_time_hours: avgResolutionTime?.avg_seconds
        ? parseFloat(avgResolutionTime.avg_seconds) / 3600
        : 0,
      total_repair_cost: parseFloat(totalRepairCost?.total) || 0,
    };
  }

  /**
   * Получение открытых критичных инцидентов
   */
  async getCriticalIncidents(): Promise<Incident[]> {
    return this.incidentRepository.find({
      where: {
        priority: IncidentPriority.CRITICAL,
        status: IncidentStatus.OPEN,
      },
      relations: ['machine', 'machine.location'],
      order: {
        reported_at: 'DESC',
      },
    });
  }
}
