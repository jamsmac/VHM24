import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ClientLoyaltyService } from './client-loyalty.service';
import { ClientLoyaltyAccount } from '../entities/client-loyalty-account.entity';
import {
  ClientLoyaltyLedger,
  LoyaltyTransactionReason,
} from '../entities/client-loyalty-ledger.entity';

describe('ClientLoyaltyService', () => {
  let service: ClientLoyaltyService;
  let loyaltyAccountRepository: jest.Mocked<Repository<ClientLoyaltyAccount>>;
  let loyaltyLedgerRepository: jest.Mocked<Repository<ClientLoyaltyLedger>>;

  const mockClientUserId = 'client-user-123';
  const mockOrderId = 'order-456';

  const mockAccount: Partial<ClientLoyaltyAccount> = {
    id: 'account-1',
    client_user_id: mockClientUserId,
    points_balance: 1000,
    lifetime_points: 5000,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockLedgerEntry: Partial<ClientLoyaltyLedger> = {
    id: 'ledger-1',
    client_user_id: mockClientUserId,
    delta: 100,
    reason: LoyaltyTransactionReason.ORDER_REFUND,
    description: 'Points refunded',
    order_id: mockOrderId,
    balance_after: 1100,
    created_at: new Date(),
  };

  beforeEach(async () => {
    const mockAccountRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockLedgerRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
    };

    const mockEntityManager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === ClientLoyaltyAccount) {
          return {
            findOne: jest.fn().mockResolvedValue({
              ...mockAccount,
              points_balance: 1000,
            }),
            save: jest.fn().mockImplementation((acc) => Promise.resolve(acc)),
          };
        }
        if (entity === ClientLoyaltyLedger) {
          return {
            create: jest.fn().mockImplementation((data) => ({
              id: 'new-ledger-id',
              ...data,
            })),
            save: jest.fn().mockImplementation((entry) =>
              Promise.resolve({
                ...entry,
                id: entry.id || 'new-ledger-id',
                created_at: new Date(),
              }),
            ),
          };
        }
        return {};
      }),
    };

    const mockDataSource = {
      transaction: jest.fn().mockImplementation((callback) => {
        return callback(mockEntityManager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientLoyaltyService,
        {
          provide: getRepositoryToken(ClientLoyaltyAccount),
          useValue: mockAccountRepo,
        },
        {
          provide: getRepositoryToken(ClientLoyaltyLedger),
          useValue: mockLedgerRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ClientLoyaltyService>(ClientLoyaltyService);
    loyaltyAccountRepository = module.get(
      getRepositoryToken(ClientLoyaltyAccount),
    );
    loyaltyLedgerRepository = module.get(
      getRepositoryToken(ClientLoyaltyLedger),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('refundPoints', () => {
    it('should refund points successfully when order is cancelled', async () => {
      const pointsToRefund = 100;

      const result = await service.refundPoints(
        mockClientUserId,
        pointsToRefund,
        mockOrderId,
        'Points refunded for cancelled order',
      );

      expect(result).toBeDefined();
      expect(result.delta).toBe(pointsToRefund);
      expect(result.reason).toBe(LoyaltyTransactionReason.ORDER_REFUND);
      expect(result.client_user_id).toBe(mockClientUserId);
      expect(result.order_id).toBe(mockOrderId);
    });

    it('should return null when points to refund is 0', async () => {
      const result = await service.refundPoints(
        mockClientUserId,
        0,
        mockOrderId,
        'No points to refund',
      );

      // The method returns null cast as ClientLoyaltyLedger for 0 points
      expect(result).toBeNull();
    });

    it('should return null when points to refund is negative', async () => {
      const result = await service.refundPoints(
        mockClientUserId,
        -10,
        mockOrderId,
        'Negative points',
      );

      expect(result).toBeNull();
    });

    it('should use default description when none provided', async () => {
      const pointsToRefund = 50;

      const result = await service.refundPoints(
        mockClientUserId,
        pointsToRefund,
        mockOrderId,
      );

      expect(result).toBeDefined();
      expect(result.description).toBe('Points refunded due to order cancellation');
    });

    it('should add points back to balance (positive delta)', async () => {
      const pointsToRefund = 200;

      const result = await service.refundPoints(
        mockClientUserId,
        pointsToRefund,
        mockOrderId,
      );

      expect(result).toBeDefined();
      // Delta should be positive to add points back
      expect(result.delta).toBe(200);
      expect(result.balance_after).toBe(1200); // 1000 + 200
    });
  });

  describe('getBalance', () => {
    it('should return correct balance with points value in UZS', async () => {
      loyaltyAccountRepository.findOne.mockResolvedValue(
        mockAccount as ClientLoyaltyAccount,
      );

      const result = await service.getBalance(mockClientUserId);

      expect(result).toEqual({
        points_balance: 1000,
        lifetime_points: 5000,
        points_value_uzs: 100000, // 1000 points * 100 UZS per point
      });
    });

    it('should create account if not exists', async () => {
      loyaltyAccountRepository.findOne.mockResolvedValue(null);
      loyaltyAccountRepository.create.mockReturnValue({
        client_user_id: mockClientUserId,
        points_balance: 0,
        lifetime_points: 0,
      } as ClientLoyaltyAccount);
      loyaltyAccountRepository.save.mockResolvedValue({
        id: 'new-account',
        client_user_id: mockClientUserId,
        points_balance: 0,
        lifetime_points: 0,
      } as ClientLoyaltyAccount);

      const result = await service.getBalance(mockClientUserId);

      expect(result.points_balance).toBe(0);
      expect(result.lifetime_points).toBe(0);
      expect(result.points_value_uzs).toBe(0);
    });
  });

  describe('calculatePointsToEarn', () => {
    it('should calculate 1% of purchase amount', () => {
      // 1% of 10000 UZS = 100 points
      expect(service.calculatePointsToEarn(10000)).toBe(100);
      // 1% of 50000 UZS = 500 points
      expect(service.calculatePointsToEarn(50000)).toBe(500);
      // 1% of 999 UZS = 9 points (floored)
      expect(service.calculatePointsToEarn(999)).toBe(9);
    });

    it('should return 0 for amounts less than 100 UZS', () => {
      expect(service.calculatePointsToEarn(50)).toBe(0);
      expect(service.calculatePointsToEarn(99)).toBe(0);
    });
  });

  describe('calculatePointsValue', () => {
    it('should calculate UZS value at 100 UZS per point', () => {
      expect(service.calculatePointsValue(10)).toBe(1000);
      expect(service.calculatePointsValue(100)).toBe(10000);
      expect(service.calculatePointsValue(0)).toBe(0);
    });
  });

  describe('earnPoints', () => {
    it('should earn points from order', async () => {
      const pointsToEarn = 150;

      const result = await service.earnPoints(
        mockClientUserId,
        pointsToEarn,
        mockOrderId,
        'Points earned from purchase',
      );

      expect(result).toBeDefined();
      expect(result.delta).toBe(pointsToEarn);
      expect(result.reason).toBe(LoyaltyTransactionReason.ORDER_EARNED);
    });

    it('should throw BadRequestException for zero points', async () => {
      await expect(
        service.earnPoints(mockClientUserId, 0, mockOrderId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative points', async () => {
      await expect(
        service.earnPoints(mockClientUserId, -10, mockOrderId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('redeemPoints', () => {
    it('should redeem points for discount', async () => {
      loyaltyAccountRepository.findOne.mockResolvedValue({
        ...mockAccount,
        points_balance: 500,
      } as ClientLoyaltyAccount);

      const pointsToRedeem = 200;

      const result = await service.redeemPoints(
        mockClientUserId,
        pointsToRedeem,
        mockOrderId,
        'Discount on order',
      );

      expect(result).toBeDefined();
      expect(result.delta).toBe(-pointsToRedeem); // Negative for redemption
      expect(result.reason).toBe(LoyaltyTransactionReason.ORDER_REDEEMED);
    });

    it('should throw BadRequestException for zero points', async () => {
      await expect(
        service.redeemPoints(mockClientUserId, 0, mockOrderId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative points', async () => {
      await expect(
        service.redeemPoints(mockClientUserId, -10, mockOrderId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getHistory', () => {
    it('should return paginated history', async () => {
      const mockHistory = [
        { ...mockLedgerEntry, id: 'ledger-1' },
        { ...mockLedgerEntry, id: 'ledger-2' },
      ];

      loyaltyLedgerRepository.findAndCount.mockResolvedValue([
        mockHistory as ClientLoyaltyLedger[],
        2,
      ]);

      const result = await service.getHistory(mockClientUserId, {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        data: mockHistory,
        total: 2,
        page: 1,
        limit: 10,
      });
    });

    it('should use default pagination values', async () => {
      loyaltyLedgerRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getHistory(mockClientUserId);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('addBonusPoints', () => {
    it('should add referral bonus points', async () => {
      const bonusPoints = 500;

      const result = await service.addBonusPoints(
        mockClientUserId,
        bonusPoints,
        LoyaltyTransactionReason.REFERRAL_BONUS,
        'Welcome bonus for referral',
      );

      expect(result).toBeDefined();
      expect(result.delta).toBe(bonusPoints);
      expect(result.reason).toBe(LoyaltyTransactionReason.REFERRAL_BONUS);
    });

    it('should add promo bonus points', async () => {
      const bonusPoints = 100;

      const result = await service.addBonusPoints(
        mockClientUserId,
        bonusPoints,
        LoyaltyTransactionReason.PROMO_BONUS,
        'Holiday promotion bonus',
      );

      expect(result).toBeDefined();
      expect(result.delta).toBe(bonusPoints);
      expect(result.reason).toBe(LoyaltyTransactionReason.PROMO_BONUS);
    });

    it('should throw BadRequestException for zero bonus', async () => {
      await expect(
        service.addBonusPoints(
          mockClientUserId,
          0,
          LoyaltyTransactionReason.PROMO_BONUS,
          'Zero bonus',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('adjustPoints', () => {
    it('should make manual adjustment (add)', async () => {
      const result = await service.adjustPoints(
        mockClientUserId,
        100,
        'Manual adjustment for customer service issue',
      );

      expect(result).toBeDefined();
      expect(result.delta).toBe(100);
      expect(result.reason).toBe(LoyaltyTransactionReason.MANUAL_ADJUSTMENT);
    });

    it('should make manual adjustment (subtract)', async () => {
      const result = await service.adjustPoints(
        mockClientUserId,
        -50,
        'Correction for incorrect bonus',
      );

      expect(result).toBeDefined();
      expect(result.delta).toBe(-50);
      expect(result.reason).toBe(LoyaltyTransactionReason.MANUAL_ADJUSTMENT);
    });
  });
});
