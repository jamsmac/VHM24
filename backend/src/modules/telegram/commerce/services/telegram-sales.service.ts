import { Injectable, Logger } from '@nestjs/common';
import { Markup } from 'telegraf';
import { TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramSessionService, ConversationState } from '../../infrastructure/services/telegram-session.service';
import { MachinesService } from '../../../machines/machines.service';
import { TransactionsService } from '../../../transactions/transactions.service';
import { TransactionType, PaymentMethod } from '../../../transactions/entities/transaction.entity';
import { TelegramI18nService } from '../../i18n/services/telegram-i18n.service';
import { BotContext } from '../../shared/types/telegram.types';

/**
 * Sales entry data structure
 */
interface SalesEntryData {
  machineId?: string;
  machineNumber?: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  productName?: string;
  quantity?: number;
}

/**
 * TelegramSalesService
 *
 * Handles /sales command for quick sales entry via Telegram.
 * Allows operators to submit sales data without file upload.
 *
 * Flow:
 * 1. /sales - Start sales entry
 * 2. Select machine (from recent or search)
 * 3. Enter amount
 * 4. Select payment method
 * 5. Confirm and submit
 *
 * @module TelegramCommerceModule
 */
/**
 * Helper methods interface for bot integration
 */
interface SalesServiceHelpers {
  t: (lang: TelegramLanguage, key: string, ...args: string[]) => string;
}

@Injectable()
export class TelegramSalesService {
  private readonly logger = new Logger(TelegramSalesService.name);
  private helpers: SalesServiceHelpers | null = null;

  constructor(
    private readonly sessionService: TelegramSessionService,
    private readonly machinesService: MachinesService,
    private readonly transactionsService: TransactionsService,
    private readonly i18nService: TelegramI18nService,
  ) {}

  /**
   * Set helper methods from bot service
   */
  setHelpers(helpers: SalesServiceHelpers): void {
    this.helpers = helpers;
  }

  /**
   * Translation helper
   */
  private t(lang: TelegramLanguage, key: string): string {
    if (this.helpers?.t) {
      return this.helpers.t(lang, key);
    }
    return this.i18nService.t(lang, key);
  }

  // ============================================================================
  // SALES COMMAND HANDLER
  // ============================================================================

  /**
   * Handle /sales command - Start sales entry flow
   */
  async handleSalesCommand(ctx: BotContext): Promise<void> {
    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Доступ запрещён. Обратитесь к администратору.'
          : '❌ Access denied. Contact administrator.',
      );
      return;
    }

    const lang = ctx.telegramUser.language;
    const userId = ctx.telegramUser.user_id;

    if (!userId) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Пользователь не найден'
          : '❌ User not found',
      );
      return;
    }

    // Initialize sales session
    await this.sessionService.saveSession(userId, {
      chatId: ctx.chat?.id?.toString() || '',
      telegramId: ctx.telegramUser.telegram_id,
      state: ConversationState.SALES_MACHINE_SELECTION,
      context: {
        tempData: {
          salesEntry: {} as SalesEntryData,
          step: 1,
        },
      },
    });

    // Get recent machines
    const machines = await this.machinesService.findAllSimple();
    const recentMachines = machines.slice(0, 8); // Show first 8 machines

    const machineButtons = recentMachines.map((m) => [
      Markup.button.callback(
        `🏭 ${m.machine_number} - ${m.location?.name || 'Unknown'}`,
        `sales_machine_${m.id}`,
      ),
    ]);

    // Add cancel button
    machineButtons.push([
      Markup.button.callback(
        lang === TelegramLanguage.RU ? '❌ Отмена' : '❌ Cancel',
        'sales_cancel',
      ),
    ]);

    const message =
      lang === TelegramLanguage.RU
        ? `💰 <b>Регистрация продажи</b>\n\n` +
          `Шаг 1/4: Выберите автомат:\n\n` +
          `<i>Или отправьте номер автомата текстом</i>`
        : `💰 <b>Sales Entry</b>\n\n` +
          `Step 1/4: Select machine:\n\n` +
          `<i>Or send machine number as text</i>`;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(machineButtons),
    });
  }

  // ============================================================================
  // MACHINE SELECTION
  // ============================================================================

  /**
   * Handle machine selection callback
   */
  async handleMachineSelection(ctx: BotContext, machineId: string): Promise<void> {
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
    const userId = ctx.telegramUser?.user_id;

    if (!userId) return;

    const machine = await this.machinesService.findOne(machineId);
    if (!machine) {
      await ctx.answerCbQuery(
        lang === TelegramLanguage.RU
          ? '❌ Автомат не найден'
          : '❌ Machine not found',
      );
      return;
    }

    // Update session with selected machine
    const session = await this.sessionService.getSession(userId);
    if (!session) return;

    const salesEntry: SalesEntryData = session.context.tempData?.salesEntry || {};
    salesEntry.machineId = machineId;
    salesEntry.machineNumber = machine.machine_number;

    await this.sessionService.saveSession(userId, {
      state: ConversationState.SALES_AMOUNT_INPUT,
      context: {
        tempData: {
          salesEntry,
          step: 2,
        },
      },
    });

    const message =
      lang === TelegramLanguage.RU
        ? `💰 <b>Регистрация продажи</b>\n\n` +
          `✅ Автомат: <b>${machine.machine_number}</b>\n` +
          `📍 Локация: ${machine.location?.name || 'N/A'}\n\n` +
          `Шаг 2/4: Введите сумму продажи (в рублях):\n\n` +
          `<i>Например: 150 или 75.50</i>`
        : `💰 <b>Sales Entry</b>\n\n` +
          `✅ Machine: <b>${machine.machine_number}</b>\n` +
          `📍 Location: ${machine.location?.name || 'N/A'}\n\n` +
          `Step 2/4: Enter sale amount:\n\n` +
          `<i>Example: 150 or 75.50</i>`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Назад', 'sales_back_machine')],
      [
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '❌ Отмена' : '❌ Cancel',
          'sales_cancel',
        ),
      ],
    ]);

    await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
    await ctx.answerCbQuery();
  }

  /**
   * Handle machine number entered as text
   */
  async handleMachineNumberInput(ctx: BotContext, machineNumber: string): Promise<void> {
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
    const userId = ctx.telegramUser?.user_id;

    if (!userId) return;

    const machine = await this.machinesService.findByMachineNumber(machineNumber.trim());
    if (!machine) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Автомат "${machineNumber}" не найден.\nПопробуйте ещё раз или выберите из списка.`
          : `❌ Machine "${machineNumber}" not found.\nTry again or select from list.`,
      );
      return;
    }

    // Update session
    const session = await this.sessionService.getSession(userId);
    if (!session) return;

    const salesEntry: SalesEntryData = session.context.tempData?.salesEntry || {};
    salesEntry.machineId = machine.id;
    salesEntry.machineNumber = machine.machine_number;

    await this.sessionService.saveSession(userId, {
      state: ConversationState.SALES_AMOUNT_INPUT,
      context: {
        tempData: {
          salesEntry,
          step: 2,
        },
      },
    });

    const message =
      lang === TelegramLanguage.RU
        ? `💰 <b>Регистрация продажи</b>\n\n` +
          `✅ Автомат: <b>${machine.machine_number}</b>\n` +
          `📍 Локация: ${machine.location?.name || 'N/A'}\n\n` +
          `Шаг 2/4: Введите сумму продажи (в рублях):`
        : `💰 <b>Sales Entry</b>\n\n` +
          `✅ Machine: <b>${machine.machine_number}</b>\n` +
          `📍 Location: ${machine.location?.name || 'N/A'}\n\n` +
          `Step 2/4: Enter sale amount:`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '❌ Отмена' : '❌ Cancel',
          'sales_cancel',
        ),
      ],
    ]);

    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }

  // ============================================================================
  // AMOUNT INPUT
  // ============================================================================

  /**
   * Handle amount input
   */
  async handleAmountInput(ctx: BotContext, amountText: string): Promise<void> {
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
    const userId = ctx.telegramUser?.user_id;

    if (!userId) return;

    // Parse amount
    const amount = parseFloat(amountText.replace(',', '.').replace(/[^\d.]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Неверный формат суммы. Введите число, например: 150'
          : '❌ Invalid amount format. Enter a number, e.g.: 150',
      );
      return;
    }

    // Update session
    const session = await this.sessionService.getSession(userId);
    if (!session) return;

    const salesEntry: SalesEntryData = session.context.tempData?.salesEntry || {};
    salesEntry.amount = amount;

    await this.sessionService.saveSession(userId, {
      state: ConversationState.SALES_PAYMENT_METHOD,
      context: {
        tempData: {
          salesEntry,
          step: 3,
        },
      },
    });

    const message =
      lang === TelegramLanguage.RU
        ? `💰 <b>Регистрация продажи</b>\n\n` +
          `✅ Автомат: <b>${salesEntry.machineNumber}</b>\n` +
          `✅ Сумма: <b>${amount.toFixed(2)} ₽</b>\n\n` +
          `Шаг 3/4: Выберите способ оплаты:`
        : `💰 <b>Sales Entry</b>\n\n` +
          `✅ Machine: <b>${salesEntry.machineNumber}</b>\n` +
          `✅ Amount: <b>${amount.toFixed(2)}</b>\n\n` +
          `Step 3/4: Select payment method:`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('💵 Наличные / Cash', 'sales_payment_cash'),
        Markup.button.callback('💳 Карта / Card', 'sales_payment_card'),
      ],
      [
        Markup.button.callback('📱 QR/СБП', 'sales_payment_qr'),
        Markup.button.callback('📲 Mobile', 'sales_payment_mobile'),
      ],
      [Markup.button.callback('⬅️ Назад', 'sales_back_amount')],
      [
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '❌ Отмена' : '❌ Cancel',
          'sales_cancel',
        ),
      ],
    ]);

    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }

  // ============================================================================
  // PAYMENT METHOD SELECTION
  // ============================================================================

  /**
   * Handle payment method selection
   */
  async handlePaymentMethodSelection(ctx: BotContext, method: string): Promise<void> {
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
    const userId = ctx.telegramUser?.user_id;

    if (!userId) return;

    const paymentMethodMap: Record<string, PaymentMethod> = {
      cash: PaymentMethod.CASH,
      card: PaymentMethod.CARD,
      qr: PaymentMethod.QR,
      mobile: PaymentMethod.MOBILE,
    };

    const paymentMethod = paymentMethodMap[method] || PaymentMethod.CASH;
    const paymentLabels: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: lang === TelegramLanguage.RU ? '💵 Наличные' : '💵 Cash',
      [PaymentMethod.CARD]: lang === TelegramLanguage.RU ? '💳 Карта' : '💳 Card',
      [PaymentMethod.QR]: '📱 QR/СБП',
      [PaymentMethod.MOBILE]: '📲 Mobile',
    };

    // Update session
    const session = await this.sessionService.getSession(userId);
    if (!session) return;

    const salesEntry: SalesEntryData = session.context.tempData?.salesEntry || {};
    salesEntry.paymentMethod = paymentMethod;

    await this.sessionService.saveSession(userId, {
      state: ConversationState.SALES_CONFIRMATION,
      context: {
        tempData: {
          salesEntry,
          step: 4,
        },
      },
    });

    const message =
      lang === TelegramLanguage.RU
        ? `💰 <b>Подтверждение продажи</b>\n\n` +
          `🏭 Автомат: <b>${salesEntry.machineNumber}</b>\n` +
          `💵 Сумма: <b>${salesEntry.amount?.toFixed(2)} ₽</b>\n` +
          `💳 Оплата: <b>${paymentLabels[paymentMethod]}</b>\n\n` +
          `Всё верно? Нажмите "Подтвердить" для сохранения.`
        : `💰 <b>Confirm Sale</b>\n\n` +
          `🏭 Machine: <b>${salesEntry.machineNumber}</b>\n` +
          `💵 Amount: <b>${salesEntry.amount?.toFixed(2)}</b>\n` +
          `💳 Payment: <b>${paymentLabels[paymentMethod]}</b>\n\n` +
          `All correct? Click "Confirm" to save.`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '✅ Подтвердить' : '✅ Confirm',
          'sales_confirm',
        ),
      ],
      [Markup.button.callback('⬅️ Назад', 'sales_back_payment')],
      [
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '❌ Отмена' : '❌ Cancel',
          'sales_cancel',
        ),
      ],
    ]);

    await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
    await ctx.answerCbQuery();
  }

  // ============================================================================
  // CONFIRMATION & SUBMISSION
  // ============================================================================

  /**
   * Handle sale confirmation
   */
  async handleSaleConfirmation(ctx: BotContext): Promise<void> {
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
    const userId = ctx.telegramUser?.user_id;

    if (!userId) return;

    const session = await this.sessionService.getSession(userId);
    if (!session) return;

    const salesEntry: SalesEntryData = session.context.tempData?.salesEntry || {};

    if (!salesEntry.machineId || !salesEntry.amount || !salesEntry.paymentMethod) {
      await ctx.answerCbQuery(
        lang === TelegramLanguage.RU
          ? '❌ Данные неполные'
          : '❌ Incomplete data',
      );
      return;
    }

    try {
      // Create transaction
      const transaction = await this.transactionsService.create({
        transaction_type: TransactionType.SALE,
        machine_id: salesEntry.machineId,
        amount: salesEntry.amount,
        payment_method: salesEntry.paymentMethod,
        quantity: salesEntry.quantity || 1,
        description: salesEntry.productName
          ? `Telegram sale: ${salesEntry.productName}`
          : 'Sale via Telegram',
      });

      // Clear session
      await this.sessionService.updateState(userId, ConversationState.IDLE);

      this.logger.log(
        `Sale recorded via Telegram: ${salesEntry.machineNumber}, ${salesEntry.amount} (${transaction.id})`,
      );

      const successMessage =
        lang === TelegramLanguage.RU
          ? `✅ <b>Продажа записана!</b>\n\n` +
            `🏭 Автомат: ${salesEntry.machineNumber}\n` +
            `💵 Сумма: ${salesEntry.amount.toFixed(2)} ₽\n` +
            `🔢 ID транзакции: <code>${transaction.id.slice(0, 8)}</code>\n\n` +
            `📊 Для новой продажи: /sales`
          : `✅ <b>Sale recorded!</b>\n\n` +
            `🏭 Machine: ${salesEntry.machineNumber}\n` +
            `💵 Amount: ${salesEntry.amount.toFixed(2)}\n` +
            `🔢 Transaction ID: <code>${transaction.id.slice(0, 8)}</code>\n\n` +
            `📊 For new sale: /sales`;

      await ctx.editMessageText(successMessage, { parse_mode: 'HTML' });
      await ctx.answerCbQuery(
        lang === TelegramLanguage.RU ? '✅ Сохранено!' : '✅ Saved!',
      );
    } catch (error) {
      this.logger.error('Failed to record sale via Telegram:', error);

      await ctx.answerCbQuery(
        lang === TelegramLanguage.RU
          ? '❌ Ошибка сохранения'
          : '❌ Save error',
      );

      await ctx.editMessageText(
        lang === TelegramLanguage.RU
          ? `❌ <b>Ошибка</b>\n\nНе удалось сохранить продажу.\nПопробуйте ещё раз: /sales`
          : `❌ <b>Error</b>\n\nFailed to save sale.\nTry again: /sales`,
        { parse_mode: 'HTML' },
      );
    }
  }

  // ============================================================================
  // NAVIGATION & CANCEL
  // ============================================================================

  /**
   * Handle cancel callback
   */
  async handleCancel(ctx: BotContext): Promise<void> {
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
    const userId = ctx.telegramUser?.user_id;

    if (userId) {
      await this.sessionService.updateState(userId, ConversationState.IDLE);
    }

    await ctx.editMessageText(
      lang === TelegramLanguage.RU
        ? '❌ Регистрация продажи отменена.'
        : '❌ Sales entry cancelled.',
    );
    await ctx.answerCbQuery();
  }

  /**
   * Handle back navigation
   */
  async handleBack(ctx: BotContext, toStep: string): Promise<void> {
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
    const userId = ctx.telegramUser?.user_id;

    if (!userId) return;

    const session = await this.sessionService.getSession(userId);
    if (!session) return;

    const salesEntry: SalesEntryData = session.context.tempData?.salesEntry || {};

    switch (toStep) {
      case 'machine':
        // Go back to machine selection
        await this.sessionService.updateState(userId, ConversationState.SALES_MACHINE_SELECTION);
        await ctx.editMessageText(
          lang === TelegramLanguage.RU
            ? '💰 <b>Регистрация продажи</b>\n\nШаг 1/4: Введите номер автомата:'
            : '💰 <b>Sales Entry</b>\n\nStep 1/4: Enter machine number:',
          { parse_mode: 'HTML' },
        );
        break;

      case 'amount':
        // Go back to amount input
        await this.sessionService.updateState(userId, ConversationState.SALES_AMOUNT_INPUT);
        await ctx.editMessageText(
          lang === TelegramLanguage.RU
            ? `💰 <b>Регистрация продажи</b>\n\n✅ Автомат: ${salesEntry.machineNumber}\n\nШаг 2/4: Введите сумму:`
            : `💰 <b>Sales Entry</b>\n\n✅ Machine: ${salesEntry.machineNumber}\n\nStep 2/4: Enter amount:`,
          { parse_mode: 'HTML' },
        );
        break;

      case 'payment':
        // Go back to payment method
        await this.sessionService.updateState(userId, ConversationState.SALES_PAYMENT_METHOD);
        const message =
          lang === TelegramLanguage.RU
            ? `💰 <b>Регистрация продажи</b>\n\n✅ Автомат: ${salesEntry.machineNumber}\n✅ Сумма: ${salesEntry.amount?.toFixed(2)} ₽\n\nШаг 3/4: Выберите способ оплаты:`
            : `💰 <b>Sales Entry</b>\n\n✅ Machine: ${salesEntry.machineNumber}\n✅ Amount: ${salesEntry.amount?.toFixed(2)}\n\nStep 3/4: Select payment method:`;

        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback('💵 Наличные', 'sales_payment_cash'),
            Markup.button.callback('💳 Карта', 'sales_payment_card'),
          ],
          [
            Markup.button.callback('📱 QR/СБП', 'sales_payment_qr'),
            Markup.button.callback('📲 Mobile', 'sales_payment_mobile'),
          ],
          [
            Markup.button.callback(
              lang === TelegramLanguage.RU ? '❌ Отмена' : '❌ Cancel',
              'sales_cancel',
            ),
          ],
        ]);

        await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
        break;
    }

    await ctx.answerCbQuery();
  }

  // ============================================================================
  // TEXT MESSAGE HANDLER
  // ============================================================================

  /**
   * Handle text input based on current state
   */
  async handleTextInput(ctx: BotContext): Promise<boolean> {
    const userId = ctx.telegramUser?.user_id;
    if (!userId) return false;

    const session = await this.sessionService.getSession(userId);
    if (!session) return false;

    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (!text) return false;

    switch (session.state) {
      case ConversationState.SALES_MACHINE_SELECTION:
        await this.handleMachineNumberInput(ctx, text);
        return true;

      case ConversationState.SALES_AMOUNT_INPUT:
        await this.handleAmountInput(ctx, text);
        return true;

      default:
        return false;
    }
  }
}
