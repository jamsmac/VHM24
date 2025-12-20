import { Test, TestingModule } from '@nestjs/testing';
import { InventoryThresholdActionsService } from './inventory-threshold-actions.service';
import { IncidentsService } from '../../incidents/incidents.service';
import { TasksService } from '../../tasks/tasks.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/entities/user.entity';
import { TelegramNotificationsService } from '../../telegram/services/telegram-notifications.service';
import {
  InventoryDifferenceThreshold,
  SeverityLevel,
  ThresholdType,
} from '../entities/inventory-difference-threshold.entity';
import { DifferenceReportItem } from './inventory-difference.service';
import { InventoryLevelType } from '../entities/inventory-actual-count.entity';
import { IncidentPriority, IncidentType } from '../../incidents/entities/incident.entity';
import { TaskPriority, TaskType } from '../../tasks/entities/task.entity';

/**
 * Unit Tests for InventoryThresholdActionsService
 *
 * Tests automatic actions when inventory thresholds are exceeded.
 */
describe('InventoryThresholdActionsService', () => {
  let service: InventoryThresholdActionsService;
  let incidentsService: any;
  let tasksService: any;
  let notificationsService: any;
  let usersService: any;
  let telegramNotificationsService: any;

  // Test fixtures
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testMachineId = '22222222-2222-2222-2222-222222222222';
  const testManagerId = '33333333-3333-3333-3333-333333333333';
  const testAdminId = '44444444-4444-4444-4444-444444444444';

  const createDifferenceReportItem = (overrides = {}): DifferenceReportItem => ({
    actual_count_id: 'count-1',
    nomenclature_id: 'nom-1',
    nomenclature_name: 'Coffee Beans',
    level_type: InventoryLevelType.MACHINE,
    level_ref_id: testMachineId,
    counted_at: new Date('2025-06-15'),
    actual_quantity: 80,
    counted_by: { id: testUserId, full_name: 'John Doe' },
    calculated_quantity: 100,
    difference_abs: -20,
    difference_rel: -20,
    severity: SeverityLevel.CRITICAL,
    threshold_exceeded: true,
    applied_threshold: {
      id: 'threshold-1',
      name: 'Critical Threshold',
      threshold_type: ThresholdType.GLOBAL,
    },
    ...overrides,
  });

  const createThreshold = (overrides = {}): InventoryDifferenceThreshold =>
    ({
      id: 'threshold-1',
      name: 'Critical Threshold',
      threshold_type: ThresholdType.GLOBAL,
      reference_id: null,
      threshold_abs: 10,
      threshold_rel: null,
      severity_level: SeverityLevel.CRITICAL,
      is_active: true,
      priority: 10,
      create_incident: false,
      create_task: false,
      notify_users: null,
      notify_roles: null,
      description: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      ...overrides,
    }) as InventoryDifferenceThreshold;

  beforeEach(async () => {
    incidentsService = {
      create: jest.fn().mockResolvedValue({ id: 'incident-1' }),
    };

    tasksService = {
      create: jest.fn().mockResolvedValue({ id: 'task-1' }),
    };

    notificationsService = {
      create: jest.fn().mockResolvedValue({}),
    };

    usersService = {
      findByRoles: jest.fn().mockResolvedValue([]),
      findByRole: jest.fn().mockResolvedValue([]),
    };

    telegramNotificationsService = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryThresholdActionsService,
        {
          provide: IncidentsService,
          useValue: incidentsService,
        },
        {
          provide: TasksService,
          useValue: tasksService,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: TelegramNotificationsService,
          useValue: telegramNotificationsService,
        },
      ],
    }).compile();

    service = module.get<InventoryThresholdActionsService>(InventoryThresholdActionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeThresholdActions', () => {
    it('should return empty results when no actions configured', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        create_incident: false,
        create_task: false,
        notify_users: null,
      });

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(result.incidentId).toBeUndefined();
      expect(result.taskId).toBeUndefined();
      expect(result.notificationsSent).toBe(0);
      expect(incidentsService.create).not.toHaveBeenCalled();
      expect(tasksService.create).not.toHaveBeenCalled();
      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('should create incident when create_incident is true', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        create_incident: true,
        severity_level: SeverityLevel.CRITICAL,
      });

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(result.incidentId).toBe('incident-1');
      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          incident_type: IncidentType.OTHER,
          title: expect.stringContaining('Coffee Beans'),
          machine_id: testMachineId,
          priority: IncidentPriority.CRITICAL,
          reported_by_user_id: testUserId,
        }),
      );
    });

    it('should create task when create_task is true', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        create_task: true,
        severity_level: SeverityLevel.WARNING,
      });

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(result.taskId).toBe('task-1');
      expect(tasksService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type_code: TaskType.AUDIT,
          machine_id: testMachineId,
          assigned_to_user_id: testUserId,
          created_by_user_id: testUserId,
          priority: TaskPriority.HIGH,
        }),
      );
    });

    it('should send notifications when notify_users configured', async () => {
      // Arrange
      const notifyUsers = ['user-1', 'user-2', 'user-3'];
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        notify_users: notifyUsers,
        severity_level: SeverityLevel.WARNING,
      });

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(result.notificationsSent).toBe(3); // 3 users notified
      expect(notificationsService.create).toHaveBeenCalledTimes(3);
    });

    it('should send both IN_APP and EMAIL for CRITICAL severity', async () => {
      // Arrange
      const notifyUsers = ['user-1'];
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        notify_users: notifyUsers,
        severity_level: SeverityLevel.CRITICAL,
      });

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(result.notificationsSent).toBe(2); // IN_APP + EMAIL
      expect(notificationsService.create).toHaveBeenCalledTimes(2);
    });

    it('should execute all configured actions', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        create_incident: true,
        create_task: true,
        notify_users: ['user-1'],
        severity_level: SeverityLevel.CRITICAL,
      });

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(result.incidentId).toBe('incident-1');
      expect(result.taskId).toBe('task-1');
      expect(result.notificationsSent).toBe(2); // IN_APP + EMAIL
      expect(incidentsService.create).toHaveBeenCalled();
      expect(tasksService.create).toHaveBeenCalled();
      expect(notificationsService.create).toHaveBeenCalledTimes(2);
    });

    it('should handle incident creation error gracefully', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        create_incident: true,
        create_task: true,
      });

      incidentsService.create.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(result.incidentId).toBeUndefined();
      expect(result.taskId).toBe('task-1'); // Task still created
    });

    it('should handle task creation error gracefully', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        create_incident: true,
        create_task: true,
      });

      tasksService.create.mockRejectedValue(new Error('Task service error'));

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(result.incidentId).toBe('incident-1'); // Incident still created
      expect(result.taskId).toBeUndefined();
    });

    it('should handle notification error gracefully', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        notify_users: ['user-1', 'user-2'],
        severity_level: SeverityLevel.WARNING,
      });

      notificationsService.create
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Notification error'));

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(result.notificationsSent).toBe(1); // Only first succeeded
    });
  });

  describe('Incident creation', () => {
    it('should map CRITICAL severity to CRITICAL priority', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        create_incident: true,
        severity_level: SeverityLevel.CRITICAL,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: IncidentPriority.CRITICAL,
        }),
      );
    });

    it('should map WARNING severity to HIGH priority', async () => {
      // Arrange
      const difference = createDifferenceReportItem({ severity: SeverityLevel.WARNING });
      const threshold = createThreshold({
        create_incident: true,
        severity_level: SeverityLevel.WARNING,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: IncidentPriority.HIGH,
        }),
      );
    });

    it('should map INFO severity to MEDIUM priority', async () => {
      // Arrange
      const difference = createDifferenceReportItem({ severity: SeverityLevel.INFO });
      const threshold = createThreshold({
        create_incident: true,
        severity_level: SeverityLevel.INFO,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: IncidentPriority.MEDIUM,
        }),
      );
    });

    it('should skip incident creation for non-MACHINE level', async () => {
      // Arrange
      const difference = createDifferenceReportItem({
        level_type: InventoryLevelType.WAREHOUSE,
        level_ref_id: 'warehouse-1',
      });
      const threshold = createThreshold({
        create_incident: true,
      });

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      // Incident creation requires machine_id, so it's skipped for warehouse
      expect(result.incidentId).toBe('none'); // Returns 'none' instead of undefined
    });

    it('should include difference metadata in incident', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        create_incident: true,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            difference_report_item: expect.objectContaining({
              actual_count_id: 'count-1',
              calculated_quantity: 100,
              actual_quantity: 80,
              difference_abs: -20,
            }),
            threshold: expect.objectContaining({
              id: 'threshold-1',
              name: 'Critical Threshold',
            }),
          }),
        }),
      );
    });
  });

  describe('Task creation', () => {
    it('should map CRITICAL severity to URGENT priority', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        create_task: true,
        severity_level: SeverityLevel.CRITICAL,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(tasksService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: TaskPriority.URGENT,
        }),
      );
    });

    it('should map WARNING severity to HIGH priority', async () => {
      // Arrange
      const difference = createDifferenceReportItem({ severity: SeverityLevel.WARNING });
      const threshold = createThreshold({
        create_task: true,
        severity_level: SeverityLevel.WARNING,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(tasksService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: TaskPriority.HIGH,
        }),
      );
    });

    it('should map INFO severity to NORMAL priority', async () => {
      // Arrange
      const difference = createDifferenceReportItem({ severity: SeverityLevel.INFO });
      const threshold = createThreshold({
        create_task: true,
        severity_level: SeverityLevel.INFO,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(tasksService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: TaskPriority.NORMAL,
        }),
      );
    });

    it('should create AUDIT task for MACHINE level', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        create_task: true,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(tasksService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type_code: TaskType.AUDIT,
          machine_id: testMachineId,
        }),
      );
    });

    it('should throw error for non-MACHINE level task creation', async () => {
      // Arrange
      const difference = createDifferenceReportItem({
        level_type: InventoryLevelType.OPERATOR,
        level_ref_id: 'operator-1',
      });
      const threshold = createThreshold({
        create_task: true,
      });

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(result.taskId).toBeUndefined(); // Task creation fails for non-machine level
    });

    it('should include difference metadata in task', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        create_task: true,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(tasksService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            difference_report_item: expect.objectContaining({
              actual_count_id: 'count-1',
              nomenclature_id: 'nom-1',
            }),
            threshold: expect.objectContaining({
              id: 'threshold-1',
            }),
          }),
        }),
      );
    });

    it('should include description with difference details', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        create_task: true,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(tasksService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Coffee Beans'),
        }),
      );
    });
  });

  describe('Notification sending', () => {
    it('should send in-app notifications to all specified users', async () => {
      // Arrange
      const notifyUsers = ['user-1', 'user-2'];
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        notify_users: notifyUsers,
        severity_level: SeverityLevel.WARNING,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(notificationsService.create).toHaveBeenCalledTimes(2);
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: 'user-1',
        }),
      );
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: 'user-2',
        }),
      );
    });

    it('should include action_url in notification', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        notify_users: ['user-1'],
        severity_level: SeverityLevel.WARNING,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action_url: expect.stringContaining('count-1'),
          }),
        }),
      );
    });

    it('should include difference data in notification', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        notify_users: ['user-1'],
        severity_level: SeverityLevel.WARNING,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            difference_report_item: expect.objectContaining({
              nomenclature_name: 'Coffee Beans',
              calculated_quantity: 100,
              actual_quantity: 80,
              severity: SeverityLevel.CRITICAL,
            }),
          }),
        }),
      );
    });

    it('should skip notifications when notify_users is empty', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        notify_users: [],
      });

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(notificationsService.create).not.toHaveBeenCalled();
      expect(result.notificationsSent).toBe(0);
    });

    it('should send role-based notifications when notify_roles configured', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        notify_roles: ['Manager', 'Admin'],
        severity_level: SeverityLevel.WARNING,
      });

      // Mock users with roles
      usersService.findByRoles.mockResolvedValue([
        { id: testManagerId, full_name: 'Manager User', role: UserRole.MANAGER },
        { id: testAdminId, full_name: 'Admin User', role: UserRole.ADMIN },
      ]);

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(usersService.findByRoles).toHaveBeenCalledWith(
        expect.arrayContaining([UserRole.MANAGER, UserRole.ADMIN]),
        true,
      );
      expect(result.notificationsSent).toBe(2);
      expect(notificationsService.create).toHaveBeenCalledTimes(2);
    });

    it('should exclude users who already receive direct notifications from role-based', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        notify_users: [testManagerId], // Manager already gets direct notifications
        notify_roles: ['Manager', 'Admin'],
        severity_level: SeverityLevel.WARNING,
      });

      // Mock users with roles
      usersService.findByRoles.mockResolvedValue([
        { id: testManagerId, full_name: 'Manager User', role: UserRole.MANAGER },
        { id: testAdminId, full_name: 'Admin User', role: UserRole.ADMIN },
      ]);

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert - 1 direct (manager) + 1 role-based (admin, manager excluded as duplicate)
      expect(result.notificationsSent).toBe(2);
    });

    it('should not send role-based notifications when no users found', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        notify_roles: ['Manager'],
        severity_level: SeverityLevel.WARNING,
      });

      // No users found for role
      usersService.findByRoles.mockResolvedValue([]);

      // Act
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(result.notificationsSent).toBe(0);
      expect(notificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('Telegram alerts', () => {
    it('should send Telegram alert for CRITICAL severity', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        severity_level: SeverityLevel.CRITICAL,
        notify_users: [testUserId],
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(telegramNotificationsService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'inventory_critical_difference',
          userIds: expect.arrayContaining([testUserId]),
        }),
      );
    });

    it('should not send Telegram alert for WARNING severity', async () => {
      // Arrange
      const difference = createDifferenceReportItem({ severity: SeverityLevel.WARNING });
      const threshold = createThreshold({
        severity_level: SeverityLevel.WARNING,
        notify_users: [testUserId],
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(telegramNotificationsService.sendNotification).not.toHaveBeenCalled();
    });

    it('should not send Telegram alert for INFO severity', async () => {
      // Arrange
      const difference = createDifferenceReportItem({ severity: SeverityLevel.INFO });
      const threshold = createThreshold({
        severity_level: SeverityLevel.INFO,
        notify_users: [testUserId],
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(telegramNotificationsService.sendNotification).not.toHaveBeenCalled();
    });

    it('should include role-based users in Telegram alert', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        severity_level: SeverityLevel.CRITICAL,
        notify_roles: ['Admin'],
      });

      usersService.findByRoles.mockResolvedValue([
        { id: testAdminId, full_name: 'Admin User', role: UserRole.ADMIN },
      ]);

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(telegramNotificationsService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: expect.arrayContaining([testAdminId]),
        }),
      );
    });

    it('should send to admins and managers when no notify config', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        severity_level: SeverityLevel.CRITICAL,
        notify_users: null,
        notify_roles: null,
      });

      usersService.findByRoles.mockResolvedValue([
        { id: testAdminId, full_name: 'Admin User', role: UserRole.ADMIN },
        { id: testManagerId, full_name: 'Manager User', role: UserRole.MANAGER },
      ]);

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(usersService.findByRoles).toHaveBeenCalledWith(
        expect.arrayContaining([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
        true,
      );
      expect(telegramNotificationsService.sendNotification).toHaveBeenCalled();
    });

    it('should deduplicate users in Telegram alert', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        severity_level: SeverityLevel.CRITICAL,
        notify_users: [testAdminId], // Admin in direct list
        notify_roles: ['Admin'], // Admin also in roles
      });

      usersService.findByRoles.mockResolvedValue([
        { id: testAdminId, full_name: 'Admin User', role: UserRole.ADMIN },
      ]);

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert - Admin should only appear once
      expect(telegramNotificationsService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: [testAdminId], // Only one admin, no duplicates
        }),
      );
    });

    it('should include action button in Telegram alert', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        severity_level: SeverityLevel.CRITICAL,
        notify_users: [testUserId],
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(telegramNotificationsService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          actions: expect.arrayContaining([
            expect.objectContaining({
              text: expect.any(String),
              url: expect.stringContaining('count-1'),
            }),
          ]),
        }),
      );
    });

    it('should handle Telegram error gracefully', async () => {
      // Arrange
      const difference = createDifferenceReportItem();
      const threshold = createThreshold({
        severity_level: SeverityLevel.CRITICAL,
        notify_users: [testUserId],
      });

      telegramNotificationsService.sendNotification.mockRejectedValue(
        new Error('Telegram API error'),
      );

      // Act - should not throw
      const result = await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      expect(result).toBeDefined();
      // Email notifications should still be sent
      expect(result.notificationsSent).toBe(2); // IN_APP + EMAIL
    });
  });

  describe('Description formatting', () => {
    it('should format difference description correctly', async () => {
      // Arrange
      const difference = createDifferenceReportItem({
        nomenclature_name: 'Arabica Coffee',
        calculated_quantity: 150,
        actual_quantity: 120,
        difference_abs: -30,
        difference_rel: -20,
        threshold_exceeded: true,
        severity: SeverityLevel.CRITICAL,
        counted_by: { id: testUserId, full_name: 'Jane Smith' },
      });
      const threshold = createThreshold({
        create_incident: true,
      });

      // Act
      await service.executeThresholdActions(difference, threshold, testUserId);

      // Assert
      const createCall = incidentsService.create.mock.calls[0][0];
      expect(createCall.description).toContain('Arabica Coffee');
      expect(createCall.description).toContain('150'); // calculated
      expect(createCall.description).toContain('120'); // actual
      expect(createCall.description).toContain('-30'); // difference_abs
      expect(createCall.description).toContain('Jane Smith'); // counted_by
    });
  });
});
