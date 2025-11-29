import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// Start command
bot.start((ctx) => {
  ctx.reply(
    'Добро пожаловать в VendHub Manager!\n\n' +
    'Этот бот предназначен для операторов сети вендинговых автоматов.\n\n' +
    'Основные команды:\n' +
    '/tasks - Мои задачи\n' +
    '/help - Помощь'
  );
});

// Help command
bot.help((ctx) => {
  ctx.reply(
    '📋 Доступные команды:\n\n' +
    '/tasks - Посмотреть список моих задач\n' +
    '/start - Начать работу с ботом\n' +
    '/help - Показать это сообщение\n\n' +
    'Для выполнения задач вам будут приходить уведомления.'
  );
});

// Tasks command (placeholder)
bot.command('tasks', (ctx) => {
  ctx.reply('📋 Функционал управления задачами будет доступен после авторизации.');
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}`, err);
  ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
});

// Launch bot
bot.launch()
  .then(() => {
    console.log('🤖 VendHub Telegram Bot запущен');
  })
  .catch((err) => {
    console.error('Ошибка запуска бота:', err);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
