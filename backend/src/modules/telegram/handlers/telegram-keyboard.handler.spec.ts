import { Test, TestingModule } from '@nestjs/testing';
import { TelegramKeyboardHandler } from './telegram-keyboard.handler';
import { TelegramI18nService } from '../services/telegram-i18n.service';
import { TelegramLanguage, TelegramUser } from '../entities/telegram-user.entity';
import { TaskStatus, TaskType } from '../../tasks/entities/task.entity';
import { UserRole } from '../../users/entities/user.entity';
import { TelegramTaskInfo, TelegramMachineInfo } from '../types/telegram.types';

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
      expect(keyboard[0][0].callback_data).toBe('menu_tasks');
      expect(keyboard[0][1].callback_data).toBe('menu_machines');

      // Second row: alerts and stats
      expect(keyboard[1][0].callback_data).toBe('menu_alerts');
      expect(keyboard[1][1].callback_data).toBe('menu_stats');

      // Third row: settings
      expect(keyboard[2][0].callback_data).toBe('menu_settings');
    });
  });

  describe('getVerificationKeyboard', () => {
    it('should return keyboard with check status button (RU)', () => {
      const result = handler.getVerificationKeyboard(TelegramLanguage.RU);

      expect(result.reply_markup.inline_keyboard).toHaveLength(1);
      expect(result.reply_markup.inline_keyboard[0][0].text).toContain('Проверить статус');
      expect(result.reply_markup.inline_keyboard[0][0].callback_data).toBe('check_verification');
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
      expect(result.reply_markup.inline_keyboard[0][0].callback_data).toBe('settings_notifications');
      expect(result.reply_markup.inline_keyboard[1][0].callback_data).toBe('settings_language');
      expect(result.reply_markup.inline_keyboard[2][0].callback_data).toBe('back_to_menu');
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

      expect(keyboard[0][0].callback_data).toBe('toggle_machine_offline');
      expect(keyboard[1][0].callback_data).toBe('toggle_low_stock');
      expect(keyboard[2][0].callback_data).toBe('toggle_maintenance_due');
      expect(keyboard[3][0].callback_data).toBe('toggle_task_assigned');
    });

    it('should handle null notification_preferences', () => {
      const user = { notification_preferences: null } as unknown as TelegramUser;

      const result = handler.getNotificationSettingsKeyboard(TelegramLanguage.EN, user);

      expect(result).toBeDefined();
      expect(result.reply_markup.inline_keyboard[0][0].text).toContain('⬜');
    });
  });

  describe('getTasksKeyboard', () => {
    it('should show up to 8 tasks', () => {
      const tasks: TelegramTaskInfo[] = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        type_code: TaskType.REFILL,
        status: TaskStatus.PENDING,
        machine: { machine_number: `M-00${i}` } as any,
      })) as TelegramTaskInfo[];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      // 8 tasks + 1 navigation row
      expect(keyboard.length).toBe(9);
    });

    it('should show "All tasks" button when more than 8 tasks', () => {
      const tasks: TelegramTaskInfo[] = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        type_code: TaskType.REFILL,
        status: TaskStatus.PENDING,
      })) as TelegramTaskInfo[];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;
      const lastRow = keyboard[keyboard.length - 1];

      expect(lastRow.some((btn: { text: string }) => btn.text.includes('All tasks (10)'))).toBe(
        true,
      );
    });

    it('should show "Continue" for in-progress tasks', () => {
      const tasks: TelegramTaskInfo[] = [
        {
          id: 'task-1',
          type_code: TaskType.REFILL,
          status: TaskStatus.IN_PROGRESS,
          machine: { machine_number: 'M-001' },
        } as TelegramTaskInfo,
      ];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).toContain('Continue');
    });

    it('should show "Start" for pending/assigned tasks', () => {
      const tasks: TelegramTaskInfo[] = [
        {
          id: 'task-1',
          type_code: TaskType.REFILL,
          status: TaskStatus.PENDING,
          machine: { machine_number: 'M-001' },
        } as TelegramTaskInfo,
      ];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).toContain('Start');
    });

    it('should include task type icons', () => {
      const tasks: TelegramTaskInfo[] = [
        {
          id: 'task-1',
          type_code: TaskType.REFILL,
          status: TaskStatus.PENDING,
          machine: { machine_number: 'M-001' },
        } as TelegramTaskInfo,
        {
          id: 'task-2',
          type_code: TaskType.COLLECTION,
          status: TaskStatus.PENDING,
          machine: { machine_number: 'M-002' },
        } as TelegramTaskInfo,
      ];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;

      expect(keyboard[0][0].text).toContain('📦'); // Refill icon
      expect(keyboard[1][0].text).toContain('💰'); // Collection icon
    });

    it('should have correct callback data with task IDs', () => {
      const tasks: TelegramTaskInfo[] = [
        {
          id: 'task-123',
          type_code: TaskType.REFILL,
          status: TaskStatus.PENDING,
        } as TelegramTaskInfo,
      ];

      const result = handler.getTasksKeyboard(tasks, TelegramLanguage.EN);

      expect(result.reply_markup.inline_keyboard[0][0].callback_data).toBe('task_start_task-123');
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

      expect(result.reply_markup.inline_keyboard[0][0].callback_data).toBe('view_machine_machine-abc');
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

      expect(keyboard[0][0].callback_data).toBe(`approve_user_user-456_role_${UserRole.OPERATOR}`);
      expect(keyboard[1][0].callback_data).toBe(`approve_user_user-456_role_${UserRole.COLLECTOR}`);
    });

    it('should have reject button with user ID', () => {
      const result = handler.getRoleSelectionKeyboard('user-789', TelegramLanguage.EN);
      const keyboard = result.reply_markup.inline_keyboard;
      const lastRow = keyboard[keyboard.length - 1];

      expect(lastRow[0].callback_data).toBe('reject_user_user-789');
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

      expect(keyboard[0][0].callback_data).toBe('step_done_task-abc_2');
      expect(keyboard[0][1].callback_data).toBe('step_skip_task-abc_2');
      expect(keyboard[1][0].callback_data).toBe('step_back_task-abc');
    });
  });
});
