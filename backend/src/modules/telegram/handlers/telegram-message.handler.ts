/**
 * Telegram Message Handler
 *
 * Handles message formatting for Telegram bot:
 * - Task messages
 * - Machine messages
 * - Alert messages
 * - Stats messages
 * - Admin messages
 */

import { Injectable } from '@nestjs/common';
import { TelegramLanguage } from '../entities/telegram-user.entity';
import { TaskStatus, TaskType } from '../../tasks/entities/task.entity';
import { UserRole } from '../../users/entities/user.entity';
import {
  TelegramTaskInfo,
  TelegramMachineInfo,
  TelegramAlertInfo,
  TelegramStatsInfo,
  TelegramPendingUserInfo,
} from '../types/telegram.types';
import { TelegramI18nService } from '../services/telegram-i18n.service';

@Injectable()
export class TelegramMessageHandler {
  constructor(private readonly i18n: TelegramI18nService) {}

  /**
   * Format tasks list message
   */
  formatTasksMessage(tasks: TelegramTaskInfo[], lang: TelegramLanguage): string {
    const header = `<b>📋 ${lang === TelegramLanguage.RU ? 'Мои задачи' : 'My Tasks'}</b>\n\n`;

    const tasksList = tasks
      .map((task, index) => {
        const statusIcon = this.getTaskStatusIcon(task.status);
        const typeIcon = this.getTaskTypeIcon(task.type_code);
        const typeLabel = this.getTaskTypeLabel(task.type_code, lang);

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
    const header = `<b>🖥 ${this.i18n.t(lang, 'machines')}</b>\n\n`;

    const machinesList = machines
      .map((m) => {
        const statusIcon = m.status === 'online' ? '🟢' : '🔴';
        const statusText = m.status === 'online' ? this.i18n.t(lang, 'online') : this.i18n.t(lang, 'offline');

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
      return `<b>🔔 ${this.i18n.t(lang, 'alerts')}</b>\n\n${this.i18n.t(lang, 'no_alerts')} ✓`;
    }

    const header = `<b>🔔 ${this.i18n.t(lang, 'alerts')}</b>\n\n`;

    const alertsList = alerts
      .map((a) => {
        const typeIcon = a.type === 'offline' ? '🔴' : '⚠️';
        const typeText = this.i18n.t(lang, `alert_${a.type}`);

        return (
          `${typeIcon} <b>${typeText}</b>\n` + `   Machine: ${a.machine}\n` + `   Time: ${a.time}`
        );
      })
      .join('\n\n');

    return header + alertsList;
  }

  /**
   * Format stats message
   */
  formatStatsMessage(stats: TelegramStatsInfo, lang: TelegramLanguage): string {
    return (
      `<b>📊 ${this.i18n.t(lang, 'statistics')}</b>\n\n` +
      `🖥 ${this.i18n.t(lang, 'total_machines')}: ${stats.total_machines}\n` +
      `🟢 ${this.i18n.t(lang, 'online')}: ${stats.online}\n` +
      `🔴 ${this.i18n.t(lang, 'offline')}: ${stats.offline}\n\n` +
      `💰 ${this.i18n.t(lang, 'today_revenue')}: ₽${stats.today_revenue.toLocaleString()}\n` +
      `☕ ${this.i18n.t(lang, 'today_sales')}: ${stats.today_sales}\n\n` +
      `📋 ${this.i18n.t(lang, 'pending_tasks')}: ${stats.pending_tasks}`
    );
  }

  /**
   * Format pending users list message
   */
  formatPendingUsersMessage(users: TelegramPendingUserInfo[], lang: TelegramLanguage): string {
    const header = `<b>👥 ${lang === TelegramLanguage.RU ? 'Пользователи в ожидании одобрения' : 'Pending Users'}</b>\n\n`;

    const usersList = users
      .map((user, index) => {
        const registeredDate = new Date(user.created_at).toLocaleDateString(
          lang === TelegramLanguage.RU ? 'ru-RU' : 'en-US',
        );

        return (
          `${index + 1}. <b>${user.full_name}</b>\n` +
          `   📧 ${user.email}\n` +
          `   📱 ${user.phone || 'N/A'}\n` +
          `   📅 ${lang === TelegramLanguage.RU ? 'Дата регистрации' : 'Registered'}: ${registeredDate}\n` +
          `   🆔 <code>${user.id}</code>`
        );
      })
      .join('\n\n');

    const footer =
      lang === TelegramLanguage.RU
        ? `\n\n<i>${users.length} ${users.length === 1 ? 'пользователь' : 'пользователей'} в ожидании</i>`
        : `\n\n<i>${users.length} ${users.length === 1 ? 'user' : 'users'} pending approval</i>`;

    return header + usersList + footer;
  }

  /**
   * Format user info for approval
   */
  formatUserInfoMessage(
    user: { full_name: string; email: string; phone?: string; created_at: Date },
    lang: TelegramLanguage,
  ): string {
    return lang === TelegramLanguage.RU
      ? `<b>👤 Информация о пользователе</b>\n\n` +
          `Имя: <b>${user.full_name}</b>\n` +
          `Email: ${user.email}\n` +
          `Телефон: ${user.phone || 'N/A'}\n` +
          `Дата регистрации: ${new Date(user.created_at).toLocaleDateString('ru-RU')}\n\n` +
          `<b>Выберите роль для пользователя:</b>`
      : `<b>👤 User Information</b>\n\n` +
          `Name: <b>${user.full_name}</b>\n` +
          `Email: ${user.email}\n` +
          `Phone: ${user.phone || 'N/A'}\n` +
          `Registered: ${new Date(user.created_at).toLocaleDateString('en-US')}\n\n` +
          `<b>Select role for the user:</b>`;
  }

  /**
   * Format task started message
   */
  formatTaskStartedMessage(
    task: { type_code: string; machine?: { machine_number?: string; location?: { name?: string } } },
    lang: TelegramLanguage,
  ): string {
    return lang === TelegramLanguage.RU
      ? `🎉 Задача "${task.type_code}" начата!\n\n` +
          `🎯 Аппарат: ${task.machine?.machine_number || 'N/A'}\n` +
          `📍 Локация: ${task.machine?.location?.name || 'N/A'}\n\n` +
          `📸 <b>Теперь просто отправьте фото ДО начала работы</b>\n` +
          `<i>(подпись не нужна, я запомнил что вы в этой задаче)</i>`
      : `🎉 Task "${task.type_code}" started!\n\n` +
          `🎯 Machine: ${task.machine?.machine_number || 'N/A'}\n` +
          `📍 Location: ${task.machine?.location?.name || 'N/A'}\n\n` +
          `📸 <b>Now just send BEFORE photo</b>\n` +
          `<i>(no caption needed, I remember you're in this task)</i>`;
  }

  /**
   * Format role name for display
   */
  formatRole(role: UserRole, lang: TelegramLanguage): string {
    const roleMap: Record<string, string> = {
      [UserRole.OWNER]: lang === TelegramLanguage.RU ? 'Владелец' : 'Owner',
      [UserRole.ADMIN]: lang === TelegramLanguage.RU ? 'Администратор' : 'Admin',
      [UserRole.MANAGER]: lang === TelegramLanguage.RU ? 'Менеджер' : 'Manager',
      [UserRole.OPERATOR]: lang === TelegramLanguage.RU ? 'Оператор' : 'Operator',
      [UserRole.COLLECTOR]: lang === TelegramLanguage.RU ? 'Инкассатор' : 'Collector',
      [UserRole.TECHNICIAN]: lang === TelegramLanguage.RU ? 'Техник' : 'Technician',
      [UserRole.VIEWER]: lang === TelegramLanguage.RU ? 'Просмотр' : 'Viewer',
    };

    return roleMap[role] || role;
  }

  // Helper methods
  private getTaskStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      [TaskStatus.PENDING]: '⏳',
      [TaskStatus.ASSIGNED]: '📌',
      [TaskStatus.IN_PROGRESS]: '🔄',
    };
    return icons[status] || '❓';
  }

  private getTaskTypeIcon(typeCode: string): string {
    const icons: Record<string, string> = {
      [TaskType.REFILL]: '📦',
      [TaskType.COLLECTION]: '💰',
      [TaskType.INSPECTION]: '👁',
      [TaskType.REPAIR]: '🔧',
    };
    return icons[typeCode] || '📋';
  }

  private getTaskTypeLabel(typeCode: string, lang: TelegramLanguage): string {
    const labels: Record<string, string> = {
      [TaskType.REFILL]: lang === TelegramLanguage.RU ? 'Пополнение' : 'Refill',
      [TaskType.COLLECTION]: lang === TelegramLanguage.RU ? 'Инкассация' : 'Collection',
      [TaskType.INSPECTION]: lang === TelegramLanguage.RU ? 'Проверка' : 'Inspection',
      [TaskType.REPAIR]: lang === TelegramLanguage.RU ? 'Ремонт' : 'Repair',
    };
    return labels[typeCode] || typeCode;
  }
}
