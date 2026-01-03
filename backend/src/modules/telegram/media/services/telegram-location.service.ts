import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TasksService } from '../../../tasks/tasks.service';
import { UsersService } from '../../../users/users.service';
import { MachinesService } from '../../../machines/machines.service';
import { LocationsService } from '../../../locations/locations.service';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import { TelegramCacheService } from '../../infrastructure/services/telegram-cache.service';

interface BotContext extends Context {
  telegramUser?: TelegramUser;
}

interface LocationHelpers {
  t: (lang: TelegramLanguage, key: string, ...args: string[]) => string;
  logMessage: (ctx: BotContext, type: TelegramMessageType, command?: string) => Promise<void>;
}

/**
 * Coordinates interface
 */
interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Nearby task with distance
 */
interface NearbyTask {
  taskId: string;
  taskType: TaskType;
  machineNumber: string;
  machineName: string;
  location: string;
  distance: number; // meters
  coordinates: Coordinates | null;
}

/**
 * Nearby machine with distance
 */
interface NearbyMachine {
  machineId: string;
  machineNumber: string;
  machineName: string;
  location: string;
  distance: number; // meters
  coordinates: Coordinates | null;
  hasPendingTasks: boolean;
}

/**
 * TelegramLocationService
 *
 * Handles location-based features for Telegram bot:
 * - Process location messages from users
 * - Find nearby tasks sorted by distance
 * - Find nearby machines
 * - Calculate optimal route suggestions
 * - Validate operator location for task completion
 *
 * @module TelegramMediaModule
 */
@Injectable()
export class TelegramLocationService {
  private readonly logger = new Logger(TelegramLocationService.name);
  private helpers: LocationHelpers | null = null;

  // Configuration
  private readonly DEFAULT_RADIUS_METERS = 5000; // 5km default search radius
  private readonly MAX_RESULTS = 10;
  private readonly TASK_COMPLETION_THRESHOLD_METERS = 500; // Must be within 500m to complete task

  constructor(
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly machinesService: MachinesService,
    private readonly locationsService: LocationsService,
    private readonly cacheService: TelegramCacheService,
  ) {}

  /**
   * Set helper methods from TelegramBotService
   */
  setHelpers(helpers: LocationHelpers): void {
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

  // ============================================================================
  // LOCATION MESSAGE HANDLERS
  // ============================================================================

  /**
   * Handle location message from user
   */
  async handleLocationMessage(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.LOCATION);

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    // Extract location from message
    const message = ctx.message;
    if (!message || !('location' in message)) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Не удалось получить местоположение'
          : '❌ Could not get location',
      );
      return;
    }

    const userLocation: Coordinates = {
      latitude: message.location.latitude,
      longitude: message.location.longitude,
    };

    await ctx.replyWithChatAction('typing');

    try {
      // Get user
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);
      if (!user) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Пользователь не найден'
            : '❌ User not found',
        );
        return;
      }

      // Find nearby tasks
      const nearbyTasks = await this.findNearbyTasks(user.id, userLocation, this.DEFAULT_RADIUS_METERS);

      if (nearbyTasks.length === 0) {
        // No nearby tasks, show nearby machines instead
        const nearbyMachines = await this.findNearbyMachines(userLocation, this.DEFAULT_RADIUS_METERS);
        await this.sendNearbyMachinesMessage(ctx, nearbyMachines, userLocation, lang);
      } else {
        await this.sendNearbyTasksMessage(ctx, nearbyTasks, userLocation, lang);
      }
    } catch (error) {
      this.logger.error('Error processing location:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Ошибка обработки местоположения'
          : '❌ Error processing location',
      );
    }
  }

  /**
   * Handle /nearby command - find nearby tasks
   */
  async handleNearbyCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/nearby');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    // Request location from user
    await ctx.reply(
      lang === TelegramLanguage.RU
        ? `📍 <b>Поиск ближайших задач</b>\n\n` +
          `Отправьте ваше местоположение, чтобы найти задачи поблизости.\n\n` +
          `💡 Нажмите кнопку ниже или отправьте геолокацию.`
        : `📍 <b>Find Nearby Tasks</b>\n\n` +
          `Share your location to find nearby tasks.\n\n` +
          `💡 Press the button below or send your location.`,
      {
        parse_mode: 'HTML',
        ...Markup.keyboard([
          [
            Markup.button.locationRequest(
              lang === TelegramLanguage.RU ? '📍 Отправить местоположение' : '📍 Share Location',
            ),
          ],
          [lang === TelegramLanguage.RU ? '❌ Отмена' : '❌ Cancel'],
        ]).resize().oneTime(),
      },
    );
  }

  /**
   * Handle /route command - show route to nearest task
   */
  async handleRouteCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/route');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    // Request location from user for route calculation
    await ctx.reply(
      lang === TelegramLanguage.RU
        ? `🗺️ <b>Построение маршрута</b>\n\n` +
          `Отправьте ваше местоположение для построения оптимального маршрута.\n\n` +
          `💡 Маршрут покажет задачи в порядке ближайших.`
        : `🗺️ <b>Route Planning</b>\n\n` +
          `Share your location to build an optimal route.\n\n` +
          `💡 Route will show tasks ordered by proximity.`,
      {
        parse_mode: 'HTML',
        ...Markup.keyboard([
          [
            Markup.button.locationRequest(
              lang === TelegramLanguage.RU ? '📍 Отправить местоположение' : '📍 Share Location',
            ),
          ],
          [lang === TelegramLanguage.RU ? '❌ Отмена' : '❌ Cancel'],
        ]).resize().oneTime(),
      },
    );
  }

  // ============================================================================
  // CALLBACK HANDLERS
  // ============================================================================

  /**
   * Handle start nearest task callback
   */
  async handleStartNearestCallback(ctx: BotContext, taskId: string): Promise<void> {
    await ctx.answerCbQuery();
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    try {
      // Get task details and return info to start it
      const task = await this.tasksService.findOne(taskId);
      if (!task) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Задача не найдена'
            : '❌ Task not found',
        );
        return;
      }

      // Send navigation link
      if (task.machine?.location?.latitude && task.machine?.location?.longitude) {
        const mapsUrl = this.getGoogleMapsUrl({
          latitude: task.machine.location.latitude,
          longitude: task.machine.location.longitude,
        });

        await ctx.reply(
          lang === TelegramLanguage.RU
            ? `🗺️ <b>Навигация к задаче</b>\n\n` +
              `📋 ${this.getTaskTypeLabel(task.task_type, lang)}\n` +
              `🖥 ${task.machine.machine_number}\n` +
              `📍 ${task.machine.location.name || task.machine.location.address || 'N/A'}\n\n` +
              `<a href="${mapsUrl}">🗺️ Открыть в Google Maps</a>\n\n` +
              `💡 Когда прибудете, нажмите кнопку "Начать"`
            : `🗺️ <b>Navigate to Task</b>\n\n` +
              `📋 ${this.getTaskTypeLabel(task.task_type, lang)}\n` +
              `🖥 ${task.machine.machine_number}\n` +
              `📍 ${task.machine.location.name || task.machine.location.address || 'N/A'}\n\n` +
              `<a href="${mapsUrl}">🗺️ Open in Google Maps</a>\n\n` +
              `💡 When you arrive, press "Start" button`,
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.callback(
                lang === TelegramLanguage.RU ? '▶️ Начать задачу' : '▶️ Start Task',
                `start_task_${taskId}`,
              )],
            ]),
          },
        );
      } else {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Координаты задачи недоступны'
            : '❌ Task coordinates not available',
        );
      }
    } catch (error) {
      this.logger.error('Error starting nearest task:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Ошибка при получении данных задачи'
          : '❌ Error fetching task data',
      );
    }
  }

  /**
   * Handle show route callback
   */
  async handleShowRouteCallback(ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery();
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    await ctx.reply(
      lang === TelegramLanguage.RU
        ? `📍 Отправьте текущее местоположение для построения маршрута`
        : `📍 Share your current location to build a route`,
      {
        ...Markup.keyboard([
          [
            Markup.button.locationRequest(
              lang === TelegramLanguage.RU ? '📍 Отправить местоположение' : '📍 Share Location',
            ),
          ],
        ]).resize().oneTime(),
      },
    );
  }

  // ============================================================================
  // LOCATION CALCULATION METHODS
  // ============================================================================

  /**
   * Find tasks near a location
   */
  async findNearbyTasks(
    userId: string,
    userLocation: Coordinates,
    radiusMeters: number,
  ): Promise<NearbyTask[]> {
    // Get user's pending tasks
    const tasks = await this.tasksService.findAll(undefined, undefined, undefined, userId);
    const pendingTasks = tasks.filter(t =>
      t.status === TaskStatus.PENDING ||
      t.status === TaskStatus.ASSIGNED ||
      t.status === TaskStatus.IN_PROGRESS
    );

    const nearbyTasks: NearbyTask[] = [];

    for (const task of pendingTasks) {
      if (!task.machine?.location) continue;

      const location = task.machine.location;
      if (!location.latitude || !location.longitude) continue;

      const taskCoords: Coordinates = {
        latitude: location.latitude,
        longitude: location.longitude,
      };

      const distance = this.calculateDistance(userLocation, taskCoords);

      if (distance <= radiusMeters) {
        nearbyTasks.push({
          taskId: task.id,
          taskType: task.task_type,
          machineNumber: task.machine.machine_number,
          machineName: task.machine.name || task.machine.machine_number,
          location: location.name || location.address || 'Unknown',
          distance,
          coordinates: taskCoords,
        });
      }
    }

    // Sort by distance
    return nearbyTasks.sort((a, b) => a.distance - b.distance).slice(0, this.MAX_RESULTS);
  }

  /**
   * Find machines near a location
   */
  async findNearbyMachines(
    userLocation: Coordinates,
    radiusMeters: number,
  ): Promise<NearbyMachine[]> {
    const machines = await this.machinesService.findAllSimple();
    const nearbyMachines: NearbyMachine[] = [];

    // Get all pending tasks to check if machines have tasks
    const allTasks = await this.tasksService.findAll(undefined);
    const pendingTasksByMachine = new Map<string, boolean>();
    for (const task of allTasks) {
      if (
        task.status === TaskStatus.PENDING ||
        task.status === TaskStatus.ASSIGNED
      ) {
        pendingTasksByMachine.set(task.machine_id, true);
      }
    }

    for (const machine of machines) {
      if (!machine.location) continue;

      const location = machine.location;
      if (!location.latitude || !location.longitude) continue;

      const machineCoords: Coordinates = {
        latitude: location.latitude,
        longitude: location.longitude,
      };

      const distance = this.calculateDistance(userLocation, machineCoords);

      if (distance <= radiusMeters) {
        nearbyMachines.push({
          machineId: machine.id,
          machineNumber: machine.machine_number,
          machineName: machine.name || machine.machine_number,
          location: location.name || location.address || 'Unknown',
          distance,
          coordinates: machineCoords,
          hasPendingTasks: pendingTasksByMachine.has(machine.id),
        });
      }
    }

    // Sort by distance
    return nearbyMachines.sort((a, b) => a.distance - b.distance).slice(0, this.MAX_RESULTS);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = this.toRadians(coord1.latitude);
    const lat2Rad = this.toRadians(coord2.latitude);
    const deltaLat = this.toRadians(coord2.latitude - coord1.latitude);
    const deltaLon = this.toRadians(coord2.longitude - coord1.longitude);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Validate if user is close enough to complete a task
   */
  async validateLocationForTask(
    userLocation: Coordinates,
    taskId: string,
  ): Promise<{ valid: boolean; distance: number; threshold: number }> {
    const task = await this.tasksService.findOne(taskId);
    if (!task?.machine?.location) {
      return { valid: true, distance: 0, threshold: this.TASK_COMPLETION_THRESHOLD_METERS };
    }

    const location = task.machine.location;
    if (!location.latitude || !location.longitude) {
      return { valid: true, distance: 0, threshold: this.TASK_COMPLETION_THRESHOLD_METERS };
    }

    const taskCoords: Coordinates = {
      latitude: location.latitude,
      longitude: location.longitude,
    };

    const distance = this.calculateDistance(userLocation, taskCoords);

    return {
      valid: distance <= this.TASK_COMPLETION_THRESHOLD_METERS,
      distance,
      threshold: this.TASK_COMPLETION_THRESHOLD_METERS,
    };
  }

  // ============================================================================
  // MESSAGE FORMATTING
  // ============================================================================

  /**
   * Send nearby tasks message
   */
  private async sendNearbyTasksMessage(
    ctx: BotContext,
    tasks: NearbyTask[],
    userLocation: Coordinates,
    lang: TelegramLanguage,
  ): Promise<void> {
    let message = lang === TelegramLanguage.RU
      ? `📍 <b>Задачи поблизости</b>\n\n`
      : `📍 <b>Nearby Tasks</b>\n\n`;

    for (let i = 0; i < Math.min(tasks.length, 5); i++) {
      const task = tasks[i];
      const distanceStr = this.formatDistance(task.distance, lang);
      const emoji = this.getTaskTypeEmoji(task.taskType);

      message += `${i + 1}. ${emoji} <b>${task.machineNumber}</b>\n`;
      message += `   📍 ${task.location}\n`;
      message += `   🚶 ${distanceStr}\n\n`;
    }

    if (tasks.length > 5) {
      message += lang === TelegramLanguage.RU
        ? `<i>...и ещё ${tasks.length - 5} задач</i>\n`
        : `<i>...and ${tasks.length - 5} more tasks</i>\n`;
    }

    const buttons = [];

    // Start nearest task button
    if (tasks.length > 0) {
      buttons.push([
        Markup.button.callback(
          lang === TelegramLanguage.RU
            ? `▶️ Начать ближайшую (${this.formatDistance(tasks[0].distance, lang)})`
            : `▶️ Start Nearest (${this.formatDistance(tasks[0].distance, lang)})`,
          `start_nearest_${tasks[0].taskId}`,
        ),
      ]);
    }

    // Show all tasks
    buttons.push([
      Markup.button.callback(
        lang === TelegramLanguage.RU ? '📋 Все мои задачи' : '📋 All My Tasks',
        'refresh_tasks',
      ),
    ]);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons),
    });

    // Remove keyboard
    await ctx.reply(
      lang === TelegramLanguage.RU ? '📍 Местоположение обработано' : '📍 Location processed',
      Markup.removeKeyboard(),
    );
  }

  /**
   * Send nearby machines message (when no tasks)
   */
  private async sendNearbyMachinesMessage(
    ctx: BotContext,
    machines: NearbyMachine[],
    userLocation: Coordinates,
    lang: TelegramLanguage,
  ): Promise<void> {
    if (machines.length === 0) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `📍 Нет задач и аппаратов поблизости (в радиусе ${this.DEFAULT_RADIUS_METERS / 1000} км)`
          : `📍 No tasks or machines nearby (within ${this.DEFAULT_RADIUS_METERS / 1000} km)`,
        Markup.removeKeyboard(),
      );
      return;
    }

    let message = lang === TelegramLanguage.RU
      ? `📍 <b>У вас нет назначенных задач поблизости</b>\n\n` +
        `🖥 <b>Ближайшие аппараты:</b>\n\n`
      : `📍 <b>No assigned tasks nearby</b>\n\n` +
        `🖥 <b>Nearby Machines:</b>\n\n`;

    for (let i = 0; i < Math.min(machines.length, 5); i++) {
      const machine = machines[i];
      const distanceStr = this.formatDistance(machine.distance, lang);
      const taskIndicator = machine.hasPendingTasks ? '📋' : '';

      message += `${i + 1}. <b>${machine.machineNumber}</b> ${taskIndicator}\n`;
      message += `   📍 ${machine.location}\n`;
      message += `   🚶 ${distanceStr}\n\n`;
    }

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(
          lang === TelegramLanguage.RU ? '📋 Мои задачи' : '📋 My Tasks',
          'refresh_tasks',
        )],
      ]),
    });

    await ctx.reply(
      lang === TelegramLanguage.RU ? '📍 Местоположение обработано' : '📍 Location processed',
      Markup.removeKeyboard(),
    );
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Format distance for display
   */
  formatDistance(meters: number, lang: TelegramLanguage): string {
    if (meters < 1000) {
      return `${meters}${lang === TelegramLanguage.RU ? 'м' : 'm'}`;
    }
    const km = (meters / 1000).toFixed(1);
    return `${km}${lang === TelegramLanguage.RU ? 'км' : 'km'}`;
  }

  /**
   * Get Google Maps URL for coordinates
   */
  getGoogleMapsUrl(coords: Coordinates): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`;
  }

  /**
   * Get Yandex Maps URL for coordinates
   */
  getYandexMapsUrl(coords: Coordinates): string {
    return `https://yandex.ru/maps/?rtext=~${coords.latitude},${coords.longitude}&rtt=auto`;
  }

  /**
   * Get task type emoji
   */
  private getTaskTypeEmoji(type: TaskType): string {
    const emojis: Record<TaskType, string> = {
      [TaskType.REFILL]: '📦',
      [TaskType.COLLECTION]: '💰',
      [TaskType.CLEANING]: '🧹',
      [TaskType.REPAIR]: '🔧',
      [TaskType.INSTALL]: '🔌',
      [TaskType.REMOVAL]: '📤',
      [TaskType.AUDIT]: '📊',
      [TaskType.INSPECTION]: '🔍',
      [TaskType.REPLACE_HOPPER]: '🥤',
      [TaskType.REPLACE_GRINDER]: '⚙️',
      [TaskType.REPLACE_BREW_UNIT]: '☕',
      [TaskType.REPLACE_MIXER]: '🔄',
    };
    return emojis[type] || '📌';
  }

  /**
   * Get task type label
   */
  private getTaskTypeLabel(type: TaskType, lang: TelegramLanguage): string {
    const labels: Record<TaskType, { ru: string; en: string }> = {
      [TaskType.REFILL]: { ru: 'Пополнение', en: 'Refill' },
      [TaskType.COLLECTION]: { ru: 'Инкассация', en: 'Collection' },
      [TaskType.CLEANING]: { ru: 'Чистка', en: 'Cleaning' },
      [TaskType.REPAIR]: { ru: 'Ремонт', en: 'Repair' },
      [TaskType.INSTALL]: { ru: 'Установка', en: 'Installation' },
      [TaskType.REMOVAL]: { ru: 'Демонтаж', en: 'Removal' },
      [TaskType.AUDIT]: { ru: 'Аудит', en: 'Audit' },
      [TaskType.INSPECTION]: { ru: 'Проверка', en: 'Inspection' },
      [TaskType.REPLACE_HOPPER]: { ru: 'Замена хоппера', en: 'Hopper replacement' },
      [TaskType.REPLACE_GRINDER]: { ru: 'Замена кофемолки', en: 'Grinder replacement' },
      [TaskType.REPLACE_BREW_UNIT]: { ru: 'Замена заварника', en: 'Brew unit replacement' },
      [TaskType.REPLACE_MIXER]: { ru: 'Замена миксера', en: 'Mixer replacement' },
    };
    return labels[type]?.[lang === TelegramLanguage.RU ? 'ru' : 'en'] || type;
  }
}
