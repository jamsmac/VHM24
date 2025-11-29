import TelegramBot from 'node-telegram-bot-api';
import { ENV } from './_core/env';
import * as db from './db';

let bot: TelegramBot | null = null;

export function initTelegramBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('[Telegram] Bot token not configured, skipping initialization');
    return null;
  }

  try {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
      polling: false, // We'll use webhooks instead
    });

    console.log('[Telegram] Bot initialized successfully');
    return bot;
  } catch (error) {
    console.error('[Telegram] Failed to initialize bot:', error);
    return null;
  }
}

export function getBot(): TelegramBot | null {
  return bot;
}

export async function setWebhook(url: string) {
  if (!bot) {
    console.warn('[Telegram] Bot not initialized');
    return false;
  }

  try {
    await bot.setWebHook(`${url}/api/telegram/webhook`);
    console.log(`[Telegram] Webhook set to: ${url}/api/telegram/webhook`);
    return true;
  } catch (error) {
    console.error('[Telegram] Failed to set webhook:', error);
    return false;
  }
}

export async function sendMessage(chatId: number, text: string, options?: TelegramBot.SendMessageOptions) {
  if (!bot) {
    console.warn('[Telegram] Bot not initialized');
    return null;
  }

  try {
    return await bot.sendMessage(chatId, text, options);
  } catch (error) {
    console.error('[Telegram] Failed to send message:', error);
    return null;
  }
}

// Command handlers
export async function handleStart(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const username = msg.from?.username || 'Unknown';
  const firstName = msg.from?.first_name || '';
  const lastName = msg.from?.last_name || '';
  const telegramId = msg.from?.id.toString() || '';

  // Check if this is the owner
  const isOwner = telegramId === process.env.TELEGRAM_OWNER_ID;

  if (isOwner) {
    await sendMessage(chatId, `👋 Добро пожаловать, ${firstName}!

Вы являетесь владельцем системы VendHub Manager.

Ваш аккаунт автоматически получил роль **Owner** с полным доступом ко всем функциям.

🔗 Войдите в систему: ${ENV.publicUrl}

Используйте команду /help для просмотра доступных команд.`);
  } else {
    await sendMessage(chatId, `👋 Здравствуйте, ${firstName}!

Добро пожаловать в VendHub Manager — систему управления вендинговыми автоматами.

📝 **Запрос на доступ отправлен**

Ваша заявка:
• Имя: ${firstName} ${lastName}
• Username: @${username}
• Telegram ID: ${telegramId}

Администратор рассмотрит вашу заявку в ближайшее время.

После одобрения вы получите уведомление и сможете войти в систему.

Используйте команду /status для проверки статуса заявки.`);

    // Create access request in database
    try {
      await db.createAccessRequest({
        telegramId,
        username: username || null,
        firstName: firstName || null,
        lastName: lastName || null,
        chatId: chatId.toString(),
        status: "pending",
        requestedRole: "operator",
      });
      console.log('[Telegram] Access request created for:', telegramId);
    } catch (error) {
      console.error('[Telegram] Failed to create access request:', error);
    }
  }
}

export async function handleStatus(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString() || '';

  // Check user status in database
  const request = await db.getAccessRequestByTelegramId(telegramId);
  
  if (!request) {
    await sendMessage(chatId, `📊 **Статус вашей заявки**

Telegram ID: ${telegramId}

❌ Заявка не найдена.

Используйте команду /start для подачи заявки на доступ.`);
    return;
  }

  let statusText = '';
  if (request.status === 'pending') {
    statusText = '⏳ На рассмотрении';
  } else if (request.status === 'approved') {
    statusText = '✅ Одобрена';
  } else if (request.status === 'rejected') {
    statusText = '❌ Отклонена';
  }

  await sendMessage(chatId, `📊 **Статус вашей заявки**

Telegram ID: ${telegramId}
Статус: ${statusText}
Дата подачи: ${new Date(request.createdAt).toLocaleDateString('ru-RU')}

${request.status === 'pending' ? 'Ваша заявка находится на рассмотрении.\n\nВы получите уведомление, как только администратор одобрит доступ.' : ''}
${request.status === 'approved' ? 'Ваша заявка одобрена! Вы можете войти в систему:\n' + ENV.publicUrl : ''}
${request.status === 'rejected' ? 'К сожалению, ваша заявка была отклонена. Обратитесь к администратору для уточнения причин.' : ''}`);
}

export async function handleHelp(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;

  await sendMessage(chatId, `❓ **Доступные команды:**

/start — Начать работу и подать заявку на доступ
/status — Проверить статус заявки
/help — Показать эту справку

📱 **О системе:**
VendHub Manager — это профессиональная система для управления сетью вендинговых автоматов.

🌐 **Веб-интерфейс:**
${ENV.publicUrl}

💬 **Поддержка:**
Если у вас возникли вопросы, обратитесь к администратору.`);
}

export function setupBotCommands(bot: TelegramBot) {
  bot.onText(/\/start/, handleStart);
  bot.onText(/\/status/, handleStatus);
  bot.onText(/\/help/, handleHelp);

  console.log('[Telegram] Bot commands registered');
}
