import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import {
  AlertRule,
  AlertMetric,
  AlertOperator,
  AlertSeverity,
} from './entities/alert-rule.entity';
import { AlertHistory, AlertStatus } from './entities/alert-history.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let alertRuleRepository: jest.Mocked<Repository<AlertRule>>;
  let alertHistoryRepository: jest.Mocked<Repository<AlertHistory>>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let mockQueryBuilder: any;

  const mockAlertRule: AlertRule = {
    id: 'rule-uuid-1',
    name: 'Low Stock Alert',
    description: 'Triggers when stock is low',
    metric: AlertMetric.LOW_STOCK_PERCENTAGE,
    operator: AlertOperator.LESS_THAN,
    threshold: 20,
    severity: AlertSeverity.WARNING,
    is_enabled: true,
    cooldown_minutes: 60,
    scope_filters: null,
    notify_user_ids: ['user-uuid-1'],
    notify_roles: null,
    notification_channels: ['in_app'],
    escalation_minutes: 30,
    escalation_config: { escalation_user_ids: ['admin-uuid-1'] },
    last_triggered_at: null,
    trigger_count: 0,
    created_by: null,
    updated_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  } as AlertRule;

  const mockAlertHistory: AlertHistory = {
    id: 'alert-uuid-1',
    alert_rule_id: 'rule-uuid-1',
    alert_rule: mockAlertRule,
    status: AlertStatus.ACTIVE,
    severity: AlertSeverity.WARNING,
    title: 'Low stock alert for Machine M-001',
    message: 'Stock is at 15%, below threshold of 20%',
    triggered_at: new Date(),
    machine_id: 'machine-uuid-1',
    location_id: null,
    metric_snapshot: {
      current_value: 15,
      threshold: 20,
      metric: AlertMetric.LOW_STOCK_PERCENTAGE,
    },
    acknowledged_at: null,
    acknowledged_by_id: null,
    acknowledged_by: null,
    acknowledgement_note: null,
    resolved_at: null,
    resolved_by_id: null,
    resolved_by: null,
    resolution_note: null,
    escalated_at: null,
    escalation_level: 0,
    notification_ids: null,
    auto_created_task_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  } as AlertHistory;

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockAlertHistory]),
      getOne: jest.fn().mockResolvedValue(mockAlertHistory),
      getCount: jest.fn().mockResolvedValue(10),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getRepositoryToken(AlertRule),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            softRemove: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(AlertHistory),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn().mockResolvedValue({ id: 'notif-uuid-1' }),
          },
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    alertRuleRepository = module.get(getRepositoryToken(AlertRule));
    alertHistoryRepository = module.get(getRepositoryToken(AlertHistory));
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRule', () => {
    it('should create a new alert rule', async () => {
      const createDto = {
        name: 'New Rule',
        metric: AlertMetric.LOW_STOCK_PERCENTAGE,
        operator: AlertOperator.LESS_THAN,
        threshold: 15,
        severity: AlertSeverity.WARNING,
      };

      alertRuleRepository.create.mockReturnValue({ ...mockAlertRule, ...createDto } as AlertRule);
      alertRuleRepository.save.mockResolvedValue({ ...mockAlertRule, ...createDto } as AlertRule);

      const result = await service.createRule(createDto, 'user-uuid-1');

      expect(alertRuleRepository.create).toHaveBeenCalledWith({
        ...createDto,
        created_by_id: 'user-uuid-1',
      });
      expect(alertRuleRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('New Rule');
    });

    it('should create rule without userId', async () => {
      const createDto = {
        name: 'New Rule',
        metric: AlertMetric.MACHINE_ERROR_COUNT,
        operator: AlertOperator.GREATER_THAN,
        threshold: 5,
        severity: AlertSeverity.CRITICAL,
      };

      alertRuleRepository.create.mockReturnValue(mockAlertRule);
      alertRuleRepository.save.mockResolvedValue(mockAlertRule);

      await service.createRule(createDto);

      expect(alertRuleRepository.create).toHaveBeenCalledWith({
        ...createDto,
        created_by_id: null,
      });
    });
  });

  describe('findAllRules', () => {
    it('should return all rules without filters', async () => {
      alertRuleRepository.find.mockResolvedValue([mockAlertRule]);

      const result = await service.findAllRules();

      expect(result).toEqual([mockAlertRule]);
      expect(alertRuleRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { created_at: 'DESC' },
      });
    });

    it('should apply is_enabled filter', async () => {
      alertRuleRepository.find.mockResolvedValue([mockAlertRule]);

      await service.findAllRules({ is_enabled: true });

      expect(alertRuleRepository.find).toHaveBeenCalledWith({
        where: { is_enabled: true },
        order: { created_at: 'DESC' },
      });
    });

    it('should apply metric filter', async () => {
      alertRuleRepository.find.mockResolvedValue([mockAlertRule]);

      await service.findAllRules({ metric: AlertMetric.LOW_STOCK_PERCENTAGE });

      expect(alertRuleRepository.find).toHaveBeenCalledWith({
        where: { metric: AlertMetric.LOW_STOCK_PERCENTAGE },
        order: { created_at: 'DESC' },
      });
    });

    it('should apply severity filter', async () => {
      alertRuleRepository.find.mockResolvedValue([mockAlertRule]);

      await service.findAllRules({ severity: AlertSeverity.CRITICAL });

      expect(alertRuleRepository.find).toHaveBeenCalledWith({
        where: { severity: AlertSeverity.CRITICAL },
        order: { created_at: 'DESC' },
      });
    });

    it('should apply multiple filters', async () => {
      alertRuleRepository.find.mockResolvedValue([mockAlertRule]);

      await service.findAllRules({
        is_enabled: true,
        metric: AlertMetric.LOW_STOCK_PERCENTAGE,
        severity: AlertSeverity.WARNING,
      });

      expect(alertRuleRepository.find).toHaveBeenCalledWith({
        where: {
          is_enabled: true,
          metric: AlertMetric.LOW_STOCK_PERCENTAGE,
          severity: AlertSeverity.WARNING,
        },
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findRuleById', () => {
    it('should return a rule by id', async () => {
      alertRuleRepository.findOne.mockResolvedValue(mockAlertRule);

      const result = await service.findRuleById('rule-uuid-1');

      expect(result).toEqual(mockAlertRule);
      expect(alertRuleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'rule-uuid-1' },
      });
    });

    it('should throw NotFoundException if rule not found', async () => {
      alertRuleRepository.findOne.mockResolvedValue(null);

      await expect(service.findRuleById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRule', () => {
    it('should update an alert rule', async () => {
      alertRuleRepository.findOne.mockResolvedValue(mockAlertRule);
      alertRuleRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.updateRule(
        'rule-uuid-1',
        { name: 'Updated Rule' },
        'user-uuid-1',
      );

      expect(alertRuleRepository.update).toHaveBeenCalledWith('rule-uuid-1', {
        name: 'Updated Rule',
        updated_by_id: 'user-uuid-1',
      });
      expect(result).toEqual(mockAlertRule);
    });

    it('should update without userId', async () => {
      alertRuleRepository.findOne.mockResolvedValue(mockAlertRule);
      alertRuleRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updateRule('rule-uuid-1', { threshold: 25 });

      expect(alertRuleRepository.update).toHaveBeenCalledWith('rule-uuid-1', {
        threshold: 25,
        updated_by_id: null,
      });
    });

    it('should throw NotFoundException if rule not found', async () => {
      alertRuleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateRule('non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteRule', () => {
    it('should soft delete a rule', async () => {
      alertRuleRepository.findOne.mockResolvedValue(mockAlertRule);
      alertRuleRepository.softRemove.mockResolvedValue(mockAlertRule);

      await service.deleteRule('rule-uuid-1');

      expect(alertRuleRepository.softRemove).toHaveBeenCalledWith(mockAlertRule);
    });

    it('should throw NotFoundException if rule not found', async () => {
      alertRuleRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteRule('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleRule', () => {
    it('should enable a rule', async () => {
      alertRuleRepository.findOne.mockResolvedValue(mockAlertRule);
      alertRuleRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.toggleRule('rule-uuid-1', true);

      expect(alertRuleRepository.update).toHaveBeenCalledWith('rule-uuid-1', {
        is_enabled: true,
      });
      expect(result).toEqual(mockAlertRule);
    });

    it('should disable a rule', async () => {
      alertRuleRepository.findOne.mockResolvedValue(mockAlertRule);
      alertRuleRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.toggleRule('rule-uuid-1', false);

      expect(alertRuleRepository.update).toHaveBeenCalledWith('rule-uuid-1', {
        is_enabled: false,
      });
    });

    it('should throw NotFoundException if rule not found', async () => {
      alertRuleRepository.findOne.mockResolvedValue(null);

      await expect(service.toggleRule('non-existent', true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAlertHistory', () => {
    it('should return alert history without filters', async () => {
      const result = await service.getAlertHistory();

      expect(result).toEqual([mockAlertHistory]);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'alert.triggered_at',
        'DESC',
      );
    });

    it('should apply status filter', async () => {
      await service.getAlertHistory({ status: AlertStatus.ACTIVE });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.status = :status',
        { status: AlertStatus.ACTIVE },
      );
    });

    it('should apply alert_rule_id filter', async () => {
      await service.getAlertHistory({ alert_rule_id: 'rule-uuid-1' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.alert_rule_id = :ruleId',
        { ruleId: 'rule-uuid-1' },
      );
    });

    it('should apply machine_id filter', async () => {
      await service.getAlertHistory({ machine_id: 'machine-uuid-1' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.machine_id = :machineId',
        { machineId: 'machine-uuid-1' },
      );
    });

    it('should apply location_id filter', async () => {
      await service.getAlertHistory({ location_id: 'location-uuid-1' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.location_id = :locationId',
        { locationId: 'location-uuid-1' },
      );
    });

    it('should apply severity filter', async () => {
      await service.getAlertHistory({ severity: AlertSeverity.CRITICAL });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.severity = :severity',
        { severity: AlertSeverity.CRITICAL },
      );
    });

    it('should apply date_from filter', async () => {
      await service.getAlertHistory({ date_from: '2024-01-01' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.triggered_at >= :dateFrom',
        { dateFrom: expect.any(Date) },
      );
    });

    it('should apply date_to filter', async () => {
      await service.getAlertHistory({ date_to: '2024-12-31' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.triggered_at <= :dateTo',
        { dateTo: expect.any(Date) },
      );
    });
  });

  describe('getActiveAlertsCount', () => {
    it('should return count of active alerts', async () => {
      alertHistoryRepository.count.mockResolvedValue(5);

      const result = await service.getActiveAlertsCount();

      expect(result).toBe(5);
      expect(alertHistoryRepository.count).toHaveBeenCalledWith({
        where: { status: AlertStatus.ACTIVE },
      });
    });
  });

  describe('findAlertById', () => {
    it('should return an alert by id', async () => {
      alertHistoryRepository.findOne.mockResolvedValue(mockAlertHistory);

      const result = await service.findAlertById('alert-uuid-1');

      expect(result).toEqual(mockAlertHistory);
      expect(alertHistoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'alert-uuid-1' },
        relations: ['alert_rule', 'acknowledged_by', 'resolved_by'],
      });
    });

    it('should throw NotFoundException if alert not found', async () => {
      alertHistoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findAlertById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an active alert', async () => {
      alertHistoryRepository.findOne.mockResolvedValue({ ...mockAlertHistory });
      alertHistoryRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as AlertHistory),
      );

      const result = await service.acknowledgeAlert(
        'alert-uuid-1',
        { note: 'Working on it' },
        'user-uuid-1',
      );

      expect(result.status).toBe(AlertStatus.ACKNOWLEDGED);
      expect(result.acknowledged_by_id).toBe('user-uuid-1');
      expect(result.acknowledgement_note).toBe('Working on it');
      expect(result.acknowledged_at).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException if alert is not active', async () => {
      const acknowledgedAlert = {
        ...mockAlertHistory,
        status: AlertStatus.ACKNOWLEDGED,
      };
      alertHistoryRepository.findOne.mockResolvedValue(acknowledgedAlert);

      await expect(
        service.acknowledgeAlert('alert-uuid-1', {}, 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if alert not found', async () => {
      alertHistoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.acknowledgeAlert('non-existent', {}, 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should acknowledge without note', async () => {
      alertHistoryRepository.findOne.mockResolvedValue({ ...mockAlertHistory });
      alertHistoryRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as AlertHistory),
      );

      const result = await service.acknowledgeAlert(
        'alert-uuid-1',
        {},
        'user-uuid-1',
      );

      expect(result.acknowledgement_note).toBeNull();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an active alert', async () => {
      alertHistoryRepository.findOne.mockResolvedValue({ ...mockAlertHistory });
      alertHistoryRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as AlertHistory),
      );

      const result = await service.resolveAlert(
        'alert-uuid-1',
        { note: 'Fixed' },
        'user-uuid-1',
      );

      expect(result.status).toBe(AlertStatus.RESOLVED);
      expect(result.resolved_by_id).toBe('user-uuid-1');
      expect(result.resolution_note).toBe('Fixed');
      expect(result.resolved_at).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException if already resolved', async () => {
      const resolvedAlert = {
        ...mockAlertHistory,
        status: AlertStatus.RESOLVED,
      };
      alertHistoryRepository.findOne.mockResolvedValue(resolvedAlert);

      await expect(
        service.resolveAlert('alert-uuid-1', {}, 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if alert not found', async () => {
      alertHistoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resolveAlert('non-existent', {}, 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should resolve acknowledged alert', async () => {
      const acknowledgedAlert = {
        ...mockAlertHistory,
        status: AlertStatus.ACKNOWLEDGED,
      };
      alertHistoryRepository.findOne.mockResolvedValue(acknowledgedAlert);
      alertHistoryRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as AlertHistory),
      );

      const result = await service.resolveAlert(
        'alert-uuid-1',
        { note: 'Done' },
        'user-uuid-1',
      );

      expect(result.status).toBe(AlertStatus.RESOLVED);
    });
  });

  describe('evaluateRule', () => {
    it('should trigger alert when condition is met', async () => {
      alertRuleRepository.findOne.mockResolvedValue(mockAlertRule);
      alertHistoryRepository.create.mockReturnValue(mockAlertHistory);
      alertHistoryRepository.save.mockResolvedValue(mockAlertHistory);
      alertRuleRepository.update.mockResolvedValue({ affected: 1 } as any);
      alertHistoryRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.evaluateRule('rule-uuid-1', 15, {
        machine_id: 'machine-uuid-1',
      });

      expect(result).toBeTruthy();
      expect(alertHistoryRepository.create).toHaveBeenCalled();
    });

    it('should not trigger alert when rule is disabled', async () => {
      alertRuleRepository.findOne.mockResolvedValue({
        ...mockAlertRule,
        is_enabled: false,
      });

      const result = await service.evaluateRule('rule-uuid-1', 15, {});

      expect(result).toBeNull();
    });

    it('should not trigger alert when in cooldown', async () => {
      alertRuleRepository.findOne.mockResolvedValue({
        ...mockAlertRule,
        last_triggered_at: new Date(),
        cooldown_minutes: 60,
      });

      const result = await service.evaluateRule('rule-uuid-1', 15, {});

      expect(result).toBeNull();
    });

    it('should not trigger alert when condition is not met', async () => {
      alertRuleRepository.findOne.mockResolvedValue(mockAlertRule);

      const result = await service.evaluateRule('rule-uuid-1', 50, {});

      expect(result).toBeNull();
      expect(alertHistoryRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if rule not found', async () => {
      alertRuleRepository.findOne.mockResolvedValue(null);

      await expect(service.evaluateRule('non-existent', 15, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should trigger for GREATER_THAN operator', async () => {
      alertRuleRepository.findOne.mockResolvedValue({
        ...mockAlertRule,
        operator: AlertOperator.GREATER_THAN,
        threshold: 10,
      });
      alertHistoryRepository.create.mockReturnValue(mockAlertHistory);
      alertHistoryRepository.save.mockResolvedValue(mockAlertHistory);
      alertRuleRepository.update.mockResolvedValue({ affected: 1 } as any);
      alertHistoryRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.evaluateRule('rule-uuid-1', 15, {});

      expect(result).toBeTruthy();
    });

    it('should trigger for EQUAL operator', async () => {
      alertRuleRepository.findOne.mockResolvedValue({
        ...mockAlertRule,
        operator: AlertOperator.EQUAL,
        threshold: 15,
      });
      alertHistoryRepository.create.mockReturnValue(mockAlertHistory);
      alertHistoryRepository.save.mockResolvedValue(mockAlertHistory);
      alertRuleRepository.update.mockResolvedValue({ affected: 1 } as any);
      alertHistoryRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.evaluateRule('rule-uuid-1', 15, {});

      expect(result).toBeTruthy();
    });
  });

  describe('triggerAlert', () => {
    it('should create alert and send notifications', async () => {
      alertHistoryRepository.create.mockReturnValue(mockAlertHistory);
      alertHistoryRepository.save.mockResolvedValue(mockAlertHistory);
      alertRuleRepository.update.mockResolvedValue({ affected: 1 } as any);
      alertHistoryRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.triggerAlert(mockAlertRule, 15, {
        machine_id: 'machine-uuid-1',
      });

      expect(result).toEqual(mockAlertHistory);
      expect(alertHistoryRepository.create).toHaveBeenCalled();
      expect(alertRuleRepository.update).toHaveBeenCalledWith(
        mockAlertRule.id,
        expect.objectContaining({
          last_triggered_at: expect.any(Date),
        }),
      );
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('should send notifications to all specified users', async () => {
      const ruleWithMultipleUsers = {
        ...mockAlertRule,
        notify_user_ids: ['user-1', 'user-2'],
      };
      alertHistoryRepository.create.mockReturnValue(mockAlertHistory);
      alertHistoryRepository.save.mockResolvedValue(mockAlertHistory);
      alertRuleRepository.update.mockResolvedValue({ affected: 1 } as any);
      alertHistoryRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.triggerAlert(ruleWithMultipleUsers, 15, {});

      expect(notificationsService.create).toHaveBeenCalledTimes(2);
    });

    it('should use in_app channel by default', async () => {
      const ruleNoChannels = { ...mockAlertRule, notification_channels: null };
      alertHistoryRepository.create.mockReturnValue(mockAlertHistory);
      alertHistoryRepository.save.mockResolvedValue(mockAlertHistory);
      alertRuleRepository.update.mockResolvedValue({ affected: 1 } as any);
      alertHistoryRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.triggerAlert(ruleNoChannels, 15, {});

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'in_app',
        }),
      );
    });

    it('should handle notification errors gracefully', async () => {
      alertHistoryRepository.create.mockReturnValue(mockAlertHistory);
      alertHistoryRepository.save.mockResolvedValue(mockAlertHistory);
      alertRuleRepository.update.mockResolvedValue({ affected: 1 } as any);
      alertHistoryRepository.update.mockResolvedValue({ affected: 1 } as any);
      notificationsService.create.mockRejectedValue(new Error('Failed'));

      const result = await service.triggerAlert(mockAlertRule, 15, {});

      expect(result).toEqual(mockAlertHistory);
    });
  });

  describe('getStatistics', () => {
    it('should return alert statistics', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(100);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { status: AlertStatus.ACTIVE, count: '30' },
        { status: AlertStatus.RESOLVED, count: '70' },
      ]);
      mockQueryBuilder.getRawOne.mockResolvedValue({ avg_minutes: '45.5' });
      alertHistoryRepository.count.mockResolvedValue(30);

      const result = await service.getStatistics();

      expect(result.total).toBe(100);
      expect(result.active_count).toBe(30);
      expect(result.by_status).toHaveLength(2);
      expect(result.avg_resolution_time_minutes).toBe(45.5);
    });

    it('should apply date filters', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(50);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      alertHistoryRepository.count.mockResolvedValue(10);

      await service.getStatistics(new Date('2024-01-01'), new Date('2024-12-31'));

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.triggered_at >= :dateFrom',
        { dateFrom: expect.any(Date) },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.triggered_at <= :dateTo',
        { dateTo: expect.any(Date) },
      );
    });

    it('should return null for avg_resolution_time if no data', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockQueryBuilder.getRawOne.mockResolvedValue(null);
      alertHistoryRepository.count.mockResolvedValue(0);

      const result = await service.getStatistics();

      expect(result.avg_resolution_time_minutes).toBeNull();
    });
  });

  describe('processEscalations', () => {
    it('should process alerts needing escalation', async () => {
      const alertToEscalate = {
        ...mockAlertHistory,
        alert_rule: mockAlertRule,
        triggered_at: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };

      mockQueryBuilder.getMany.mockResolvedValue([alertToEscalate]);
      alertHistoryRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as AlertHistory),
      );

      await service.processEscalations();

      expect(alertHistoryRepository.save).toHaveBeenCalled();
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('should not escalate if rule has no escalation_minutes', async () => {
      const alertNoEscalation = {
        ...mockAlertHistory,
        alert_rule: { ...mockAlertRule, escalation_minutes: null },
      };

      mockQueryBuilder.getMany.mockResolvedValue([alertNoEscalation]);

      await service.processEscalations();

      expect(alertHistoryRepository.save).not.toHaveBeenCalled();
    });

    it('should not escalate if not past escalation time', async () => {
      const recentAlert = {
        ...mockAlertHistory,
        alert_rule: { ...mockAlertRule, escalation_minutes: 60 },
        triggered_at: new Date(), // Just now
      };

      mockQueryBuilder.getMany.mockResolvedValue([recentAlert]);

      await service.processEscalations();

      expect(alertHistoryRepository.save).not.toHaveBeenCalled();
    });
  });
});
