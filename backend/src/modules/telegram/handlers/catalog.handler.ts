import { Injectable, Logger } from '@nestjs/common';
import { Context, Telegraf } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';

/** Context with match groups from regex action handlers */
interface ActionContext extends Context {
  match: RegExpExecArray;
}
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Material, MaterialCategory } from '../../requests/entities/material.entity';
import { TelegramSessionService } from '../services/telegram-session.service';
import { CartStorageService } from '../services/cart-storage.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/entities/user.entity';
import { CatalogState, defaultSessionData } from './fsm-states';
import {
  getCategoryKeyboard,
  getMaterialsKeyboard,
  getQuantityKeyboard,
  getSearchResultsKeyboard,
  categoryNames,
} from './keyboards';

/**
 * Обработчик каталога материалов.
 * Портировано из Python vendhub-bot/handlers/catalog.py
 *
 * PERF-4: Now integrated with Redis-backed CartStorageService
 */
@Injectable()
export class CatalogHandler {
  private readonly logger = new Logger(CatalogHandler.name);

  /** Roles that are allowed to create material requests */
  private static readonly ALLOWED_REQUEST_ROLES: UserRole[] = [
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.TECHNICIAN,
  ];

  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    private readonly sessionService: TelegramSessionService,
    private readonly cartStorage: CartStorageService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Регистрирует все обработчики каталога.
   */
  registerHandlers(bot: Telegraf<Context>) {
    // Создать заявку (главное меню)
    bot.hears('📦 Создать заявку', (ctx) => this.handleCreateOrder(ctx));

    // Категории
    bot.action(/^cat:(.+)$/, (ctx) => this.handleCategory(ctx));

    // Пагинация материалов
    bot.action(/^mat_page:(.+):(\d+)$/, (ctx) => this.handlePagination(ctx));

    // Выбор материала
    bot.action(/^mat:(.+)$/, (ctx) => this.handleMaterial(ctx));

    // Управление количеством
    bot.action(/^qty_inc:(.+)$/, (ctx) => this.handleQuantityIncrease(ctx));
    bot.action(/^qty_dec:(.+)$/, (ctx) => this.handleQuantityDecrease(ctx));
    bot.action(/^qty_set:(.+):(\d+)$/, (ctx) => this.handleQuantitySet(ctx));
    bot.action(/^qty_custom:(.+)$/, (ctx) => this.handleQuantityCustomStart(ctx));
    bot.action(/^qty_add:(.+)$/, (ctx) => this.handleAddToCart(ctx));

    // Поиск
    bot.action('search:start', (ctx) => this.handleSearchStart(ctx));
    bot.action(/^search_page:(\d+)$/, (ctx) => this.handleSearchPagination(ctx));

    // Обработка текстовых сообщений в FSM состояниях
    bot.on('text', (ctx, next) => this.handleTextInput(ctx, next));

    this.logger.log('Catalog handlers registered');
  }

  /**
   * Checks if a user role is allowed to create material requests.
   */
  private canCreateRequests(role: UserRole): boolean {
    return CatalogHandler.ALLOWED_REQUEST_ROLES.includes(role);
  }

  /**
   * Создать заявку - показать категории.
   */
  private async handleCreateOrder(ctx: Context) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    // Проверка прав доступа
    const user = await this.usersService.findByTelegramId(userId);
    if (!user) {
      await ctx.reply(
        '❌ <b>Пользователь не найден</b>\n\n' +
          'Ваш аккаунт не связан с системой VendHub.\n' +
          'Обратитесь к администратору для получения доступа.',
        { parse_mode: 'HTML' },
      );
      return;
    }

    if (!this.canCreateRequests(user.role)) {
      await ctx.reply(
        '❌ <b>Недостаточно прав</b>\n\n' +
          'У вас нет доступа к созданию заявок на материалы.\n' +
          'Данная функция доступна только для операторов и выше.',
        { parse_mode: 'HTML' },
      );
      return;
    }

    // Сбрасываем состояние
    await this.sessionService.setSessionData(userId, defaultSessionData);

    // Get cart count from Redis-backed storage
    const cartCount = await this.cartStorage.getItemCount(userId);

    await ctx.reply('📦 <b>Создание заявки</b>\n\n' + 'Выберите категорию материалов:', {
      parse_mode: 'HTML',
      reply_markup: getCategoryKeyboard(cartCount).reply_markup,
    });
  }

  /**
   * Обработка выбора категории.
   */
  private async handleCategory(ctx: ActionContext) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const action = ctx.match[1];

    if (action === 'back') {
      // Назад к категориям
      const cartCount = await this.cartStorage.getItemCount(userId);
      await ctx.editMessageText('📦 <b>Создание заявки</b>\n\n' + 'Выберите категорию:', {
        parse_mode: 'HTML',
        reply_markup: getCategoryKeyboard(cartCount).reply_markup,
      });
      await ctx.answerCbQuery();
      return;
    }

    const category = action as MaterialCategory;

    if (!Object.values(MaterialCategory).includes(category)) {
      await ctx.answerCbQuery('❌ Неизвестная категория', { show_alert: true });
      return;
    }

    // Получаем материалы категории
    const materials = await this.materialRepository.find({
      where: { category, is_active: true },
      order: { sort_order: 'ASC', name: 'ASC' },
    });

    if (materials.length === 0) {
      await ctx.answerCbQuery('📭 В этой категории пока нет материалов', {
        show_alert: true,
      });
      return;
    }

    // Сохраняем категорию в сессии
    const session = await this.sessionService.getSessionData(userId);
    await this.sessionService.setSessionData(userId, {
      ...session,
      currentCategory: category,
    });

    const categoryName = categoryNames[category];

    await ctx.editMessageText(
      `<b>${categoryName}</b>\n\n` +
        `📦 Материалов: ${materials.length}\n` +
        'Выберите для добавления в корзину:',
      {
        parse_mode: 'HTML',
        reply_markup: getMaterialsKeyboard(materials, category, 0).reply_markup,
      },
    );
    await ctx.answerCbQuery();
  }

  /**
   * Пагинация материалов.
   */
  private async handlePagination(ctx: ActionContext) {
    const category = ctx.match[1] as MaterialCategory;
    const page = parseInt(ctx.match[2], 10);

    const materials = await this.materialRepository.find({
      where: { category, is_active: true },
      order: { sort_order: 'ASC', name: 'ASC' },
    });

    const categoryName = categoryNames[category];

    await ctx.editMessageText(
      `<b>${categoryName}</b>\n\n` +
        `📦 Материалов: ${materials.length}\n` +
        'Выберите для добавления:',
      {
        parse_mode: 'HTML',
        reply_markup: getMaterialsKeyboard(materials, category, page).reply_markup,
      },
    );
    await ctx.answerCbQuery();
  }

  /**
   * Выбор материала - показать выбор количества.
   */
  private async handleMaterial(ctx: ActionContext) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const materialId = ctx.match[1];

    const material = await this.materialRepository.findOne({
      where: { id: materialId },
      relations: ['supplier'],
    });

    if (!material) {
      await ctx.answerCbQuery('❌ Материал не найден', { show_alert: true });
      return;
    }

    // Сохраняем в сессии
    await this.sessionService.setSessionData(userId, {
      ...((await this.sessionService.getSessionData(userId)) || defaultSessionData),
      selectedMaterialId: materialId,
      currentQuantity: 1,
    });

    await ctx.editMessageText(
      `📦 <b>${material.name}</b>\n\n` +
        `📏 Ед. измерения: ${material.unit}\n` +
        `🏭 Поставщик: ${material.supplier?.name || 'Не указан'}\n\n` +
        'Выберите количество:',
      {
        parse_mode: 'HTML',
        reply_markup: getQuantityKeyboard(materialId, 1).reply_markup,
      },
    );
    await ctx.answerCbQuery();
  }

  /**
   * Увеличить количество.
   */
  private async handleQuantityIncrease(ctx: ActionContext) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const materialId = ctx.match[1];

    const session = await this.sessionService.getSessionData(userId);
    const current = session?.currentQuantity || 1;
    const newQty = Math.min(current + 1, 999);

    await this.sessionService.setSessionData(userId, {
      ...session,
      currentQuantity: newQty,
    });

    await this.updateQuantityKeyboard(ctx, materialId, newQty);
  }

  /**
   * Уменьшить количество.
   */
  private async handleQuantityDecrease(ctx: ActionContext) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const materialId = ctx.match[1];

    const session = await this.sessionService.getSessionData(userId);
    const current = session?.currentQuantity || 1;
    const newQty = Math.max(current - 1, 1);

    await this.sessionService.setSessionData(userId, {
      ...session,
      currentQuantity: newQty,
    });

    await this.updateQuantityKeyboard(ctx, materialId, newQty);
  }

  /**
   * Установить конкретное количество.
   */
  private async handleQuantitySet(ctx: ActionContext) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const materialId = ctx.match[1];
    const quantity = parseInt(ctx.match[2], 10);

    const session = await this.sessionService.getSessionData(userId);
    await this.sessionService.setSessionData(userId, {
      ...session,
      currentQuantity: quantity,
    });

    await this.updateQuantityKeyboard(ctx, materialId, quantity);
  }

  /**
   * Обновить клавиатуру количества.
   */
  private async updateQuantityKeyboard(ctx: Context, materialId: string, quantity: number) {
    try {
      await ctx.editMessageReplyMarkup(getQuantityKeyboard(materialId, quantity).reply_markup);
    } catch {
      // Ignore if keyboard didn't change
    }
    await ctx.answerCbQuery(`📦 Количество: ${quantity}`);
  }

  /**
   * Начать ввод произвольного количества.
   */
  private async handleQuantityCustomStart(ctx: ActionContext) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const materialId = ctx.match[1];

    const session = await this.sessionService.getSessionData(userId);
    await this.sessionService.setSessionData(userId, {
      ...session,
      selectedMaterialId: materialId,
      state: CatalogState.ENTERING_QUANTITY,
    });

    await ctx.editMessageText(
      '✏️ <b>Введите количество</b>\n\n' + 'Отправьте число (например: 15)',
      { parse_mode: 'HTML' },
    );
    await ctx.answerCbQuery();
  }

  /**
   * Добавить в корзину.
   */
  private async handleAddToCart(ctx: ActionContext) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const materialId = ctx.match[1];

    const session = await this.sessionService.getSessionData(userId);
    const quantity = session?.currentQuantity || 1;

    const material = await this.materialRepository.findOne({
      where: { id: materialId },
    });

    if (!material) {
      await ctx.answerCbQuery('❌ Материал не найден', { show_alert: true });
      return;
    }

    // Add to Redis-backed cart storage
    await this.cartStorage.addItem(userId, {
      id: uuidv4(),
      materialId: material.id,
      name: material.name,
      quantity,
      unit: material.unit,
    });

    // Сбрасываем сессию
    await this.sessionService.setSessionData(userId, {
      ...defaultSessionData,
    });

    const cartCount = await this.cartStorage.getItemCount(userId);

    await ctx.answerCbQuery(`✅ Добавлено: ${material.name} × ${quantity}`, {
      show_alert: true,
    });

    await ctx.editMessageText(
      `✅ <b>Добавлено в корзину!</b>\n\n` +
        `📦 ${material.name}\n` +
        `📊 ${quantity} ${material.unit}\n\n` +
        `🛒 В корзине: ${cartCount} поз.\n\n` +
        'Продолжите выбор или перейдите в корзину:',
      {
        parse_mode: 'HTML',
        reply_markup: getCategoryKeyboard(cartCount).reply_markup,
      },
    );
  }

  /**
   * Начать поиск.
   */
  private async handleSearchStart(ctx: Context) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const session = await this.sessionService.getSessionData(userId);
    await this.sessionService.setSessionData(userId, {
      ...session,
      state: CatalogState.SEARCHING,
    });

    await ctx.editMessageText(
      '🔍 <b>Поиск материалов</b>\n\n' + 'Введите название или часть названия материала:',
      { parse_mode: 'HTML' },
    );
    await ctx.answerCbQuery();
  }

  /**
   * Пагинация результатов поиска.
   */
  private async handleSearchPagination(ctx: ActionContext) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const page = parseInt(ctx.match[1], 10);

    const session = await this.sessionService.getSessionData(userId);
    const query = session?.searchQuery || '';

    const materials = await this.materialRepository
      .createQueryBuilder('m')
      .where('m.is_active = true')
      .andWhere('(m.name ILIKE :query OR m.sku ILIKE :query)', {
        query: `%${query}%`,
      })
      .orderBy('m.name', 'ASC')
      .getMany();

    await ctx.editMessageText(
      `🔍 <b>Результаты поиска:</b> «${query}»\n\n` + `Найдено: ${materials.length} материал(ов)`,
      {
        parse_mode: 'HTML',
        reply_markup: getSearchResultsKeyboard(materials, query, page).reply_markup,
      },
    );
    await ctx.answerCbQuery();
  }

  /**
   * Обработка текстового ввода в FSM состояниях.
   */
  private async handleTextInput(ctx: Context, next: () => Promise<void>) {
    const userId = ctx.from?.id?.toString();
    if (!userId || !ctx.message || !('text' in ctx.message)) {
      return next();
    }

    const session = await this.sessionService.getSessionData(userId);
    if (!session) {
      return next();
    }

    const text = ctx.message.text;

    // Обработка ввода количества
    if (session.state === CatalogState.ENTERING_QUANTITY) {
      const quantity = parseInt(text, 10);

      if (isNaN(quantity) || quantity < 1 || quantity > 999) {
        await ctx.reply('❌ Введите число от 1 до 999');
        return;
      }

      const materialId = session.selectedMaterialId;
      if (!materialId) {
        await ctx.reply('❌ Ошибка. Начните заново.');
        await this.sessionService.setSessionData(userId, defaultSessionData);
        return;
      }

      const material = await this.materialRepository.findOne({
        where: { id: materialId },
      });

      if (!material) {
        await ctx.reply('❌ Материал не найден. Начните заново.');
        await this.sessionService.setSessionData(userId, defaultSessionData);
        return;
      }

      // Add to Redis-backed cart storage
      await this.cartStorage.addItem(userId, {
        id: uuidv4(),
        materialId: material.id,
        name: material.name,
        quantity,
        unit: material.unit,
      });

      await this.sessionService.setSessionData(userId, defaultSessionData);

      const cartCount = await this.cartStorage.getItemCount(userId);

      await ctx.reply(
        `✅ <b>Добавлено в корзину!</b>\n\n` +
          `📦 ${material.name}\n` +
          `📊 Количество: ${quantity} ${material.unit}\n\n` +
          `🛒 В корзине: ${cartCount} поз.`,
        {
          parse_mode: 'HTML',
          reply_markup: getCategoryKeyboard(cartCount).reply_markup,
        },
      );
      return;
    }

    // Обработка поискового запроса
    if (session.state === CatalogState.SEARCHING) {
      const query = text.trim();

      if (query.length < 2) {
        await ctx.reply('❌ Введите минимум 2 символа для поиска');
        return;
      }

      const materials = await this.materialRepository
        .createQueryBuilder('m')
        .where('m.is_active = true')
        .andWhere('(m.name ILIKE :query OR m.sku ILIKE :query)', {
          query: `%${query}%`,
        })
        .orderBy('m.name', 'ASC')
        .getMany();

      await this.sessionService.setSessionData(userId, {
        ...defaultSessionData,
        searchQuery: query,
        searchResults: materials.map((m) => m.id),
      });

      await ctx.reply(
        `🔍 <b>Результаты поиска:</b> «${query}»\n\n` + `Найдено: ${materials.length} материал(ов)`,
        {
          parse_mode: 'HTML',
          reply_markup: getSearchResultsKeyboard(materials, query, 0).reply_markup,
        },
      );
      return;
    }

    // Если не в FSM состоянии, передаём дальше
    return next();
  }
}
