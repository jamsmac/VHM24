import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

// Mock Twilio
jest.mock('twilio', () => {
  const mockMessages = {
    create: jest.fn(),
  };
  const mockAccounts = jest.fn().mockReturnValue({
    fetch: jest.fn(),
  });
  const mockApi = {
    accounts: mockAccounts,
  };
  return {
    Twilio: jest.fn().mockImplementation(() => ({
      messages: mockMessages,
      api: mockApi,
    })),
  };
});

describe('SmsService', () => {
  let service: SmsService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigValues: Record<string, string | undefined> = {
    TWILIO_ACCOUNT_SID: 'AC1234567890abcdef',
    TWILIO_AUTH_TOKEN: 'auth_token_123',
    TWILIO_PHONE_NUMBER: '+15551234567',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    configService = {
      get: jest.fn((key: string, defaultValue?: string) => mockConfigValues[key] ?? defaultValue),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be ready when properly configured', () => {
      expect(service.isReady()).toBe(true);
    });

    it('should not be ready when credentials are missing', async () => {
      const incompleteConfig: Record<string, string | undefined> = {
        TWILIO_ACCOUNT_SID: undefined,
        TWILIO_AUTH_TOKEN: undefined,
        TWILIO_PHONE_NUMBER: undefined,
      };

      const mockIncompleteConfigService = {
        get: jest.fn(
          (key: string, defaultValue?: string) => incompleteConfig[key] ?? defaultValue ?? '',
        ),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsService,
          {
            provide: ConfigService,
            useValue: mockIncompleteConfigService,
          },
        ],
      }).compile();

      const unconfiguredService = module.get<SmsService>(SmsService);
      expect(unconfiguredService.isReady()).toBe(false);
    });
  });

  describe('send', () => {
    it('should send SMS successfully', async () => {
      const mockMessageResponse = {
        sid: 'SM1234567890',
        status: 'queued',
        numSegments: '1',
      };

      // Access the mocked Twilio client
      const twilioClient = (service as any).client;
      twilioClient.messages.create.mockResolvedValue(mockMessageResponse);

      const result = await service.send({
        to: '+79001234567',
        message: 'Test message',
      });

      expect(result).toEqual({
        messageId: 'SM1234567890',
        to: '+79001234567',
        status: 'queued',
        segmentCount: 1,
      });

      expect(twilioClient.messages.create).toHaveBeenCalledWith({
        to: '+79001234567',
        from: '+15551234567',
        body: 'Test message',
      });
    });

    it('should use custom from number when provided', async () => {
      const mockMessageResponse = {
        sid: 'SM1234567890',
        status: 'queued',
        numSegments: '1',
      };

      const twilioClient = (service as any).client;
      twilioClient.messages.create.mockResolvedValue(mockMessageResponse);

      await service.send({
        to: '+79001234567',
        message: 'Test message',
        from: '+15559876543',
      });

      expect(twilioClient.messages.create).toHaveBeenCalledWith({
        to: '+79001234567',
        from: '+15559876543',
        body: 'Test message',
      });
    });

    it('should throw error when Twilio fails', async () => {
      const twilioClient = (service as any).client;
      twilioClient.messages.create.mockRejectedValue(new Error('Twilio error'));

      await expect(
        service.send({
          to: '+79001234567',
          message: 'Test message',
        }),
      ).rejects.toThrow('Failed to send SMS: Twilio error');
    });

    it('should throw error when service not configured', async () => {
      // Create unconfigured service
      const mockIncompleteConfigService = {
        get: jest.fn(() => undefined),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsService,
          {
            provide: ConfigService,
            useValue: mockIncompleteConfigService,
          },
        ],
      }).compile();

      const unconfiguredService = module.get<SmsService>(SmsService);

      await expect(
        unconfiguredService.send({
          to: '+79001234567',
          message: 'Test message',
        }),
      ).rejects.toThrow('SMS service not configured');
    });
  });

  describe('sendSimple', () => {
    it('should return true on successful send', async () => {
      const twilioClient = (service as any).client;
      twilioClient.messages.create.mockResolvedValue({
        sid: 'SM123',
        status: 'queued',
        numSegments: '1',
      });

      const result = await service.sendSimple('+79001234567', 'Hello');
      expect(result).toBe(true);
    });

    it('should return false on failure', async () => {
      const twilioClient = (service as any).client;
      twilioClient.messages.create.mockRejectedValue(new Error('Failed'));

      const result = await service.sendSimple('+79001234567', 'Hello');
      expect(result).toBe(false);
    });
  });

  describe('sendBulk', () => {
    it('should send to multiple recipients', async () => {
      const twilioClient = (service as any).client;
      twilioClient.messages.create.mockResolvedValue({
        sid: 'SM123',
        status: 'queued',
        numSegments: '1',
      });

      const result = await service.sendBulk({
        to: ['+79001234567', '+79009876543'],
        message: 'Bulk message',
      });

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should handle partial failures', async () => {
      const twilioClient = (service as any).client;
      twilioClient.messages.create
        .mockResolvedValueOnce({
          sid: 'SM123',
          status: 'queued',
          numSegments: '1',
        })
        .mockRejectedValueOnce(new Error('Failed'));

      const result = await service.sendBulk({
        to: ['+79001234567', '+79009876543'],
        message: 'Bulk message',
      });

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('sendVerificationCode', () => {
    it('should send verification code message', async () => {
      const twilioClient = (service as any).client;
      twilioClient.messages.create.mockResolvedValue({
        sid: 'SM123',
        status: 'queued',
        numSegments: '1',
      });

      const result = await service.sendVerificationCode('+79001234567', '123456');

      expect(result).toBe(true);
      expect(twilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('123456'),
        }),
      );
    });
  });

  describe('sendTaskNotification', () => {
    it('should send task notification with formatted date', async () => {
      const twilioClient = (service as any).client;
      twilioClient.messages.create.mockResolvedValue({
        sid: 'SM123',
        status: 'queued',
        numSegments: '1',
      });

      const dueDate = new Date('2025-01-20T14:30:00');
      const result = await service.sendTaskNotification(
        '+79001234567',
        'REFILL',
        'M-001',
        dueDate,
      );

      expect(result).toBe(true);
      expect(twilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('M-001'),
        }),
      );
    });
  });

  describe('sendUrgentAlert', () => {
    it('should send urgent alert with prefix', async () => {
      const twilioClient = (service as any).client;
      twilioClient.messages.create.mockResolvedValue({
        sid: 'SM123',
        status: 'queued',
        numSegments: '1',
      });

      const result = await service.sendUrgentAlert('+79001234567', 'Critical issue!');

      expect(result).toBe(true);
      expect(twilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('[URGENT]'),
        }),
      );
    });
  });

  describe('getAccountInfo', () => {
    it('should return account info when configured', async () => {
      const twilioClient = (service as any).client;
      twilioClient.api.accounts.mockReturnValue({
        fetch: jest.fn().mockResolvedValue({
          sid: 'AC123',
          friendlyName: 'Test Account',
          status: 'active',
        }),
      });

      const result = await service.getAccountInfo();

      expect(result).toEqual({
        accountSid: 'AC123',
        friendlyName: 'Test Account',
        status: 'active',
      });
    });

    it('should return null when not configured', async () => {
      const mockIncompleteConfigService = {
        get: jest.fn(() => undefined),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsService,
          {
            provide: ConfigService,
            useValue: mockIncompleteConfigService,
          },
        ],
      }).compile();

      const unconfiguredService = module.get<SmsService>(SmsService);
      const result = await unconfiguredService.getAccountInfo();

      expect(result).toBeNull();
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate correct E.164 format', () => {
      expect(SmsService.isValidPhoneNumber('+79001234567')).toBe(true);
      expect(SmsService.isValidPhoneNumber('+15551234567')).toBe(true);
      expect(SmsService.isValidPhoneNumber('+447911123456')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(SmsService.isValidPhoneNumber('79001234567')).toBe(false);
      expect(SmsService.isValidPhoneNumber('+0123456789')).toBe(false);
      expect(SmsService.isValidPhoneNumber('invalid')).toBe(false);
      expect(SmsService.isValidPhoneNumber('')).toBe(false);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format Russian numbers starting with 8', () => {
      expect(SmsService.formatPhoneNumber('89001234567')).toBe('+79001234567');
    });

    it('should format Russian numbers starting with 7', () => {
      expect(SmsService.formatPhoneNumber('79001234567')).toBe('+79001234567');
    });

    it('should format 10-digit Russian numbers', () => {
      expect(SmsService.formatPhoneNumber('9001234567')).toBe('+79001234567');
    });

    it('should keep valid E.164 numbers unchanged', () => {
      expect(SmsService.formatPhoneNumber('+79001234567')).toBe('+79001234567');
    });

    it('should remove non-digit characters', () => {
      expect(SmsService.formatPhoneNumber('+7 (900) 123-45-67')).toBe('+79001234567');
    });

    it('should return null for invalid numbers', () => {
      expect(SmsService.formatPhoneNumber('123')).toBeNull();
      expect(SmsService.formatPhoneNumber('invalid')).toBeNull();
    });
  });
});
