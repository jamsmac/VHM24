import { Test, TestingModule } from '@nestjs/testing';
import { TelegramMessageHandler } from './telegram-message.handler';
import { TelegramI18nService } from '../../i18n/services/telegram-i18n.service';
import { TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import { UserRole } from '../../../users/entities/user.entity';
import {
  TelegramTaskInfo,
  TelegramMachineInfo,
  TelegramAlertInfo,
  TelegramStatsInfo,
  TelegramPendingUserInfo,
} from '../../shared/types/telegram.types';

describe('TelegramMessageHandler', () => {
  let handler: TelegramMessageHandler;
  let _i18nService: jest.Mocked<TelegramI18nService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramMessageHandler,
        {
          provide: TelegramI18nService,
          useValue: {
            t: jest.fn((lang, key) => {
              const translations: Record<string, string> = {
                machines: 'Машины',
                online: 'Онлайн',
                offline: 'Офлайн',
                alerts: 'Оповещения',
                no_alerts: 'Нет оповещений',
                alert_offline: 'Офлайн',
                alert_error: 'Ошибка',
                statistics: 'Статистика',
                total_machines: 'Всего машин',
                today_revenue: 'Доход сегодня',
                today_sales: 'Продаж сегодня',
                pending_tasks: 'Ожидающих задач',
              };
              return translations[key] || key;
            }),
          },
        },
      ],
    }).compile();

    handler = module.get<TelegramMessageHandler>(TelegramMessageHandler);
    _i18nService = module.get(TelegramI18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('formatTasksMessage', () => {
    it('should format tasks message in Russian', () => {
      const tasks: TelegramTaskInfo[] = [
        {
          id: 'task-1',
          status: TaskStatus.PENDING,
          type_code: TaskType.REFILL,
          scheduled_date: new Date('2025-01-15'),
          machine: {
            id: 'machine-1',
            machine_number: 'M-001',
            name: 'Machine 1',
            location: { id: 'loc-1', name: 'Office' },
          },
        },
      ];

      const result = handler.formatTasksMessage(tasks, TelegramLanguage.RU);

      expect(result).toContain('📋');
      expect(result).toContain('Мои задачи');
      expect(result).toContain('M-001');
      expect(result).toContain('Office');
      expect(result).toContain('Пополнение');
    });

    it('should format tasks message in English', () => {
      const tasks: TelegramTaskInfo[] = [
        {
          id: 'task-1',
          status: TaskStatus.ASSIGNED,
          type_code: TaskType.COLLECTION,
          scheduled_date: new Date('2025-01-15'),
          machine: {
            id: 'machine-1',
            machine_number: 'M-002',
            name: 'Machine 2',
            location: { id: 'loc-2', name: 'Lobby' },
          },
        },
      ];

      const result = handler.formatTasksMessage(tasks, TelegramLanguage.EN);

      expect(result).toContain('My Tasks');
      expect(result).toContain('M-002');
      expect(result).toContain('Lobby');
      expect(result).toContain('Collection');
    });

    it('should handle tasks without machine info', () => {
      const tasks: TelegramTaskInfo[] = [
        {
          id: 'task-1',
          status: TaskStatus.IN_PROGRESS,
          type_code: TaskType.INSPECTION,
          scheduled_date: null,
          machine: null,
        },
      ];

      const result = handler.formatTasksMessage(tasks, TelegramLanguage.RU);

      expect(result).toContain('N/A');
    });

    it('should handle tasks with machine but no location', () => {
      const tasks: TelegramTaskInfo[] = [
        {
          id: 'task-1',
          status: TaskStatus.PENDING,
          type_code: TaskType.REPAIR,
          scheduled_date: new Date('2025-01-20'),
          machine: {
            id: 'machine-1',
            machine_number: 'M-003',
            name: 'Machine 3',
            location: null,
          },
        },
      ];

      const result = handler.formatTasksMessage(tasks, TelegramLanguage.RU);

      expect(result).toContain('M-003');
      expect(result).toContain('N/A');
    });

    it('should show correct status icons', () => {
      const tasks: TelegramTaskInfo[] = [
        {
          id: 'task-1',
          status: TaskStatus.PENDING,
          type_code: TaskType.REFILL,
          scheduled_date: new Date(),
          machine: { id: '1', machine_number: 'M-001', name: 'M1', location: { id: 'l1', name: 'L1' } },
        },
        {
          id: 'task-2',
          status: TaskStatus.ASSIGNED,
          type_code: TaskType.COLLECTION,
          scheduled_date: new Date(),
          machine: { id: '2', machine_number: 'M-002', name: 'M2', location: { id: 'l2', name: 'L2' } },
        },
        {
          id: 'task-3',
          status: TaskStatus.IN_PROGRESS,
          type_code: TaskType.INSPECTION,
          scheduled_date: new Date(),
          machine: { id: '3', machine_number: 'M-003', name: 'M3', location: { id: 'l3', name: 'L3' } },
        },
      ];

      const result = handler.formatTasksMessage(tasks, TelegramLanguage.RU);

      expect(result).toContain('⏳'); // PENDING
      expect(result).toContain('📌'); // ASSIGNED
      expect(result).toContain('🔄'); // IN_PROGRESS
    });

    it('should show correct type icons', () => {
      const tasks: TelegramTaskInfo[] = [
        {
          id: 'task-1',
          status: TaskStatus.PENDING,
          type_code: TaskType.REFILL,
          scheduled_date: new Date(),
          machine: { id: '1', machine_number: 'M-001', name: 'M1', location: { id: 'l1', name: 'L1' } },
        },
        {
          id: 'task-2',
          status: TaskStatus.PENDING,
          type_code: TaskType.COLLECTION,
          scheduled_date: new Date(),
          machine: { id: '2', machine_number: 'M-002', name: 'M2', location: { id: 'l2', name: 'L2' } },
        },
        {
          id: 'task-3',
          status: TaskStatus.PENDING,
          type_code: TaskType.INSPECTION,
          scheduled_date: new Date(),
          machine: { id: '3', machine_number: 'M-003', name: 'M3', location: { id: 'l3', name: 'L3' } },
        },
        {
          id: 'task-4',
          status: TaskStatus.PENDING,
          type_code: TaskType.REPAIR,
          scheduled_date: new Date(),
          machine: { id: '4', machine_number: 'M-004', name: 'M4', location: { id: 'l4', name: 'L4' } },
        },
      ];

      const result = handler.formatTasksMessage(tasks, TelegramLanguage.RU);

      expect(result).toContain('📦'); // REFILL
      expect(result).toContain('💰'); // COLLECTION
      expect(result).toContain('👁'); // INSPECTION
      expect(result).toContain('🔧'); // REPAIR
    });

    it('should handle unknown status with default icon', () => {
      const tasks: TelegramTaskInfo[] = [
        {
          id: 'task-1',
          status: 'unknown_status' as TaskStatus,
          type_code: TaskType.REFILL,
          scheduled_date: new Date(),
          machine: { id: '1', machine_number: 'M-001', name: 'M1', location: { id: 'l1', name: 'L1' } },
        },
      ];

      const result = handler.formatTasksMessage(tasks, TelegramLanguage.RU);

      expect(result).toContain('❓');
    });

    it('should handle unknown type with default icon', () => {
      const tasks: TelegramTaskInfo[] = [
        {
          id: 'task-1',
          status: TaskStatus.PENDING,
          type_code: 'unknown_type' as TaskType,
          scheduled_date: new Date(),
          machine: { id: '1', machine_number: 'M-001', name: 'M1', location: { id: 'l1', name: 'L1' } },
        },
      ];

      const result = handler.formatTasksMessage(tasks, TelegramLanguage.RU);

      expect(result).toContain('📋');
      expect(result).toContain('unknown_type');
    });
  });

  describe('formatMachinesMessage', () => {
    it('should format machines message with online status', () => {
      const machines: TelegramMachineInfo[] = [
        {
          id: 'machine-1',
          name: 'Coffee Machine',
          machine_number: 'M-001',
          status: 'online',
          location: 'Office Building',
        },
      ];

      const result = handler.formatMachinesMessage(machines, TelegramLanguage.RU);

      expect(result).toContain('🖥');
      expect(result).toContain('Coffee Machine');
      expect(result).toContain('🟢');
      expect(result).toContain('Office Building');
    });

    it('should format machines message with offline status', () => {
      const machines: TelegramMachineInfo[] = [
        {
          id: 'machine-1',
          name: 'Snack Machine',
          machine_number: 'M-002',
          status: 'offline',
          location: 'Lobby',
        },
      ];

      const result = handler.formatMachinesMessage(machines, TelegramLanguage.RU);

      expect(result).toContain('🔴');
      expect(result).toContain('Snack Machine');
    });

    it('should format multiple machines', () => {
      const machines: TelegramMachineInfo[] = [
        { id: '1', name: 'Machine 1', machine_number: 'M-001', status: 'online', location: 'A' },
        { id: '2', name: 'Machine 2', machine_number: 'M-002', status: 'offline', location: 'B' },
      ];

      const result = handler.formatMachinesMessage(machines, TelegramLanguage.EN);

      expect(result).toContain('Machine 1');
      expect(result).toContain('Machine 2');
      expect(result).toContain('🟢');
      expect(result).toContain('🔴');
    });
  });

  describe('formatAlertsMessage', () => {
    it('should show no alerts message when empty', () => {
      const result = handler.formatAlertsMessage([], TelegramLanguage.RU);

      expect(result).toContain('🔔');
      expect(result).toContain('Нет оповещений');
      expect(result).toContain('✓');
    });

    it('should format offline alert', () => {
      const alerts: TelegramAlertInfo[] = [
        {
          id: 'alert-1',
          type: 'offline',
          machine: 'M-001',
          time: '10:30',
        },
      ];

      const result = handler.formatAlertsMessage(alerts, TelegramLanguage.RU);

      expect(result).toContain('🔴');
      expect(result).toContain('M-001');
      expect(result).toContain('10:30');
    });

    it('should format error alert', () => {
      const alerts: TelegramAlertInfo[] = [
        {
          id: 'alert-1',
          type: 'error',
          machine: 'M-002',
          time: '14:45',
        },
      ];

      const result = handler.formatAlertsMessage(alerts, TelegramLanguage.RU);

      expect(result).toContain('⚠️');
      expect(result).toContain('M-002');
    });

    it('should format multiple alerts', () => {
      const alerts: TelegramAlertInfo[] = [
        { id: '1', type: 'offline', machine: 'M-001', time: '10:00' },
        { id: '2', type: 'error', machine: 'M-002', time: '11:00' },
      ];

      const result = handler.formatAlertsMessage(alerts, TelegramLanguage.EN);

      expect(result).toContain('M-001');
      expect(result).toContain('M-002');
    });
  });

  describe('formatStatsMessage', () => {
    it('should format stats message correctly', () => {
      const stats: TelegramStatsInfo = {
        total_machines: 50,
        online: 45,
        offline: 5,
        today_revenue: 125000,
        today_sales: 350,
        pending_tasks: 12,
      };

      const result = handler.formatStatsMessage(stats, TelegramLanguage.RU);

      expect(result).toContain('📊');
      expect(result).toContain('50');
      expect(result).toContain('45');
      expect(result).toContain('5');
      expect(result).toContain('125,000');
      expect(result).toContain('350');
      expect(result).toContain('12');
    });

    it('should format stats for different languages', () => {
      const stats: TelegramStatsInfo = {
        total_machines: 10,
        online: 8,
        offline: 2,
        today_revenue: 5000,
        today_sales: 25,
        pending_tasks: 3,
      };

      const result = handler.formatStatsMessage(stats, TelegramLanguage.EN);

      expect(result).toContain('🖥');
      expect(result).toContain('🟢');
      expect(result).toContain('🔴');
      expect(result).toContain('💰');
      expect(result).toContain('☕');
      expect(result).toContain('📋');
    });
  });

  describe('formatPendingUsersMessage', () => {
    it('should format pending users in Russian', () => {
      const users: TelegramPendingUserInfo[] = [
        {
          id: 'user-1',
          full_name: 'Иван Иванов',
          email: 'ivan@example.com',
          phone: '+79001234567',
          created_at: new Date('2025-01-10'),
        },
      ];

      const result = handler.formatPendingUsersMessage(users, TelegramLanguage.RU);

      expect(result).toContain('👥');
      expect(result).toContain('Пользователи в ожидании одобрения');
      expect(result).toContain('Иван Иванов');
      expect(result).toContain('ivan@example.com');
      expect(result).toContain('+79001234567');
      expect(result).toContain('1 пользователь');
    });

    it('should format pending users in English', () => {
      const users: TelegramPendingUserInfo[] = [
        {
          id: 'user-1',
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: null,
          created_at: new Date('2025-01-15'),
        },
        {
          id: 'user-2',
          full_name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
          created_at: new Date('2025-01-16'),
        },
      ];

      const result = handler.formatPendingUsersMessage(users, TelegramLanguage.EN);

      expect(result).toContain('Pending Users');
      expect(result).toContain('John Doe');
      expect(result).toContain('Jane Doe');
      expect(result).toContain('N/A'); // Phone is null
      expect(result).toContain('2 users pending approval');
    });

    it('should show singular form for one user in Russian', () => {
      const users: TelegramPendingUserInfo[] = [
        {
          id: 'user-1',
          full_name: 'Test User',
          email: 'test@example.com',
          phone: null,
          created_at: new Date(),
        },
      ];

      const result = handler.formatPendingUsersMessage(users, TelegramLanguage.RU);

      expect(result).toContain('1 пользователь в ожидании');
    });

    it('should show singular form for one user in English', () => {
      const users: TelegramPendingUserInfo[] = [
        {
          id: 'user-1',
          full_name: 'Test User',
          email: 'test@example.com',
          phone: null,
          created_at: new Date(),
        },
      ];

      const result = handler.formatPendingUsersMessage(users, TelegramLanguage.EN);

      expect(result).toContain('1 user pending approval');
    });
  });

  describe('formatUserInfoMessage', () => {
    it('should format user info in Russian', () => {
      const user = {
        full_name: 'Петр Петров',
        email: 'petr@example.com',
        phone: '+79009876543',
        created_at: new Date('2025-01-20'),
      };

      const result = handler.formatUserInfoMessage(user, TelegramLanguage.RU);

      expect(result).toContain('👤');
      expect(result).toContain('Информация о пользователе');
      expect(result).toContain('Петр Петров');
      expect(result).toContain('petr@example.com');
      expect(result).toContain('+79009876543');
      expect(result).toContain('Выберите роль для пользователя');
    });

    it('should format user info in English', () => {
      const user = {
        full_name: 'Alice Smith',
        email: 'alice@example.com',
        phone: undefined,
        created_at: new Date('2025-01-21'),
      };

      const result = handler.formatUserInfoMessage(user, TelegramLanguage.EN);

      expect(result).toContain('User Information');
      expect(result).toContain('Alice Smith');
      expect(result).toContain('alice@example.com');
      expect(result).toContain('N/A');
      expect(result).toContain('Select role for the user');
    });
  });

  describe('formatTaskStartedMessage', () => {
    it('should format task started message in Russian', () => {
      const task = {
        type_code: 'refill',
        machine: {
          machine_number: 'M-001',
          location: { id: 'office', name: 'Офис' },
        },
      };

      const result = handler.formatTaskStartedMessage(task, TelegramLanguage.RU);

      expect(result).toContain('🎉');
      expect(result).toContain('refill');
      expect(result).toContain('M-001');
      expect(result).toContain('Офис');
      expect(result).toContain('📸');
      expect(result).toContain('фото ДО');
    });

    it('should format task started message in English', () => {
      const task = {
        type_code: 'collection',
        machine: {
          machine_number: 'M-002',
          location: { id: 'loc-2', name: 'Lobby' },
        },
      };

      const result = handler.formatTaskStartedMessage(task, TelegramLanguage.EN);

      expect(result).toContain('Task');
      expect(result).toContain('started');
      expect(result).toContain('M-002');
      expect(result).toContain('Lobby');
      expect(result).toContain('BEFORE photo');
    });

    it('should handle missing machine info', () => {
      const task = {
        type_code: 'inspection',
        machine: undefined,
      };

      const result = handler.formatTaskStartedMessage(task, TelegramLanguage.RU);

      expect(result).toContain('N/A');
    });

    it('should handle missing location', () => {
      const task = {
        type_code: 'repair',
        machine: {
          machine_number: 'M-003',
          location: undefined,
        },
      };

      const result = handler.formatTaskStartedMessage(task, TelegramLanguage.EN);

      expect(result).toContain('M-003');
      expect(result).toContain('N/A');
    });
  });

  describe('formatRole', () => {
    it('should format all roles in Russian', () => {
      expect(handler.formatRole(UserRole.OWNER, TelegramLanguage.RU)).toBe('Владелец');
      expect(handler.formatRole(UserRole.ADMIN, TelegramLanguage.RU)).toBe('Администратор');
      expect(handler.formatRole(UserRole.MANAGER, TelegramLanguage.RU)).toBe('Менеджер');
      expect(handler.formatRole(UserRole.OPERATOR, TelegramLanguage.RU)).toBe('Оператор');
      expect(handler.formatRole(UserRole.COLLECTOR, TelegramLanguage.RU)).toBe('Инкассатор');
      expect(handler.formatRole(UserRole.TECHNICIAN, TelegramLanguage.RU)).toBe('Техник');
      expect(handler.formatRole(UserRole.VIEWER, TelegramLanguage.RU)).toBe('Просмотр');
    });

    it('should format all roles in English', () => {
      expect(handler.formatRole(UserRole.OWNER, TelegramLanguage.EN)).toBe('Owner');
      expect(handler.formatRole(UserRole.ADMIN, TelegramLanguage.EN)).toBe('Admin');
      expect(handler.formatRole(UserRole.MANAGER, TelegramLanguage.EN)).toBe('Manager');
      expect(handler.formatRole(UserRole.OPERATOR, TelegramLanguage.EN)).toBe('Operator');
      expect(handler.formatRole(UserRole.COLLECTOR, TelegramLanguage.EN)).toBe('Collector');
      expect(handler.formatRole(UserRole.TECHNICIAN, TelegramLanguage.EN)).toBe('Technician');
      expect(handler.formatRole(UserRole.VIEWER, TelegramLanguage.EN)).toBe('Viewer');
    });

    it('should return role as-is for unknown roles', () => {
      const unknownRole = 'UNKNOWN_ROLE' as UserRole;
      expect(handler.formatRole(unknownRole, TelegramLanguage.RU)).toBe('UNKNOWN_ROLE');
    });
  });
});
