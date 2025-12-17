/**
 * Telegram Task Handler
 *
 * Handles all task-related operations via Telegram:
 * - List tasks
 * - Start task
 * - Complete task
 * - Step-by-step execution
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Context } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../entities/telegram-user.entity';
import { TelegramMessageLog, TelegramMessageType } from '../entities/telegram-message-log.entity';
import { TelegramSessionService, ConversationState } from '../services/telegram-session.service';
import { TasksService } from '../../tasks/tasks.service';
import { UsersService } from '../../users/users.service';
import { TaskStatus, Task } from '../../tasks/entities/task.entity';
import { TelegramKeyboardHandler } from './telegram-keyboard.handler';
import { TelegramMessageHandler } from './telegram-message.handler';

interface BotContext extends Context {
  telegramUser?: TelegramUser;
}

/**
 * Task execution state for step-by-step guidance
 */
interface TaskExecutionState {
  current_step: number;
  checklist_progress: Record<number, { completed: boolean; completed_at?: string; notes?: string }>;
  photos_uploaded: { before: boolean; after: boolean };
  started_at: string;
  last_interaction_at: string;
}

@Injectable()
export class TelegramTaskHandler {
  private readonly logger = new Logger(TelegramTaskHandler.name);

  constructor(
    @InjectRepository(TelegramMessageLog)
    private readonly messageLogRepository: Repository<TelegramMessageLog>,
    private readonly sessionService: TelegramSessionService,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly keyboardHandler: TelegramKeyboardHandler,
    private readonly messageHandler: TelegramMessageHandler,
  ) {}

  /**
   * Handle /tasks command - shows list of operator's tasks
   */
  async handleTasksCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/tasks');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Вы не верифицированы'
          : '❌ You are not verified',
      );
      return;
    }

    const lang = ctx.telegramUser.language;
    await ctx.replyWithChatAction('typing');

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);

      if (!user) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Пользователь не найден. Обратитесь к администратору.'
            : '❌ User not found. Contact administrator.',
        );
        return;
      }

      const tasks = await this.tasksService.findAll(undefined, undefined, undefined, user.id);

      const activeTasks = tasks.filter(
        (t) =>
          t.status === TaskStatus.PENDING ||
          t.status === TaskStatus.ASSIGNED ||
          t.status === TaskStatus.IN_PROGRESS,
      );

      if (activeTasks.length === 0) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '✅ У вас нет активных задач'
            : '✅ You have no active tasks',
        );
        return;
      }

      const message = this.messageHandler.formatTasksMessage(activeTasks, lang);
      const keyboard = this.keyboardHandler.getTasksKeyboard(activeTasks, lang);

      await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
    } catch (error) {
      this.logger.error('Error fetching tasks:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '😕 Не удалось загрузить список задач'
          : '😕 Failed to load tasks list',
      );
    }
  }

  /**
   * Handle /start_task command
   */
  async handleStartTaskCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/start_task');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Вы не верифицированы'
          : '❌ You are not verified',
      );
      return;
    }

    const lang = ctx.telegramUser.language;

    // Parse task ID from command argument
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = text.split(' ');
    const taskId = parts[1];

    if (!taskId) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '⚠️ Укажите ID задачи: /start_task <task_id>'
          : '⚠️ Specify task ID: /start_task <task_id>',
      );
      return;
    }

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);
      if (!user) {
        await ctx.reply(
          lang === TelegramLanguage.RU ? '❌ Пользователь не найден' : '❌ User not found',
        );
        return;
      }

      const task = await this.tasksService.startTask(taskId, user.id);

      // Set conversation state - request BEFORE photo
      await this.sessionService.requestPhoto(user.id, taskId, 'before');

      const message = this.messageHandler.formatTaskStartedMessage(task, lang);
      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      this.logger.error('Error starting task:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${error.message}`
          : `❌ Error: ${error.message}`,
      );
    }
  }

  /**
   * Handle /complete_task command
   */
  async handleCompleteTaskCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/complete_task');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Вы не верифицированы'
          : '❌ You are not verified',
      );
      return;
    }

    const lang = ctx.telegramUser.language;

    // Parse task ID from command argument
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = text.split(' ');
    const taskId = parts[1];

    if (!taskId) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '⚠️ Укажите ID задачи: /complete_task <task_id>'
          : '⚠️ Specify task ID: /complete_task <task_id>',
      );
      return;
    }

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);
      if (!user) {
        await ctx.reply(
          lang === TelegramLanguage.RU ? '❌ Пользователь не найден' : '❌ User not found',
        );
        return;
      }

      await this.tasksService.completeTask(taskId, user.id);

      // Clear session state
      await this.sessionService.clearPhotoRequest(user.id);

      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '✅ Задача успешно завершена!'
          : '✅ Task completed successfully!',
      );
    } catch (error) {
      this.logger.error('Error completing task:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${error.message}`
          : `❌ Error: ${error.message}`,
      );
    }
  }

  /**
   * Handle task start via callback (inline button)
   */
  async handleTaskStartCallback(ctx: BotContext, taskId: string): Promise<void> {
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser!.telegram_id);
      if (!user) {
        await ctx.reply(
          lang === TelegramLanguage.RU ? '❌ Пользователь не найден' : '❌ User not found',
        );
        return;
      }

      const task = await this.tasksService.startTask(taskId, user.id);

      // Set conversation state - request BEFORE photo
      await this.sessionService.requestPhoto(user.id, taskId, 'before');

      const message = this.messageHandler.formatTaskStartedMessage(task, lang);
      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      this.logger.error('Error starting task:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${error.message}`
          : `❌ Error: ${error.message}`,
      );
    }
  }

  /**
   * Handle step completion (Done/Skip buttons)
   */
  async handleStepCompletion(
    ctx: BotContext,
    taskId: string,
    stepIndex: number,
    skipped: boolean,
  ): Promise<void> {
    if (!ctx.telegramUser?.is_verified) {
      return;
    }

    const lang = ctx.telegramUser.language;

    try {
      const task = await this.tasksService.findOne(taskId);
      const state = this.getExecutionState(task);

      if (!state) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Состояние задачи не найдено'
            : '❌ Task state not found',
        );
        return;
      }

      // Mark step as completed
      state.checklist_progress[stepIndex] = {
        completed: !skipped,
        completed_at: new Date().toISOString(),
        notes: skipped ? 'Пропущено' : undefined,
      };

      // Move to next step
      state.current_step = stepIndex + 1;
      state.last_interaction_at = new Date().toISOString();

      await this.updateExecutionState(taskId, state);

      // Show next step or completion
      const checklist = task.checklist || [];
      if (state.current_step >= checklist.length) {
        // All steps completed - request AFTER photo
        const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);
        if (user) {
          await this.sessionService.requestPhoto(user.id, taskId, 'after');
        }

        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '✅ Все шаги выполнены!\n\n📸 Теперь отправьте фото ПОСЛЕ выполнения работы'
            : '✅ All steps completed!\n\n📸 Now send AFTER photo',
        );
      } else {
        // Show next step
        const updatedTask = await this.tasksService.findOne(taskId);
        await this.showCurrentStep(ctx, updatedTask, state, lang);
      }
    } catch (error) {
      this.logger.error('Error handling step completion:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${error.message}`
          : `❌ Error: ${error.message}`,
      );
    }
  }

  /**
   * Show current step in the checklist
   */
  async showCurrentStep(
    ctx: BotContext,
    task: Task,
    state: TaskExecutionState,
    lang: TelegramLanguage,
  ): Promise<void> {
    const checklist = task.checklist || [];
    const currentStep = state.current_step;

    if (currentStep >= checklist.length) {
      return;
    }

    const step = checklist[currentStep];
    const stepNumber = currentStep + 1;
    const totalSteps = checklist.length;

    const message =
      lang === TelegramLanguage.RU
        ? `📝 <b>Шаг ${stepNumber} из ${totalSteps}</b>\n\n${step}\n\n<i>Нажмите "Готово" когда завершите</i>`
        : `📝 <b>Step ${stepNumber} of ${totalSteps}</b>\n\n${step}\n\n<i>Tap "Done" when finished</i>`;

    const keyboard = this.keyboardHandler.getStepKeyboard(task.id, currentStep, lang, currentStep > 0);

    await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
  }

  // Helper methods
  private getExecutionState(task: Task): TaskExecutionState | null {
    const metadata = task.metadata as Record<string, unknown> | null;
    return (metadata?.telegram_execution_state as TaskExecutionState) || null;
  }

  private async updateExecutionState(taskId: string, state: TaskExecutionState): Promise<void> {
    const task = await this.tasksService.findOne(taskId);
    const metadata = (task.metadata || {}) as Record<string, unknown>;
    metadata.telegram_execution_state = state;

    // Update task metadata
    await this.tasksService.update(taskId, { metadata: metadata as Record<string, unknown> });
  }

  private async logMessage(
    ctx: BotContext,
    type: TelegramMessageType,
    content: string,
  ): Promise<void> {
    try {
      const log = this.messageLogRepository.create({
        telegram_user_id: ctx.telegramUser?.id,
        chat_id: ctx.chat?.id.toString(),
        message_type: type,
        message_content: content,
        direction: 'incoming',
        processed_at: new Date(),
      });
      await this.messageLogRepository.save(log);
    } catch (error) {
      this.logger.error('Failed to log message', error);
    }
  }
}
