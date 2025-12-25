import { Test, TestingModule } from '@nestjs/testing';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { AcknowledgeAlertDto, ResolveAlertDto, FilterAlertHistoryDto } from './dto/alert-history.dto';
import { AlertMetric, AlertSeverity, AlertOperator } from './entities/alert-rule.entity';
import { AlertStatus } from './entities/alert-history.entity';
import { User } from '@modules/users/entities/user.entity';

describe('AlertsController', () => {
  let controller: AlertsController;
  let alertsService: jest.Mocked<AlertsService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'admin@test.com',
    full_name: 'Test Admin',
  };

  const mockAlertRule = {
    id: 'rule-1',
    name: 'Low Stock Alert',
    metric: AlertMetric.LOW_STOCK_PERCENTAGE,
    operator: AlertOperator.LESS_THAN,
    threshold: 10,
    severity: AlertSeverity.WARNING,
    is_enabled: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAlertHistory = {
    id: 'alert-1',
    rule_id: 'rule-1',
    status: AlertStatus.ACTIVE,
    triggered_at: new Date(),
    current_value: 5,
    threshold_value: 10,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const mockAlertsService = {
      createRule: jest.fn(),
      findAllRules: jest.fn(),
      findRuleById: jest.fn(),
      updateRule: jest.fn(),
      deleteRule: jest.fn(),
      toggleRule: jest.fn(),
      getAlertHistory: jest.fn(),
      getActiveAlertsCount: jest.fn(),
      findAlertById: jest.fn(),
      acknowledgeAlert: jest.fn(),
      resolveAlert: jest.fn(),
      getStatistics: jest.fn(),
      evaluateRule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
      ],
    }).compile();

    controller = module.get<AlertsController>(AlertsController);
    alertsService = module.get(AlertsService);
  });

  describe('Alert Rules', () => {
    describe('createRule', () => {
      it('should create a new alert rule', async () => {
        const dto: CreateAlertRuleDto = {
          name: 'Low Stock Alert',
          metric: AlertMetric.LOW_STOCK_PERCENTAGE,
          operator: AlertOperator.LESS_THAN,
          threshold: 10,
          severity: AlertSeverity.WARNING,
        };

        alertsService.createRule.mockResolvedValue(mockAlertRule as any);

        const result = await controller.createRule(dto, mockUser as User);

        expect(result).toEqual(mockAlertRule);
        expect(alertsService.createRule).toHaveBeenCalledWith(dto, mockUser.id);
      });
    });

    describe('findAllRules', () => {
      it('should return all alert rules without filters', async () => {
        alertsService.findAllRules.mockResolvedValue([mockAlertRule] as any);

        const result = await controller.findAllRules();

        expect(result).toEqual([mockAlertRule]);
        expect(alertsService.findAllRules).toHaveBeenCalledWith({});
      });

      it('should return filtered rules by is_enabled=true', async () => {
        alertsService.findAllRules.mockResolvedValue([mockAlertRule] as any);

        const result = await controller.findAllRules('true');

        expect(alertsService.findAllRules).toHaveBeenCalledWith({ is_enabled: true });
      });

      it('should return filtered rules by is_enabled=false', async () => {
        alertsService.findAllRules.mockResolvedValue([] as any);

        const result = await controller.findAllRules('false');

        expect(alertsService.findAllRules).toHaveBeenCalledWith({ is_enabled: false });
      });

      it('should return filtered rules by metric', async () => {
        alertsService.findAllRules.mockResolvedValue([mockAlertRule] as any);

        const result = await controller.findAllRules(undefined, AlertMetric.LOW_STOCK_PERCENTAGE);

        expect(alertsService.findAllRules).toHaveBeenCalledWith({
          metric: AlertMetric.LOW_STOCK_PERCENTAGE,
        });
      });

      it('should return filtered rules by severity', async () => {
        alertsService.findAllRules.mockResolvedValue([mockAlertRule] as any);

        const result = await controller.findAllRules(undefined, undefined, AlertSeverity.CRITICAL);

        expect(alertsService.findAllRules).toHaveBeenCalledWith({
          severity: AlertSeverity.CRITICAL,
        });
      });

      it('should return filtered rules with all filters', async () => {
        alertsService.findAllRules.mockResolvedValue([mockAlertRule] as any);

        const result = await controller.findAllRules(
          'true',
          AlertMetric.LOW_STOCK_PERCENTAGE,
          AlertSeverity.WARNING,
        );

        expect(alertsService.findAllRules).toHaveBeenCalledWith({
          is_enabled: true,
          metric: AlertMetric.LOW_STOCK_PERCENTAGE,
          severity: AlertSeverity.WARNING,
        });
      });
    });

    describe('findRuleById', () => {
      it('should return a rule by ID', async () => {
        alertsService.findRuleById.mockResolvedValue(mockAlertRule as any);

        const result = await controller.findRuleById('rule-1');

        expect(result).toEqual(mockAlertRule);
        expect(alertsService.findRuleById).toHaveBeenCalledWith('rule-1');
      });
    });

    describe('updateRule', () => {
      it('should update a rule', async () => {
        const dto: UpdateAlertRuleDto = { threshold: 20 };
        const updatedRule = { ...mockAlertRule, threshold: 20 };
        alertsService.updateRule.mockResolvedValue(updatedRule as any);

        const result = await controller.updateRule('rule-1', dto, mockUser as User);

        expect(result).toEqual(updatedRule);
        expect(alertsService.updateRule).toHaveBeenCalledWith('rule-1', dto, mockUser.id);
      });
    });

    describe('deleteRule', () => {
      it('should delete a rule', async () => {
        alertsService.deleteRule.mockResolvedValue(undefined);

        const result = await controller.deleteRule('rule-1');

        expect(result).toEqual({ deleted: true });
        expect(alertsService.deleteRule).toHaveBeenCalledWith('rule-1');
      });
    });

    describe('toggleRule', () => {
      it('should enable a rule', async () => {
        const enabledRule = { ...mockAlertRule, is_enabled: true };
        alertsService.toggleRule.mockResolvedValue(enabledRule as any);

        const result = await controller.toggleRule('rule-1', 'true');

        expect(result).toEqual(enabledRule);
        expect(alertsService.toggleRule).toHaveBeenCalledWith('rule-1', true);
      });

      it('should disable a rule', async () => {
        const disabledRule = { ...mockAlertRule, is_enabled: false };
        alertsService.toggleRule.mockResolvedValue(disabledRule as any);

        const result = await controller.toggleRule('rule-1', 'false');

        expect(result).toEqual(disabledRule);
        expect(alertsService.toggleRule).toHaveBeenCalledWith('rule-1', false);
      });
    });
  });

  describe('Alert History', () => {
    describe('getAlertHistory', () => {
      it('should return alert history with filters', async () => {
        const filters: FilterAlertHistoryDto = {
          status: AlertStatus.ACTIVE,
          severity: AlertSeverity.CRITICAL,
        };
        alertsService.getAlertHistory.mockResolvedValue([mockAlertHistory] as any);

        const result = await controller.getAlertHistory(filters);

        expect(result).toEqual([mockAlertHistory]);
        expect(alertsService.getAlertHistory).toHaveBeenCalledWith(filters);
      });
    });

    describe('getActiveAlerts', () => {
      it('should return active alerts', async () => {
        alertsService.getAlertHistory.mockResolvedValue([mockAlertHistory] as any);

        const result = await controller.getActiveAlerts();

        expect(result).toEqual([mockAlertHistory]);
        expect(alertsService.getAlertHistory).toHaveBeenCalledWith({
          status: AlertStatus.ACTIVE,
        });
      });
    });

    describe('getActiveAlertsCount', () => {
      it('should return active alerts count', async () => {
        alertsService.getActiveAlertsCount.mockResolvedValue(5);

        const result = await controller.getActiveAlertsCount();

        expect(result).toEqual({ count: 5 });
        expect(alertsService.getActiveAlertsCount).toHaveBeenCalled();
      });
    });

    describe('findAlertById', () => {
      it('should return an alert by ID', async () => {
        alertsService.findAlertById.mockResolvedValue(mockAlertHistory as any);

        const result = await controller.findAlertById('alert-1');

        expect(result).toEqual(mockAlertHistory);
        expect(alertsService.findAlertById).toHaveBeenCalledWith('alert-1');
      });
    });

    describe('acknowledgeAlert', () => {
      it('should acknowledge an alert', async () => {
        const dto: AcknowledgeAlertDto = { note: 'Acknowledged by admin' };
        const acknowledgedAlert = {
          ...mockAlertHistory,
          status: AlertStatus.ACKNOWLEDGED,
          acknowledged_at: new Date(),
        };
        alertsService.acknowledgeAlert.mockResolvedValue(acknowledgedAlert as any);

        const result = await controller.acknowledgeAlert('alert-1', dto, mockUser as User);

        expect(result).toEqual(acknowledgedAlert);
        expect(alertsService.acknowledgeAlert).toHaveBeenCalledWith('alert-1', dto, mockUser.id);
      });
    });

    describe('resolveAlert', () => {
      it('should resolve an alert', async () => {
        const dto: ResolveAlertDto = { note: 'Issue fixed' };
        const resolvedAlert = {
          ...mockAlertHistory,
          status: AlertStatus.RESOLVED,
          resolved_at: new Date(),
        };
        alertsService.resolveAlert.mockResolvedValue(resolvedAlert as any);

        const result = await controller.resolveAlert('alert-1', dto, mockUser as User);

        expect(result).toEqual(resolvedAlert);
        expect(alertsService.resolveAlert).toHaveBeenCalledWith('alert-1', dto, mockUser.id);
      });
    });
  });

  describe('Statistics', () => {
    describe('getStatistics', () => {
      it('should return statistics without date filters', async () => {
        const stats = { total: 100, active: 10, resolved: 90 };
        alertsService.getStatistics.mockResolvedValue(stats as any);

        const result = await controller.getStatistics();

        expect(result).toEqual(stats);
        expect(alertsService.getStatistics).toHaveBeenCalledWith(undefined, undefined);
      });

      it('should return statistics with date_from filter', async () => {
        const dateFrom = '2024-01-01';
        const stats = { total: 50, active: 5, resolved: 45 };
        alertsService.getStatistics.mockResolvedValue(stats as any);

        const result = await controller.getStatistics(dateFrom);

        expect(result).toEqual(stats);
        expect(alertsService.getStatistics).toHaveBeenCalledWith(
          new Date(dateFrom),
          undefined,
        );
      });

      it('should return statistics with date_to filter', async () => {
        const dateTo = '2024-12-31';
        const stats = { total: 75, active: 8, resolved: 67 };
        alertsService.getStatistics.mockResolvedValue(stats as any);

        const result = await controller.getStatistics(undefined, dateTo);

        expect(result).toEqual(stats);
        expect(alertsService.getStatistics).toHaveBeenCalledWith(
          undefined,
          new Date(dateTo),
        );
      });

      it('should return statistics with both date filters', async () => {
        const dateFrom = '2024-01-01';
        const dateTo = '2024-12-31';
        const stats = { total: 60, active: 6, resolved: 54 };
        alertsService.getStatistics.mockResolvedValue(stats as any);

        const result = await controller.getStatistics(dateFrom, dateTo);

        expect(result).toEqual(stats);
        expect(alertsService.getStatistics).toHaveBeenCalledWith(
          new Date(dateFrom),
          new Date(dateTo),
        );
      });
    });
  });

  describe('Manual Trigger', () => {
    describe('testTriggerRule', () => {
      it('should test trigger a rule without machine_id', async () => {
        const body = { current_value: 5 };
        const triggerResult = { triggered: true, alert_id: 'alert-new' };
        alertsService.evaluateRule.mockResolvedValue(triggerResult as any);

        const result = await controller.testTriggerRule('rule-1', body);

        expect(result).toEqual(triggerResult);
        expect(alertsService.evaluateRule).toHaveBeenCalledWith('rule-1', 5, {
          machine_id: undefined,
          additional_data: { test: true },
        });
      });

      it('should test trigger a rule with machine_id', async () => {
        const body = { current_value: 5, machine_id: 'machine-123' };
        const triggerResult = { triggered: true, alert_id: 'alert-new' };
        alertsService.evaluateRule.mockResolvedValue(triggerResult as any);

        const result = await controller.testTriggerRule('rule-1', body);

        expect(result).toEqual(triggerResult);
        expect(alertsService.evaluateRule).toHaveBeenCalledWith('rule-1', 5, {
          machine_id: 'machine-123',
          additional_data: { test: true },
        });
      });
    });
  });
});
