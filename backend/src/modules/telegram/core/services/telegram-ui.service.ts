import { Injectable } from '@nestjs/common';
import { Markup } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import {
  TelegramTaskInfo,
  TelegramMachineInfo,
  TelegramAlertInfo,
  TelegramStatsInfo,
  TelegramKeyboardRow,
  TranslationValue,
} from '../../shared/types/telegram.types';

/**
 * TelegramUIService
 *
 * Centralized service for all Telegram UI components:
 * - Keyboard generation (inline keyboards, menus)
 * - Message formatting (tasks, machines, alerts, stats)
 * - Translations (RU/EN)
 *
 * This service is used by TelegramBotService and other telegram services
 * to generate consistent UI elements.
 *
 * @module TelegramCoreModule
 */
@Injectable()
export class TelegramUIService {
  // ============================================================================
  // TRANSLATIONS
  // ============================================================================

  /**
   * Get translated string by key
   */
  t(lang: TelegramLanguage, key: string, ...args: string[]): string {
    const translations = {
      ru: {
        welcome_back: (name: string) => `Привет снова, ${name}! 👋\n\nЧто вы хотите сделать?`,
        welcome_new: (name: string) =>
          `Добро пожаловать, ${name}! 👋\n\n` +
          `Для использования бота необходимо связать ваш Telegram аккаунт.\n\n` +
          `Откройте веб-приложение VendHub и следуйте инструкциям для получения кода верификации.`,
        not_verified: '🔒 Пожалуйста, сначала свяжите ваш аккаунт через веб-приложение.',
        access_request_created: (name: string) =>
          `Здравствуйте, ${name}! 👋\n\n` +
          `✅ Ваша заявка на доступ отправлена администратору.\n\n` +
          `Как только ваша заявка будет одобрена, вы получите уведомление и сможете начать работу с системой.\n\n` +
          `⏳ Пожалуйста, подождите...`,
        access_request_pending:
          `⏳ Ваша заявка на доступ ожидает одобрения администратором.\n\n` +
          `Пожалуйста, дождитесь уведомления.\n\n` +
          `Обычно это занимает от нескольких минут до нескольких часов.`,
        access_request_error:
          `❌ Произошла ошибка при создании заявки.\n\n` +
          `Пожалуйста, попробуйте позже или свяжитесь с администратором.`,
        main_menu: '📱 <b>Главное меню</b>\n\nВыберите действие:',
        machines: 'Машины',
        alerts: 'Уведомления',
        stats: 'Статистика',
        settings: 'Настройки',
        open_web_app: '🌐 Открыть VendHub',
        settings_menu: '⚙️ <b>Настройки</b>\n\nВыберите раздел:',
        notifications: 'Уведомления',
        language: 'Язык',
        back: '« Назад',
        notification_settings:
          '🔔 <b>Настройки уведомлений</b>\n\nВключите или отключите типы уведомлений:',
        notif_machine_offline: 'Машина оффлайн',
        notif_low_stock: 'Низкий запас',
        notif_maintenance_due: 'Требуется обслуживание',
        notif_task_assigned: 'Новая задача',
        settings_updated: '✓ Настройки обновлены',
        online: 'Онлайн',
        offline: 'Оффлайн',
        no_alerts: 'Нет активных уведомлений',
        alert_offline: 'Машина оффлайн',
        alert_low_stock: 'Низкий запас',
        acknowledge: 'Подтвердить',
        statistics: 'Статистика',
        total_machines: 'Всего машин',
        today_revenue: 'Выручка сегодня',
        today_sales: 'Продаж сегодня',
        pending_tasks: 'Задач в работе',
        refresh: '🔄 Обновить',
        help:
          '<b>📖 Справка</b>\n\n' +
          '<b>Команды:</b>\n' +
          '/menu - Главное меню\n' +
          '/machines - Список машин\n' +
          '/alerts - Активные уведомления\n' +
          '/stats - Статистика\n' +
          '/language - Изменить язык\n' +
          '/help - Справка',
      },
      en: {
        welcome_back: (name: string) => `Welcome back, ${name}! 👋\n\nWhat would you like to do?`,
        welcome_new: (name: string) =>
          `Welcome, ${name}! 👋\n\n` +
          `To use this bot, you need to link your Telegram account.\n\n` +
          `Open the VendHub web app and follow the instructions to get your verification code.`,
        not_verified: '🔒 Please link your account via the web app first.',
        access_request_created: (name: string) =>
          `Hello, ${name}! 👋\n\n` +
          `✅ Your access request has been sent to the administrator.\n\n` +
          `Once your request is approved, you will receive a notification and can start working with the system.\n\n` +
          `⏳ Please wait...`,
        access_request_pending:
          `⏳ Your access request is pending administrator approval.\n\n` +
          `Please wait for notification.\n\n` +
          `This usually takes from a few minutes to several hours.`,
        access_request_error:
          `❌ An error occurred while creating the request.\n\n` +
          `Please try again later or contact the administrator.`,
        main_menu: '📱 <b>Main Menu</b>\n\nChoose an action:',
        machines: 'Machines',
        alerts: 'Alerts',
        stats: 'Statistics',
        settings: 'Settings',
        open_web_app: '🌐 Open VendHub',
        settings_menu: '⚙️ <b>Settings</b>\n\nChoose a section:',
        notifications: 'Notifications',
        language: 'Language',
        back: '« Back',
        notification_settings:
          '🔔 <b>Notification Settings</b>\n\nEnable or disable notification types:',
        notif_machine_offline: 'Machine offline',
        notif_low_stock: 'Low stock',
        notif_maintenance_due: 'Maintenance due',
        notif_task_assigned: 'New task',
        settings_updated: '✓ Settings updated',
        online: 'Online',
        offline: 'Offline',
        no_alerts: 'No active alerts',
        alert_offline: 'Machine offline',
        alert_low_stock: 'Low stock',
        acknowledge: 'Acknowledge',
        statistics: 'Statistics',
        total_machines: 'Total machines',
        today_revenue: 'Today revenue',
        today_sales: 'Today sales',
        pending_tasks: 'Pending tasks',
        refresh: '🔄 Refresh',
        help:
          '<b>📖 Help</b>\n\n' +
          '<b>Commands:</b>\n' +
          '/menu - Main menu\n' +
          '/machines - Machine list\n' +
          '/alerts - Active alerts\n' +
          '/stats - Statistics\n' +
          '/language - Change language\n' +
          '/help - Help',
      },
    };

    // Fallback to 'ru' if language not found (e.g., 'uz' not implemented yet)
    const langKey = (lang in translations ? lang : TelegramLanguage.RU) as 'ru' | 'en';
    const translationMap = translations[langKey] as Record<string, TranslationValue>;
    const translation = translationMap[key];

    if (typeof translation === 'function') {
      return translation(...args);
    }

    return translation || key;
  }

  // ============================================================================
  // KEYBOARD METHODS
  // ============================================================================

  /**
   * Get main menu keyboard
   */
  getMainMenuKeyboard(lang: TelegramLanguage) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`🖥 ${this.t(lang, 'machines')}`, 'menu_machines'),
        Markup.button.callback(`🔔 ${this.t(lang, 'alerts')}`, 'menu_alerts'),
      ],
      [
        Markup.button.callback(`📊 ${this.t(lang, 'stats')}`, 'menu_stats'),
        Markup.button.callback(`⚙️ ${this.t(lang, 'settings')}`, 'menu_settings'),
      ],
    ]);
  }

  /**
   * Get verification keyboard with web app link
   */
  getVerificationKeyboard(lang: TelegramLanguage) {
    return Markup.inlineKeyboard([
      [
        Markup.button.url(
          this.t(lang, 'open_web_app'),
          process.env.FRONTEND_URL || 'https://vendhub.com',
        ),
      ],
    ]);
  }

  /**
   * Get settings menu keyboard
   */
  getSettingsKeyboard(lang: TelegramLanguage) {
    return Markup.inlineKeyboard([
      [Markup.button.callback(`🔔 ${this.t(lang, 'notifications')}`, 'settings_notifications')],
      [Markup.button.callback(`🌐 ${this.t(lang, 'language')}`, 'settings_language')],
      [Markup.button.callback(this.t(lang, 'back'), 'back_to_menu')],
    ]);
  }

  /**
   * Get notification settings keyboard with toggles
   */
  getNotificationSettingsKeyboard(lang: TelegramLanguage, user: TelegramUser) {
    const prefs = user.notification_preferences || {};

    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          `${prefs.machine_offline ? '✅' : '⬜'} ${this.t(lang, 'notif_machine_offline')}`,
          'toggle_machine_offline',
        ),
      ],
      [
        Markup.button.callback(
          `${prefs.low_stock ? '✅' : '⬜'} ${this.t(lang, 'notif_low_stock')}`,
          'toggle_low_stock',
        ),
      ],
      [
        Markup.button.callback(
          `${prefs.maintenance_due ? '✅' : '⬜'} ${this.t(lang, 'notif_maintenance_due')}`,
          'toggle_maintenance_due',
        ),
      ],
      [
        Markup.button.callback(
          `${prefs.task_assigned ? '✅' : '⬜'} ${this.t(lang, 'notif_task_assigned')}`,
          'toggle_task_assigned',
        ),
      ],
      [Markup.button.callback(this.t(lang, 'back'), 'menu_settings')],
    ]);
  }

  /**
   * Get machines list keyboard
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

    buttons.push([Markup.button.callback(this.t(lang, 'back'), 'back_to_menu')]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Get alerts list keyboard
   */
  getAlertsKeyboard(alerts: TelegramAlertInfo[], lang: TelegramLanguage) {
    const buttons = alerts
      .slice(0, 5)
      .map((alert) => [
        Markup.button.callback(`✓ ${this.t(lang, 'acknowledge')}`, `ack_alert_${alert.id}`),
      ]);

    buttons.push([Markup.button.callback(this.t(lang, 'back'), 'back_to_menu')]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Get tasks list keyboard with action buttons
   */
  getTasksKeyboard(tasks: TelegramTaskInfo[], lang: TelegramLanguage) {
    const buttons: TelegramKeyboardRow[] = [];

    // Add buttons for up to 8 tasks (Telegram limit for inline keyboard)
    tasks.slice(0, 8).forEach((task, index) => {
      const typeIcon =
        (
          {
            [TaskType.REFILL]: '📦',
            [TaskType.COLLECTION]: '💰',
            [TaskType.REPAIR]: '🔧',
            [TaskType.INSPECTION]: '👁',
          } as Record<string, string>
        )[task.type_code] || '📋';

      const statusIcon =
        (
          {
            [TaskStatus.PENDING]: '⏳',
            [TaskStatus.ASSIGNED]: '📌',
            [TaskStatus.IN_PROGRESS]: '🔄',
          } as Record<string, string>
        )[task.status] || '';

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
        Markup.button.callback(
          `${typeIcon} ${machineLabel} - ${buttonText}`,
          `task_start_${task.id}`,
        ),
      ]);
    });

    // Add refresh and navigation buttons
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

  // ============================================================================
  // MESSAGE FORMATTING METHODS
  // ============================================================================

  /**
   * Format tasks list message
   */
  formatTasksMessage(tasks: TelegramTaskInfo[], lang: TelegramLanguage): string {
    const header = `<b>📋 ${lang === TelegramLanguage.RU ? 'Мои задачи' : 'My Tasks'}</b>\n\n`;

    const tasksList = tasks
      .map((task, index) => {
        const statusIcon =
          (
            {
              [TaskStatus.PENDING]: '⏳',
              [TaskStatus.ASSIGNED]: '📌',
              [TaskStatus.IN_PROGRESS]: '🔄',
            } as Record<string, string>
          )[task.status] || '❓';

        const typeIcon =
          (
            {
              [TaskType.REFILL]: '📦',
              [TaskType.COLLECTION]: '💰',
              [TaskType.INSPECTION]: '👁',
              [TaskType.REPAIR]: '🔧',
            } as Record<string, string>
          )[task.type_code] || '📋';

        const typeLabel =
          (
            {
              [TaskType.REFILL]: lang === TelegramLanguage.RU ? 'Пополнение' : 'Refill',
              [TaskType.COLLECTION]: lang === TelegramLanguage.RU ? 'Инкассация' : 'Collection',
              [TaskType.INSPECTION]: lang === TelegramLanguage.RU ? 'Проверка' : 'Inspection',
              [TaskType.REPAIR]: lang === TelegramLanguage.RU ? 'Ремонт' : 'Repair',
            } as Record<string, string>
          )[task.type_code] || task.type_code;

        const machineInfo = task.machine
          ? `${task.machine.machine_number} • ${task.machine.location?.name || 'N/A'}`
          : 'N/A';

        const dateStr = task.scheduled_date
          ? new Date(task.scheduled_date).toLocaleDateString(
              lang === TelegramLanguage.RU ? 'ru-RU' : 'en-US',
              { day: 'numeric', month: 'short' },
            )
          : 'N/A';

        return (
          `${index + 1}. ${statusIcon} ${typeIcon} <b>${typeLabel}</b>\n` +
          `   🎯 ${machineInfo}\n` +
          `   📅 ${dateStr}`
        );
      })
      .join('\n\n');

    const footer =
      lang === TelegramLanguage.RU
        ? `\n\n<i>💡 Нажмите кнопку ниже чтобы начать задачу</i>`
        : `\n\n<i>💡 Tap a button below to start a task</i>`;

    return header + tasksList + footer;
  }

  /**
   * Format machines list message
   */
  formatMachinesMessage(machines: TelegramMachineInfo[], lang: TelegramLanguage): string {
    const header = `<b>🖥 ${this.t(lang, 'machines')}</b>\n\n`;

    const machinesList = machines
      .map((m) => {
        const statusIcon = m.status === 'online' ? '🟢' : '🔴';
        const statusText = m.status === 'online' ? this.t(lang, 'online') : this.t(lang, 'offline');

        return (
          `${statusIcon} <b>${m.name}</b>\n` + `   📍 ${m.location}\n` + `   Status: ${statusText}`
        );
      })
      .join('\n\n');

    return header + machinesList;
  }

  /**
   * Format alerts list message
   */
  formatAlertsMessage(alerts: TelegramAlertInfo[], lang: TelegramLanguage): string {
    if (alerts.length === 0) {
      return `<b>🔔 ${this.t(lang, 'alerts')}</b>\n\n${this.t(lang, 'no_alerts')} ✓`;
    }

    const header = `<b>🔔 ${this.t(lang, 'alerts')}</b>\n\n`;

    const alertsList = alerts
      .map((a) => {
        const typeIcon = a.type === 'offline' ? '🔴' : '⚠️';
        const typeText = this.t(lang, `alert_${a.type}`);

        return (
          `${typeIcon} <b>${typeText}</b>\n` + `   Machine: ${a.machine}\n` + `   Time: ${a.time}`
        );
      })
      .join('\n\n');

    return header + alertsList;
  }

  /**
   * Format statistics message
   */
  formatStatsMessage(stats: TelegramStatsInfo, lang: TelegramLanguage): string {
    return (
      `<b>📊 ${this.t(lang, 'statistics')}</b>\n\n` +
      `🖥 ${this.t(lang, 'total_machines')}: ${stats.total_machines}\n` +
      `🟢 ${this.t(lang, 'online')}: ${stats.online}\n` +
      `🔴 ${this.t(lang, 'offline')}: ${stats.offline}\n\n` +
      `💰 ${this.t(lang, 'today_revenue')}: ₽${stats.today_revenue.toLocaleString()}\n` +
      `☕ ${this.t(lang, 'today_sales')}: ${stats.today_sales}\n\n` +
      `📋 ${this.t(lang, 'pending_tasks')}: ${stats.pending_tasks}`
    );
  }
}
