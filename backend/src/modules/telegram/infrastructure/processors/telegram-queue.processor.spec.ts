import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelegramQueueProcessor, TelegramMessageJob } from './telegram-queue.processor';
import { TelegramSettings } from '../../shared/entities/telegram-settings.entity';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { Job } from 'bull';

describe('TelegramQueueProcessor', () => {
  let processor: TelegramQueueProcessor;
  let settingsRepository: jest.Mocked<any>;
  let messageLogRepository: jest.Mocked<any>;

  beforeEach(async () => {
    settingsRepository = {
      findOne: jest.fn(),
    };

    messageLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramQueueProcessor,
        {
          provide: getRepositoryToken(TelegramSettings),
          useValue: settingsRepository,
        },
        {
          provide: getRepositoryToken(TelegramMessageLog),
          useValue: messageLogRepository,
        },
      ],
    }).compile();

    processor = module.get<TelegramQueueProcessor>(TelegramQueueProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(processor).toBeDefined();
    });

    it('should initialize without bot when no settings', async () => {
      settingsRepository.findOne.mockResolvedValue(null);

      // Force re-initialization by calling private method through reflection
      await (processor as any).initializeBot();

      expect(settingsRepository.findOne).toHaveBeenCalled();
    });

    it('should initialize bot when settings are active', async () => {
      settingsRepository.findOne.mockResolvedValue({
        setting_key: 'default',
        bot_token: 'test-token',
        is_active: true,
      });

      await (processor as any).initializeBot();

      expect(settingsRepository.findOne).toHaveBeenCalledWith({
        where: { setting_key: 'default' },
      });
    });

    it('should handle initialization error gracefully', async () => {
      settingsRepository.findOne.mockRejectedValue(new Error('DB error'));

      await expect((processor as any).initializeBot()).resolves.not.toThrow();
    });
  });

  describe('isRetryableError', () => {
    it('should return true for timeout errors', () => {
      const error = new Error('ETIMEDOUT');
      const result = (processor as any).isRetryableError(error);
      expect(result).toBe(true);
    });

    it('should return true for connection refused errors', () => {
      const error = new Error('ECONNREFUSED');
      const result = (processor as any).isRetryableError(error);
      expect(result).toBe(true);
    });

    it('should return true for connection reset errors', () => {
      const error = new Error('ECONNRESET');
      const result = (processor as any).isRetryableError(error);
      expect(result).toBe(true);
    });

    it('should return true for DNS resolution errors', () => {
      const error = new Error('EAI_AGAIN');
      const result = (processor as any).isRetryableError(error);
      expect(result).toBe(true);
    });

    it('should return true for rate limit errors (429)', () => {
      const error = new Error('Too Many Requests (429)');
      const result = (processor as any).isRetryableError(error);
      expect(result).toBe(true);
    });

    it('should return true for server errors (500, 502, 503, 504)', () => {
      expect((processor as any).isRetryableError(new Error('500 Internal Server Error'))).toBe(
        true,
      );
      expect((processor as any).isRetryableError(new Error('502 Bad Gateway'))).toBe(true);
      expect((processor as any).isRetryableError(new Error('503 Service Unavailable'))).toBe(true);
      expect((processor as any).isRetryableError(new Error('504 Gateway Timeout'))).toBe(true);
    });

    it('should return false for blocked user errors', () => {
      const error = new Error('Forbidden: bot was blocked by the user');
      const result = (processor as any).isRetryableError(error);
      expect(result).toBe(false);
    });

    it('should return false for invalid chat ID errors', () => {
      const error = new Error('Bad Request: chat not found');
      const result = (processor as any).isRetryableError(error);
      expect(result).toBe(false);
    });

    it('should handle error without message', () => {
      const error = {} as Error;
      const result = (processor as any).isRetryableError(error);
      expect(result).toBe(false);
    });
  });

  describe('logMessage', () => {
    it('should log message successfully', async () => {
      const logData = {
        telegram_user_id: '123456789',
        message_type: TelegramMessageType.NOTIFICATION,
        message_text: 'Test message',
      };

      messageLogRepository.create.mockReturnValue(logData);
      messageLogRepository.save.mockResolvedValue(logData);

      await (processor as any).logMessage(logData);

      expect(messageLogRepository.create).toHaveBeenCalledWith(logData);
      expect(messageLogRepository.save).toHaveBeenCalled();
    });

    it('should handle log failure gracefully', async () => {
      messageLogRepository.create.mockReturnValue({});
      messageLogRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(
        (processor as any).logMessage({ telegram_user_id: '123' }),
      ).resolves.not.toThrow();
    });
  });

  describe('handleSendMessage', () => {
    it('should throw error when bot is not initialized', async () => {
      // Bot is not initialized
      (processor as any).bot = null;
      settingsRepository.findOne.mockResolvedValue(null);

      const job = {
        id: 'job-1',
        data: {
          type: 'text',
          chatId: '123456789',
          content: 'Test message',
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Job<TelegramMessageJob>;

      await expect(processor.handleSendMessage(job)).rejects.toThrow(
        'Telegram bot not initialized',
      );
    });

    it('should handle unsupported message type', async () => {
      // Mock initialized bot
      (processor as any).bot = {
        telegram: {
          sendMessage: jest.fn(),
        },
      };

      const job = {
        id: 'job-1',
        data: {
          type: 'unsupported' as any,
          chatId: '123456789',
          content: 'Test',
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Job<TelegramMessageJob>;

      await expect(processor.handleSendMessage(job)).rejects.toThrow('Unsupported message type');
    });

    it('should send text message successfully', async () => {
      const mockTelegram = {
        sendMessage: jest.fn().mockResolvedValue({ message_id: 123 }),
      };
      (processor as any).bot = { telegram: mockTelegram };

      const job = {
        id: 'job-1',
        data: {
          type: 'text',
          chatId: '123456789',
          content: 'Test message',
          options: { parse_mode: 'HTML' },
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Job<TelegramMessageJob>;

      const result = await processor.handleSendMessage(job);

      expect(result).toEqual({ success: true, messageId: 123 });
      expect(mockTelegram.sendMessage).toHaveBeenCalledWith('123456789', 'Test message', {
        parse_mode: 'HTML',
        disable_notification: undefined,
      });
    });

    it('should send photo message successfully', async () => {
      const mockTelegram = {
        sendPhoto: jest.fn().mockResolvedValue({ message_id: 124 }),
      };
      (processor as any).bot = { telegram: mockTelegram };

      const job = {
        id: 'job-2',
        data: {
          type: 'photo',
          chatId: '123456789',
          content: 'https://example.com/photo.jpg',
          options: { caption: 'Test photo' },
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Job<TelegramMessageJob>;

      const result = await processor.handleSendMessage(job);

      expect(result).toEqual({ success: true, messageId: 124 });
      expect(mockTelegram.sendPhoto).toHaveBeenCalled();
    });

    it('should send photo with buffer successfully', async () => {
      const mockTelegram = {
        sendPhoto: jest.fn().mockResolvedValue({ message_id: 125 }),
      };
      (processor as any).bot = { telegram: mockTelegram };

      const buffer = Buffer.from('photo data');
      const job = {
        id: 'job-3',
        data: {
          type: 'photo',
          chatId: '123456789',
          content: buffer,
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Job<TelegramMessageJob>;

      const result = await processor.handleSendMessage(job);

      expect(result).toEqual({ success: true, messageId: 125 });
      expect(mockTelegram.sendPhoto).toHaveBeenCalledWith(
        '123456789',
        { source: buffer },
        expect.any(Object),
      );
    });

    it('should send document message successfully', async () => {
      const mockTelegram = {
        sendDocument: jest.fn().mockResolvedValue({ message_id: 126 }),
      };
      (processor as any).bot = { telegram: mockTelegram };

      const job = {
        id: 'job-4',
        data: {
          type: 'document',
          chatId: '123456789',
          content: 'https://example.com/document.pdf',
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Job<TelegramMessageJob>;

      const result = await processor.handleSendMessage(job);

      expect(result).toEqual({ success: true, messageId: 126 });
    });

    it('should send voice message successfully', async () => {
      const mockTelegram = {
        sendVoice: jest.fn().mockResolvedValue({ message_id: 127 }),
      };
      (processor as any).bot = { telegram: mockTelegram };

      const job = {
        id: 'job-5',
        data: {
          type: 'voice',
          chatId: '123456789',
          content: 'https://example.com/voice.ogg',
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Job<TelegramMessageJob>;

      const result = await processor.handleSendMessage(job);

      expect(result).toEqual({ success: true, messageId: 127 });
    });

    it('should send location message successfully', async () => {
      const mockTelegram = {
        sendLocation: jest.fn().mockResolvedValue({ message_id: 128 }),
      };
      (processor as any).bot = { telegram: mockTelegram };

      const job = {
        id: 'job-6',
        data: {
          type: 'location',
          chatId: '123456789',
          content: { latitude: 41.311081, longitude: 69.279737 },
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Job<TelegramMessageJob>;

      const result = await processor.handleSendMessage(job);

      expect(result).toEqual({ success: true, messageId: 128 });
      expect(mockTelegram.sendLocation).toHaveBeenCalledWith('123456789', 41.311081, 69.279737);
    });

    it('should log message with metadata on success', async () => {
      const mockTelegram = {
        sendMessage: jest.fn().mockResolvedValue({ message_id: 130 }),
      };
      (processor as any).bot = { telegram: mockTelegram };
      messageLogRepository.create.mockReturnValue({});
      messageLogRepository.save.mockResolvedValue({});

      const job = {
        id: 'job-8',
        data: {
          type: 'text',
          chatId: '123456789',
          content: 'Test message',
          metadata: {
            userId: 'user-uuid',
            messageType: TelegramMessageType.NOTIFICATION,
          },
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Job<TelegramMessageJob>;

      await processor.handleSendMessage(job);

      expect(messageLogRepository.create).toHaveBeenCalled();
      expect(messageLogRepository.save).toHaveBeenCalled();
    });

    it('should throw and log on retryable error', async () => {
      const mockTelegram = {
        sendMessage: jest.fn().mockRejectedValue(new Error('ETIMEDOUT')),
      };
      (processor as any).bot = { telegram: mockTelegram };

      const job = {
        id: 'job-9',
        data: {
          type: 'text',
          chatId: '123456789',
          content: 'Test',
          metadata: { userId: 'user-uuid' },
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Job<TelegramMessageJob>;

      messageLogRepository.create.mockReturnValue({});
      messageLogRepository.save.mockResolvedValue({});

      await expect(processor.handleSendMessage(job)).rejects.toThrow('ETIMEDOUT');
    });

    it('should throw on non-retryable error', async () => {
      const mockTelegram = {
        sendMessage: jest.fn().mockRejectedValue(new Error('Forbidden: bot was blocked')),
      };
      (processor as any).bot = { telegram: mockTelegram };

      const job = {
        id: 'job-10',
        data: {
          type: 'text',
          chatId: '123456789',
          content: 'Test',
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Job<TelegramMessageJob>;

      await expect(processor.handleSendMessage(job)).rejects.toThrow('Forbidden: bot was blocked');
    });
  });
});
