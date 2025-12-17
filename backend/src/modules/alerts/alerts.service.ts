import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, In } from 'typeorm';
import {
  AlertRule,
  AlertMetric,
  AlertOperator,
  AlertSeverity,
} from './entities/alert-rule.entity';
import { AlertHistory, AlertStatus } from './entities/alert-history.entity';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import {
  AcknowledgeAlertDto,
  ResolveAlertDto,
  FilterAlertHistoryDto,
} from './dto/alert-history.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../notifications/entities/notification.entity';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(AlertRule)
    private readonly alertRuleRepository: Repository<AlertRule>,
    @InjectRepository(AlertHistory)
    private readonly alertHistoryRepository: Repository<AlertHistory>,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  // ============================================================================
  // ALERT RULES CRUD
  // ============================================================================

  /**
   * Create a new alert rule
   */
  async createRule(dto: CreateAlertRuleDto, userId?: string): Promise<AlertRule> {
    const rule = this.alertRuleRepository.create({
      ...dto,
      created_by_id: userId || null,
    });
    return this.alertRuleRepository.save(rule);
  }

  /**
   * Get all alert rules
   */
  async findAllRules(filters?: {
    is_enabled?: boolean;
    metric?: AlertMetric;
    severity?: AlertSeverity;
  }): Promise<AlertRule[]> {
    const where: { is_enabled?: boolean; metric?: AlertMetric; severity?: AlertSeverity } = {};

    if (filters?.is_enabled !== undefined) {
      where.is_enabled = filters.is_enabled;
    }
    if (filters?.metric) {
      where.metric = filters.metric;
    }
    if (filters?.severity) {
      where.severity = filters.severity;
    }

    return this.alertRuleRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get alert rule by ID
   */
  async findRuleById(id: string): Promise<AlertRule> {
    const rule = await this.alertRuleRepository.findOne({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Правило оповещения с ID ${id} не найдено`);
    }

    return rule;
  }

  /**
   * Update alert rule
   */
  async updateRule(
    id: string,
    dto: UpdateAlertRuleDto,
    userId?: string,
  ): Promise<AlertRule> {
    await this.findRuleById(id);
    await this.alertRuleRepository.update(id, {
      ...dto,
      updated_by_id: userId || null,
    });
    return this.findRuleById(id);
  }

  /**
   * Delete alert rule (soft delete)
   */
  async deleteRule(id: string): Promise<void> {
    const rule = await this.findRuleById(id);
    await this.alertRuleRepository.softRemove(rule);
  }

  /**
   * Enable/disable alert rule
   */
  async toggleRule(id: string, isEnabled: boolean): Promise<AlertRule> {
    await this.findRuleById(id);
    await this.alertRuleRepository.update(id, { is_enabled: isEnabled });
    return this.findRuleById(id);
  }

  // ============================================================================
  // ALERT HISTORY
  // ============================================================================

  /**
   * Get alert history with filters
   */
  async getAlertHistory(filters?: FilterAlertHistoryDto): Promise<AlertHistory[]> {
    const query = this.alertHistoryRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.alert_rule', 'rule')
      .leftJoinAndSelect('alert.acknowledged_by', 'ackUser')
      .leftJoinAndSelect('alert.resolved_by', 'resUser');

    if (filters?.status) {
      query.andWhere('alert.status = :status', { status: filters.status });
    }

    if (filters?.alert_rule_id) {
      query.andWhere('alert.alert_rule_id = :ruleId', {
        ruleId: filters.alert_rule_id,
      });
    }

    if (filters?.machine_id) {
      query.andWhere('alert.machine_id = :machineId', {
        machineId: filters.machine_id,
      });
    }

    if (filters?.location_id) {
      query.andWhere('alert.location_id = :locationId', {
        locationId: filters.location_id,
      });
    }

    if (filters?.severity) {
      query.andWhere('alert.severity = :severity', { severity: filters.severity });
    }

    if (filters?.date_from) {
      query.andWhere('alert.triggered_at >= :dateFrom', {
        dateFrom: new Date(filters.date_from),
      });
    }

    if (filters?.date_to) {
      query.andWhere('alert.triggered_at <= :dateTo', {
        dateTo: new Date(filters.date_to),
      });
    }

    query.orderBy('alert.triggered_at', 'DESC');

    return query.getMany();
  }

  /**
   * Get active alerts count
   */
  async getActiveAlertsCount(): Promise<number> {
    return this.alertHistoryRepository.count({
      where: { status: AlertStatus.ACTIVE },
    });
  }

  /**
   * Get alert by ID
   */
  async findAlertById(id: string): Promise<AlertHistory> {
    const alert = await this.alertHistoryRepository.findOne({
      where: { id },
      relations: ['alert_rule', 'acknowledged_by', 'resolved_by'],
    });

    if (!alert) {
      throw new NotFoundException(`Оповещение с ID ${id} не найдено`);
    }

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    id: string,
    dto: AcknowledgeAlertDto,
    userId: string,
  ): Promise<AlertHistory> {
    const alert = await this.findAlertById(id);

    if (alert.status !== AlertStatus.ACTIVE) {
      throw new BadRequestException(
        'Только активные оповещения могут быть подтверждены',
      );
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledged_at = new Date();
    alert.acknowledged_by_id = userId;
    alert.acknowledgement_note = dto.note || null;

    return this.alertHistoryRepository.save(alert);
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(
    id: string,
    dto: ResolveAlertDto,
    userId: string,
  ): Promise<AlertHistory> {
    const alert = await this.findAlertById(id);

    if (alert.status === AlertStatus.RESOLVED) {
      throw new BadRequestException('Оповещение уже разрешено');
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolved_at = new Date();
    alert.resolved_by_id = userId;
    alert.resolution_note = dto.note || null;

    return this.alertHistoryRepository.save(alert);
  }

  // ============================================================================
  // ALERT EVALUATION & TRIGGERING
  // ============================================================================

  /**
   * Evaluate a rule against a value and trigger alert if condition is met
   */
  async evaluateRule(
    ruleId: string,
    currentValue: number,
    context: {
      machine_id?: string;
      location_id?: string;
      additional_data?: Record<string, any>;
    },
  ): Promise<AlertHistory | null> {
    const rule = await this.findRuleById(ruleId);

    if (!rule.is_enabled) {
      return null;
    }

    // Check cooldown
    if (rule.last_triggered_at) {
      const cooldownEnd = new Date(rule.last_triggered_at);
      cooldownEnd.setMinutes(cooldownEnd.getMinutes() + rule.cooldown_minutes);

      if (new Date() < cooldownEnd) {
        this.logger.debug(
          `Rule ${rule.name} is in cooldown until ${cooldownEnd.toISOString()}`,
        );
        return null;
      }
    }

    // Evaluate condition
    const conditionMet = this.evaluateCondition(
      currentValue,
      rule.operator,
      rule.threshold,
    );

    if (!conditionMet) {
      return null;
    }

    // Create alert
    return this.triggerAlert(rule, currentValue, context);
  }

  /**
   * Evaluate condition using operator
   */
  private evaluateCondition(
    value: number,
    operator: AlertOperator,
    threshold: number,
  ): boolean {
    switch (operator) {
      case AlertOperator.GREATER_THAN:
        return value > threshold;
      case AlertOperator.LESS_THAN:
        return value < threshold;
      case AlertOperator.GREATER_THAN_OR_EQUAL:
        return value >= threshold;
      case AlertOperator.LESS_THAN_OR_EQUAL:
        return value <= threshold;
      case AlertOperator.EQUAL:
        return value === threshold;
      case AlertOperator.NOT_EQUAL:
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(
    rule: AlertRule,
    currentValue: number,
    context: {
      machine_id?: string;
      location_id?: string;
      additional_data?: Record<string, any>;
    },
  ): Promise<AlertHistory> {
    // Create alert history entry
    const alert = this.alertHistoryRepository.create({
      alert_rule_id: rule.id,
      severity: rule.severity,
      title: this.generateAlertTitle(rule, context),
      message: this.generateAlertMessage(rule, currentValue, context),
      triggered_at: new Date(),
      machine_id: context.machine_id || null,
      location_id: context.location_id || null,
      metric_snapshot: {
        current_value: currentValue,
        threshold: rule.threshold,
        metric: rule.metric,
        additional_data: context.additional_data,
      },
      status: AlertStatus.ACTIVE,
    });

    const savedAlert = await this.alertHistoryRepository.save(alert);

    // Update rule trigger info
    await this.alertRuleRepository.update(rule.id, {
      last_triggered_at: new Date(),
      trigger_count: () => 'trigger_count + 1',
    });

    // Send notifications
    await this.sendAlertNotifications(rule, savedAlert);

    this.logger.log(
      `Alert triggered: ${savedAlert.title} (Rule: ${rule.name})`,
    );

    return savedAlert;
  }

  /**
   * Generate alert title based on rule and context
   */
  private generateAlertTitle(
    rule: AlertRule,
    context: { machine_id?: string; additional_data?: Record<string, any> },
  ): string {
    const machineNum = context.additional_data?.machine_number || context.machine_id?.slice(0, 8);
    const prefix = machineNum ? `[${machineNum}] ` : '';
    return `${prefix}${rule.name}`;
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    rule: AlertRule,
    currentValue: number,
    context: { additional_data?: Record<string, any> },
  ): string {
    const metricLabel = this.getMetricLabel(rule.metric);
    const operatorLabel = this.getOperatorLabel(rule.operator);

    let message = `${metricLabel}: ${currentValue} ${operatorLabel} ${rule.threshold}`;

    if (context.additional_data?.machine_name) {
      message = `Аппарат "${context.additional_data.machine_name}": ${message}`;
    }

    return message;
  }

  /**
   * Get human-readable metric label
   */
  private getMetricLabel(metric: AlertMetric): string {
    const labels: Record<AlertMetric, string> = {
      [AlertMetric.LOW_STOCK_PERCENTAGE]: 'Уровень заполнения',
      [AlertMetric.MACHINE_ERROR_COUNT]: 'Количество ошибок',
      [AlertMetric.TASK_OVERDUE_HOURS]: 'Просрочка задачи (часов)',
      [AlertMetric.INCIDENT_COUNT]: 'Количество инцидентов',
      [AlertMetric.COLLECTION_DUE_DAYS]: 'Дней до инкассации',
      [AlertMetric.COMPONENT_LIFETIME_PERCENTAGE]: 'Ресурс компонента',
      [AlertMetric.WASHING_OVERDUE_DAYS]: 'Просрочка мойки (дней)',
      [AlertMetric.DAILY_SALES_DROP_PERCENTAGE]: 'Падение продаж',
      [AlertMetric.MACHINE_OFFLINE_HOURS]: 'Офлайн (часов)',
      [AlertMetric.SPARE_PART_LOW_STOCK]: 'Запас запчастей',
    };
    return labels[metric] || metric;
  }

  /**
   * Get human-readable operator label
   */
  private getOperatorLabel(operator: AlertOperator): string {
    const labels: Record<AlertOperator, string> = {
      [AlertOperator.GREATER_THAN]: '>',
      [AlertOperator.LESS_THAN]: '<',
      [AlertOperator.GREATER_THAN_OR_EQUAL]: '>=',
      [AlertOperator.LESS_THAN_OR_EQUAL]: '<=',
      [AlertOperator.EQUAL]: '=',
      [AlertOperator.NOT_EQUAL]: '!=',
    };
    return labels[operator] || operator;
  }

  /**
   * Send notifications for an alert
   */
  private async sendAlertNotifications(
    rule: AlertRule,
    alert: AlertHistory,
  ): Promise<void> {
    const notificationIds: string[] = [];

    // Determine notification priority based on severity
    const priorityMap: Record<AlertSeverity, NotificationPriority> = {
      [AlertSeverity.INFO]: NotificationPriority.LOW,
      [AlertSeverity.WARNING]: NotificationPriority.NORMAL,
      [AlertSeverity.CRITICAL]: NotificationPriority.HIGH,
      [AlertSeverity.EMERGENCY]: NotificationPriority.URGENT,
    };

    const priority = priorityMap[alert.severity] || NotificationPriority.NORMAL;

    // Get notification channels (default to in_app if not specified)
    const channels = rule.notification_channels?.length
      ? rule.notification_channels
      : ['in_app'];

    // Get users to notify
    const userIds = rule.notify_user_ids || [];

    // Send to specific users
    for (const userId of userIds) {
      for (const channelStr of channels) {
        const channel = channelStr as NotificationChannel;
        try {
          const notification = await this.notificationsService.create({
            type: NotificationType.SYSTEM_ALERT,
            channel,
            recipient_id: userId,
            title: alert.title,
            message: alert.message,
            priority,
            data: {
              alert_id: alert.id,
              alert_rule_id: rule.id,
              severity: alert.severity,
              machine_id: alert.machine_id,
              location_id: alert.location_id,
            },
            action_url: `/dashboard/alerts/${alert.id}`,
          });
          notificationIds.push(notification.id);
        } catch (error) {
          this.logger.error(
            `Failed to send alert notification to user ${userId}: ${error.message}`,
          );
        }
      }
    }

    // Update alert with notification IDs
    if (notificationIds.length > 0) {
      await this.alertHistoryRepository.update(alert.id, {
        notification_ids: notificationIds,
      });
    }
  }

  // ============================================================================
  // ESCALATION
  // ============================================================================

  /**
   * Check for alerts that need escalation
   * Should be called by a scheduled task
   */
  async processEscalations(): Promise<void> {
    // Find active alerts that are past their escalation time
    const alertsToEscalate = await this.alertHistoryRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.alert_rule', 'rule')
      .where('alert.status = :status', { status: AlertStatus.ACTIVE })
      .andWhere('rule.escalation_minutes IS NOT NULL')
      .andWhere(
        'alert.triggered_at < :escalationTime',
        {
          escalationTime: new Date(
            Date.now() - 30 * 60 * 1000, // Default 30 minutes if we can't compute per-rule
          ),
        },
      )
      .andWhere('alert.escalated_at IS NULL')
      .getMany();

    for (const alert of alertsToEscalate) {
      const rule = alert.alert_rule;
      if (!rule?.escalation_minutes) continue;

      const escalationTime = new Date(alert.triggered_at);
      escalationTime.setMinutes(
        escalationTime.getMinutes() + rule.escalation_minutes,
      );

      if (new Date() >= escalationTime) {
        await this.escalateAlert(alert);
      }
    }
  }

  /**
   * Escalate an alert
   */
  private async escalateAlert(alert: AlertHistory): Promise<void> {
    const rule = alert.alert_rule;
    if (!rule?.escalation_config) return;

    alert.status = AlertStatus.ESCALATED;
    alert.escalated_at = new Date();
    alert.escalation_level++;

    await this.alertHistoryRepository.save(alert);

    // Notify escalation targets
    const escalationUserIds = rule.escalation_config.escalation_user_ids || [];

    for (const userId of escalationUserIds) {
      try {
        await this.notificationsService.create({
          type: NotificationType.SYSTEM_ALERT,
          channel: NotificationChannel.IN_APP,
          recipient_id: userId,
          title: `[ESCALATED] ${alert.title}`,
          message: `Оповещение было эскалировано. ${alert.message}`,
          priority: NotificationPriority.URGENT,
          data: {
            alert_id: alert.id,
            escalation_level: alert.escalation_level,
          },
          action_url: `/dashboard/alerts/${alert.id}`,
        });
      } catch (error) {
        this.logger.error(
          `Failed to send escalation notification: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Alert ${alert.id} escalated to level ${alert.escalation_level}`,
    );
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get alert statistics
   */
  async getStatistics(dateFrom?: Date, dateTo?: Date) {
    const query = this.alertHistoryRepository.createQueryBuilder('alert');

    if (dateFrom) {
      query.andWhere('alert.triggered_at >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      query.andWhere('alert.triggered_at <= :dateTo', { dateTo });
    }

    const total = await query.getCount();

    const byStatus = await this.alertHistoryRepository
      .createQueryBuilder('alert')
      .select('alert.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('alert.status')
      .getRawMany();

    const bySeverity = await this.alertHistoryRepository
      .createQueryBuilder('alert')
      .select('alert.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .groupBy('alert.severity')
      .getRawMany();

    const activeCount = await this.alertHistoryRepository.count({
      where: { status: AlertStatus.ACTIVE },
    });

    const avgResolutionTime = await this.alertHistoryRepository
      .createQueryBuilder('alert')
      .select(
        'AVG(EXTRACT(EPOCH FROM (alert.resolved_at - alert.triggered_at)) / 60)',
        'avg_minutes',
      )
      .where('alert.resolved_at IS NOT NULL')
      .getRawOne();

    return {
      total,
      active_count: activeCount,
      by_status: byStatus.map((item) => ({
        status: item.status,
        count: parseInt(item.count, 10),
      })),
      by_severity: bySeverity.map((item) => ({
        severity: item.severity,
        count: parseInt(item.count, 10),
      })),
      avg_resolution_time_minutes: avgResolutionTime?.avg_minutes
        ? parseFloat(avgResolutionTime.avg_minutes)
        : null,
    };
  }
}
