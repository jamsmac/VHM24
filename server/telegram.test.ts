import { describe, it, expect } from 'vitest';
import TelegramBot from 'node-telegram-bot-api';

describe('Telegram Bot Token Validation', () => {
  it('should validate Telegram bot token', async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    expect(token).toBeDefined();
    expect(token).not.toBe('');
    
    // Test token format (should be like: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)
    const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
    expect(token).toMatch(tokenPattern);
    
    // Try to create a bot instance and get bot info
    const bot = new TelegramBot(token!, { polling: false });
    
    try {
      const me = await bot.getMe();
      
      // Verify bot info
      expect(me).toBeDefined();
      expect(me.username).toBe('vhm24bot');
      expect(me.is_bot).toBe(true);
      
      console.log('✅ Telegram bot validated:', {
        id: me.id,
        username: me.username,
        firstName: me.first_name,
      });
    } catch (error) {
      throw new Error(`Failed to validate Telegram bot token: ${error}`);
    }
  }, 10000); // 10 second timeout for API call

  it('should validate owner Telegram ID', () => {
    const ownerId = process.env.TELEGRAM_OWNER_ID;
    
    expect(ownerId).toBeDefined();
    expect(ownerId).toBe('42283329');
    expect(parseInt(ownerId!)).toBeGreaterThan(0);
  });
});
