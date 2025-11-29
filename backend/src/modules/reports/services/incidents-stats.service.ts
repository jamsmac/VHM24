import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  Incident,
  IncidentType,
  IncidentStatus,
  IncidentPriority,
} from '@modules/incidents/entities/incident.entity';

export interface IncidentsStatsReport {
  period: {
    start_date: Date;
    end_date: Date;
  };
  summary: {
    total_incidents: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    avg_resolution_time_hours: number;
    total_repair_costs: number;
    incidents_by_priority: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  by_type: Array<{
    incident_type: IncidentType;
    count: number;
    percentage: number;
    avg_resolution_time_hours: number;
    total_repair_costs: number;
    open: number;
    resolved: number;
  }>;
  by_status: Array<{
    status: IncidentStatus;
    count: number;
    percentage: number;
  }>;
  by_priority: Array<{
    priority: IncidentPriority;
    count: number;
    percentage: number;
    avg_resolution_time_hours: number;
  }>;
  by_machine: Array<{
    machine_id: string;
    machine_number: string;
    machine_name: string;
    location_name: string;
    total_incidents: number;
    critical_incidents: number;
    avg_resolution_time_hours: number;
    total_repair_costs: number;
    most_common_type: IncidentType;
  }>;
  timeline: Array<{
    date: string; // YYYY-MM-DD
    reported: number;
    resolved: number;
    closed: number;
  }>;
  critical_incidents: Array<{
    id: string;
    incident_type: IncidentType;
    title: string;
    machine_number: string;
    machine_name: string;
    reported_at: Date;
    status: IncidentStatus;
    age_hours: number;
  }>;
  generated_at: Date;
}

@Injectable()
export class IncidentsStatsService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
  ) {}

  /**
   * Generate comprehensive incidents statistics report
   */
  async generateReport(startDate: Date, endDate: Date): Promise<IncidentsStatsReport> {
    const [incidents, byType, byStatus, byPriority, byMachine, timeline] = await Promise.all([
      this.getIncidents(startDate, endDate),
      this.getIncidentsByType(startDate, endDate),
      this.getIncidentsByStatus(startDate, endDate),
      this.getIncidentsByPriority(startDate, endDate),
      this.getIncidentsByMachine(startDate, endDate),
      this.getIncidentsTimeline(startDate, endDate),
    ]);

    // Calculate summary
    const totalIncidents = incidents.length;
    const openIncidents = incidents.filter((i) => i.status === IncidentStatus.OPEN).length;
    const inProgressIncidents = incidents.filter(
      (i) => i.status === IncidentStatus.IN_PROGRESS,
    ).length;
    const resolvedIncidents = incidents.filter((i) => i.status === IncidentStatus.RESOLVED).length;
    const closedIncidents = incidents.filter((i) => i.status === IncidentStatus.CLOSED).length;

    const resolvedOrClosed = incidents.filter(
      (i) =>
        i.resolved_at &&
        (i.status === IncidentStatus.RESOLVED || i.status === IncidentStatus.CLOSED),
    );
    const avgResolutionTimeHours =
      resolvedOrClosed.length > 0
        ? resolvedOrClosed.reduce((sum, inc) => {
            const reportedAt = new Date(inc.reported_at).getTime();
            const resolvedAt = new Date(inc.resolved_at!).getTime();
            const hours = (resolvedAt - reportedAt) / (1000 * 60 * 60);
            return sum + hours;
          }, 0) / resolvedOrClosed.length
        : 0;

    const totalRepairCosts = incidents.reduce((sum, inc) => sum + Number(inc.repair_cost || 0), 0);

    const criticalCount = incidents.filter((i) => i.priority === IncidentPriority.CRITICAL).length;
    const highCount = incidents.filter((i) => i.priority === IncidentPriority.HIGH).length;
    const mediumCount = incidents.filter((i) => i.priority === IncidentPriority.MEDIUM).length;
    const lowCount = incidents.filter((i) => i.priority === IncidentPriority.LOW).length;

    // Get critical incidents for detailed view
    const criticalIncidents = this.getCriticalIncidents(incidents);

    return {
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      summary: {
        total_incidents: totalIncidents,
        open: openIncidents,
        in_progress: inProgressIncidents,
        resolved: resolvedIncidents,
        closed: closedIncidents,
        avg_resolution_time_hours: avgResolutionTimeHours,
        total_repair_costs: totalRepairCosts,
        incidents_by_priority: {
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount,
        },
      },
      by_type: byType,
      by_status: byStatus,
      by_priority: byPriority,
      by_machine: byMachine,
      timeline,
      critical_incidents: criticalIncidents,
      generated_at: new Date(),
    };
  }

  /**
   * Get all incidents in period
   */
  private async getIncidents(startDate: Date, endDate: Date): Promise<Incident[]> {
    return await this.incidentRepository.find({
      where: {
        reported_at: Between(startDate, endDate) as any,
      },
      relations: ['machine', 'machine.location'],
      order: { reported_at: 'DESC' },
    });
  }

  /**
   * Get incidents grouped by type
   */
  private async getIncidentsByType(
    startDate: Date,
    endDate: Date,
  ): Promise<IncidentsStatsReport['by_type']> {
    const result = await this.incidentRepository
      .createQueryBuilder('incident')
      .select('incident.incident_type', 'incident_type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COUNT(*) FILTER (WHERE incident.status = :open)', 'open')
      .addSelect('COUNT(*) FILTER (WHERE incident.status IN (:...resolved))', 'resolved')
      .addSelect('SUM(COALESCE(incident.repair_cost, 0))', 'total_repair_costs')
      .addSelect(
        `AVG(EXTRACT(EPOCH FROM (incident.resolved_at - incident.reported_at)) / 3600) FILTER (WHERE incident.resolved_at IS NOT NULL)`,
        'avg_resolution_time_hours',
      )
      .where('incident.reported_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .setParameter('open', IncidentStatus.OPEN)
      .setParameter('resolved', [IncidentStatus.RESOLVED, IncidentStatus.CLOSED])
      .groupBy('incident.incident_type')
      .orderBy('count', 'DESC')
      .getRawMany();

    const total = result.reduce((sum, r) => sum + Number(r.count), 0);

    return result.map((r) => ({
      incident_type: r.incident_type,
      count: Number(r.count),
      percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
      avg_resolution_time_hours: Number(r.avg_resolution_time_hours || 0),
      total_repair_costs: Number(r.total_repair_costs || 0),
      open: Number(r.open || 0),
      resolved: Number(r.resolved || 0),
    }));
  }

  /**
   * Get incidents grouped by status
   */
  private async getIncidentsByStatus(
    startDate: Date,
    endDate: Date,
  ): Promise<IncidentsStatsReport['by_status']> {
    const result = await this.incidentRepository
      .createQueryBuilder('incident')
      .select('incident.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('incident.reported_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('incident.status')
      .getRawMany();

    const total = result.reduce((sum, r) => sum + Number(r.count), 0);

    return result.map((r) => ({
      status: r.status,
      count: Number(r.count),
      percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
    }));
  }

  /**
   * Get incidents grouped by priority
   */
  private async getIncidentsByPriority(
    startDate: Date,
    endDate: Date,
  ): Promise<IncidentsStatsReport['by_priority']> {
    const result = await this.incidentRepository
      .createQueryBuilder('incident')
      .select('incident.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        `AVG(EXTRACT(EPOCH FROM (incident.resolved_at - incident.reported_at)) / 3600) FILTER (WHERE incident.resolved_at IS NOT NULL)`,
        'avg_resolution_time_hours',
      )
      .where('incident.reported_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('incident.priority')
      .getRawMany();

    const total = result.reduce((sum, r) => sum + Number(r.count), 0);

    return result.map((r) => ({
      priority: r.priority,
      count: Number(r.count),
      percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
      avg_resolution_time_hours: Number(r.avg_resolution_time_hours || 0),
    }));
  }

  /**
   * Get incidents grouped by machine
   */
  private async getIncidentsByMachine(
    startDate: Date,
    endDate: Date,
  ): Promise<IncidentsStatsReport['by_machine']> {
    const result = await this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoin('incident.machine', 'machine')
      .leftJoin('machine.location', 'location')
      .select('incident.machine_id', 'machine_id')
      .addSelect('machine.machine_number', 'machine_number')
      .addSelect('machine.name', 'machine_name')
      .addSelect('location.name', 'location_name')
      .addSelect('COUNT(*)', 'total_incidents')
      .addSelect('COUNT(*) FILTER (WHERE incident.priority = :critical)', 'critical_incidents')
      .addSelect('SUM(COALESCE(incident.repair_cost, 0))', 'total_repair_costs')
      .addSelect(
        `AVG(EXTRACT(EPOCH FROM (incident.resolved_at - incident.reported_at)) / 3600) FILTER (WHERE incident.resolved_at IS NOT NULL)`,
        'avg_resolution_time_hours',
      )
      .addSelect(
        `(
          SELECT incident_type
          FROM incidents i2
          WHERE i2.machine_id = incident.machine_id
            AND i2.reported_at BETWEEN :startDate AND :endDate
          GROUP BY incident_type
          ORDER BY COUNT(*) DESC
          LIMIT 1
        )`,
        'most_common_type',
      )
      .where('incident.reported_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .setParameter('critical', IncidentPriority.CRITICAL)
      .groupBy('incident.machine_id')
      .addGroupBy('machine.machine_number')
      .addGroupBy('machine.name')
      .addGroupBy('location.name')
      .orderBy('total_incidents', 'DESC')
      .limit(20)
      .getRawMany();

    return result.map((r) => ({
      machine_id: r.machine_id,
      machine_number: r.machine_number || 'Unknown',
      machine_name: r.machine_name || 'Unknown',
      location_name: r.location_name || 'Unknown',
      total_incidents: Number(r.total_incidents),
      critical_incidents: Number(r.critical_incidents || 0),
      avg_resolution_time_hours: Number(r.avg_resolution_time_hours || 0),
      total_repair_costs: Number(r.total_repair_costs || 0),
      most_common_type: r.most_common_type || IncidentType.OTHER,
    }));
  }

  /**
   * Get incidents timeline (daily breakdown)
   */
  private async getIncidentsTimeline(
    startDate: Date,
    endDate: Date,
  ): Promise<IncidentsStatsReport['timeline']> {
    const reported = await this.incidentRepository
      .createQueryBuilder('incident')
      .select(`DATE(incident.reported_at)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('incident.reported_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(incident.reported_at)')
      .orderBy('DATE(incident.reported_at)', 'ASC')
      .getRawMany();

    const resolved = await this.incidentRepository
      .createQueryBuilder('incident')
      .select(`DATE(incident.resolved_at)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('incident.resolved_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('incident.resolved_at IS NOT NULL')
      .groupBy('DATE(incident.resolved_at)')
      .getRawMany();

    const closed = await this.incidentRepository
      .createQueryBuilder('incident')
      .select(`DATE(incident.closed_at)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('incident.closed_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('incident.closed_at IS NOT NULL')
      .groupBy('DATE(incident.closed_at)')
      .getRawMany();

    // Merge all dates
    const datesMap = new Map<string, { reported: number; resolved: number; closed: number }>();

    reported.forEach((r) => {
      const dateStr = r.date;
      datesMap.set(dateStr, { reported: Number(r.count), resolved: 0, closed: 0 });
    });

    resolved.forEach((r) => {
      const dateStr = r.date;
      const existing = datesMap.get(dateStr) || { reported: 0, resolved: 0, closed: 0 };
      existing.resolved = Number(r.count);
      datesMap.set(dateStr, existing);
    });

    closed.forEach((r) => {
      const dateStr = r.date;
      const existing = datesMap.get(dateStr) || { reported: 0, resolved: 0, closed: 0 };
      existing.closed = Number(r.count);
      datesMap.set(dateStr, existing);
    });

    return Array.from(datesMap.entries())
      .map(([date, data]) => ({
        date,
        reported: data.reported,
        resolved: data.resolved,
        closed: data.closed,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get critical incidents for detailed view
   */
  private getCriticalIncidents(incidents: Incident[]): IncidentsStatsReport['critical_incidents'] {
    const critical = incidents.filter(
      (i) => i.priority === IncidentPriority.CRITICAL && i.status !== IncidentStatus.CLOSED,
    );

    const now = new Date();

    return critical.map((inc) => {
      const reportedAt = new Date(inc.reported_at);
      const ageHours = (now.getTime() - reportedAt.getTime()) / (1000 * 60 * 60);

      return {
        id: inc.id,
        incident_type: inc.incident_type,
        title: inc.title,
        machine_number: inc.machine?.machine_number || 'Unknown',
        machine_name: inc.machine?.name || 'Unknown',
        reported_at: reportedAt,
        status: inc.status,
        age_hours: ageHours,
      };
    });
  }
}
