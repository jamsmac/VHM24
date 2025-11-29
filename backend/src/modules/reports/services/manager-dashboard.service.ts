import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Machine } from '@modules/machines/entities/machine.entity';
import { Transaction } from '@modules/transactions/entities/transaction.entity';
import { Task, TaskStatus } from '@modules/tasks/entities/task.entity';
import { Incident, IncidentStatus } from '@modules/incidents/entities/incident.entity';
import { Complaint, ComplaintStatus } from '@modules/complaints/entities/complaint.entity';
import { MachineInventory } from '@modules/inventory/entities/machine-inventory.entity';
import { Location } from '@modules/locations/entities/location.entity';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';

export interface ManagerDashboard {
  period: {
    current_date: Date;
    period_start: Date;
    period_end: Date;
  };
  operations_summary: {
    total_machines: number;
    active_machines: number;
    machines_needing_attention: number;
    total_locations: number;
    pending_tasks: number;
    tasks_in_progress: number;
    completed_today: number;
  };
  revenue_overview: {
    today_revenue: number;
    week_revenue: number;
    month_revenue: number;
    avg_revenue_per_machine: number;
  };
  tasks_management: {
    pending_refills: number;
    pending_collections: number;
    pending_maintenance: number;
    overdue_tasks: number;
    urgent_tasks: Array<{
      task_id: string;
      task_type: string;
      machine_number: string;
      machine_name: string;
      priority: string;
      due_date: Date;
      assigned_operator: string;
    }>;
  };
  machine_status: {
    by_status: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    requiring_service: Array<{
      machine_id: string;
      machine_number: string;
      machine_name: string;
      location_name: string;
      status: string;
      issue_type: string;
      reported_at: Date;
    }>;
  };
  inventory_status: {
    total_low_stock: number;
    total_out_of_stock: number;
    critical_items: Array<{
      machine_id: string;
      machine_number: string;
      product_name: string;
      current_quantity: number;
      threshold: number;
      status: 'low' | 'out';
    }>;
  };
  incidents_tracking: {
    open_incidents: number;
    in_progress_incidents: number;
    resolved_today: number;
    high_priority_incidents: Array<{
      incident_id: string;
      machine_number: string;
      incident_type: string;
      priority: string;
      reported_at: Date;
      age_hours: number;
    }>;
  };
  complaints_tracking: {
    new_complaints: number;
    in_review: number;
    resolved_today: number;
    recent_complaints: Array<{
      complaint_id: string;
      machine_number: string;
      complaint_type: string;
      submitted_at: Date;
      status: string;
    }>;
  };
  location_performance: Array<{
    location_id: string;
    location_name: string;
    machines_count: number;
    active_machines: number;
    today_revenue: number;
    pending_tasks: number;
    open_incidents: number;
  }>;
  generated_at: Date;
}

@Injectable()
export class ManagerDashboardService {
  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
    @InjectRepository(Complaint)
    private readonly complaintRepository: Repository<Complaint>,
    @InjectRepository(MachineInventory)
    private readonly machineInventoryRepository: Repository<MachineInventory>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  /**
   * Generate comprehensive manager dashboard
   *
   * @param locationIds - Optional filter for specific locations managed by this manager
   */
  async generateDashboard(locationIds?: string[]): Promise<ManagerDashboard> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    const [
      operationsSummary,
      revenueOverview,
      tasksManagement,
      machineStatus,
      inventoryStatus,
      incidentsTracking,
      complaintsTracking,
      locationPerformance,
    ] = await Promise.all([
      this.getOperationsSummary(todayStart, locationIds),
      this.getRevenueOverview(todayStart, weekStart, monthStart, locationIds),
      this.getTasksManagement(locationIds),
      this.getMachineStatus(locationIds),
      this.getInventoryStatus(locationIds),
      this.getIncidentsTracking(todayStart, locationIds),
      this.getComplaintsTracking(todayStart, locationIds),
      this.getLocationPerformance(todayStart, locationIds),
    ]);

    return {
      period: {
        current_date: now,
        period_start: monthStart,
        period_end: now,
      },
      operations_summary: operationsSummary,
      revenue_overview: revenueOverview,
      tasks_management: tasksManagement,
      machine_status: machineStatus,
      inventory_status: inventoryStatus,
      incidents_tracking: incidentsTracking,
      complaints_tracking: complaintsTracking,
      location_performance: locationPerformance,
      generated_at: now,
    };
  }

  /**
   * Get operations summary
   */
  private async getOperationsSummary(
    todayStart: Date,
    locationIds?: string[],
  ): Promise<ManagerDashboard['operations_summary']> {
    const machineQuery = this.machineRepository.createQueryBuilder('machine');
    if (locationIds && locationIds.length > 0) {
      machineQuery.where('machine.location_id IN (:...locationIds)', { locationIds });
    }
    const machines = await machineQuery.getMany();

    const taskQuery = this.taskRepository.createQueryBuilder('task');
    if (locationIds && locationIds.length > 0) {
      taskQuery
        .leftJoin('task.machine', 'machine')
        .where('machine.location_id IN (:...locationIds)', { locationIds });
    }

    const [pending, inProgress, completedToday, locations] = await Promise.all([
      taskQuery
        .clone()
        .andWhere('task.status = :status', { status: TaskStatus.PENDING })
        .getCount(),
      taskQuery
        .clone()
        .andWhere('task.status = :status', { status: TaskStatus.IN_PROGRESS })
        .getCount(),
      taskQuery
        .clone()
        .andWhere('task.status = :status', { status: TaskStatus.COMPLETED })
        .andWhere('task.completed_at >= :todayStart', { todayStart })
        .getCount(),
      locationIds && locationIds.length > 0
        ? this.locationRepository.count({ where: { id: In(locationIds) as any } })
        : this.locationRepository.count(),
    ]);

    const activeMachines = machines.filter((m) => m.status === 'active').length;
    const machinesNeedingAttention = machines.filter(
      (m) => m.status !== 'active' && m.status !== 'disabled',
    ).length;

    return {
      total_machines: machines.length,
      active_machines: activeMachines,
      machines_needing_attention: machinesNeedingAttention,
      total_locations: locations,
      pending_tasks: pending,
      tasks_in_progress: inProgress,
      completed_today: completedToday,
    };
  }

  /**
   * Get revenue overview
   */
  private async getRevenueOverview(
    todayStart: Date,
    weekStart: Date,
    monthStart: Date,
    locationIds?: string[],
  ): Promise<ManagerDashboard['revenue_overview']> {
    const now = new Date();

    const baseQuery = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.machine', 'machine');

    if (locationIds && locationIds.length > 0) {
      baseQuery.where('machine.location_id IN (:...locationIds)', { locationIds });
    }

    const [todayRevenue, weekRevenue, monthRevenue, machineCount] = await Promise.all([
      baseQuery
        .clone()
        .select('SUM(transaction.amount)', 'revenue')
        .andWhere('transaction.transaction_date >= :todayStart', { todayStart })
        .andWhere('transaction.transaction_date <= :now', { now })
        .getRawOne(),
      baseQuery
        .clone()
        .select('SUM(transaction.amount)', 'revenue')
        .andWhere('transaction.transaction_date >= :weekStart', { weekStart })
        .andWhere('transaction.transaction_date <= :now', { now })
        .getRawOne(),
      baseQuery
        .clone()
        .select('SUM(transaction.amount)', 'revenue')
        .andWhere('transaction.transaction_date >= :monthStart', { monthStart })
        .andWhere('transaction.transaction_date <= :now', { now })
        .getRawOne(),
      locationIds && locationIds.length > 0
        ? this.machineRepository.count({
            where: { location_id: In(locationIds) as any },
          })
        : this.machineRepository.count(),
    ]);

    const avgRevenuePerMachine =
      machineCount > 0 ? Number(monthRevenue?.revenue || 0) / machineCount : 0;

    return {
      today_revenue: Number(todayRevenue?.revenue || 0),
      week_revenue: Number(weekRevenue?.revenue || 0),
      month_revenue: Number(monthRevenue?.revenue || 0),
      avg_revenue_per_machine: avgRevenuePerMachine,
    };
  }

  /**
   * Get tasks management overview
   */
  private async getTasksManagement(
    locationIds?: string[],
  ): Promise<ManagerDashboard['tasks_management']> {
    const taskQuery = this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.machine', 'machine');

    if (locationIds && locationIds.length > 0) {
      taskQuery.where('machine.location_id IN (:...locationIds)', { locationIds });
    }

    const [pendingRefills, pendingCollections, pendingMaintenance, allPendingTasks] =
      await Promise.all([
        taskQuery
          .clone()
          .andWhere('task.status = :status', { status: TaskStatus.PENDING })
          .andWhere('task.type = :type', { type: 'refill' })
          .getCount(),
        taskQuery
          .clone()
          .andWhere('task.status = :status', { status: TaskStatus.PENDING })
          .andWhere('task.type = :type', { type: 'collection' })
          .getCount(),
        taskQuery
          .clone()
          .andWhere('task.status = :status', { status: TaskStatus.PENDING })
          .andWhere('task.type IN (:...types)', { types: ['maintenance', 'repair'] })
          .getCount(),
        taskQuery
          .clone()
          .andWhere('task.status = :status', { status: TaskStatus.PENDING })
          .leftJoinAndSelect('task.machine', 'm')
          .leftJoinAndSelect('task.assigned_to', 'operator')
          .getMany(),
      ]);

    const now = new Date();
    const overdueTasks = allPendingTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now,
    ).length;

    // Get urgent tasks (high priority or overdue)
    const urgentTasks = allPendingTasks
      .filter((t) => t.priority === 'high' || (t.due_date && new Date(t.due_date) < now))
      .slice(0, 10)
      .map((t) => ({
        task_id: t.id,
        task_type: t.type_code,
        machine_number: t.machine?.machine_number || 'Unknown',
        machine_name: t.machine?.name || 'Unknown',
        priority: t.priority,
        due_date: t.due_date || new Date(),
        assigned_operator: t.assigned_to?.full_name || 'Не назначен',
      }));

    return {
      pending_refills: pendingRefills,
      pending_collections: pendingCollections,
      pending_maintenance: pendingMaintenance,
      overdue_tasks: overdueTasks,
      urgent_tasks: urgentTasks,
    };
  }

  /**
   * Get machine status overview
   */
  private async getMachineStatus(
    locationIds?: string[],
  ): Promise<ManagerDashboard['machine_status']> {
    const machineQuery = this.machineRepository.createQueryBuilder('machine');
    if (locationIds && locationIds.length > 0) {
      machineQuery.where('machine.location_id IN (:...locationIds)', { locationIds });
    }

    const machines = await machineQuery.leftJoinAndSelect('machine.location', 'location').getMany();

    // Group by status
    const statusCounts = new Map<string, number>();
    machines.forEach((m) => {
      const count = statusCounts.get(m.status) || 0;
      statusCounts.set(m.status, count + 1);
    });

    const byStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: (count / machines.length) * 100,
    }));

    // Machines requiring service
    const requireingService = machines
      .filter((m) => m.status === 'error' || m.status === 'maintenance' || m.status === 'low_stock')
      .slice(0, 10)
      .map((m) => ({
        machine_id: m.id,
        machine_number: m.machine_number,
        machine_name: m.name,
        location_name: m.location?.name || 'Unknown',
        status: m.status,
        issue_type: m.status === 'low_stock' ? 'Низкий запас' : 'Требуется обслуживание',
        reported_at: m.updated_at,
      }));

    return {
      by_status: byStatus,
      requiring_service: requireingService,
    };
  }

  /**
   * Get inventory status
   */
  private async getInventoryStatus(
    locationIds?: string[],
  ): Promise<ManagerDashboard['inventory_status']> {
    const inventoryQuery = this.machineInventoryRepository
      .createQueryBuilder('mi')
      .leftJoin('mi.machine', 'machine')
      .leftJoin('mi.nomenclature', 'nomenclature');

    if (locationIds && locationIds.length > 0) {
      inventoryQuery.where('machine.location_id IN (:...locationIds)', { locationIds });
    }

    const [lowStock, outOfStock] = await Promise.all([
      inventoryQuery
        .clone()
        .andWhere('mi.quantity > 0')
        .andWhere('mi.quantity <= mi.low_stock_threshold')
        .leftJoinAndSelect('mi.machine', 'm')
        .leftJoinAndSelect('mi.nomenclature', 'n')
        .getMany(),
      inventoryQuery
        .clone()
        .andWhere('mi.quantity = 0')
        .leftJoinAndSelect('mi.machine', 'm')
        .leftJoinAndSelect('mi.nomenclature', 'n')
        .getMany(),
    ]);

    const criticalItems = [...lowStock, ...outOfStock].slice(0, 20).map((item) => ({
      machine_id: item.machine?.id || '',
      machine_number: item.machine?.machine_number || 'Unknown',
      product_name: item.nomenclature?.name || 'Unknown',
      current_quantity: Number(item.current_quantity || 0),
      threshold: Number(item.min_stock_level || 0),
      status: (Number(item.current_quantity) === 0 ? 'out' : 'low') as 'low' | 'out',
    }));

    return {
      total_low_stock: lowStock.length,
      total_out_of_stock: outOfStock.length,
      critical_items: criticalItems,
    };
  }

  /**
   * Get incidents tracking
   */
  private async getIncidentsTracking(
    todayStart: Date,
    locationIds?: string[],
  ): Promise<ManagerDashboard['incidents_tracking']> {
    const incidentQuery = this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoin('incident.machine', 'machine');

    if (locationIds && locationIds.length > 0) {
      incidentQuery.where('machine.location_id IN (:...locationIds)', { locationIds });
    }

    const [open, inProgress, resolvedToday, highPriorityIncidents] = await Promise.all([
      incidentQuery
        .clone()
        .andWhere('incident.status = :status', { status: IncidentStatus.OPEN })
        .getCount(),
      incidentQuery
        .clone()
        .andWhere('incident.status = :status', { status: IncidentStatus.IN_PROGRESS })
        .getCount(),
      incidentQuery
        .clone()
        .andWhere('incident.status = :status', { status: IncidentStatus.RESOLVED })
        .andWhere('incident.resolved_at >= :todayStart', { todayStart })
        .getCount(),
      incidentQuery
        .clone()
        .andWhere('incident.priority IN (:...priorities)', { priorities: ['high', 'critical'] })
        .andWhere('incident.status != :status', { status: IncidentStatus.CLOSED })
        .leftJoinAndSelect('incident.machine', 'm')
        .orderBy('incident.reported_at', 'DESC')
        .limit(10)
        .getMany(),
    ]);

    const now = new Date();
    const highPriority = highPriorityIncidents.map((inc) => {
      const ageHours = (now.getTime() - new Date(inc.reported_at).getTime()) / (1000 * 60 * 60);
      return {
        incident_id: inc.id,
        machine_number: inc.machine?.machine_number || 'Unknown',
        incident_type: inc.incident_type,
        priority: inc.priority,
        reported_at: new Date(inc.reported_at),
        age_hours: ageHours,
      };
    });

    return {
      open_incidents: open,
      in_progress_incidents: inProgress,
      resolved_today: resolvedToday,
      high_priority_incidents: highPriority,
    };
  }

  /**
   * Get complaints tracking
   */
  private async getComplaintsTracking(
    todayStart: Date,
    locationIds?: string[],
  ): Promise<ManagerDashboard['complaints_tracking']> {
    const complaintQuery = this.complaintRepository
      .createQueryBuilder('complaint')
      .leftJoin('complaint.machine', 'machine');

    if (locationIds && locationIds.length > 0) {
      complaintQuery.where('machine.location_id IN (:...locationIds)', { locationIds });
    }

    const [newComplaints, inReview, resolvedToday, recentComplaints] = await Promise.all([
      complaintQuery
        .clone()
        .andWhere('complaint.status = :status', { status: ComplaintStatus.NEW })
        .getCount(),
      complaintQuery
        .clone()
        .andWhere('complaint.status = :status', { status: ComplaintStatus.IN_REVIEW })
        .getCount(),
      complaintQuery
        .clone()
        .andWhere('complaint.status = :status', { status: ComplaintStatus.RESOLVED })
        .andWhere('complaint.resolved_at >= :todayStart', { todayStart })
        .getCount(),
      complaintQuery
        .clone()
        .andWhere('complaint.status != :status', { status: ComplaintStatus.RESOLVED })
        .leftJoinAndSelect('complaint.machine', 'm')
        .orderBy('complaint.submitted_at', 'DESC')
        .limit(10)
        .getMany(),
    ]);

    const recent = recentComplaints.map((c) => ({
      complaint_id: c.id,
      machine_number: c.machine?.machine_number || 'Unknown',
      complaint_type: c.complaint_type,
      submitted_at: new Date(c.submitted_at),
      status: c.status,
    }));

    return {
      new_complaints: newComplaints,
      in_review: inReview,
      resolved_today: resolvedToday,
      recent_complaints: recent,
    };
  }

  /**
   * Get location performance overview
   */
  private async getLocationPerformance(
    todayStart: Date,
    locationIds?: string[],
  ): Promise<ManagerDashboard['location_performance']> {
    const locationQuery = this.locationRepository.createQueryBuilder('location');
    if (locationIds && locationIds.length > 0) {
      locationQuery.where('location.id IN (:...locationIds)', { locationIds });
    }

    const locations = await locationQuery.getMany();

    const performance = await Promise.all(
      locations.map(async (location) => {
        const [machines, revenue, pendingTasks, openIncidents] = await Promise.all([
          this.machineRepository.find({ where: { location_id: location.id } }),
          this.getTodayRevenueForLocation(location.id, todayStart),
          this.taskRepository.count({
            where: {
              machine: { location_id: location.id },
              status: TaskStatus.PENDING,
            } as any,
          }),
          this.incidentRepository.count({
            where: {
              machine: { location_id: location.id },
              status: IncidentStatus.OPEN,
            } as any,
          }),
        ]);

        const activeMachines = machines.filter((m) => m.status === 'active').length;

        return {
          location_id: location.id,
          location_name: location.name,
          machines_count: machines.length,
          active_machines: activeMachines,
          today_revenue: revenue,
          pending_tasks: pendingTasks,
          open_incidents: openIncidents,
        };
      }),
    );

    return performance;
  }

  private async getTodayRevenueForLocation(locationId: string, todayStart: Date): Promise<number> {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.machine', 'machine')
      .select('SUM(transaction.amount)', 'revenue')
      .where('machine.location_id = :locationId', { locationId })
      .andWhere('transaction.transaction_date >= :todayStart', { todayStart })
      .getRawOne();

    return Number(result?.revenue || 0);
  }
}
