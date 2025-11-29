import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { WebhookService } from './webhook.service';
import { Webhook, WebhookStatus } from '../entities/webhook.entity';

describe('WebhookService', () => {
  let service: WebhookService;
  let repository: jest.Mocked<Repository<Webhook>>;

  const mockWebhook: Partial<Webhook> = {
    id: 'webhook-uuid',
    integration_id: 'integration-uuid',
    event_type: 'payment.completed',
    source: 'stripe',
    external_id: 'evt_123',
    payload: { amount: 1000, currency: 'USD' },
    headers: { 'content-type': 'application/json' },
    status: WebhookStatus.PENDING,
    retry_count: 0,
    max_retries: 3,
    error_message: null,
    processed_at: null,
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: getRepositoryToken(Webhook),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    repository = module.get(getRepositoryToken(Webhook));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWebhook', () => {
    it('should create a new webhook with PENDING status', async () => {
      const webhookData = {
        integration_id: 'integration-uuid',
        event_type: 'payment.completed',
        source: 'stripe',
        external_id: 'evt_123',
        payload: { amount: 1000 },
      };

      repository.create.mockReturnValue(mockWebhook as Webhook);
      repository.save.mockResolvedValue(mockWebhook as Webhook);

      const result = await service.createWebhook(webhookData);

      expect(result).toEqual(mockWebhook);
      expect(repository.create).toHaveBeenCalledWith({
        ...webhookData,
        status: WebhookStatus.PENDING,
      });
      expect(repository.save).toHaveBeenCalled();
    });

    it('should create webhook with metadata and headers', async () => {
      const webhookData = {
        event_type: 'order.created',
        payload: { order_id: '123' },
        headers: { 'x-signature': 'abc' },
        metadata: { ip_address: '192.168.1.1' },
      };

      repository.create.mockReturnValue({ ...mockWebhook, ...webhookData } as Webhook);
      repository.save.mockResolvedValue({ ...mockWebhook, ...webhookData } as Webhook);

      const result = await service.createWebhook(webhookData);

      expect(repository.create).toHaveBeenCalledWith({
        ...webhookData,
        status: WebhookStatus.PENDING,
      });
    });
  });

  describe('processWebhook', () => {
    it('should set webhook status to PROCESSING', async () => {
      repository.findOne.mockResolvedValue(mockWebhook as Webhook);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Webhook));

      const result = await service.processWebhook('webhook-uuid');

      expect(result.status).toBe(WebhookStatus.PROCESSING);
    });

    it('should throw NotFoundException when webhook not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.processWebhook('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('completeWebhook', () => {
    it('should set webhook status to COMPLETED and set processed_at', async () => {
      repository.findOne.mockResolvedValue({ ...mockWebhook } as Webhook);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Webhook));

      const result = await service.completeWebhook('webhook-uuid');

      expect(result.status).toBe(WebhookStatus.COMPLETED);
      expect(result.processed_at).toBeDefined();
    });

    it('should throw NotFoundException when webhook not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.completeWebhook('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('failWebhook', () => {
    it('should increment retry count and set back to PENDING', async () => {
      const webhookWithLowRetry = {
        ...mockWebhook,
        retry_count: 0,
        max_retries: 3,
      };
      repository.findOne.mockResolvedValue(webhookWithLowRetry as Webhook);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Webhook));

      const result = await service.failWebhook('webhook-uuid', 'Connection error');

      expect(result.status).toBe(WebhookStatus.PENDING);
      expect(result.retry_count).toBe(1);
      expect(result.error_message).toBe('Connection error');
    });

    it('should set status to FAILED when max retries reached', async () => {
      const webhookAtMaxRetry = {
        ...mockWebhook,
        retry_count: 2, // Will become 3 after increment
        max_retries: 3,
      };
      repository.findOne.mockResolvedValue(webhookAtMaxRetry as Webhook);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Webhook));

      const result = await service.failWebhook('webhook-uuid', 'Max retries exceeded');

      expect(result.status).toBe(WebhookStatus.FAILED);
      expect(result.retry_count).toBe(3);
    });

    it('should throw NotFoundException when webhook not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.failWebhook('non-existent', 'error')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPendingWebhooks', () => {
    it('should return pending webhooks ordered by created_at', async () => {
      const pendingWebhooks = [mockWebhook, { ...mockWebhook, id: 'webhook-2' }];
      repository.find.mockResolvedValue(pendingWebhooks as Webhook[]);

      const result = await service.getPendingWebhooks();

      expect(result).toEqual(pendingWebhooks);
      expect(repository.find).toHaveBeenCalledWith({
        where: { status: WebhookStatus.PENDING },
        order: { created_at: 'ASC' },
        take: 10,
      });
    });

    it('should respect limit parameter', async () => {
      repository.find.mockResolvedValue([mockWebhook] as Webhook[]);

      await service.getPendingWebhooks(5);

      expect(repository.find).toHaveBeenCalledWith({
        where: { status: WebhookStatus.PENDING },
        order: { created_at: 'ASC' },
        take: 5,
      });
    });
  });

  describe('verifySignature', () => {
    it('should return true for valid signature', async () => {
      const payload = { test: 'data' };
      const secret = 'webhook_secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const result = await service.verifySignature(payload, signature, secret);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', async () => {
      const payload = { test: 'data' };
      const secret = 'webhook_secret';
      const invalidSignature = 'invalid_signature_hex_value_1234567890abcdef12345678';

      // Create a valid length signature (64 hex chars for sha256)
      const result = await service.verifySignature(payload, '0'.repeat(64), secret);

      expect(result).toBe(false);
    });
  });

  describe('getWebhooksByIntegration', () => {
    it('should return webhooks for integration', async () => {
      repository.find.mockResolvedValue([mockWebhook] as Webhook[]);

      const result = await service.getWebhooksByIntegration('integration-uuid');

      expect(result).toEqual([mockWebhook]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { integration_id: 'integration-uuid' },
        order: { created_at: 'DESC' },
        take: 100,
      });
    });

    it('should respect limit parameter', async () => {
      repository.find.mockResolvedValue([mockWebhook] as Webhook[]);

      await service.getWebhooksByIntegration('integration-uuid', 50);

      expect(repository.find).toHaveBeenCalledWith({
        where: { integration_id: 'integration-uuid' },
        order: { created_at: 'DESC' },
        take: 50,
      });
    });
  });

  describe('getWebhooksByEventType', () => {
    it('should return webhooks by event type', async () => {
      repository.find.mockResolvedValue([mockWebhook] as Webhook[]);

      const result = await service.getWebhooksByEventType('payment.completed');

      expect(result).toEqual([mockWebhook]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { event_type: 'payment.completed' },
        order: { created_at: 'DESC' },
        take: 100,
      });
    });

    it('should respect limit parameter', async () => {
      repository.find.mockResolvedValue([mockWebhook] as Webhook[]);

      await service.getWebhooksByEventType('order.created', 25);

      expect(repository.find).toHaveBeenCalledWith({
        where: { event_type: 'order.created' },
        order: { created_at: 'DESC' },
        take: 25,
      });
    });
  });
});
