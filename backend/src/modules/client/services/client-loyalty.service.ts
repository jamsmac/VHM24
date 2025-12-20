import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientLoyaltyAccount } from '../entities/client-loyalty-account.entity';
import {
  ClientLoyaltyLedger,
  LoyaltyTransactionReason,
} from '../entities/client-loyalty-ledger.entity';

/**
 * Client loyalty points service.
 * Handles points earning, redemption, and balance management.
 */
@Injectable()
export class ClientLoyaltyService {
  private readonly logger = new Logger(ClientLoyaltyService.name);

  // Points conversion rate: 1 point = 100 UZS
  private readonly POINTS_VALUE_UZS = 100;

  // Earn rate: 1% of purchase amount in points (1 point per 10000 UZS)
  private readonly POINTS_EARN_RATE = 0.01;

  constructor(
    @InjectRepository(ClientLoyaltyAccount)
    private readonly loyaltyAccountRepository: Repository<ClientLoyaltyAccount>,
    @InjectRepository(ClientLoyaltyLedger)
    private readonly loyaltyLedgerRepository: Repository<ClientLoyaltyLedger>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get or create loyalty account for a client
   */
  async getOrCreateAccount(clientUserId: string): Promise<ClientLoyaltyAccount> {
    let account = await this.loyaltyAccountRepository.findOne({
      where: { client_user_id: clientUserId },
    });

    if (!account) {
      account = this.loyaltyAccountRepository.create({
        client_user_id: clientUserId,
        points_balance: 0,
        lifetime_points: 0,
      });
      account = await this.loyaltyAccountRepository.save(account);
    }

    return account;
  }

  /**
   * Get loyalty balance for a client
   */
  async getBalance(clientUserId: string): Promise<{
    points_balance: number;
    lifetime_points: number;
    points_value_uzs: number;
  }> {
    const account = await this.getOrCreateAccount(clientUserId);

    return {
      points_balance: account.points_balance,
      lifetime_points: account.lifetime_points,
      points_value_uzs: account.points_balance * this.POINTS_VALUE_UZS,
    };
  }

  /**
   * Calculate points to earn for a given amount
   */
  calculatePointsToEarn(amountUzs: number): number {
    return Math.floor(amountUzs * this.POINTS_EARN_RATE);
  }

  /**
   * Calculate UZS discount for given points
   */
  calculatePointsValue(points: number): number {
    return points * this.POINTS_VALUE_UZS;
  }

  /**
   * Earn points from order
   */
  async earnPoints(
    clientUserId: string,
    points: number,
    orderId: string,
    description?: string,
  ): Promise<ClientLoyaltyLedger> {
    if (points <= 0) {
      throw new BadRequestException('Points must be positive');
    }

    return this.createTransaction(
      clientUserId,
      points,
      LoyaltyTransactionReason.ORDER_EARNED,
      orderId,
      description || 'Points earned from order',
    );
  }

  /**
   * Redeem points for order discount
   */
  async redeemPoints(
    clientUserId: string,
    points: number,
    orderId: string,
    description?: string,
  ): Promise<ClientLoyaltyLedger> {
    if (points <= 0) {
      throw new BadRequestException('Points must be positive');
    }

    const account = await this.getOrCreateAccount(clientUserId);

    if (account.points_balance < points) {
      throw new BadRequestException(
        `Insufficient points balance. Available: ${account.points_balance}, requested: ${points}`,
      );
    }

    return this.createTransaction(
      clientUserId,
      -points, // Negative for redemption
      LoyaltyTransactionReason.ORDER_REDEEMED,
      orderId,
      description || 'Points redeemed for discount',
    );
  }

  /**
   * Refund points when order is cancelled
   * This refunds points that were previously redeemed (used) for an order
   */
  async refundPoints(
    clientUserId: string,
    points: number,
    orderId: string,
    description?: string,
  ): Promise<ClientLoyaltyLedger> {
    if (points <= 0) {
      this.logger.log(`No points to refund for order ${orderId}`);
      return null as unknown as ClientLoyaltyLedger;
    }

    this.logger.log(
      `Refunding ${points} points to user ${clientUserId} for cancelled order ${orderId}`,
    );

    return this.createTransaction(
      clientUserId,
      points, // Positive to add back to balance
      LoyaltyTransactionReason.ORDER_REFUND,
      orderId,
      description || 'Points refunded due to order cancellation',
    );
  }

  /**
   * Add bonus points (promo, referral, etc.)
   */
  async addBonusPoints(
    clientUserId: string,
    points: number,
    reason: LoyaltyTransactionReason.REFERRAL_BONUS | LoyaltyTransactionReason.PROMO_BONUS,
    description: string,
  ): Promise<ClientLoyaltyLedger> {
    if (points <= 0) {
      throw new BadRequestException('Points must be positive');
    }

    return this.createTransaction(clientUserId, points, reason, null, description);
  }

  /**
   * Manual adjustment (admin only)
   */
  async adjustPoints(
    clientUserId: string,
    points: number,
    description: string,
  ): Promise<ClientLoyaltyLedger> {
    return this.createTransaction(
      clientUserId,
      points,
      LoyaltyTransactionReason.MANUAL_ADJUSTMENT,
      null,
      description,
    );
  }

  /**
   * Get loyalty transaction history
   */
  async getHistory(
    clientUserId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{
    data: ClientLoyaltyLedger[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = options;

    const [data, total] = await this.loyaltyLedgerRepository.findAndCount({
      where: { client_user_id: clientUserId },
      order: { created_at: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { data, total, page, limit };
  }

  /**
   * Create loyalty transaction with atomic balance update
   */
  private async createTransaction(
    clientUserId: string,
    delta: number,
    reason: LoyaltyTransactionReason,
    orderId: string | null,
    description: string,
  ): Promise<ClientLoyaltyLedger> {
    return this.dataSource.transaction(async (manager) => {
      const accountRepo = manager.getRepository(ClientLoyaltyAccount);
      const ledgerRepo = manager.getRepository(ClientLoyaltyLedger);

      // Lock account row for update
      const account = await accountRepo.findOne({
        where: { client_user_id: clientUserId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!account) {
        throw new BadRequestException('Loyalty account not found');
      }

      const newBalance = account.points_balance + delta;

      if (newBalance < 0) {
        throw new BadRequestException('Insufficient points balance');
      }

      // Update account balance
      account.points_balance = newBalance;
      if (delta > 0) {
        account.lifetime_points += delta;
      }
      await accountRepo.save(account);

      // Create ledger entry
      const ledgerEntry = ledgerRepo.create({
        client_user_id: clientUserId,
        delta,
        reason,
        description,
        order_id: orderId,
        balance_after: newBalance,
      });

      const savedEntry = await ledgerRepo.save(ledgerEntry);

      this.logger.log(
        `Loyalty transaction: user=${clientUserId}, delta=${delta}, reason=${reason}, balance=${newBalance}`,
      );

      return savedEntry;
    });
  }
}
