import { Test, TestingModule } from '@nestjs/testing';
import { TelegramUIService } from './telegram-ui.service';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import {
  TelegramTaskInfo,
  TelegramMachineInfo,
  TelegramAlertInfo,
  TelegramStatsInfo,
} from '../../shared/types/telegram.types';

describe('TelegramUIService', () => {
  let service: TelegramUIService;

  const mockTelegramUser: Partial<TelegramUser> = {
    id: 'tg-user-1',
    telegram_id: '123456789',
    language: TelegramLanguage.RU,
    notification_preferences: {
      machine_offline: true,
      low_stock: false,
      maintenance_due: true,
      task_assigned: false,
    },
  };

  const mockTask: TelegramTaskInfo = {
    id: 'task-1',
    type_code: TaskType.REFILL,
    status: TaskStatus.ASSIGNED,
    machine: {
      id: 'machine-1',
      machine_number: 'M-001',
      location: { id: 'loc-1', name: 'Test Location' },
    },
    scheduled_date: new Date('2025-01-15'),
  };

  const mockMachine: TelegramMachineInfo = {
    id: 1,
    name: 'M-001',
    status: 'online',
    location: 'Test Location',
  };

  const mockAlert: TelegramAlertInfo = {
    id: 1,
    type: 'offline',
    machine: 'M-001',
    time: '2h ago',
  };

  const mockStats: TelegramStatsInfo = {
    total_machines: 10,
    online: 8,
    offline: 2,
    today_sales: 150,
    today_revenue: 5000,
    pending_tasks: 5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramUIService],
    }).compile();

    service = module.get<TelegramUIService>(TelegramUIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // Translation (t) tests
  // ============================================================================

  describe('t (translation)', () => {
    it('should return Russian translation', () => {
      const result = service.t(TelegramLanguage.RU, 'machines');
      expect(result).toBe('Машины');
    });

    it('should return English translation', () => {
      const result = service.t(TelegramLanguage.EN, 'machines');
      expect(result).toBe('Machines');
    });

    it('should handle function translations with args', () => {
      const result = service.t(TelegramLanguage.RU, 'welcome_back', 'Иван');
      expect(result).toContain('Иван');
      expect(result).toContain('Привет снова');
    });

    it('should handle function translations in English', () => {
      const result = service.t(TelegramLanguage.EN, 'welcome_back', 'John');
      expect(result).toContain('John');
      expect(result).toContain('Welcome back');
    });

    it('should return key if translation not found', () => {
      const result = service.t(TelegramLanguage.RU, 'unknown_key');
      expect(result).toBe('unknown_key');
    });

    it('should fallback to Russian for unsupported languages', () => {
      const result = service.t('uz' as TelegramLanguage, 'machines');
      expect(result).toBe('Машины');
    });

    it('should translate all common keys in Russian', () => {
      const keys = ['alerts', 'stats', 'settings', 'back', 'online', 'offline'];
      keys.forEach((key) => {
        const result = service.t(TelegramLanguage.RU, key);
        expect(result).not.toBe(key);
      });
    });

    it('should translate all common keys in English', () => {
      const keys = ['alerts', 'stats', 'settings', 'back', 'online', 'offline'];
      keys.forEach((key) => {
        const result = service.t(TelegramLanguage.EN, key);
        expect(result).not.toBe(key);
      });
    });

    it('should translate access_request_created with name', () => {
      const result = service.t(TelegramLanguage.RU, 'access_request_created', 'Тест');
      expect(result).toContain('Тест');
      expect(result).toContain('заявка на доступ');
    });

    it('should translate help message', () => {
      const result = service.t(TelegramLanguage.RU, 'help');
      expect(result).toContain('Справка');
      expect(result).toContain('/menu');
    });
  });

  // ============================================================================
  // Keyboard tests
  // ============================================================================

  describe('getMainMenuKeyboard', () => {
    it('should return keyboard with 4 buttons in Russian', () => {
      const keyboard = service.getMainMenuKeyboard(TelegramLanguage.RU);
      expect(keyboard.reply_markup).toBeDefined();
      expect(keyboard.reply_markup.inline_keyboard).toHaveLength(2);
      expect(keyboard.reply_markup.inline_keyboard[0]).toHaveLength(2);
      expect(keyboard.reply_markup.inline_keyboard[1]).toHaveLength(2);
    });

    it('should return keyboard with correct callbacks', () => {
      const keyboard = service.getMainMenuKeyboard(TelegramLanguage.EN);
      const buttons = keyboard.reply_markup.inline_keyboard.flat();
      const callbackData = buttons.map((b: any) => b.callback_data);
      expect(callbackData).toContain('menu_machines');
      expect(callbackData).toContain('menu_alerts');
      expect(callbackData).toContain('menu_stats');
      expect(callbackData).toContain('menu_settings');
    });
  });

  describe('getVerificationKeyboard', () => {
    it('should return keyboard with URL button', () => {
      const keyboard = service.getVerificationKeyboard(TelegramLanguage.RU);
      expect(keyboard.reply_markup).toBeDefined();
      expect(keyboard.reply_markup.inline_keyboard).toHaveLength(1);
      expect(keyboard.reply_markup.inline_keyboard[0][0]).toHaveProperty('url');
    });
  });

  describe('getSettingsKeyboard', () => {
    it('should return settings keyboard', () => {
      const keyboard = service.getSettingsKeyboard(TelegramLanguage.RU);
      expect(keyboard.reply_markup).toBeDefined();
      expect(keyboard.reply_markup.inline_keyboard.length).toBeGreaterThanOrEqual(3);
    });

    it('should include back button', () => {
      const keyboard = service.getSettingsKeyboard(TelegramLanguage.EN);
      const buttons = keyboard.reply_markup.inline_keyboard.flat();
      const backButton = buttons.find((b: any) => b.callback_data === 'back_to_menu');
      expect(backButton).toBeDefined();
    });
  });

  describe('getNotificationSettingsKeyboard', () => {
    it('should show enabled notifications with checkmark', () => {
      const keyboard = service.getNotificationSettingsKeyboard(
        TelegramLanguage.RU,
        mockTelegramUser as TelegramUser,
      );
      const buttons = keyboard.reply_markup.inline_keyboard.flat();
      const offlineButton = buttons.find((b: any) =>
        b.callback_data === 'toggle_machine_offline',
      );
      expect(offlineButton?.text).toContain('✅');
    });

    it('should show disabled notifications with empty checkbox', () => {
      const keyboard = service.getNotificationSettingsKeyboard(
        TelegramLanguage.RU,
        mockTelegramUser as TelegramUser,
      );
      const buttons = keyboard.reply_markup.inline_keyboard.flat();
      const lowStockButton = buttons.find((b: any) =>
        b.callback_data === 'toggle_low_stock',
      );
      expect(lowStockButton?.text).toContain('⬜');
    });

    it('should handle user without notification preferences', () => {
      const userNoPrefs: Partial<TelegramUser> = {
        ...mockTelegramUser,
        notification_preferences: undefined,
      };
      const keyboard = service.getNotificationSettingsKeyboard(
        TelegramLanguage.EN,
        userNoPrefs as TelegramUser,
      );
      expect(keyboard.reply_markup).toBeDefined();
    });
  });

  describe('getMachinesKeyboard', () => {
    it('should show machines with status icons', () => {
      const keyboard = service.getMachinesKeyboard([mockMachine], TelegramLanguage.RU);
      const buttons = keyboard.reply_markup.inline_keyboard.flat();
      const machineButton = buttons.find((b: any) =>
        b.callback_data?.startsWith('view_machine_'),
      );
      expect(machineButton?.text).toContain('🟢');
    });

    it('should show offline machines with red icon', () => {
      const offlineMachine = { ...mockMachine, status: 'offline' };
      const keyboard = service.getMachinesKeyboard([offlineMachine], TelegramLanguage.RU);
      const buttons = keyboard.reply_markup.inline_keyboard.flat();
      const machineButton = buttons.find((b: any) =>
        b.callback_data?.startsWith('view_machine_'),
      );
      expect(machineButton?.text).toContain('🔴');
    });

    it('should limit to 5 machines', () => {
      const machines = Array.from({ length: 10 }, (_, i) => ({
        ...mockMachine,
        id: i,
        name: `M-${i}`,
      }));
      const keyboard = service.getMachinesKeyboard(machines, TelegramLanguage.RU);
      // 5 machine buttons + 1 back button
      expect(keyboard.reply_markup.inline_keyboard.length).toBe(6);
    });

    it('should include back button', () => {
      const keyboard = service.getMachinesKeyboard([mockMachine], TelegramLanguage.EN);
      const buttons = keyboard.reply_markup.inline_keyboard.flat();
      const backButton = buttons.find((b: any) => b.callback_data === 'back_to_menu');
      expect(backButton).toBeDefined();
    });
  });

  describe('getAlertsKeyboard', () => {
    it('should show acknowledge buttons for alerts', () => {
      const keyboard = service.getAlertsKeyboard([mockAlert], TelegramLanguage.RU);
      const buttons = keyboard.reply_markup.inline_keyboard.flat();
      const ackButton = buttons.find((b: any) =>
        b.callback_data?.startsWith('ack_alert_'),
      );
      expect(ackButton).toBeDefined();
    });

    it('should limit to 5 alerts', () => {
      const alerts = Array.from({ length: 10 }, (_, i) => ({
        ...mockAlert,
        id: i,
      }));
      const keyboard = service.getAlertsKeyboard(alerts, TelegramLanguage.RU);
      // 5 alert buttons + 1 back button
      expect(keyboard.reply_markup.inline_keyboard.length).toBe(6);
    });
  });

  describe('getTasksKeyboard', () => {
    it('should show task buttons with type icons', () => {
      const keyboard = service.getTasksKeyboard([mockTask], TelegramLanguage.RU);
      const buttons = keyboard.reply_markup.inline_keyboard.flat();
      const taskButton = buttons.find((b: any) =>
        b.callback_data?.startsWith('task_start_'),
      );
      expect(taskButton?.text).toContain('📦'); // Refill icon
    });

    it('should show Continue for in-progress tasks', () => {
      const inProgressTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      const keyboard = service.getTasksKeyboard([inProgressTask], TelegramLanguage.RU);
      const buttons = keyboard.reply_markup.inline_keyboard.flat();
      const taskButton = buttons.find((b: any) =>
        b.callback_data?.startsWith('task_start_'),
      );
      expect(taskButton?.text).toContain('Продолжить');
    });

    it('should show Start for pending tasks', () => {
      const keyboard = service.getTasksKeyboard([mockTask], TelegramLanguage.RU);
      const buttons = keyboard.reply_markup.inline_keyboard.flat();
      const taskButton = buttons.find((b: any) =>
        b.callback_data?.startsWith('task_start_'),
      );
      expect(taskButton?.text).toContain('Начать');
    });

    it('should limit to 8 tasks', () => {
      const tasks = Array.from({ length: 15 }, (_, i) => ({
        ...mockTask,
        id: `task-${i}`,
      }));
      const keyboard = service.getTasksKeyboard(tasks, TelegramLanguage.RU);
      // 8 task buttons + 1 row with "all tasks" + refresh
      const taskButtons = keyboard.reply_markup.inline_keyboard
        .flat()
        .filter((b: any) => b.callback_data?.startsWith('task_start_'));
      expect(taskButtons.length).toBe(8);
    });

    it('should show "All tasks" button when more than 8', () => {
      const tasks = Array.from({ length: 15 }, (_, i) => ({
        ...mockTask,
        id: `task-${i}`,
      }));
      const keyboard = service.getTasksKeyboard(tasks, TelegramLanguage.RU);
      const buttons = keyboard.reply_markup.inline_keyboard.flat();
      const allTasksButton = buttons.find((b: any) =>
        b.callback_data === 'tasks_show_all',
      );
      expect(allTasksButton?.text).toContain('15');
    });

    it('should include refresh button', () => {
      const keyboard = service.getTasksKeyboard([mockTask], TelegramLanguage.EN);
      const buttons = keyboard.reply_markup.inline_keyboard.flat();
      const refreshButton = buttons.find((b: any) => b.callback_data === 'refresh_tasks');
      expect(refreshButton).toBeDefined();
    });

    it('should handle different task types', () => {
      const taskTypes = [
        { type: TaskType.REFILL, icon: '📦' },
        { type: TaskType.COLLECTION, icon: '💰' },
        { type: TaskType.REPAIR, icon: '🔧' },
        { type: TaskType.INSPECTION, icon: '👁' },
      ];

      taskTypes.forEach(({ type, icon }) => {
        const task = { ...mockTask, type_code: type };
        const keyboard = service.getTasksKeyboard([task], TelegramLanguage.RU);
        const buttons = keyboard.reply_markup.inline_keyboard.flat();
        const taskButton = buttons.find((b: any) =>
          b.callback_data?.startsWith('task_start_'),
        );
        expect(taskButton?.text).toContain(icon);
      });
    });
  });

  // ============================================================================
  // Message formatting tests
  // ============================================================================

  describe('formatTasksMessage', () => {
    it('should format tasks list in Russian', () => {
      const message = service.formatTasksMessage([mockTask], TelegramLanguage.RU);
      expect(message).toContain('Мои задачи');
      expect(message).toContain('Пополнение');
      expect(message).toContain('M-001');
    });

    it('should format tasks list in English', () => {
      const message = service.formatTasksMessage([mockTask], TelegramLanguage.EN);
      expect(message).toContain('My Tasks');
      expect(message).toContain('Refill');
    });

    it('should show status icons', () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      const message = service.formatTasksMessage([pendingTask], TelegramLanguage.RU);
      expect(message).toContain('⏳');
    });

    it('should handle task without machine', () => {
      const taskNoMachine = { ...mockTask, machine: undefined };
      const message = service.formatTasksMessage([taskNoMachine], TelegramLanguage.RU);
      expect(message).toContain('N/A');
    });

    it('should handle task without scheduled date', () => {
      const taskNoDate = { ...mockTask, scheduled_date: null };
      const message = service.formatTasksMessage([taskNoDate], TelegramLanguage.RU);
      expect(message).toContain('N/A');
    });

    it('should include footer hint', () => {
      const message = service.formatTasksMessage([mockTask], TelegramLanguage.RU);
      expect(message).toContain('💡');
    });
  });

  describe('formatMachinesMessage', () => {
    it('should format machines list', () => {
      const message = service.formatMachinesMessage([mockMachine], TelegramLanguage.RU);
      expect(message).toContain('Машины');
      expect(message).toContain('M-001');
      expect(message).toContain('🟢');
    });

    it('should show offline status', () => {
      const offlineMachine = { ...mockMachine, status: 'offline' };
      const message = service.formatMachinesMessage([offlineMachine], TelegramLanguage.RU);
      expect(message).toContain('🔴');
      expect(message).toContain('Оффлайн');
    });

    it('should format in English', () => {
      const message = service.formatMachinesMessage([mockMachine], TelegramLanguage.EN);
      expect(message).toContain('Machines');
      expect(message).toContain('Online');
    });
  });

  describe('formatAlertsMessage', () => {
    it('should format alerts list', () => {
      const message = service.formatAlertsMessage([mockAlert], TelegramLanguage.RU);
      expect(message).toContain('Уведомления');
      expect(message).toContain('M-001');
    });

    it('should show "no alerts" when empty', () => {
      const message = service.formatAlertsMessage([], TelegramLanguage.RU);
      expect(message).toContain('Нет активных уведомлений');
      expect(message).toContain('✓');
    });

    it('should show "no alerts" in English', () => {
      const message = service.formatAlertsMessage([], TelegramLanguage.EN);
      expect(message).toContain('No active alerts');
    });
  });

  describe('formatStatsMessage', () => {
    it('should format stats in Russian', () => {
      const message = service.formatStatsMessage(mockStats, TelegramLanguage.RU);
      expect(message).toContain('Статистика');
      expect(message).toContain('10');
      expect(message).toContain('8');
      expect(message).toContain('2');
      expect(message).toContain('5,000'); // toLocaleString uses comma separator
      expect(message).toContain('150');
    });

    it('should format stats in English', () => {
      const message = service.formatStatsMessage(mockStats, TelegramLanguage.EN);
      expect(message).toContain('Statistics');
      expect(message).toContain('Total machines');
      expect(message).toContain('Today revenue');
    });

    it('should show icons', () => {
      const message = service.formatStatsMessage(mockStats, TelegramLanguage.RU);
      expect(message).toContain('🖥');
      expect(message).toContain('🟢');
      expect(message).toContain('🔴');
      expect(message).toContain('💰');
      expect(message).toContain('📋');
    });
  });
});
