import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import {
  TelegramResilientApiService,
  TelegramSendOptions,
  ResilientSendOptions,
} from './telegram-resilient-api.service';
import { TelegramMessageType } from '../entities/telegram-message-log.entity';

describe('TelegramResilientApiService', () => {
  let service: TelegramResilientApiService;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
      getJobCounts: jest.fn(),
      getFailed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramResilientApiService,
        {
          provide: getQueueToken('telegram-messages'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<TelegramResilientApiService>(TelegramResilientApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendText', () => {
    it('should queue text message and return job ID', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      const result = await service.sendText('123456789', 'Hello World');

      expect(result).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-message',
        expect.objectContaining({
          type: 'text',
          chatId: '123456789',
          content: 'Hello World',
        }),
        expect.any(Object),
      );
    });

    it('should include telegram options in job data', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-124' });
      const options: TelegramSendOptions = {
        parse_mode: 'HTML',
        disable_notification: true,
      };

      await service.sendText('123456789', '<b>Bold</b>', options);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-message',
        expect.objectContaining({
          options,
        }),
        expect.any(Object),
      );
    });

    it('should include metadata in job data', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-125' });
      const resilientOptions: ResilientSendOptions = {
        metadata: {
          userId: 'user-uuid',
          messageType: TelegramMessageType.NOTIFICATION,
        },
      };

      await service.sendText('123456789', 'Test', undefined, resilientOptions);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-message',
        expect.objectContaining({
          metadata: resilientOptions.metadata,
        }),
        expect.any(Object),
      );
    });

    it('should use custom retry options', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-126' });
      const resilientOptions: ResilientSendOptions = {
        attempts: 10,
        priority: 5,
        timeout: 120000,
      };

      await service.sendText('123456789', 'Test', undefined, resilientOptions);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-message',
        expect.any(Object),
        expect.objectContaining({
          attempts: 10,
          priority: 5,
          timeout: 120000,
        }),
      );
    });
  });

  describe('sendPhoto', () => {
    it('should queue photo message with URL', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-photo-1' });

      const result = await service.sendPhoto('123456789', 'https://example.com/photo.jpg');

      expect(result).toBe('job-photo-1');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-message',
        expect.objectContaining({
          type: 'photo',
          chatId: '123456789',
          content: 'https://example.com/photo.jpg',
        }),
        expect.any(Object),
      );
    });

    it('should queue photo message with Buffer', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-photo-2' });
      const buffer = Buffer.from('photo-data');

      await service.sendPhoto('123456789', buffer);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-message',
        expect.objectContaining({
          type: 'photo',
          content: buffer,
        }),
        expect.any(Object),
      );
    });

    it('should include caption in options', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-photo-3' });
      const options: TelegramSendOptions = { caption: 'Photo caption' };

      await service.sendPhoto('123456789', 'https://example.com/photo.jpg', options);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-message',
        expect.objectContaining({
          options: { caption: 'Photo caption' },
        }),
        expect.any(Object),
      );
    });
  });

  describe('sendDocument', () => {
    it('should queue document message', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-doc-1' });

      const result = await service.sendDocument('123456789', 'https://example.com/doc.pdf');

      expect(result).toBe('job-doc-1');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-message',
        expect.objectContaining({
          type: 'document',
          chatId: '123456789',
          content: 'https://example.com/doc.pdf',
        }),
        expect.any(Object),
      );
    });
  });

  describe('sendVoice', () => {
    it('should queue voice message', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-voice-1' });

      const result = await service.sendVoice('123456789', 'https://example.com/voice.ogg');

      expect(result).toBe('job-voice-1');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-message',
        expect.objectContaining({
          type: 'voice',
          chatId: '123456789',
        }),
        expect.any(Object),
      );
    });
  });

  describe('sendLocation', () => {
    it('should queue location message with coordinates', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-loc-1' });

      const result = await service.sendLocation('123456789', 41.2995, 69.2401);

      expect(result).toBe('job-loc-1');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-message',
        expect.objectContaining({
          type: 'location',
          chatId: '123456789',
          content: { latitude: 41.2995, longitude: 69.2401 },
        }),
        expect.any(Object),
      );
    });
  });

  describe('getJobStatus', () => {
    it('should return job status', async () => {
      const mockJob = {
        getState: jest.fn().mockResolvedValue('completed'),
        progress: jest.fn().mockReturnValue(100),
        attemptsMade: 1,
        failedReason: undefined,
      };
      mockQueue.getJob.mockResolvedValue(mockJob);

      const status = await service.getJobStatus('job-123');

      expect(status).toEqual({
        state: 'completed',
        progress: 100,
        attemptsMade: 1,
        failedReason: undefined,
      });
    });

    it('should return failed reason for failed jobs', async () => {
      const mockJob = {
        getState: jest.fn().mockResolvedValue('failed'),
        progress: jest.fn().mockReturnValue(0),
        attemptsMade: 5,
        failedReason: 'Network error',
      };
      mockQueue.getJob.mockResolvedValue(mockJob);

      const status = await service.getJobStatus('job-failed');

      expect(status.state).toBe('failed');
      expect(status.failedReason).toBe('Network error');
      expect(status.attemptsMade).toBe(5);
    });

    it('should throw error if job not found', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.getJobStatus('nonexistent')).rejects.toThrow(
        'Job nonexistent not found',
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
    });

    it('should handle missing counts as 0', async () => {
      mockQueue.getJobCounts.mockResolvedValue({});

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });
    });
  });

  describe('clearFailedJobs', () => {
    it('should remove all failed jobs', async () => {
      const mockJobs = [{ remove: jest.fn() }, { remove: jest.fn() }, { remove: jest.fn() }];
      mockQueue.getFailed.mockResolvedValue(mockJobs);

      const count = await service.clearFailedJobs();

      expect(count).toBe(3);
      mockJobs.forEach((job) => {
        expect(job.remove).toHaveBeenCalled();
      });
    });

    it('should return 0 when no failed jobs', async () => {
      mockQueue.getFailed.mockResolvedValue([]);

      const count = await service.clearFailedJobs();

      expect(count).toBe(0);
    });
  });

  describe('retryFailedJob', () => {
    it('should retry job by ID', async () => {
      const mockJob = { retry: jest.fn() };
      mockQueue.getJob.mockResolvedValue(mockJob);

      await service.retryFailedJob('job-failed-1');

      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should throw error if job not found', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.retryFailedJob('nonexistent')).rejects.toThrow(
        'Job nonexistent not found',
      );
    });
  });
});
