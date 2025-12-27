import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TelegramSessionService, UserSession, ConversationState } from '../../infrastructure/services/telegram-session.service';
import { TelegramVoiceService } from '../../media/services/telegram-voice.service';
import { TelegramTaskCallbackService } from './telegram-task-callback.service';
import { TasksService } from '../../../tasks/tasks.service';
import { FilesService } from '../../../files/files.service';
import { UsersService } from '../../../users/users.service';
import { TaskStatus } from '../../../tasks/entities/task.entity';
import { TelegramTaskInfo } from '../../shared/types/telegram.types';

interface BotContext extends Context {
  telegramUser?: TelegramUser;
  session?: UserSession;
}

/**
 * Task execution state for step-by-step guidance
 * Stored in task.metadata.telegram_execution_state
 */
export interface TaskExecutionState {
  current_step: number; // Current checklist step index (0-based)
  checklist_progress: Record<
    number,
    {
      completed: boolean;
      completed_at?: string;
      notes?: string;
    }
  >;
  photos_uploaded: {
    before: boolean;
    after: boolean;
  };
  started_at: string;
  last_interaction_at: string;
}

/**
 * Helpers interface for dependency injection
 */
interface TaskOperationsHelpers {
  t: (lang: TelegramLanguage, key: string, ...args: string[]) => string;
  logMessage: (ctx: BotContext, type: TelegramMessageType, command?: string) => Promise<void>;
  handleTasksCommand: (ctx: BotContext) => Promise<void>;
  handleMachinesCommand: (ctx: BotContext) => Promise<void>;
  handleStatsCommand: (ctx: BotContext) => Promise<void>;
}

/**
 * TelegramTaskOperationsService
 *
 * Handles task execution operations via Telegram:
 * - Start task command
 * - Complete task command
 * - Photo uploads (before/after)
 * - Voice message commands
 *
 * Extracted from TelegramBotService to reduce complexity.
 *
 * @module TelegramCoreModule
 */
@Injectable()
export class TelegramTaskOperationsService {
  private readonly logger = new Logger(TelegramTaskOperationsService.name);
  private helpers: TaskOperationsHelpers | null = null;

  constructor(
    private readonly sessionService: TelegramSessionService,
    private readonly voiceService: TelegramVoiceService,
    private readonly taskCallbackService: TelegramTaskCallbackService,
    private readonly tasksService: TasksService,
    private readonly filesService: FilesService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Set helper methods from TelegramBotService
   */
  setHelpers(helpers: TaskOperationsHelpers): void {
    this.helpers = helpers;
  }

  /**
   * Translation helper shortcut
   */
  private t(lang: TelegramLanguage, key: string, ...args: string[]): string {
    if (!this.helpers) {
      return key;
    }
    return this.helpers.t(lang, key, ...args);
  }

  /**
   * Log message helper shortcut
   */
  private async logMessage(ctx: BotContext, type: TelegramMessageType, command?: string): Promise<void> {
    if (this.helpers) {
      await this.helpers.logMessage(ctx, type, command);
    }
  }

  /**
   * Initialize execution state for a task
   */
  initializeExecutionState(task: TelegramTaskInfo): TaskExecutionState {
    const checklistLength = task.checklist?.length || 0;
    const progress: Record<number, { completed: boolean; completed_at?: string; notes?: string }> =
      {};

    for (let i = 0; i < checklistLength; i++) {
      progress[i] = {
        completed: false,
      };
    }

    return {
      current_step: 0,
      checklist_progress: progress,
      photos_uploaded: {
        before: task.has_photo_before || false,
        after: task.has_photo_after || false,
      },
      started_at: new Date().toISOString(),
      last_interaction_at: new Date().toISOString(),
    };
  }

  /**
   * Handler for /start_task command - starts task execution
   */
  async handleStartTaskCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/start_task');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    // Parse task ID from command
    const match =
      ctx.message && 'text' in ctx.message ? ctx.message.text.match(/\/start_task\s+(\S+)/) : null;

    if (!match) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Использование: /start_task <ID задачи>\n\nПример: /start_task abc123'
          : '❌ Usage: /start_task <task ID>\n\nExample: /start_task abc123',
      );
      return;
    }

    const taskId = match[1];

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);

      if (!user) {
        await ctx.reply(
          lang === TelegramLanguage.RU ? '❌ Пользователь не найден' : '❌ User not found',
        );
        return;
      }

      // Start the task
      const task = await this.tasksService.startTask(taskId, user.id);

      // Initialize execution state
      const state = this.initializeExecutionState(task);
      await this.taskCallbackService.updateExecutionState(task.id, state);

      // Show task info
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `🎉 <b>Задача начата!</b>\n\n` +
              `📋 ${task.type_code}\n` +
              `🎯 Аппарат: <b>${task.machine?.machine_number || 'N/A'}</b>\n` +
              `📍 Локация: ${task.machine?.location?.name || 'N/A'}\n\n` +
              (task.checklist && task.checklist.length > 0
                ? `✅ Чек-лист: <b>${task.checklist.length} шагов</b>\n\n` +
                  `⏩ Сейчас покажу первый шаг...`
                : `📸 Загрузите фото ДО начала работы`)
          : `🎉 <b>Task started!</b>\n\n` +
              `📋 ${task.type_code}\n` +
              `🎯 Machine: <b>${task.machine?.machine_number || 'N/A'}</b>\n` +
              `📍 Location: ${task.machine?.location?.name || 'N/A'}\n\n` +
              (task.checklist && task.checklist.length > 0
                ? `✅ Checklist: <b>${task.checklist.length} steps</b>\n\n` +
                  `⏩ Showing first step...`
                : `📸 Upload BEFORE photo`),
        { parse_mode: 'HTML' },
      );

      // Show first step if checklist exists
      if (task.checklist && task.checklist.length > 0) {
        await this.taskCallbackService.showCurrentStep(ctx, task, state, lang);
      }
    } catch (error) {
      this.logger.error('Error starting task:', error);

      // User-friendly error message
      const errorMessage =
        lang === TelegramLanguage.RU
          ? `😕 Не удалось начать задачу\n\n` +
            `<b>Возможные причины:</b>\n` +
            `• Задача уже выполнена\n` +
            `• Задача назначена другому оператору\n` +
            `• Неверный ID задачи\n\n` +
            `<b>💡 Попробуйте:</b>\n` +
            `1️⃣ Проверьте список задач: /tasks\n` +
            `2️⃣ Используйте кнопку "▶️ Начать" вместо команды\n\n` +
            `❓ Не помогло? Напишите /help`
          : `😕 Could not start task\n\n` +
            `<b>Possible reasons:</b>\n` +
            `• Task already completed\n` +
            `• Task assigned to another operator\n` +
            `• Invalid task ID\n\n` +
            `<b>💡 Try this:</b>\n` +
            `1️⃣ Check task list: /tasks\n` +
            `2️⃣ Use "▶️ Start" button instead\n\n` +
            `❓ Still stuck? Type /help`;

      await ctx.reply(errorMessage, { parse_mode: 'HTML' });
    }
  }

  /**
   * Handler for /complete_task command - completes task
   */
  async handleCompleteTaskCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/complete_task');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    // Parse task ID from command
    const match =
      ctx.message && 'text' in ctx.message
        ? ctx.message.text.match(/\/complete_task\s+(\S+)/)
        : null;

    if (!match) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Использование: /complete_task <ID задачи>\n\nПример: /complete_task abc123'
          : '❌ Usage: /complete_task <task ID>\n\nExample: /complete_task abc123',
      );
      return;
    }

    const taskId = match[1];

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);

      if (!user) {
        await ctx.reply(
          lang === TelegramLanguage.RU ? '❌ Пользователь не найден' : '❌ User not found',
        );
        return;
      }

      // Complete the task
      const task = await this.tasksService.completeTask(taskId, user.id, {
        skip_photos: false, // Require photos
      });

      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `🎉🎊 <b>Отличная работа!</b> 🎊🎉\n\n` +
              `✅ Задача завершена: <b>${task.type_code}</b>\n\n` +
              `🎯 Аппарат: ${task.machine?.machine_number || 'N/A'}\n` +
              `📅 Выполнено: ${new Date().toLocaleString('ru-RU')}\n\n` +
              `💪 Так держать!`
          : `🎉🎊 <b>Great job!</b> 🎊🎉\n\n` +
              `✅ Task completed: <b>${task.type_code}</b>\n\n` +
              `🎯 Machine: ${task.machine?.machine_number || 'N/A'}\n` +
              `📅 Completed: ${new Date().toLocaleString('en-US')}\n\n` +
              `💪 Keep it up!`,
        { parse_mode: 'HTML' },
      );
    } catch (error) {
      this.logger.error('Error completing task:', error);

      // User-friendly error message with recovery steps
      const errorMessage =
        lang === TelegramLanguage.RU
          ? `😕 Не удалось завершить задачу\n\n` +
            `<b>Что могло пойти не так:</b>\n` +
            `• Задача не запущена (используйте /start_task сначала)\n` +
            `• Фото ДО не загружено\n` +
            `• Фото ПОСЛЕ не загружено\n` +
            `• Не все шаги чек-листа завершены\n\n` +
            `<b>💡 Что делать:</b>\n` +
            `1️⃣ Проверьте, что задача запущена\n` +
            `2️⃣ Загрузите все необходимые фото\n` +
            `3️⃣ Завершите чек-лист\n` +
            `4️⃣ Попробуйте снова: /complete_task <ID>\n\n` +
            `❓ Нужна помощь? Напишите /help`
          : `😕 Could not complete task\n\n` +
            `<b>Possible issues:</b>\n` +
            `• Task not started (use /start_task first)\n` +
            `• BEFORE photo missing\n` +
            `• AFTER photo missing\n` +
            `• Checklist not fully completed\n\n` +
            `<b>💡 What to do:</b>\n` +
            `1️⃣ Check task is started\n` +
            `2️⃣ Upload all required photos\n` +
            `3️⃣ Complete checklist\n` +
            `4️⃣ Try again: /complete_task <ID>\n\n` +
            `❓ Need help? Type /help`;

      await ctx.reply(errorMessage, { parse_mode: 'HTML' });
    }
  }

  /**
   * Validate photo before upload
   * Checks MIME type, file size, and task ownership
   *
   * @param buffer - Photo buffer
   * @param mimeType - MIME type of the photo
   * @param fileSize - Size of the file in bytes
   * @param userId - User ID uploading the photo
   * @param taskId - Task ID the photo is for
   * @throws Error if validation fails
   */
  async validatePhotoUpload(
    buffer: Buffer,
    mimeType: string,
    fileSize: number,
    userId: string,
    taskId: string,
  ): Promise<void> {
    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error(`Invalid file type: ${mimeType}. Allowed: JPEG, PNG, WebP`);
    }

    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 5_000_000; // 5MB
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${(fileSize / 1_000_000).toFixed(2)}MB (max 5MB)`);
    }

    // Verify task exists and user is assigned to it
    try {
      const task = await this.tasksService.findOne(taskId);

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Check if user is assigned to the task
      if (task.assigned_to_user_id !== userId) {
        throw new Error('You are not assigned to this task');
      }

      // Check task status - only allow photo uploads for tasks in progress
      const validStatuses = [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS];
      if (!validStatuses.includes(task.status)) {
        throw new Error(`Cannot upload photos to task with status: ${task.status}`);
      }
    } catch (error) {
      // Re-throw any errors with validation context
      throw error;
    }
  }

  /**
   * Handler for photo uploads - associates photos with tasks
   * 🎯 NOW USES CONVERSATION STATE - NO CAPTION NEEDED!
   */
  async handlePhotoUpload(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.MESSAGE, 'photo');

    if (!ctx.telegramUser?.is_verified) {
      return; // Ignore photos from unverified users
    }

    const lang = ctx.telegramUser.language;

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);

      if (!user) {
        return;
      }

      // 🎯 CHECK CONVERSATION STATE instead of parsing caption!
      const session = ctx.session;

      if (!session) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Сессия не найдена. Начните задачу заново.'
            : '❌ Session not found. Start task again.',
        );
        return;
      }

      // Check if user is in photo upload state
      const isAwaitingBefore = session.state === ConversationState.AWAITING_PHOTO_BEFORE;
      const isAwaitingAfter = session.state === ConversationState.AWAITING_PHOTO_AFTER;

      if (!isAwaitingBefore && !isAwaitingAfter) {
        // User sent photo but we're not expecting one
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '🤔 Сейчас фото не ожидается.\n\n' + '💡 Сначала начните задачу: /tasks'
            : '🤔 Not expecting a photo right now.\n\n' + '💡 Start a task first: /tasks',
        );
        return;
      }

      // Get task ID from session context
      const taskId = session.context.activeTaskId;

      if (!taskId) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Задача не найдена в сессии. Начните заново.'
            : '❌ Task not found in session. Start again.',
        );
        await this.sessionService.clearActiveTask(user.id);
        return;
      }

      // Get photo file
      const photo =
        ctx.message && 'photo' in ctx.message
          ? ctx.message.photo[ctx.message.photo.length - 1]
          : null;

      if (!photo) {
        await ctx.reply(lang === TelegramLanguage.RU ? '❌ Фото не найдено' : '❌ Photo not found');
        return;
      }

      // Show upload progress
      await ctx.replyWithChatAction('upload_photo');

      // Download photo from Telegram
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);
      const response = await fetch(fileLink.href);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Determine category based on state
      const category = isAwaitingBefore ? 'task_photo_before' : 'task_photo_after';

      await this.filesService.uploadFile(
        {
          buffer,
          originalname: `telegram_${Date.now()}.jpg`,
          mimetype: 'image/jpeg',
          size: buffer.length,
        } as Express.Multer.File,
        'task',
        taskId,
        category,
        user.id,
      );

      // 🎯 UPDATE CONVERSATION STATE based on which photo was uploaded
      if (isAwaitingBefore) {
        // BEFORE photo uploaded → Now request AFTER photo
        await this.sessionService.requestPhoto(user.id, taskId, 'after');

        await ctx.reply(
          lang === TelegramLanguage.RU
            ? `✅ <b>Фото ДО загружено успешно!</b>\n\n` +
                `📸 Теперь выполните работу и отправьте фото ПОСЛЕ\n` +
                `<i>(просто отправьте фото, подпись не нужна)</i>`
            : `✅ <b>BEFORE photo uploaded successfully!</b>\n\n` +
                `📸 Now complete the work and send AFTER photo\n` +
                `<i>(just send photo, no caption needed)</i>`,
          { parse_mode: 'HTML' },
        );
      } else if (isAwaitingAfter) {
        // AFTER photo uploaded → Clear active task, back to IDLE
        await this.sessionService.clearActiveTask(user.id);

        await ctx.reply(
          lang === TelegramLanguage.RU
            ? `🎉 <b>Оба фото загружены!</b>\n\n` +
                `✅ Фото ДО: ✓\n` +
                `✅ Фото ПОСЛЕ: ✓\n\n` +
                `💡 Теперь можете завершить задачу:\n` +
                `/complete_task ${taskId.substring(0, 8)}...\n\n` +
                `Или выберите другую задачу: /tasks`
            : `🎉 <b>Both photos uploaded!</b>\n\n` +
                `✅ BEFORE photo: ✓\n` +
                `✅ AFTER photo: ✓\n\n` +
                `💡 You can now complete the task:\n` +
                `/complete_task ${taskId.substring(0, 8)}...\n\n` +
                `Or choose another task: /tasks`,
          { parse_mode: 'HTML' },
        );
      }

      // Update task execution state metadata
      try {
        const task = await this.tasksService.findOne(taskId);
        const state = this.taskCallbackService.getExecutionState(task);

        if (state) {
          if (isAwaitingBefore) {
            state.photos_uploaded.before = true;
          } else if (isAwaitingAfter) {
            state.photos_uploaded.after = true;
          }

          await this.taskCallbackService.updateExecutionState(taskId, state);
        }
      } catch (error: any) {
        this.logger.warn(`Failed to update execution state after photo upload: ${error.message}`);
        // Don't fail the photo upload if state update fails
      }
    } catch (error: any) {
      this.logger.error('Error uploading photo:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка при загрузке фото: ${error.message}`
          : `❌ Error uploading photo: ${error.message}`,
      );
    }
  }

  /**
   * Handler for voice messages - transcribe and execute commands
   * 🎤 Uses OpenAI Whisper for speech-to-text in Russian/English/Uzbek
   */
  async handleVoiceMessage(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.MESSAGE, 'voice');

    if (!ctx.telegramUser?.is_verified) {
      return; // Ignore voice from unverified users
    }

    const lang = ctx.telegramUser.language;

    // Check if voice service is available
    if (!this.voiceService.isAvailable()) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '🎤 Голосовые команды временно недоступны.\n\n' +
              '💡 Используйте текстовые команды или кнопки меню.'
          : '🎤 Voice commands temporarily unavailable.\n\n' +
              '💡 Please use text commands or menu buttons.',
      );
      return;
    }

    try {
      // Show typing indicator
      await ctx.replyWithChatAction('typing');

      // Get voice file
      const voice = ctx.message && 'voice' in ctx.message ? ctx.message.voice : null;

      if (!voice) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Голосовое сообщение не найдено'
            : '❌ Voice message not found',
        );
        return;
      }

      // Inform user we're processing
      const processingMsg = await ctx.reply(
        lang === TelegramLanguage.RU
          ? '🎤 Слушаю... Распознаю речь...'
          : '🎤 Listening... Transcribing...',
      );

      // Download voice file from Telegram
      const fileLink = await ctx.telegram.getFileLink(voice.file_id);
      const response = await fetch(fileLink.href);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Transcribe voice to text
      const languageCode = lang === TelegramLanguage.RU ? 'ru' : 'en';
      const transcribedText = await this.voiceService.transcribeVoice(buffer, languageCode);

      this.logger.log(
        `Voice transcribed from user ${ctx.telegramUser.telegram_id}: "${transcribedText}"`,
      );

      // Delete processing message
      await ctx.telegram.deleteMessage(ctx.chat!.id, processingMsg.message_id);

      // Parse command from transcribed text
      const command = this.voiceService.parseCommand(transcribedText);

      // Show what we understood
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `🎧 Вы сказали: <i>"${transcribedText}"</i>\n\n${this.voiceService.getVoiceCommandResponse(command, 'ru')}`
          : `🎧 You said: <i>"${transcribedText}"</i>\n\n${this.voiceService.getVoiceCommandResponse(command, 'en')}`,
        { parse_mode: 'HTML' },
      );

      // Execute command based on intent
      switch (command.intent) {
        case 'tasks':
          if (this.helpers?.handleTasksCommand) {
            await this.helpers.handleTasksCommand(ctx);
          }
          break;

        case 'machines':
          if (this.helpers?.handleMachinesCommand) {
            await this.helpers.handleMachinesCommand(ctx);
          }
          break;

        case 'stats':
          if (this.helpers?.handleStatsCommand) {
            await this.helpers.handleStatsCommand(ctx);
          }
          break;

        case 'help':
          await ctx.reply(this.t(lang, 'help'), { parse_mode: 'HTML' });
          break;

        case 'start_task':
          // If task number was detected, try to start it
          if (command.parameters?.taskNumber) {
            if (this.helpers?.handleTasksCommand) {
              await this.helpers.handleTasksCommand(ctx); // Show tasks, user will select from list
            }
          } else if (this.helpers?.handleTasksCommand) {
            await this.helpers.handleTasksCommand(ctx);
          }
          break;

        case 'complete_task':
          if (this.helpers?.handleTasksCommand) {
            await this.helpers.handleTasksCommand(ctx); // Show tasks, user will complete from list
          }
          break;

        case 'unknown':
          // Already responded with help text via getVoiceCommandResponse
          break;
      }
    } catch (error: any) {
      this.logger.error('Error processing voice message:', error);

      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '😕 Не удалось распознать голосовое сообщение\n\n' +
              '<b>Что могло пойти не так:</b>\n' +
              '• Плохое качество записи\n' +
              '• Фоновый шум\n' +
              '• Слишком короткая запись\n\n' +
              '<b>💡 Попробуйте:</b>\n' +
              '1️⃣ Записать в тихом месте\n' +
              '2️⃣ Говорить четко и громко\n' +
              '3️⃣ Использовать текстовые команды: /help\n\n' +
              `<i>Ошибка: ${error.message}</i>`
          : '😕 Failed to process voice message\n\n' +
              '<b>What could go wrong:</b>\n' +
              '• Poor recording quality\n' +
              '• Background noise\n' +
              '• Recording too short\n\n' +
              '<b>💡 Try:</b>\n' +
              '1️⃣ Record in quiet place\n' +
              '2️⃣ Speak clearly and loudly\n' +
              '3️⃣ Use text commands: /help\n\n' +
              `<i>Error: ${error.message}</i>`,
        { parse_mode: 'HTML' },
      );
    }
  }
}
