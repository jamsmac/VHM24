import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Markup } from 'telegraf';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TasksService } from '../../../tasks/tasks.service';
import { UsersService } from '../../../users/users.service';
import { TelegramSessionService } from '../../infrastructure/services/telegram-session.service';
import {
  BotContext,
  TelegramTaskInfo,
  TaskExecutionState,
} from '../../shared/types/telegram.types';

/**
 * TelegramTaskCallbackService
 *
 * Handles task-related callback queries for the Telegram bot.
 * Includes task start, step completion, step skip, and step back callbacks.
 *
 * @module TelegramCoreModule
 */
@Injectable()
export class TelegramTaskCallbackService {
  private readonly logger = new Logger(TelegramTaskCallbackService.name);

  constructor(
    @InjectRepository(TelegramMessageLog)
    private telegramMessageLogRepository: Repository<TelegramMessageLog>,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly sessionService: TelegramSessionService,
  ) {}

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

  // ============================================================================
  // TASK START CALLBACK
  // ============================================================================

  /**
   * Handle task_start callback - start a task and request before photo
   */
  async handleTaskStart(ctx: BotContext, taskId: string): Promise<void> {
    await this.logCallback(ctx, `task_start_${taskId}`);
    await ctx.answerCbQuery();

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

      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `🎉 Задача "${task.type_code}" начата!\n\n` +
              `🎯 Аппарат: ${task.machine?.machine_number || 'N/A'}\n` +
              `📍 Локация: ${task.machine?.location?.name || 'N/A'}\n\n` +
              `📸 <b>Теперь просто отправьте фото ДО начала работы</b>\n` +
              `<i>(подпись не нужна, я запомнил что вы в этой задаче)</i>`
          : `🎉 Task "${task.type_code}" started!\n\n` +
              `🎯 Machine: ${task.machine?.machine_number || 'N/A'}\n` +
              `📍 Location: ${task.machine?.location?.name || 'N/A'}\n\n` +
              `📸 <b>Now just send BEFORE photo</b>\n` +
              `<i>(no caption needed, I remember you're in this task)</i>`,
        { parse_mode: 'HTML' },
      );
    } catch (error: unknown) {
      this.logger.error('Error starting task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${errorMessage}`
          : `❌ Error: ${errorMessage}`,
      );
    }
  }

  // ============================================================================
  // STEP COMPLETION CALLBACKS
  // ============================================================================

  /**
   * Handle step_done callback - mark step as completed
   */
  async handleStepDone(ctx: BotContext, taskId: string, stepIndex: number): Promise<void> {
    await this.logCallback(ctx, `step_done_${taskId}_${stepIndex}`);
    await ctx.answerCbQuery('✅');
    await this.handleStepCompletion(ctx, taskId, stepIndex, false);
  }

  /**
   * Handle step_skip callback - skip current step
   */
  async handleStepSkip(ctx: BotContext, taskId: string, stepIndex: number): Promise<void> {
    await this.logCallback(ctx, `step_skip_${taskId}_${stepIndex}`);
    await ctx.answerCbQuery('⏭️');
    await this.handleStepCompletion(ctx, taskId, stepIndex, true);
  }

  /**
   * Handle step_back callback - go to previous step
   */
  async handleStepBack(ctx: BotContext, taskId: string): Promise<void> {
    await this.logCallback(ctx, `step_back_${taskId}`);

    if (!ctx.telegramUser?.is_verified) {
      return;
    }

    const lang = ctx.telegramUser.language;

    try {
      const task = await this.tasksService.findOne(taskId);
      const state = this.getExecutionState(task);

      if (!state) {
        await ctx.answerCbQuery('❌ State not found');
        return;
      }

      if (state.current_step > 0) {
        state.current_step -= 1;
        await this.updateExecutionState(taskId, state);

        await ctx.answerCbQuery('◀️');
        const updatedTask = await this.tasksService.findOne(taskId);
        await this.showCurrentStep(ctx, updatedTask, state, lang);
      } else {
        await ctx.answerCbQuery(
          lang === TelegramLanguage.RU ? 'Уже на первом шаге' : 'Already at first step',
        );
      }
    } catch (error: unknown) {
      this.logger.error('Error going back:', error);
      await ctx.answerCbQuery('❌ Error');
    }
  }

  // ============================================================================
  // HELPER METHODS (public for use by TelegramBotService)
  // ============================================================================

  /**
   * Get execution state from task metadata
   */
  getExecutionState(task: TelegramTaskInfo): TaskExecutionState | null {
    return (
      ((task.metadata as Record<string, unknown> | null)
        ?.telegram_execution_state as TaskExecutionState | null) || null
    );
  }

  /**
   * Update task execution state
   */
  async updateExecutionState(taskId: string, state: TaskExecutionState): Promise<void> {
    try {
      const task = await this.tasksService.findOne(taskId);

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      const metadata = task.metadata || {};
      metadata.telegram_execution_state = {
        ...state,
        last_interaction_at: new Date().toISOString(),
      };

      await this.tasksService.update(taskId, { metadata });
    } catch (error) {
      this.logger.error(`Failed to update execution state for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Show current step with inline keyboard
   */
  async showCurrentStep(
    ctx: BotContext,
    task: TelegramTaskInfo,
    state: TaskExecutionState,
    lang: TelegramLanguage,
  ): Promise<void> {
    const checklist = task.checklist || [];

    if (!checklist.length) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `📋 Задача без чек-листа\n\n` +
              `📸 Загрузите фото ДО и ПОСЛЕ выполнения\n` +
              `После загрузки фото используйте /complete_task ${task.id}`
          : `📋 Task without checklist\n\n` +
              `📸 Upload BEFORE and AFTER photos\n` +
              `After uploading photos use /complete_task ${task.id}`,
      );
      return;
    }

    const currentStep = state.current_step;
    const totalSteps = checklist.length;
    const currentItem = checklist[currentStep];

    if (currentStep >= totalSteps) {
      // All steps completed
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `✅ Все шаги выполнены! (${totalSteps}/${totalSteps})\n\n` +
              `${state.photos_uploaded.before ? '✅' : '❌'} Фото ДО\n` +
              `${state.photos_uploaded.after ? '✅' : '❌'} Фото ПОСЛЕ\n\n` +
              (state.photos_uploaded.before && state.photos_uploaded.after
                ? `🎉 Задача готова к завершению!\n\n` + `Используйте /complete_task ${task.id}`
                : `📸 Загрузите ${!state.photos_uploaded.before ? 'фото ДО' : 'фото ПОСЛЕ'}`)
          : `✅ All steps completed! (${totalSteps}/${totalSteps})\n\n` +
              `${state.photos_uploaded.before ? '✅' : '❌'} BEFORE photo\n` +
              `${state.photos_uploaded.after ? '✅' : '❌'} AFTER photo\n\n` +
              (state.photos_uploaded.before && state.photos_uploaded.after
                ? `🎉 Task ready to complete!\n\n` + `Use /complete_task ${task.id}`
                : `📸 Upload ${!state.photos_uploaded.before ? 'BEFORE photo' : 'AFTER photo'}`),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              lang === TelegramLanguage.RU ? '◀️ Назад' : '◀️ Back',
              `step_back_${task.id}`,
            ),
          ],
        ]),
      );
      return;
    }

    // Show current step
    const progressBar = this.buildProgressBar(state.checklist_progress, totalSteps);
    const completedCount = Object.values(state.checklist_progress).filter(
      (p) => p.completed,
    ).length;

    await ctx.reply(
      lang === TelegramLanguage.RU
        ? `📋 Шаг ${currentStep + 1}/${totalSteps}\n` +
            `${progressBar}\n\n` +
            `${currentItem.item}\n\n` +
            `✅ Выполнено: ${completedCount}/${totalSteps}`
        : `📋 Step ${currentStep + 1}/${totalSteps}\n` +
            `${progressBar}\n\n` +
            `${currentItem.item}\n\n` +
            `✅ Completed: ${completedCount}/${totalSteps}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            lang === TelegramLanguage.RU ? '✅ Готово' : '✅ Done',
            `step_done_${task.id}_${currentStep}`,
          ),
          Markup.button.callback(
            lang === TelegramLanguage.RU ? '⏭️ Пропустить' : '⏭️ Skip',
            `step_skip_${task.id}_${currentStep}`,
          ),
        ],
        currentStep > 0
          ? [
              Markup.button.callback(
                lang === TelegramLanguage.RU ? '◀️ Назад' : '◀️ Back',
                `step_back_${task.id}`,
              ),
            ]
          : [],
      ]),
    );
  }

  /**
   * Build visual progress bar
   */
  private buildProgressBar(
    progress: Record<number, { completed: boolean }>,
    total: number,
  ): string {
    let bar = '';
    for (let i = 0; i < total; i++) {
      bar += progress[i]?.completed ? '🟩' : '⬜';
    }
    return bar;
  }

  /**
   * Mark current step as completed and move to next
   */
  private async handleStepCompletion(
    ctx: BotContext,
    taskId: string,
    stepIndex: number,
    skipped: boolean = false,
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
            ? '❌ Состояние выполнения не найдено'
            : '❌ Execution state not found',
        );
        return;
      }

      // Validate step index bounds
      const checklistLength = task.checklist?.length || 0;
      if (stepIndex < 0 || stepIndex >= checklistLength) {
        this.logger.warn(
          `Step index out of bounds for task ${taskId}: index=${stepIndex}, checklist_length=${checklistLength}`,
        );
        await ctx.reply(
          lang === TelegramLanguage.RU ? '❌ Некорректный номер шага' : '❌ Invalid step number',
        );
        return;
      }

      // Mark step as completed
      state.checklist_progress[stepIndex] = {
        completed: !skipped,
        completed_at: new Date().toISOString(),
      };

      // Move to next step with bounds check
      state.current_step = Math.min(stepIndex + 1, checklistLength);

      // Update task checklist
      if (task.checklist && task.checklist[stepIndex]) {
        task.checklist[stepIndex].completed = !skipped;
        await this.tasksService.update(taskId, {
          checklist: task.checklist,
        });
      }

      // Save state
      await this.updateExecutionState(taskId, state);

      // Show next step
      const updatedTask = await this.tasksService.findOne(taskId);
      await this.showCurrentStep(ctx, updatedTask, state, lang);
    } catch (error: unknown) {
      this.logger.error('Error handling step completion:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await ctx.reply(
        lang === TelegramLanguage.RU ? `❌ Ошибка: ${errorMessage}` : `❌ Error: ${errorMessage}`,
      );
    }
  }
}
