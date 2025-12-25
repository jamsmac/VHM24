import { Test, TestingModule } from '@nestjs/testing';
import { TelegramKeyboardHandler } from './telegram-keyboard.handler';
import { TelegramI18nService } from '../services/telegram-i18n.service';
import { TelegramLanguage, TelegramUser } from '../entities/telegram-user.entity';
import { TaskStatus, TaskType } from '../../tasks/entities/task.entity';
import { UserRole } from '../../users/entities/user.entity';
import { TelegramTaskInfo, TelegramMachineInfo } from '../types/telegram.types';
import { InlineKeyboardButton } from 'telegraf/types';

// Helper to extract callback_data from InlineKeyboardButton
const getCallbackData = (button: InlineKeyboardButton): string | undefined => {
  return 'callback_data' in button ? button.callback_data : undefined;
};

// Helper to create test tasks
const createTestTask = (overrides: Partial<TelegramTaskInfo> = {}): TelegramTaskInfo => ({
  id: 'task-1',
  type_code: TaskType.REFILL,
  status: TaskStatus.PENDING,
  scheduled_date: new Date().toISOString(),
  ...overrides,
});

describe('TelegramKeyboardHandler', () => {
  let handler: TelegramKeyboardHandler;
  let i18nService: jest.Mocked<TelegramI18nService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramKeyboardHandler,
        {
          provide: TelegramI18nService,
          useValue: {
            t: jest.fn().mockImplementation((lang, key) => {
              const translations: Record<string, string> = {
                tasks: 'Tasks',
                machines: 'Machines',
                alerts: 'Alerts',
                statistics: 'Statistics',
                settings: 'Settings',
                open_web_app: 'Open Web App',
                back: 'Back',
                notifications: 'Notifications',
                language: 'Language',
                acknowledge: 'Acknowledge',
                notif_machine_offline: 'Machine Offline',
                notif_low_stock: 'Low Stock',
                notif_maintenance_due: 'Maintenance Due',
                notif_task_assigned: 'Task Assigned',
              };
              return translations[key] || key;
            }),
          },
        },
      ],
    }).compile();

    handler = module.get<TelegramKeyboardHandler>(TelegramKeyboardHandler);
    i18nService = module.get(TelegramI18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMainMenuKeyboard', () => {
    it('should return keyboard with all main menu options', () => {
      const result = handler.getMainMenuKeyboard(TelegramLanguage.EN);

      expect(result).toBeDefined();
      expect(result.reply_markup).toBeDefined();
      expect(result.reply_markup.inline_keyboard).toHaveLength(4);
    });

    it('should use i18n service for translations', () => {
      handler.getMainMenuKeyboard(TelegramLanguage.RU);

      expect(i18nService.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'tasks');
      expect(i18nService.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'machines');
      expect(i18nService.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'alerts');
      expect(i18nService.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'statistics');
      expect(i18nService.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'settings');
    });

    it('should have correct callback data for buttons', () => {
      const result = handler.getMainMenuKeyboard(TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      // First row: tasks and machines
      expect(getCallbackData(keyboard[0][0])).toBe('menu_tasks');
      expect(getCallbackData(keyboard[0][1])).toBe('menu_machines');

      // Second row: alerts and stats
      expect(getCallbackData(keyboard[1][0])).toBe('menu_alerts');
      expect(getCallbackData(keyboard[1][1])).toBe('menu_stats');

      // Third row: settings
      expect(getCallbackData(keyboard[2][0])).toBe('menu_settings');
    });
  });

  describe('getVerificationKeyboard', () => {
    it('should return keyboard with check status button (RU)', () => {
      const result = handler.getVerificationKeyboard(TelegramLanguage.RU);

      expect(result.reply_markup.inline_keyboard).toHaveLength(1);
      expect(result.reply_markup.inline_keyboard[0][0].text).toContain('Проверить статус');
      expect(getCallbackData(result.reply_markup.inline_keyboard[0][0])).toBe('check_verification');
    });

    it('should return keyboard with check status button (EN)', () => {
      const result = handler.getVerificationKeyboard(TelegramLanguage.EN);

      expect(result.reply_markup.inline_keyboard[0][0].text).toContain('Check Status');
    });
  });

  describe('getSettingsKeyboard', () => {
    it('should return keyboard with settings options', () => {
      const result = handler.getSettingsKeyboard(TelegramLanguage.EN);

      expect(result.reply_markup.inline_keyboard).toHaveLength(3);
      expect(getCallbackData(result.reply_markup.inline_keyboard[0][0])).toBe('settings_notifications');
      expect(getCallbackData(result.reply_markup.inline_keyboard[1][0])).toBe('settings_language');
      expect(getCallbackData(result.reply_markup.inline_keyboard[2][0])).toBe('back_to_menu');
    });
  });

  describe('getNotificationSettingsKeyboard', () => {
    it('should show enabled notifications with checkmark', () => {
      const user = {
        notification_preferences: {
          machine_offline: true,
          low_stock: true,
          maintenance_due: false,
          task_assigned: false,
        },
      } as TelegramUser;

      const result = handler.getNotificationSettingsKeyboard(TelegramLanguage.EN, user);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).toContain('✅');
      expect(keyboard[1][0].text).toContain('✅');
      expect(keyboard[2][0].text).toContain('⬜');
      expect(keyboard[3][0].text).toContain('⬜');
    });

    it('should have toggle callback data for each notification type', () => {
      const user = { notification_preferences: {} } as TelegramUser;

      const result = handler.getNotificationSettingsKeyboard(TelegramLanguage.EN, user);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(getCallbackData(keyboard[0][0])).toBe('toggle_machine_offline');
      expect(getCallbackData(keyboard[1][0])).toBe('toggle_low_stock');
      expect(getCallbackData(keyboard[2][0])).toBe('toggle_maintenance_due');
      expect(getCallbackData(keyboard[3][0])).toBe('toggle_task_assigned');
    });

    it('should handle null notification_preferences', () => {
      const user = { notification_preferences: null } as unknown as TelegramUser;

      const result = handler.getNotificationSettingsKeyboard(TelegramLanguage.EN, user);

      expect(result).toBeDefined();
      expect(result.reply_markup.inline_keyboard[0][0].text).toContain('⬜');
    });

    it('should show all notifications as enabled', () => {
      const user = {
        notification_preferences: {
          machine_offline: true,
          low_stock: true,
          maintenance_due: true,
          task_assigned: true,
        },
      } as TelegramUser;

      const result = handler.getNotificationSettingsKeyboard(TelegramLanguage.EN, user);
      const keyboard = result.reply_markup.inline_keyboard;

      // All notifications should show checkmark
      expect(keyboard[0][0].text).toContain('✅');
      expect(keyboard[1][0].text).toContain('✅');
      expect(keyboard[2][0].text).toContain('✅');
      expect(keyboard[3][0].text).toContain('✅');
    });
  });

  describe('getTasksKeyboard', () => {
    it('should show up to 8 tasks', () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createTestTask({
          id: `task-${i}`,
          machine: { id: `m-${i}`, machine_number: `M-00${i}` },
        }),
      );

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      // 8 tasks + 1 navigation row
      expect(keyboard.length).toBe(9);
    });

    it('should show "All tasks" button when more than 8 tasks', () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createTestTask({ id: `task-${i}` }),
      );

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;
      const lastRow = keyboard[keyboard.length - 1];

      expect(lastRow.some((btn: { text: string }) => btn.text.includes('All tasks (10)'))).toBe(
        true,
      );
    });

    it('should show "Continue" for in-progress tasks', () => {
      const tasks = [
        createTestTask({
          id: 'task-1',
          status: TaskStatus.IN_PROGRESS,
          machine: { id: 'm-1', machine_number: 'M-001' },
        }),
      ];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).toContain('Continue');
    });

    it('should show "Start" for pending/assigned tasks', () => {
      const tasks = [
        createTestTask({
          id: 'task-1',
          status: TaskStatus.PENDING,
          machine: { id: 'm-1', machine_number: 'M-001' },
        }),
      ];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).toContain('Start');
    });

    it('should include task type icons', () => {
      const tasks = [
        createTestTask({
          id: 'task-1',
          type_code: TaskType.REFILL,
          machine: { id: 'm-1', machine_number: 'M-001' },
        }),
        createTestTask({
          id: 'task-2',
          type_code: TaskType.COLLECTION,
          machine: { id: 'm-2', machine_number: 'M-002' },
        }),
      ];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).toContain('📦'); // Refill icon
      expect(keyboard[1][0].text).toContain('💰'); // Collection icon
    });

    it('should have correct callback data with task IDs', () => {
      const tasks = [createTestTask({ id: 'task-123' })];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);

      expect(getCallbackData(result.reply_markup.inline_keyboard[0][0])).toBe('task_start_task-123');
    });

    it('should show different icons for different task types', () => {
      const tasks = [
        createTestTask({ id: 'task-1', type_code: TaskType.INSPECTION }),
        createTestTask({ id: 'task-2', type_code: TaskType.REPAIR }),
        createTestTask({ id: 'task-3', type_code: 'unknown_type' as any }),
      ];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).toContain('👁'); // Inspection icon
      expect(keyboard[1][0].text).toContain('🔧'); // Repair icon
      expect(keyboard[2][0].text).toContain('📋'); // Default icon for unknown type
    });

    it('should use index as label when machine is missing', () => {
      const tasks = [createTestTask({ id: 'task-1', machine: null })];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).toContain('#1');
    });

    it('should show Russian labels for RU language', () => {
      const tasks = [
        createTestTask({
          id: 'task-1',
          status: TaskStatus.IN_PROGRESS,
          machine: { id: 'm-1', machine_number: 'M-001' },
        }),
        createTestTask({
          id: 'task-2',
          status: TaskStatus.PENDING,
          machine: { id: 'm-2', machine_number: 'M-002' },
        }),
      ];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.RU);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).toContain('Продолжить');
      expect(keyboard[1][0].text).toContain('Начать');
    });

    it('should show Russian "All tasks" when more than 8 tasks', () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createTestTask({ id: `task-${i}` }),
      );

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.RU);
      const keyboard = result.reply_markup.inline_keyboard;
      const lastRow = keyboard[keyboard.length - 1];

      expect(lastRow.some((btn: { text: string }) => btn.text.includes('Все задачи'))).toBe(true);
    });

    it('should not show "All tasks" button when 8 or fewer tasks', () => {
      const tasks = Array.from({ length: 5 }, (_, i) =>
        createTestTask({ id: `task-${i}` }),
      );

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;
      const lastRow = keyboard[keyboard.length - 1];

      expect(lastRow.some((btn: { text: string }) => btn.text.includes('All tasks'))).toBe(false);
    });

    it('should show different status icons', () => {
      const tasks = [
        createTestTask({
          id: 'task-1',
          status: TaskStatus.PENDING,
          machine: { id: 'm-1', machine_number: 'M-001' },
        }),
        createTestTask({
          id: 'task-2',
          status: TaskStatus.ASSIGNED,
          machine: { id: 'm-2', machine_number: 'M-002' },
        }),
        createTestTask({
          id: 'task-3',
          status: 'unknown_status' as any,
          machine: { id: 'm-3', machine_number: 'M-003' },
        }),
      ];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      // PENDING tasks show ▶️ Start (no status icon in text, but getTaskStatusIcon returns ⏳)
      // ASSIGNED tasks show ▶️ Start
      // Unknown status returns ❓
      expect(keyboard[0][0].text).toContain('Start');
      expect(keyboard[1][0].text).toContain('Start');
      expect(keyboard[2][0].text).toContain('Start');
    });
  });

  describe('getMachinesKeyboard', () => {
    it('should show up to 5 machines', () => {
      const machines: TelegramMachineInfo[] = Array.from({ length: 7 }, (_, i) => ({
        id: `machine-${i}`,
        name: `Machine ${i}`,
        status: 'online',
      })) as TelegramMachineInfo[];

      const result = handler.getMachinesKeyboard(machines, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      // 5 machines + back button
      expect(keyboard.length).toBe(6);
    });

    it('should show green circle for online machines', () => {
      const machines: TelegramMachineInfo[] = [
        { id: 'machine-1', name: 'Coffee Machine', status: 'online' } as TelegramMachineInfo,
      ];

      const result = handler.getMachinesKeyboard(machines, TelegramLanguage.EN);

      expect(result.reply_markup.inline_keyboard[0][0].text).toContain('🟢');
    });

    it('should show red circle for offline machines', () => {
      const machines: TelegramMachineInfo[] = [
        { id: 'machine-1', name: 'Coffee Machine', status: 'offline' } as TelegramMachineInfo,
      ];

      const result = handler.getMachinesKeyboard(machines, TelegramLanguage.EN);

      expect(result.reply_markup.inline_keyboard[0][0].text).toContain('🔴');
    });

    it('should have correct callback data with machine IDs', () => {
      const machines: TelegramMachineInfo[] = [
        { id: 'machine-abc', name: 'Test', status: 'online' } as TelegramMachineInfo,
      ];

      const result = handler.getMachinesKeyboard(machines, TelegramLanguage.EN);

      expect(getCallbackData(result.reply_markup.inline_keyboard[0][0])).toBe('view_machine_machine-abc');
    });
  });

  describe('getAlertsKeyboard', () => {
    const createAlert = (id: string, type: string) => ({
      id,
      type,
      machine: `Machine-${id}`,
      time: new Date().toISOString(),
    });

    it('should show up to 5 alerts', () => {
      const alerts = Array.from({ length: 7 }, (_, i) => createAlert(`alert-${i}`, 'offline'));

      const result = handler.getAlertsKeyboard(alerts, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      // 5 alerts + back button
      expect(keyboard.length).toBe(6);
    });

    it('should have acknowledge button for each alert', () => {
      const alerts = [
        createAlert('alert-123', 'low_stock'),
        createAlert('alert-456', 'offline'),
      ];

      const result = handler.getAlertsKeyboard(alerts, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(getCallbackData(keyboard[0][0])).toBe('ack_alert_alert-123');
      expect(getCallbackData(keyboard[1][0])).toBe('ack_alert_alert-456');
      expect(keyboard[0][0].text).toContain('Acknowledge');
    });

    it('should have back button', () => {
      const alerts = [createAlert('alert-1', 'error')];

      const result = handler.getAlertsKeyboard(alerts, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;
      const lastRow = keyboard[keyboard.length - 1];

      expect(getCallbackData(lastRow[0])).toBe('back_to_menu');
    });

    it('should handle empty alerts array', () => {
      const result = handler.getAlertsKeyboard([], TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      // Only back button
      expect(keyboard.length).toBe(1);
      expect(getCallbackData(keyboard[0][0])).toBe('back_to_menu');
    });
  });

  describe('getPendingUsersKeyboard', () => {
    const createUser = (id: string, fullName: string) => ({
      id,
      full_name: fullName,
      email: `${id}@example.com`,
      created_at: new Date(),
    });

    it('should show up to 5 pending users', () => {
      const users = Array.from({ length: 7 }, (_, i) => createUser(`user-${i}`, `User ${i}`));

      const result = handler.getPendingUsersKeyboard(users, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      // 5 users + refresh button
      expect(keyboard.length).toBe(6);
    });

    it('should truncate long names', () => {
      const users = [createUser('user-1', 'This Is A Very Long Name That Should Be Truncated')];

      const result = handler.getPendingUsersKeyboard(users, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).toContain('...');
      expect(keyboard[0][0].text.length).toBeLessThan(30);
    });

    it('should not truncate short names', () => {
      const users = [createUser('user-1', 'John Doe')];

      const result = handler.getPendingUsersKeyboard(users, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).not.toContain('...');
      expect(keyboard[0][0].text).toContain('John Doe');
    });

    it('should have expand callback with user ID', () => {
      const users = [createUser('user-abc', 'Test User')];

      const result = handler.getPendingUsersKeyboard(users, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(getCallbackData(keyboard[0][0])).toBe('expand_user_user-abc');
    });

    it('should have refresh button with correct text (EN)', () => {
      const users = [createUser('user-1', 'Test')];

      const result = handler.getPendingUsersKeyboard(users, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;
      const lastRow = keyboard[keyboard.length - 1];

      expect(lastRow[0].text).toContain('Refresh');
      expect(getCallbackData(lastRow[0])).toBe('refresh_pending_users');
    });

    it('should have refresh button with correct text (RU)', () => {
      const users = [createUser('user-1', 'Test')];

      const result = handler.getPendingUsersKeyboard(users, TelegramLanguage.RU);
      const keyboard = result.reply_markup.inline_keyboard;
      const lastRow = keyboard[keyboard.length - 1];

      expect(lastRow[0].text).toContain('Обновить');
    });

    it('should handle empty users array', () => {
      const result = handler.getPendingUsersKeyboard([], TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      // Only refresh button
      expect(keyboard.length).toBe(1);
      expect(getCallbackData(keyboard[0][0])).toBe('refresh_pending_users');
    });
  });

  describe('getRoleSelectionKeyboard', () => {
    it('should show all available roles', () => {
      const result = handler.getRoleSelectionKeyboard('user-123', TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      // 5 roles + reject button
      expect(keyboard.length).toBe(6);
    });

    it('should include user ID and role in callback data', () => {
      const result = handler.getRoleSelectionKeyboard('user-456', TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(getCallbackData(keyboard[0][0])).toBe(`approve_user_user-456_role_${UserRole.OPERATOR}`);
      expect(getCallbackData(keyboard[1][0])).toBe(`approve_user_user-456_role_${UserRole.COLLECTOR}`);
    });

    it('should have reject button with user ID', () => {
      const result = handler.getRoleSelectionKeyboard('user-789', TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;
      const lastRow = keyboard[keyboard.length - 1];

      expect(getCallbackData(lastRow[0])).toBe('reject_user_user-789');
      expect(lastRow[0].text).toContain('Reject');
    });

    it('should translate role labels based on language', () => {
      const resultRu = handler.getRoleSelectionKeyboard('user-123', TelegramLanguage.RU);

      expect(resultRu.reply_markup.inline_keyboard[0][0].text).toContain('Оператор');
      expect(resultRu.reply_markup.inline_keyboard[1][0].text).toContain('Инкассатор');
    });
  });

  describe('getStepKeyboard', () => {
    it('should show Done and Skip buttons', () => {
      const result = handler.getStepKeyboard('task-123', 0, TelegramLanguage.EN, false);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).toContain('Done');
      expect(keyboard[0][1].text).toContain('Skip');
    });

    it('should include Back button when canGoBack is true', () => {
      const result = handler.getStepKeyboard('task-123', 1, TelegramLanguage.EN, true);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard.length).toBe(2);
      expect(keyboard[1][0].text).toContain('Back');
    });

    it('should not include Back button when canGoBack is false', () => {
      const result = handler.getStepKeyboard('task-123', 0, TelegramLanguage.EN, false);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard.length).toBe(1);
    });

    it('should have correct callback data with task ID and step index', () => {
      const result = handler.getStepKeyboard('task-abc', 2, TelegramLanguage.EN, true);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(getCallbackData(keyboard[0][0])).toBe('step_done_task-abc_2');
      expect(getCallbackData(keyboard[0][1])).toBe('step_skip_task-abc_2');
      expect(getCallbackData(keyboard[1][0])).toBe('step_back_task-abc');
    });

    it('should show Russian labels for RU language', () => {
      const result = handler.getStepKeyboard('task-123', 0, TelegramLanguage.RU, false);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).toContain('Готово');
      expect(keyboard[0][1].text).toContain('Пропустить');
    });

    it('should show Russian back button when canGoBack is true', () => {
      const result = handler.getStepKeyboard('task-123', 1, TelegramLanguage.RU, true);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[1][0].text).toContain('Назад');
    });
  });
});
