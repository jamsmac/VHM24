import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { TelegramPaymentsService } from './telegram-payments.service';
import {
  ClientOrder,
  ClientOrderStatus,
  PaymentProvider,
} from '../entities/client-order.entity';
import { ClientPayment, ClientPaymentStatus } from '../entities/client-payment.entity';
import { ClientLoyaltyService } from './client-loyalty.service';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('TelegramPaymentsService', () => {
  let service: TelegramPaymentsService;
  let orderRepository: jest.Mocked<Repository<ClientOrder>>;
  let paymentRepository: jest.Mocked<Repository<ClientPayment>>;
  let loyaltyService: jest.Mocked<ClientLoyaltyService>;
  let configService: jest.Mocked<ConfigService>;

  const mockOrder: Partial<ClientOrder> = {
    id: 'order-123',
    client_user_id: 'client-1',
    status: ClientOrderStatus.PENDING,
    total_amount: 50000,
    discount_amount: 0,
    loyalty_points_earned: 50,
    items: [
      { product_name: 'Coffee', quantity: 2, price: 25000 } as any,
    ],
    machine: { id: 'machine-1', name: 'Coffee Machine' } as any,
  };

  const mockPayment: Partial<ClientPayment> = {
    id: 'payment-1',
    client_user_id: 'client-1',
    provider: PaymentProvider.TELEGRAM,
    amount: 50000,
    currency: 'UZS',
    status: ClientPaymentStatus.SUCCESS,
  };

  beforeEach(async () => {
    mockFetch.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramPaymentsService,
        {
          provide: getRepositoryToken(ClientOrder),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClientPayment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ClientLoyaltyService,
          useValue: {
            earnPoints: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'TELEGRAM_BOT_TOKEN') return 'test-bot-token';
              if (key === 'TELEGRAM_PAYMENT_PROVIDER_TOKEN') return 'test-provider-token';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramPaymentsService>(TelegramPaymentsService);
    orderRepository = module.get(getRepositoryToken(ClientOrder));
    paymentRepository = module.get(getRepositoryToken(ClientPayment));
    loyaltyService = module.get(ClientLoyaltyService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should warn when bot token is not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TelegramPaymentsService,
          {
            provide: getRepositoryToken(ClientOrder),
            useValue: { findOne: jest.fn(), save: jest.fn() },
          },
          {
            provide: getRepositoryToken(ClientPayment),
            useValue: { create: jest.fn(), save: jest.fn() },
          },
          {
            provide: ClientLoyaltyService,
            useValue: { earnPoints: jest.fn() },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(null),
            },
          },
        ],
      }).compile();

      const serviceWithNoToken = module.get<TelegramPaymentsService>(TelegramPaymentsService);
      expect(serviceWithNoToken).toBeDefined();
    });

    it('should warn when provider token is not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TelegramPaymentsService,
          {
            provide: getRepositoryToken(ClientOrder),
            useValue: { findOne: jest.fn(), save: jest.fn() },
          },
          {
            provide: getRepositoryToken(ClientPayment),
            useValue: { create: jest.fn(), save: jest.fn() },
          },
          {
            provide: ClientLoyaltyService,
            useValue: { earnPoints: jest.fn() },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'TELEGRAM_BOT_TOKEN') return 'test-token';
                return null;
              }),
            },
          },
        ],
      }).compile();

      const serviceWithNoProvider = module.get<TelegramPaymentsService>(TelegramPaymentsService);
      expect(serviceWithNoProvider).toBeDefined();
    });
  });

  describe('createInvoiceLink', () => {
    it('should create invoice link successfully', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder as ClientOrder);
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          ok: true,
          result: 'https://t.me/$invoice-link',
        }),
      });

      const result = await service.createInvoiceLink('order-123');

      expect(result).toBe('https://t.me/$invoice-link');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-bot-token/createInvoiceLink',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should throw error when bot token not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TelegramPaymentsService,
          {
            provide: getRepositoryToken(ClientOrder),
            useValue: { findOne: jest.fn(), save: jest.fn() },
          },
          {
            provide: getRepositoryToken(ClientPayment),
            useValue: { create: jest.fn(), save: jest.fn() },
          },
          {
            provide: ClientLoyaltyService,
            useValue: { earnPoints: jest.fn() },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(''),
            },
          },
        ],
      }).compile();

      const serviceNoToken = module.get<TelegramPaymentsService>(TelegramPaymentsService);

      await expect(serviceNoToken.createInvoiceLink('order-123'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw error when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.createInvoiceLink('order-123'))
        .rejects.toThrow('Order not found');
    });

    it('should throw error when order is not pending', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: ClientOrderStatus.PAID,
      } as ClientOrder);

      await expect(service.createInvoiceLink('order-123'))
        .rejects.toThrow('Order is not pending payment');
    });

    it('should include discount in invoice', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        discount_amount: 5000,
      } as ClientOrder);
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          ok: true,
          result: 'https://t.me/$invoice-link',
        }),
      });

      await service.createInvoiceLink('order-123');

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.prices).toHaveLength(2); // Item + Discount
      expect(body.prices[1].label).toBe('Скидка');
      expect(body.prices[1].amount).toBe(-500000); // -5000 * 100
    });

    it('should handle order without machine name', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        machine: null,
      } as any);
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          ok: true,
          result: 'https://t.me/$invoice-link',
        }),
      });

      await service.createInvoiceLink('order-123');

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.description).toContain('Автомат');
    });

    it('should handle order without items', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        items: null,
      } as ClientOrder);
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          ok: true,
          result: 'https://t.me/$invoice-link',
        }),
      });

      const result = await service.createInvoiceLink('order-123');

      expect(result).toBe('https://t.me/$invoice-link');
    });

    it('should throw error on Telegram API error', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder as ClientOrder);
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          ok: false,
          description: 'Invalid provider token',
          error_code: 400,
        }),
      });

      await expect(service.createInvoiceLink('order-123'))
        .rejects.toThrow('Telegram API error: Invalid provider token');
    });

    it('should use provider token when available', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder as ClientOrder);
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          ok: true,
          result: 'https://t.me/$invoice-link',
        }),
      });

      await service.createInvoiceLink('order-123');

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.provider_token).toBe('test-provider-token');
    });
  });

  describe('handleSuccessfulPayment', () => {
    const paymentParams = {
      telegramPaymentChargeId: 'tg-charge-123',
      providerPaymentChargeId: 'provider-charge-456',
      orderPayload: JSON.stringify({ order_id: 'order-123', type: 'vending_order' }),
      telegramUserId: 123456789,
      totalAmount: 5000000, // in tiyin
      currency: 'UZS',
    };

    it('should process successful payment', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder as ClientOrder);
      paymentRepository.create.mockReturnValue(mockPayment as ClientPayment);
      paymentRepository.save.mockResolvedValue(mockPayment as ClientPayment);
      orderRepository.save.mockResolvedValue(mockOrder as ClientOrder);
      loyaltyService.earnPoints.mockResolvedValue({} as any);

      await service.handleSuccessfulPayment(
        paymentParams.telegramPaymentChargeId,
        paymentParams.providerPaymentChargeId,
        paymentParams.orderPayload,
        paymentParams.telegramUserId,
        paymentParams.totalAmount,
        paymentParams.currency,
      );

      expect(paymentRepository.create).toHaveBeenCalled();
      expect(paymentRepository.save).toHaveBeenCalled();
      expect(orderRepository.save).toHaveBeenCalled();
      expect(loyaltyService.earnPoints).toHaveBeenCalled();
    });

    it('should throw error on invalid payload', async () => {
      await expect(
        service.handleSuccessfulPayment(
          paymentParams.telegramPaymentChargeId,
          paymentParams.providerPaymentChargeId,
          'invalid-json',
          paymentParams.telegramUserId,
          paymentParams.totalAmount,
          paymentParams.currency,
        ),
      ).rejects.toThrow('Invalid payment payload');
    });

    it('should skip non-vending_order payment types', async () => {
      const payload = JSON.stringify({ order_id: 'order-123', type: 'subscription' });

      await service.handleSuccessfulPayment(
        paymentParams.telegramPaymentChargeId,
        paymentParams.providerPaymentChargeId,
        payload,
        paymentParams.telegramUserId,
        paymentParams.totalAmount,
        paymentParams.currency,
      );

      expect(orderRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw error when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.handleSuccessfulPayment(
          paymentParams.telegramPaymentChargeId,
          paymentParams.providerPaymentChargeId,
          paymentParams.orderPayload,
          paymentParams.telegramUserId,
          paymentParams.totalAmount,
          paymentParams.currency,
        ),
      ).rejects.toThrow('Order not found');
    });

    it('should skip already processed orders', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: ClientOrderStatus.PAID,
      } as ClientOrder);

      await service.handleSuccessfulPayment(
        paymentParams.telegramPaymentChargeId,
        paymentParams.providerPaymentChargeId,
        paymentParams.orderPayload,
        paymentParams.telegramUserId,
        paymentParams.totalAmount,
        paymentParams.currency,
      );

      expect(paymentRepository.create).not.toHaveBeenCalled();
    });

    it('should not earn points when loyalty_points_earned is 0', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        loyalty_points_earned: 0,
      } as ClientOrder);
      paymentRepository.create.mockReturnValue(mockPayment as ClientPayment);
      paymentRepository.save.mockResolvedValue(mockPayment as ClientPayment);
      orderRepository.save.mockResolvedValue(mockOrder as ClientOrder);

      await service.handleSuccessfulPayment(
        paymentParams.telegramPaymentChargeId,
        paymentParams.providerPaymentChargeId,
        paymentParams.orderPayload,
        paymentParams.telegramUserId,
        paymentParams.totalAmount,
        paymentParams.currency,
      );

      expect(loyaltyService.earnPoints).not.toHaveBeenCalled();
    });

    it('should convert amount from tiyin to sum', async () => {
      const pendingOrder = {
        ...mockOrder,
        status: ClientOrderStatus.PENDING,
        loyalty_points_earned: 50,
      };
      orderRepository.findOne.mockResolvedValue(pendingOrder as ClientOrder);
      paymentRepository.create.mockReturnValue(mockPayment as ClientPayment);
      paymentRepository.save.mockResolvedValue(mockPayment as ClientPayment);
      orderRepository.save.mockResolvedValue(pendingOrder as ClientOrder);
      loyaltyService.earnPoints.mockResolvedValue({} as any);

      await service.handleSuccessfulPayment(
        'charge-id',
        'provider-charge-id',
        JSON.stringify({ order_id: 'order-123', type: 'vending_order' }),
        123456789,
        5000000, // 5000000 tiyin = 50000 sum
        'UZS',
      );

      expect(paymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50000, // Converted from tiyin
        }),
      );
    });
  });

  describe('handlePreCheckoutQuery', () => {
    it('should approve valid pre-checkout query', async () => {
      const pendingOrder = {
        ...mockOrder,
        status: ClientOrderStatus.PENDING,
      };
      orderRepository.findOne.mockResolvedValue(pendingOrder as ClientOrder);
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({ ok: true, result: '' }),
      });

      const result = await service.handlePreCheckoutQuery(
        'query-123',
        JSON.stringify({ order_id: 'order-123', type: 'vending_order' }),
      );

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('answerPreCheckoutQuery'),
        expect.any(Object),
      );
    });

    it('should reject invalid payload', async () => {
      const result = await service.handlePreCheckoutQuery(
        'query-123',
        'invalid-json',
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Invalid payload');
    });

    it('should reject when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      const result = await service.handlePreCheckoutQuery(
        'query-123',
        JSON.stringify({ order_id: 'order-123', type: 'vending_order' }),
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Order not found');
    });

    it('should reject when order is no longer pending', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: ClientOrderStatus.CANCELLED,
      } as ClientOrder);

      const result = await service.handlePreCheckoutQuery(
        'query-123',
        JSON.stringify({ order_id: 'order-123', type: 'vending_order' }),
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Order is no longer available');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status for existing order', async () => {
      const paidOrder = {
        ...mockOrder,
        status: ClientOrderStatus.PAID,
        paid_at: new Date('2024-01-01'),
        provider_tx_id: 'tx-123',
      };
      orderRepository.findOne.mockResolvedValue(paidOrder as ClientOrder);

      const result = await service.getPaymentStatus('order-123');

      expect(result.status).toBe(ClientOrderStatus.PAID);
      expect(result.paid_at).toEqual(new Date('2024-01-01'));
      expect(result.provider_tx_id).toBe('tx-123');
    });

    it('should throw error when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.getPaymentStatus('order-123'))
        .rejects.toThrow('Order not found');
    });

    it('should handle null paid_at and provider_tx_id', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        paid_at: null,
        provider_tx_id: null,
      } as ClientOrder);

      const result = await service.getPaymentStatus('order-123');

      expect(result.paid_at).toBeUndefined();
      expect(result.provider_tx_id).toBeUndefined();
    });
  });

  describe('callTelegramApi (private)', () => {
    it('should call Telegram API with correct parameters', async () => {
      const pendingOrder = {
        ...mockOrder,
        status: ClientOrderStatus.PENDING,
      };
      orderRepository.findOne.mockResolvedValue(pendingOrder as ClientOrder);
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          ok: true,
          result: 'test-result',
        }),
      });

      await service.createInvoiceLink('order-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-bot-token/createInvoiceLink',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.any(String),
        },
      );
    });

    it('should throw BadRequestException on API error', async () => {
      const pendingOrder = {
        ...mockOrder,
        status: ClientOrderStatus.PENDING,
      };
      orderRepository.findOne.mockResolvedValue(pendingOrder as ClientOrder);
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          ok: false,
          description: 'Bad Request: invalid currency',
        }),
      });

      await expect(service.createInvoiceLink('order-123'))
        .rejects.toThrow(BadRequestException);
    });
  });
});
