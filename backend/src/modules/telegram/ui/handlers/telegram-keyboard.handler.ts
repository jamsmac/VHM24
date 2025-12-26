/**
 * Telegram Keyboard Handler
 *
 * Handles all keyboard generation for Telegram bot:
 * - Main menu keyboards
 * - Task keyboards
 * - Settings keyboards
 * - Admin approval keyboards
 */

import { Injectable } from '@nestjs/common';
import { Markup } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { UserRole } from '../../../users/entities/user.entity';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import {
  TelegramTaskInfo,
  TelegramMachineInfo,
  TelegramAlertInfo,
  TelegramPendingUserInfo,
  TelegramKeyboardRow,
} from '../../shared/types/telegram.types';
import { TelegramI18nService } from '../../i18n/services/telegram-i18n.service';

@Injectable()
export class TelegramKeyboardHandler {
  constructor(private readonly i18n: TelegramI18nService) {}

  /**
   * Main menu keyboard
   */
  getMainMenuKeyboard(lang: TelegramLanguage) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`📋 ${this.i18n.t(lang, 'tasks')}`, 'menu_tasks'),
        Markup.button.callback(`🖥 ${this.i18n.t(lang, 'machines')}`, 'menu_machines'),
      ],
      [
        Markup.button.callback(`🔔 ${this.i18n.t(lang, 'alerts')}`, 'menu_alerts'),
        Markup.button.callback(`📊 ${this.i18n.t(lang, 'statistics')}`, 'menu_stats'),
      ],
      [Markup.button.callback(`⚙️ ${this.i18n.t(lang, 'settings')}`, 'menu_settings')],
      [
        Markup.button.url(
          this.i18n.t(lang, 'open_web_app'),
          process.env.FRONTEND_URL || 'https://vendhub.com',
        ),
      ],
    ]);
  }

  /**
   * Verification keyboard for unverified users
   */
  getVerificationKeyboard(lang: TelegramLanguage) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '🔄 Проверить статус' : '🔄 Check Status',
          'check_verification',
        ),
      ],
    ]);
  }

  /**
   * Settings menu keyboard
   */
  getSettingsKeyboard(lang: TelegramLanguage) {
    return Markup.inlineKeyboard([
      [Markup.button.callback(`🔔 ${this.i18n.t(lang, 'notifications')}`, 'settings_notifications')],
      [Markup.button.callback(`🌐 ${this.i18n.t(lang, 'language')}`, 'settings_language')],
      [Markup.button.callback(this.i18n.t(lang, 'back'), 'back_to_menu')],
    ]);
  }

  /**
   * Notification settings keyboard
   */
  getNotificationSettingsKeyboard(lang: TelegramLanguage, user: TelegramUser) {
    const prefs = user.notification_preferences || {};

    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          `${prefs.machine_offline ? '✅' : '⬜'} ${this.i18n.t(lang, 'notif_machine_offline')}`,
          'toggle_machine_offline',
        ),
      ],
      [
        Markup.button.callback(
          `${prefs.low_stock ? '✅' : '⬜'} ${this.i18n.t(lang, 'notif_low_stock')}`,
          'toggle_low_stock',
        ),
      ],
      [
        Markup.button.callback(
          `${prefs.maintenance_due ? '✅' : '⬜'} ${this.i18n.t(lang, 'notif_maintenance_due')}`,
          'toggle_maintenance_due',
        ),
      ],
      [
        Markup.button.callback(
          `${prefs.task_assigned ? '✅' : '⬜'} ${this.i18n.t(lang, 'notif_task_assigned')}`,
          'toggle_task_assigned',
        ),
      ],
      [Markup.button.callback(this.i18n.t(lang, 'back'), 'menu_settings')],
    ]);
  }

  /**
   * Tasks list keyboard
   */
  getTasksKeyboard(tasks: TelegramTaskInfo[], lang: TelegramLanguage) {
    const buttons: TelegramKeyboardRow[] = [];

    tasks.slice(0, 8).forEach((task, index) => {
      const typeIcon = this.getTaskTypeIcon(task.type_code);
      const statusIcon = this.getTaskStatusIcon(task.status);

      const buttonText =
        task.status === TaskStatus.IN_PROGRESS
          ? lang === TelegramLanguage.RU
            ? `${statusIcon} Продолжить`
            : `${statusIcon} Continue`
          : lang === TelegramLanguage.RU
            ? `▶️ Начать`
            : `▶️ Start`;

      const machineLabel = task.machine?.machine_number || `#${index + 1}`;

      buttons.push([
        Markup.button.callback(`${typeIcon} ${machineLabel} - ${buttonText}`, `task_start_${task.id}`),
      ]);
    });

    const navButtons = [];

    if (tasks.length > 8) {
      navButtons.push(
        Markup.button.callback(
          lang === TelegramLanguage.RU
            ? `📋 Все задачи (${tasks.length})`
            : `📋 All tasks (${tasks.length})`,
          'tasks_show_all',
        ),
      );
    }

    navButtons.push(
      Markup.button.callback(
        lang === TelegramLanguage.RU ? '🔄 Обновить' : '🔄 Refresh',
        'refresh_tasks',
      ),
    );

    buttons.push(navButtons);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Machines list keyboard
   */
  getMachinesKeyboard(machines: TelegramMachineInfo[], lang: TelegramLanguage) {
    const buttons = machines
      .slice(0, 5)
      .map((machine) => [
        Markup.button.callback(
          `${machine.status === 'online' ? '🟢' : '🔴'} ${machine.name}`,
          `view_machine_${machine.id}`,
        ),
      ]);

    buttons.push([Markup.button.callback(this.i18n.t(lang, 'back'), 'back_to_menu')]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Alerts list keyboard
   */
  getAlertsKeyboard(alerts: TelegramAlertInfo[], lang: TelegramLanguage) {
    const buttons = alerts
      .slice(0, 5)
      .map((alert) => [
        Markup.button.callback(`✓ ${this.i18n.t(lang, 'acknowledge')}`, `ack_alert_${alert.id}`),
      ]);

    buttons.push([Markup.button.callback(this.i18n.t(lang, 'back'), 'back_to_menu')]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Pending users approval keyboard
   */
  getPendingUsersKeyboard(users: TelegramPendingUserInfo[], lang: TelegramLanguage) {
    const buttons: TelegramKeyboardRow[] = [];

    users.slice(0, 5).forEach((user) => {
      buttons.push([
        Markup.button.callback(
          `👤 ${user.full_name.substring(0, 20)}${user.full_name.length > 20 ? '...' : ''}`,
          `expand_user_${user.id}`,
        ),
      ]);
    });

    buttons.push([
      Markup.button.callback(
        lang === TelegramLanguage.RU ? '🔄 Обновить' : '🔄 Refresh',
        'refresh_pending_users',
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Role selection keyboard for user approval
   */
  getRoleSelectionKeyboard(userId: string, lang: TelegramLanguage) {
    const roles = [
      {
        value: UserRole.OPERATOR,
        label: lang === TelegramLanguage.RU ? '👨‍💼 Оператор' : '👨‍💼 Operator',
      },
      {
        value: UserRole.COLLECTOR,
        label: lang === TelegramLanguage.RU ? '💰 Инкассатор' : '💰 Collector',
      },
      {
        value: UserRole.TECHNICIAN,
        label: lang === TelegramLanguage.RU ? '🔧 Техник' : '🔧 Technician',
      },
      {
        value: UserRole.MANAGER,
        label: lang === TelegramLanguage.RU ? '📊 Менеджер' : '📊 Manager',
      },
      { value: UserRole.VIEWER, label: lang === TelegramLanguage.RU ? '👁️ Просмотр' : '👁️ Viewer' },
    ];

    const buttons = roles.map((role) => [
      Markup.button.callback(role.label, `approve_user_${userId}_role_${role.value}`),
    ]);

    buttons.push([
      Markup.button.callback(
        lang === TelegramLanguage.RU ? '❌ Отклонить' : '❌ Reject',
        `reject_user_${userId}`,
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Step execution keyboard with Done/Skip/Back buttons
   */
  getStepKeyboard(taskId: string, stepIndex: number, lang: TelegramLanguage, canGoBack: boolean) {
    const buttons: TelegramKeyboardRow[] = [];

    buttons.push([
      Markup.button.callback(
        lang === TelegramLanguage.RU ? '✅ Готово' : '✅ Done',
        `step_done_${taskId}_${stepIndex}`,
      ),
      Markup.button.callback(
        lang === TelegramLanguage.RU ? '⏭️ Пропустить' : '⏭️ Skip',
        `step_skip_${taskId}_${stepIndex}`,
      ),
    ]);

    if (canGoBack) {
      buttons.push([
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '◀️ Назад' : '◀️ Back',
          `step_back_${taskId}`,
        ),
      ]);
    }

    return Markup.inlineKeyboard(buttons);
  }

  // Helper methods for icons
  private getTaskTypeIcon(typeCode: string): string {
    const icons: Record<string, string> = {
      [TaskType.REFILL]: '📦',
      [TaskType.COLLECTION]: '💰',
      [TaskType.INSPECTION]: '👁',
      [TaskType.REPAIR]: '🔧',
    };
    return icons[typeCode] || '📋';
  }

  private getTaskStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      [TaskStatus.PENDING]: '⏳',
      [TaskStatus.ASSIGNED]: '📌',
      [TaskStatus.IN_PROGRESS]: '🔄',
    };
    return icons[status] || '❓';
  }
}
