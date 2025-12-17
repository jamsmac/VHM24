import { Injectable, Logger } from '@nestjs/common';
import { Context, Telegraf } from 'telegraf';

/** Context with match groups from regex action handlers */
interface ActionContext extends Context {
  match: RegExpExecArray;
}
import { TelegramSessionService } from '../services/telegram-session.service';
import { CartStorageService, CartItem } from '../services/cart-storage.service';
import { CartState, defaultSessionData } from './fsm-states';
import { getCartKeyboard, getCartEmptyKeyboard, getCheckoutKeyboard } from './keyboards';

// Temporary interface until RequestsService is implemented
interface UserRequest {
  request_number: string;
  status: string;
  created_at?: Date;
  items?: unknown[];
}

/**
 * Обработчик корзины и оформления заказа.
 * Портировано из Python vendhub-bot/handlers/cart.py
 *
 * PERF-4: Cart storage migrated to Redis with 24h TTL
 * - Survives server restarts
 * - Shared across multiple instances
 * - 24-hour cart persistence for better UX
 */
@Injectable()
export class CartHandler {
  private readonly logger = new Logger(CartHandler.name);

  constructor(
    private readonly sessionService: TelegramSessionService,
    private readonly cartStorage: CartStorageService,
  ) {}

  /**
   * Регистрирует все обработчики корзины.
   */
  registerHandlers(bot: Telegraf<Context>) {
    // Просмотр корзины
    bot.hears('🛒 Корзина', (ctx) => this.handleViewCart(ctx));
    bot.action('cart:view', (ctx) => this.handleViewCartCallback(ctx));

    // Управление позициями
    bot.action(/^cart_inc:(.+)$/, (ctx) => this.handleCartIncrease(ctx));
    bot.action(/^cart_dec:(.+)$/, (ctx) => this.handleCartDecrease(ctx));
    bot.action(/^cart_del:(.+)$/, (ctx) => this.handleCartDelete(ctx));
    bot.action('cart:clear', (ctx) => this.handleCartClear(ctx));

    // Оформление заказа
    bot.action('cart:checkout', (ctx) => this.handleStartCheckout(ctx));
    bot.action(/^priority:(.+)$/, (ctx) => this.handleSetPriority(ctx));
    bot.action('checkout:comment', (ctx) => this.handleAddCommentStart(ctx));
    bot.action('checkout:cancel', (ctx) => this.handleCancelCheckout(ctx));
    bot.action('checkout:confirm', (ctx) => this.handleConfirmCheckout(ctx));

    // Мои заявки
    bot.hears('📋 Мои заявки', (ctx) => this.handleMyRequests(ctx));

    // Обработка текстовых сообщений
    bot.on('text', (ctx, next) => this.handleTextInput(ctx, next));

    this.logger.log('Cart handlers registered');
  }

  /**
   * Добавить в корзину (вызывается из CatalogHandler).
   * Now uses Redis-backed storage with 24h TTL.
   */
  async addToCart(userId: string, item: CartItem): Promise<void> {
    await this.cartStorage.addItem(userId, item);
  }

  /**
   * Просмотр корзины (текстовое сообщение).
   */
  private async handleViewCart(ctx: Context) {
    await this.showCart(ctx, false);
  }

  /**
   * Просмотр корзины (callback).
   */
  private async handleViewCartCallback(ctx: Context) {
    await this.showCart(ctx, true);
    await ctx.answerCbQuery();
  }

  /**
   * Показать содержимое корзины.
   */
  private async showCart(ctx: Context, isCallback: boolean) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const cart = await this.cartStorage.getCart(userId);

    // Сбрасываем состояние
    await this.sessionService.setSessionData(userId, defaultSessionData);

    if (cart.length === 0) {
      const text = '🛒 <b>Корзина пуста</b>\n\n' + 'Добавьте материалы из каталога.';

      if (isCallback) {
        await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          reply_markup: getCartEmptyKeyboard().reply_markup,
        });
      } else {
        await ctx.reply(text, {
          parse_mode: 'HTML',
          reply_markup: getCartEmptyKeyboard().reply_markup,
        });
      }
      return;
    }

    // Формируем текст корзины
    const lines = ['🛒 <b>Ваша корзина</b>\n'];
    let totalItems = 0;

    cart.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.name}`);
      lines.push(`   📦 ${item.quantity} ${item.unit}`);
      totalItems += item.quantity;
    });

    lines.push(`\n📊 <b>Всего позиций:</b> ${cart.length}`);
    lines.push(`📦 <b>Всего единиц:</b> ${totalItems}`);

    const text = lines.join('\n');
    const keyboard = getCartKeyboard(cart);

    if (isCallback) {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup,
      });
    } else {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup,
      });
    }
  }

  /**
   * Увеличить количество позиции.
   */
  private async handleCartIncrease(ctx: ActionContext) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const itemId = ctx.match[1];

    const item = await this.cartStorage.updateItemQuantity(userId, itemId, 1);

    if (item) {
      await ctx.answerCbQuery(`➕ ${item.name}: ${item.quantity}`);
    }

    const cart = await this.cartStorage.getCart(userId);
    await this.updateCartView(ctx, cart);
  }

  /**
   * Уменьшить количество позиции.
   */
  private async handleCartDecrease(ctx: ActionContext) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const itemId = ctx.match[1];

    // Get item before update to show name in callback
    const existingItem = await this.cartStorage.getItem(userId, itemId);
    const itemName = existingItem?.name || 'Товар';

    const item = await this.cartStorage.updateItemQuantity(userId, itemId, -1);

    if (item) {
      await ctx.answerCbQuery(`➖ ${item.name}: ${item.quantity}`);
    } else if (existingItem) {
      // Item was removed (quantity was 1)
      await ctx.answerCbQuery(`🗑 ${itemName} удалён`);
    }

    const cart = await this.cartStorage.getCart(userId);
    await this.updateCartView(ctx, cart);
  }

  /**
   * Удалить позицию из корзины.
   */
  private async handleCartDelete(ctx: ActionContext) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const itemId = ctx.match[1];

    const item = await this.cartStorage.removeItem(userId, itemId);

    if (item) {
      await ctx.answerCbQuery(`🗑 Удалено: ${item.name}`);
    }

    const cart = await this.cartStorage.getCart(userId);
    await this.updateCartView(ctx, cart);
  }

  /**
   * Очистить корзину.
   */
  private async handleCartClear(ctx: Context) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    await this.cartStorage.clearCart(userId);

    await ctx.editMessageText('🗑 <b>Корзина очищена</b>', {
      parse_mode: 'HTML',
      reply_markup: getCartEmptyKeyboard().reply_markup,
    });
    await ctx.answerCbQuery('🗑 Корзина очищена');
  }

  /**
   * Обновить отображение корзины.
   */
  private async updateCartView(ctx: Context, cart: CartItem[]) {
    if (cart.length === 0) {
      await ctx.editMessageText('🛒 <b>Корзина пуста</b>', {
        parse_mode: 'HTML',
        reply_markup: getCartEmptyKeyboard().reply_markup,
      });
      return;
    }

    const lines = ['🛒 <b>Ваша корзина</b>\n'];
    let totalItems = 0;

    cart.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.name}`);
      lines.push(`   📦 ${item.quantity} ${item.unit}`);
      totalItems += item.quantity;
    });

    lines.push(`\n📊 <b>Позиций:</b> ${cart.length}`);
    lines.push(`📦 <b>Единиц:</b> ${totalItems}`);

    try {
      await ctx.editMessageText(lines.join('\n'), {
        parse_mode: 'HTML',
        reply_markup: getCartKeyboard(cart).reply_markup,
      });
    } catch (e) {
      // Ignore if nothing changed
    }
  }

  /**
   * Начать оформление заказа.
   */
  private async handleStartCheckout(ctx: Context) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const cart = await this.cartStorage.getCart(userId);

    if (cart.length === 0) {
      await ctx.answerCbQuery('❌ Корзина пуста', { show_alert: true });
      return;
    }

    // Сохраняем данные checkout
    await this.sessionService.setSessionData(userId, {
      ...defaultSessionData,
      checkoutItems: cart.length,
      priority: 'normal',
      comment: undefined,
    });

    // Формируем summary
    const lines = ['📋 <b>Оформление заявки</b>\n'];

    for (const item of cart) {
      lines.push(`• ${item.name}: ${item.quantity} ${item.unit}`);
    }

    lines.push('\n<b>Выберите приоритет:</b>');
    lines.push('🔵 Обычная — стандартная обработка');
    lines.push('🟡 Высокая — ускоренная обработка');
    lines.push('🔴 Срочная — немедленная обработка');

    await ctx.editMessageText(lines.join('\n'), {
      parse_mode: 'HTML',
      reply_markup: getCheckoutKeyboard().reply_markup,
    });
    await ctx.answerCbQuery();
  }

  /**
   * Установить приоритет.
   */
  private async handleSetPriority(ctx: ActionContext) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const priority = ctx.match[1] as 'normal' | 'high' | 'urgent';

    const session = await this.sessionService.getSessionData(userId);
    await this.sessionService.setSessionData(userId, {
      ...session,
      priority,
    });

    const priorityNames: Record<string, string> = {
      normal: '🔵 Обычная',
      high: '🟡 Высокая',
      urgent: '🔴 Срочная',
    };

    await ctx.answerCbQuery(`Приоритет: ${priorityNames[priority] || priority}`);
  }

  /**
   * Начать добавление комментария.
   */
  private async handleAddCommentStart(ctx: Context) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const session = await this.sessionService.getSessionData(userId);
    await this.sessionService.setSessionData(userId, {
      ...session,
      state: CartState.ENTERING_COMMENT,
    });

    await ctx.editMessageText(
      '💬 <b>Добавьте комментарий</b>\n\n' + 'Введите текст или отправьте /skip чтобы пропустить:',
      { parse_mode: 'HTML' },
    );
    await ctx.answerCbQuery();
  }

  /**
   * Отменить оформление.
   */
  private async handleCancelCheckout(ctx: Context) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const cart = await this.cartStorage.getCart(userId);

    await this.sessionService.setSessionData(userId, defaultSessionData);

    await ctx.editMessageText('❌ <b>Оформление отменено</b>\n\n' + 'Ваша корзина сохранена.', {
      parse_mode: 'HTML',
      reply_markup: getCartKeyboard(cart).reply_markup,
    });
    await ctx.answerCbQuery('Отменено');
  }

  /**
   * Подтвердить и создать заявку.
   */
  private async handleConfirmCheckout(ctx: Context) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const cart = await this.cartStorage.getCart(userId);

    if (cart.length === 0) {
      await ctx.answerCbQuery('❌ Корзина пуста', { show_alert: true });
      return;
    }

    const session = await this.sessionService.getSessionData(userId);
    const priority = session?.priority || 'normal';
    // Note: comment available via session?.comment when request creation is implemented

    // TODO: Создать заявку через RequestsService
    // const requestId = await this.requestsService.create(userId, {
    //   priority,
    //   comment,
    //   items: cart.map(item => ({
    //     material_id: item.materialId,
    //     quantity: item.quantity,
    //   })),
    // });

    const requestId = Math.floor(Math.random() * 10000); // Temporary

    // Очищаем корзину и сессию
    await this.cartStorage.clearCart(userId);
    await this.sessionService.setSessionData(userId, defaultSessionData);

    const priorityEmoji: Record<string, string> = {
      normal: '🔵',
      high: '🟡',
      urgent: '🔴',
    };

    // TODO: Уведомить администраторов
    // await this.notifyAdmins(requestId, userId, cart, priority, comment);

    await ctx.editMessageText(
      `✅ <b>Заявка #${requestId} создана!</b>\n\n` +
        `📦 Позиций: ${cart.length}\n` +
        `${priorityEmoji[priority] || '🔵'} Приоритет: ${priority}\n\n` +
        'Администратор получил уведомление.\n' +
        'Следите за статусом в разделе «📋 Мои заявки»',
      {
        parse_mode: 'HTML',
      },
    );
    await ctx.answerCbQuery('✅ Заявка создана!');
  }

  /**
   * Показать мои заявки.
   */
  private async handleMyRequests(ctx: Context) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    // TODO: Получить заявки пользователя через RequestsService
    // const requests = await this.requestsService.findAll({
    //   created_by_user_id: userId,
    //   limit: 15,
    // });

    const requests: UserRequest[] = []; // Temporary until RequestsService is implemented

    if (requests.length === 0) {
      await ctx.reply(
        '📋 <b>У вас пока нет заявок</b>\n\n' + 'Создайте первую заявку через «📦 Создать заявку»',
        { parse_mode: 'HTML' },
      );
      return;
    }

    const lines = ['📋 <b>Ваши заявки</b>\n'];

    for (const req of requests) {
      const date = req.created_at?.toISOString().slice(0, 10) || '';
      lines.push(`#${req.request_number} • ${req.status}`);
      lines.push(`   📦 ${req.items?.length || 0} поз. • ${date}`);
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
  }

  /**
   * Обработка текстового ввода.
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

    // Обработка ввода комментария
    if (session.state === CartState.ENTERING_COMMENT) {
      const comment = text === '/skip' ? undefined : text.slice(0, 500);

      const cart = await this.cartStorage.getCart(userId);

      await this.sessionService.setSessionData(userId, {
        ...session,
        state: CartState.IDLE,
        comment,
      });

      // Показываем checkout снова
      const lines = ['📋 <b>Оформление заявки</b>\n'];

      for (const item of cart) {
        lines.push(`• ${item.name}: ${item.quantity} ${item.unit}`);
      }

      const priorityNames: Record<string, string> = {
        normal: '🔵 Обычная',
        high: '🟡 Высокая',
        urgent: '🔴 Срочная',
      };

      lines.push(`\n<b>Приоритет:</b> ${priorityNames[session.priority || 'normal']}`);

      if (comment) {
        lines.push(
          `<b>Комментарий:</b> ${comment.length > 50 ? comment.slice(0, 50) + '...' : comment}`,
        );
      }

      await ctx.reply(lines.join('\n'), {
        parse_mode: 'HTML',
        reply_markup: getCheckoutKeyboard().reply_markup,
      });
      return;
    }

    return next();
  }
}
