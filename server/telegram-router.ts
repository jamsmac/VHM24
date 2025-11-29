import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getBot, handleStart, handleStatus, handleHelp } from "./telegram";
import type TelegramBot from 'node-telegram-bot-api';

export const telegramRouter = router({
  webhook: publicProcedure
    .input(z.any()) // Telegram sends complex update objects
    .mutation(async ({ input }) => {
      const bot = getBot();
      if (!bot) {
        console.warn('[Telegram] Bot not initialized, ignoring webhook');
        return { success: false };
      }

      try {
        const update = input as TelegramBot.Update;
        
        if (update.message) {
          const msg = update.message;
          const text = msg.text || '';

          // Handle commands
          if (text.startsWith('/start')) {
            await handleStart(msg);
          } else if (text.startsWith('/status')) {
            await handleStatus(msg);
          } else if (text.startsWith('/help')) {
            await handleHelp(msg);
          } else {
            // Default response for unknown messages
            const chatId = msg.chat.id;
            await bot.sendMessage(chatId, 'Используйте /help для просмотра доступных команд.');
          }
        }

        return { success: true };
      } catch (error) {
        console.error('[Telegram] Webhook error:', error);
        return { success: false, error: String(error) };
      }
    }),

  getInfo: publicProcedure.query(async () => {
    const bot = getBot();
    if (!bot) {
      return { initialized: false };
    }

    try {
      const me = await bot.getMe();
      const webhookInfo = await bot.getWebHookInfo();
      
      return {
        initialized: true,
        botInfo: {
          id: me.id,
          username: me.username,
          firstName: me.first_name,
        },
        webhook: {
          url: webhookInfo.url,
          hasCustomCertificate: webhookInfo.has_custom_certificate,
          pendingUpdateCount: webhookInfo.pending_update_count,
        },
      };
    } catch (error) {
      console.error('[Telegram] Failed to get bot info:', error);
      return { initialized: false, error: String(error) };
    }
  }),

  sendNotification: publicProcedure
    .input(z.object({
      telegramId: z.string(),
      message: z.string(),
    }))
    .mutation(async ({ input }) => {
      const bot = getBot();
      if (!bot) {
        throw new Error('Telegram bot not initialized');
      }

      try {
        await bot.sendMessage(parseInt(input.telegramId), input.message);
        return { success: true };
      } catch (error) {
        console.error('[Telegram] Failed to send notification:', error);
        throw new Error(`Failed to send notification: ${error}`);
      }
    }),
});
