import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Markup } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { UsersService } from '../../../users/users.service';
import { UserRole } from '../../../users/entities/user.entity';
import { AuditLogService } from '../../../audit-logs/audit-log.service';
import { TelegramKeyboardHandler } from '../../ui/handlers/telegram-keyboard.handler';
import {
  BotContext,
  TelegramPendingUserInfo,
  TelegramMessageOptions,
} from '../../shared/types/telegram.types';

/**
 * TelegramAdminCallbackService
 *
 * Handles admin approval callbacks and pending user management for the Telegram bot.
 * Includes user approval, rejection, and role assignment functionality.
 *
 * @module TelegramCoreModule
 */
@Injectable()
export class TelegramAdminCallbackService {
  private readonly logger = new Logger(TelegramAdminCallbackService.name);

  constructor(
    @InjectRepository(TelegramUser)
    private telegramUserRepository: Repository<TelegramUser>,
    @InjectRepository(TelegramMessageLog)
    private telegramMessageLogRepository: Repository<TelegramMessageLog>,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly keyboardHandler: TelegramKeyboardHandler,
  ) {}

  // ============================================================================
  // CALLBACK HANDLERS
  // ============================================================================

  /**
   * Handle expand_user callback - show role selection for a user
   */
  async handleExpandUser(ctx: BotContext, userId: string): Promise<void> {
    await this.logCallback(ctx, `expand_user_${userId}`);
    await ctx.answerCbQuery();

    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    // Check super admin permission
    if (!this.isSuperAdmin(ctx.from?.id.toString())) {
      await ctx.answerCbQuery(
        lang === TelegramLanguage.RU ? 'Недостаточно прав' : 'Insufficient permissions',
        { show_alert: true },
      );
      return;
    }

    try {
      // Get user details
      const user = await this.usersService.findOne(userId);

      const message =
        lang === TelegramLanguage.RU
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

      const keyboard = this.keyboardHandler.getRoleSelectionKeyboard(userId, lang);

      await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
    } catch (error: unknown) {
      this.logger.error('Error expanding user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${errorMessage}`
          : `❌ Error: ${errorMessage}`,
      );
    }
  }

  /**
   * Handle approve_user callback - approve user with specified role
   */
  async handleApproveUser(
    ctx: BotContext,
    userId: string,
    role: UserRole,
    sendMessage: (chatId: string, message: string, options?: TelegramMessageOptions) => Promise<void>,
  ): Promise<void> {
    await this.logCallback(ctx, `approve_user_${userId}_role_${role}`);
    await ctx.answerCbQuery('⏳ Одобрение...');

    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    // Check super admin permission
    if (!this.isSuperAdmin(ctx.from?.id.toString())) {
      await ctx.answerCbQuery(
        lang === TelegramLanguage.RU ? 'Недостаточно прав' : 'Insufficient permissions',
        { show_alert: true },
      );
      return;
    }

    try {
      // Get the super admin user from database
      const superAdmin = await this.usersService.findByTelegramId(ctx.from?.id.toString() || '');

      if (!superAdmin) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Администратор не найден'
            : '❌ Administrator not found',
        );
        return;
      }

      // Approve user using the service (which handles credential generation)
      const result = await this.usersService.approveUser(userId, { role }, superAdmin.id);

      // Log the approval action for audit trail
      await this.auditLogService.logAccessRequestApproved(
        superAdmin.id,
        userId,
        {
          ipAddress: 'telegram',
          userAgent: `TelegramBot/${ctx.from?.id}`,
        },
      );
      this.logger.log(`Access request approved: user ${userId} as ${role} by admin ${superAdmin.id}`);

      // Send approval confirmation to super admin
      await ctx.editMessageText(
        lang === TelegramLanguage.RU
          ? `✅ <b>Пользователь одобрен</b>\n\n` +
            `👤 ${result.user.full_name}\n` +
            `📧 ${result.user.email}\n` +
            `👨‍💼 Роль: <b>${this.formatRole(role, lang)}</b>\n\n` +
            `🔐 Учетные данные:\n` +
            `Username: <code>${result.credentials.username}</code>\n` +
            `Password: <code>${result.credentials.password}</code>\n\n` +
            `📨 Письмо с учетными данными отправлено пользователю.`
          : `✅ <b>User approved</b>\n\n` +
            `👤 ${result.user.full_name}\n` +
            `📧 ${result.user.email}\n` +
            `👨‍💼 Role: <b>${this.formatRole(role, lang)}</b>\n\n` +
            `🔐 Credentials:\n` +
            `Username: <code>${result.credentials.username}</code>\n` +
            `Password: <code>${result.credentials.password}</code>\n\n` +
            `📨 Email with credentials sent to user.`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              lang === TelegramLanguage.RU ? '🔄 Обновить список' : '🔄 Refresh list',
              'refresh_pending_users',
            ),
          ],
        ]),
      );

      // Send approval notification to the user (if they have telegram linked)
      if (result.user.telegram_user_id) {
        try {
          const telegramUserRecord = await this.telegramUserRepository.findOne({
            where: { telegram_id: result.user.telegram_user_id },
          });

          // Determine chat_id and language
          const chatId = telegramUserRecord?.chat_id || result.user.telegram_user_id;
          const userLang = telegramUserRecord?.language || TelegramLanguage.RU;

          const message =
            userLang === TelegramLanguage.RU
              ? `✅ <b>Ваша учетная запись одобрена!</b>\n\n` +
                `🎉 Добро пожаловать в VendHub!\n\n` +
                `🔐 <b>Ваши учетные данные:</b>\n` +
                `Username: <code>${result.credentials.username}</code>\n` +
                `Password: <code>${result.credentials.password}</code>\n\n` +
                `⚠️ <b>Важно:</b> Пароль временный и одноразовый. Вам потребуется изменить его при первом входе.\n\n` +
                `🌐 <a href="${process.env.FRONTEND_URL}">Перейти в VendHub Manager</a>`
              : `✅ <b>Your account has been approved!</b>\n\n` +
                `🎉 Welcome to VendHub!\n\n` +
                `🔐 <b>Your credentials:</b>\n` +
                `Username: <code>${result.credentials.username}</code>\n` +
                `Password: <code>${result.credentials.password}</code>\n\n` +
                `⚠️ <b>Important:</b> Password is temporary and one-time. You'll need to change it on first login.\n\n` +
                `🌐 <a href="${process.env.FRONTEND_URL}">Open VendHub Manager</a>`;

          await sendMessage(chatId, message);
        } catch (error) {
          this.logger.warn(`Failed to send telegram notification to user ${userId}:`, error);
          // Don't fail the approval if telegram notification fails
        }
      }
    } catch (error: unknown) {
      this.logger.error('Error approving user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка при одобрении: ${errorMessage}`
          : `❌ Error approving user: ${errorMessage}`,
      );
    }
  }

  /**
   * Handle reject_user callback - prompt for rejection reason
   */
  async handleRejectUser(ctx: BotContext, userId: string): Promise<void> {
    await this.logCallback(ctx, `reject_user_${userId}`);
    await ctx.answerCbQuery();

    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    // For rejection, we need to get the reason - prompt the user
    await ctx.editMessageText(
      lang === TelegramLanguage.RU
        ? `❌ Введите причину отказа (минимум 10 символов):`
        : `❌ Enter rejection reason (minimum 10 characters):`,
    );

    // Store the userId in the context for the next message
    const telegramUser = ctx.telegramUser;
    if (telegramUser) {
      // Mark this user as waiting for rejection reason
      telegramUser.metadata = telegramUser.metadata || {};
      telegramUser.metadata.pending_rejection_user_id = userId;
      await this.telegramUserRepository.save(telegramUser);
    }
  }

  /**
   * Handle refresh_pending_users callback
   */
  async handleRefreshPendingUsers(ctx: BotContext): Promise<void> {
    await this.logCallback(ctx, 'refresh_pending_users');
    await ctx.answerCbQuery();
    await this.handlePendingUsersCommand(ctx);
  }

  /**
   * Handle rejection reason text input
   */
  async handleRejectUserInput(
    ctx: BotContext,
    messageText: string,
    sendMessage: (chatId: string, message: string, options?: TelegramMessageOptions) => Promise<void>,
  ): Promise<boolean> {
    if (!ctx.telegramUser?.metadata?.pending_rejection_user_id) {
      return false;
    }

    const lang = ctx.telegramUser.language;
    const userId = ctx.telegramUser.metadata.pending_rejection_user_id;

    // Check if reason text is too short
    if (messageText.length < 10) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Причина должна содержать минимум 10 символов. Попробуйте еще раз.'
          : '❌ Reason must be at least 10 characters. Try again.',
      );
      return true;
    }

    // Check super admin permission
    if (!this.isSuperAdmin(ctx.from?.id.toString())) {
      await ctx.reply(
        lang === TelegramLanguage.RU ? '🔒 Недостаточно прав' : '🔒 Insufficient permissions',
      );
      return true;
    }

    try {
      // Get the super admin user
      const superAdmin = await this.usersService.findByTelegramId(ctx.from?.id.toString() || '');

      if (!superAdmin) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Администратор не найден'
            : '❌ Administrator not found',
        );
        return true;
      }

      // Reject user
      const rejectedUser = await this.usersService.rejectUser(userId, messageText, superAdmin.id);

      // Log the rejection action for audit trail
      await this.auditLogService.logAccessRequestRejected(
        superAdmin.id,
        userId,
        messageText,
        {
          ipAddress: 'telegram',
          userAgent: `TelegramBot/${ctx.from?.id}`,
        },
      );
      this.logger.log(`Access request rejected: user ${userId} by admin ${superAdmin.id}, reason: ${messageText}`);

      // Clear the pending rejection flag
      ctx.telegramUser.metadata.pending_rejection_user_id = null;
      await this.telegramUserRepository.save(ctx.telegramUser);

      // Send rejection confirmation to super admin
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `✅ <b>Пользователь отклонен</b>\n\n` +
            `👤 ${rejectedUser.full_name}\n` +
            `📧 ${rejectedUser.email}\n` +
            `📝 Причина: ${messageText}`
          : `✅ <b>User rejected</b>\n\n` +
            `👤 ${rejectedUser.full_name}\n` +
            `📧 ${rejectedUser.email}\n` +
            `📝 Reason: ${messageText}`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                lang === TelegramLanguage.RU ? '🔄 Обновить список' : '🔄 Refresh list',
                'refresh_pending_users',
              ),
            ],
          ]),
        },
      );

      // Send rejection notification to user (if they have telegram linked)
      if (rejectedUser.telegram_user_id) {
        try {
          const telegramUserRecord = await this.telegramUserRepository.findOne({
            where: { telegram_id: rejectedUser.telegram_user_id },
          });

          if (telegramUserRecord) {
            const userLang = telegramUserRecord.language;
            await sendMessage(
              telegramUserRecord.chat_id,
              userLang === TelegramLanguage.RU
                ? `❌ <b>Ваша заявка отклонена</b>\n\n` +
                  `🔍 <b>Причина:</b>\n${messageText}\n\n` +
                  `📞 Если у вас есть вопросы, свяжитесь с администратором.`
                : `❌ <b>Your application has been rejected</b>\n\n` +
                  `🔍 <b>Reason:</b>\n${messageText}\n\n` +
                  `📞 If you have questions, contact the administrator.`,
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to send telegram notification to user ${userId}:`, error);
        }
      }

      return true;
    } catch (error: unknown) {
      this.logger.error('Error rejecting user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${errorMessage}`
          : `❌ Error: ${errorMessage}`,
      );
      return true;
    }
  }

  // ============================================================================
  // PUBLIC HELPER METHODS
  // ============================================================================

  /**
   * Check if user is the super admin (owner)
   * Super Admin Telegram ID is configured via SUPER_ADMIN_TELEGRAM_ID environment variable
   */
  isSuperAdmin(telegramId: string | undefined): boolean {
    const OWNER_TELEGRAM_ID = process.env.SUPER_ADMIN_TELEGRAM_ID;
    if (!OWNER_TELEGRAM_ID) {
      this.logger.warn('SUPER_ADMIN_TELEGRAM_ID not configured');
      return false;
    }
    return telegramId === OWNER_TELEGRAM_ID;
  }

  /**
   * Notify owner about new pending user registration
   * Sends a message with user info and role selection buttons
   */
  async notifyAdminAboutNewUser(
    userId: string,
    telegramFrom: { id: number; first_name?: string; last_name?: string; username?: string },
    sendMessage: (chatId: string, message: string, options?: TelegramMessageOptions) => Promise<void>,
  ): Promise<void> {
    const OWNER_TELEGRAM_ID = process.env.SUPER_ADMIN_TELEGRAM_ID;

    if (!OWNER_TELEGRAM_ID) {
      this.logger.warn('SUPER_ADMIN_TELEGRAM_ID not configured, cannot send notification');
      return;
    }

    try {
      // Get owner's TelegramUser to find their chat_id
      const adminTelegramUser = await this.telegramUserRepository.findOne({
        where: { telegram_id: OWNER_TELEGRAM_ID },
      });

      if (!adminTelegramUser) {
        this.logger.warn('Owner TelegramUser not found, cannot send notification');
        return;
      }

      // Build user info
      const name =
        [telegramFrom.first_name, telegramFrom.last_name].filter(Boolean).join(' ') ||
        `@${telegramFrom.username}` ||
        `User ${telegramFrom.id}`;

      const message =
        `🆕 <b>Новая заявка на регистрацию</b>\n\n` +
        `👤 Имя: <b>${name}</b>\n` +
        `📱 Telegram: ${telegramFrom.username ? `@${telegramFrom.username}` : 'не указан'}\n` +
        `🆔 ID: <code>${telegramFrom.id}</code>\n\n` +
        `<b>Выберите действие:</b>`;

      // Create simplified approval keyboard (only MANAGER and OPERATOR)
      const keyboard = this.getAdminApprovalKeyboard(userId, TelegramLanguage.RU);

      await sendMessage(adminTelegramUser.chat_id, message, keyboard);

      this.logger.log(`Notification sent to admin about new user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to notify admin about new user:', error);
      // Don't throw - notification failure shouldn't block registration
    }
  }

  /**
   * Handler for /pending_users command - shows list of users awaiting approval
   * Super admin only command
   */
  async handlePendingUsersCommand(
    ctx: BotContext,
    logMessage?: (ctx: BotContext, type: TelegramMessageType, command: string) => Promise<void>,
  ): Promise<void> {
    if (logMessage) {
      await logMessage(ctx, TelegramMessageType.COMMAND, '/pending_users');
    }

    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    // Check if super admin
    if (!this.isSuperAdmin(ctx.from?.id.toString())) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '🔒 Эта команда доступна только для супер администратора'
          : '🔒 This command is only available for super admin',
      );
      return;
    }

    try {
      // Get pending users from database
      const pendingUsers = await this.usersService.getPendingUsers();

      if (pendingUsers.length === 0) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '✅ Нет пользователей в ожидании одобрения'
            : '✅ No pending users for approval',
        );
        return;
      }

      // Format message with pending users
      const message = this.formatPendingUsersMessage(pendingUsers, lang);

      // Create keyboard with user options
      const keyboard = this.keyboardHandler.getPendingUsersKeyboard(pendingUsers, lang);

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
      } else {
        await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
      }
    } catch (error: unknown) {
      this.logger.error('Error fetching pending users:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка при загрузке пользователей: ${errorMessage}`
          : `❌ Error loading users: ${errorMessage}`,
      );
    }
  }

  /**
   * Get simplified keyboard for admin approval notification
   * Shows only MANAGER and OPERATOR roles + Reject button
   */
  getAdminApprovalKeyboard(userId: string, lang: TelegramLanguage) {
    const buttons = [
      [
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '📊 Одобрить как Менеджер' : '📊 Approve as Manager',
          `approve_user_${userId}_role_${UserRole.MANAGER}`,
        ),
      ],
      [
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '👨‍💼 Одобрить как Оператор' : '👨‍💼 Approve as Operator',
          `approve_user_${userId}_role_${UserRole.OPERATOR}`,
        ),
      ],
      [
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '❌ Отклонить' : '❌ Reject',
          `reject_user_${userId}`,
        ),
      ],
    ];

    return Markup.inlineKeyboard(buttons);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Log a callback to the database for analytics
   */
  private async logCallback(ctx: BotContext, callbackData: string): Promise<void> {
    try {
      const log = this.telegramMessageLogRepository.create({
        telegram_user_id: ctx.telegramUser?.id || null,
        chat_id: ctx.chat?.id?.toString() || null,
        message_type: TelegramMessageType.CALLBACK,
        command: callbackData,
        message_text: `Callback: ${callbackData}`,
      });
      await this.telegramMessageLogRepository.save(log);
    } catch (error) {
      this.logger.warn('Failed to log callback', error);
    }
  }

  /**
   * Format pending users list for super admin
   */
  private formatPendingUsersMessage(
    users: TelegramPendingUserInfo[],
    lang: TelegramLanguage,
  ): string {
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
   * Format role name for display
   */
  private formatRole(role: UserRole, lang: TelegramLanguage): string {
    const roleMap = {
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
}
