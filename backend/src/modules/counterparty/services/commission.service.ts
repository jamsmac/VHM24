import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Contract, CommissionType, TieredCommissionTier } from '../entities/contract.entity';
import { CommissionCalculation, PaymentStatus } from '../entities/commission-calculation.entity';
import { add, differenceInDays } from 'date-fns';

/**
 * Commission Calculation Result
 */
export interface CommissionCalculationResult {
  total_revenue: number; // Общий оборот
  transaction_count: number; // Количество транзакций
  commission_amount: number; // Сумма комиссии
  commission_type: string; // Тип комиссии
  calculation_details: Record<string, any>; // Детали расчета
}

/**
 * Commission Service
 *
 * Handles commission calculations for different contract types:
 * - PERCENTAGE: Simple percentage of revenue
 * - FIXED: Fixed amount per period
 * - TIERED: Progressive rates based on revenue tiers
 * - HYBRID: Combination of fixed + percentage
 */
@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(CommissionCalculation)
    private readonly calculationRepository: Repository<CommissionCalculation>,
  ) {}

  /**
   * Calculate commission for a contract based on revenue
   *
   * @param contract Contract entity with commission settings
   * @param revenue Total revenue for the period (UZS)
   * @param periodStart Start of calculation period
   * @param periodEnd End of calculation period
   * @param transactionCount Optional number of transactions (for record-keeping)
   * @returns Calculation result
   */
  async calculateCommission(
    contract: Contract,
    revenue: number,
    periodStart: Date,
    periodEnd: Date,
    transactionCount: number = 0,
  ): Promise<CommissionCalculationResult> {
    if (revenue < 0) {
      throw new BadRequestException('Revenue cannot be negative');
    }

    let commissionAmount = 0;
    let calculationDetails: Record<string, any> = {};

    switch (contract.commission_type) {
      case CommissionType.PERCENTAGE:
        ({ commissionAmount, calculationDetails } = this.calculatePercentageCommission(
          revenue,
          contract.commission_rate,
        ));
        break;

      case CommissionType.FIXED:
        ({ commissionAmount, calculationDetails } = this.calculateFixedCommission(
          contract.commission_fixed_amount,
          contract.commission_fixed_period,
          periodStart,
          periodEnd,
        ));
        break;

      case CommissionType.TIERED:
        ({ commissionAmount, calculationDetails } = this.calculateTieredCommission(
          revenue,
          contract.commission_tiers,
        ));
        break;

      case CommissionType.HYBRID:
        ({ commissionAmount, calculationDetails } = this.calculateHybridCommission(
          revenue,
          contract.commission_hybrid_fixed,
          contract.commission_hybrid_rate,
          periodStart,
          periodEnd,
        ));
        break;

      default:
        throw new BadRequestException(`Unknown commission type: ${contract.commission_type}`);
    }

    // Round to 2 decimal places (UZS has no smaller denominations than tiyin)
    commissionAmount = Math.round(commissionAmount * 100) / 100;

    return {
      total_revenue: revenue,
      transaction_count: transactionCount,
      commission_amount: commissionAmount,
      commission_type: contract.commission_type,
      calculation_details: calculationDetails,
    };
  }

  /**
   * Calculate PERCENTAGE commission
   * Formula: revenue * (rate / 100)
   *
   * @example
   * Revenue: 10,000,000 UZS, Rate: 15%
   * Commission: 10,000,000 * 0.15 = 1,500,000 UZS
   */
  private calculatePercentageCommission(
    revenue: number,
    rate: number | null,
  ): { commissionAmount: number; calculationDetails: Record<string, any> } {
    if (rate === null || rate === undefined) {
      throw new BadRequestException('Commission rate is required for PERCENTAGE type');
    }

    if (rate < 0 || rate > 100) {
      throw new BadRequestException('Commission rate must be between 0 and 100');
    }

    const commissionAmount = revenue * (rate / 100);

    return {
      commissionAmount,
      calculationDetails: {
        formula: 'revenue * (rate / 100)',
        revenue,
        rate,
        calculation: `${revenue.toLocaleString()} * ${rate}% = ${commissionAmount.toLocaleString()} UZS`,
      },
    };
  }

  /**
   * Calculate FIXED commission
   * Returns fixed amount, optionally prorated for partial periods
   *
   * @example
   * Fixed: 5,000,000 UZS/month, Period: 15 days
   * Commission: 5,000,000 * (15/30) = 2,500,000 UZS (prorated)
   */
  private calculateFixedCommission(
    fixedAmount: number | null,
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | null,
    periodStart: Date,
    periodEnd: Date,
  ): { commissionAmount: number; calculationDetails: Record<string, any> } {
    if (fixedAmount === null || fixedAmount === undefined) {
      throw new BadRequestException('Fixed amount is required for FIXED type');
    }

    if (fixedAmount < 0) {
      throw new BadRequestException('Fixed amount cannot be negative');
    }

    if (!period) {
      throw new BadRequestException('Fixed period is required for FIXED type');
    }

    const daysInPeriod = differenceInDays(periodEnd, periodStart) + 1;
    let expectedDays = 30; // Default to monthly

    switch (period) {
      case 'daily':
        expectedDays = 1;
        break;
      case 'weekly':
        expectedDays = 7;
        break;
      case 'monthly':
        expectedDays = 30;
        break;
      case 'quarterly':
        expectedDays = 90;
        break;
    }

    // Prorate if actual period differs from expected
    const prorataFactor = daysInPeriod / expectedDays;
    const commissionAmount = fixedAmount * prorataFactor;

    return {
      commissionAmount,
      calculationDetails: {
        formula: 'fixedAmount * (actualDays / expectedDays)',
        fixed_amount: fixedAmount,
        period,
        expected_days: expectedDays,
        actual_days: daysInPeriod,
        prorata_factor: prorataFactor,
        calculation: `${fixedAmount.toLocaleString()} * (${daysInPeriod} / ${expectedDays}) = ${commissionAmount.toLocaleString()} UZS`,
      },
    };
  }

  /**
   * Calculate TIERED commission
   * Progressive rates for different revenue brackets
   *
   * @example
   * Tiers: [0-10M: 10%, 10M-50M: 12%, 50M+: 15%]
   * Revenue: 60,000,000 UZS
   * Commission: (10M * 10%) + (40M * 12%) + (10M * 15%) = 1M + 4.8M + 1.5M = 7.3M UZS
   */
  private calculateTieredCommission(
    revenue: number,
    tiers: TieredCommissionTier[] | null,
  ): { commissionAmount: number; calculationDetails: Record<string, any> } {
    if (!tiers || tiers.length === 0) {
      throw new BadRequestException('Commission tiers are required for TIERED type');
    }

    // Sort tiers by 'from' value
    const sortedTiers = [...tiers].sort((a, b) => a.from - b.from);

    let totalCommission = 0;
    const tierBreakdown: Array<{ tier: string; rate: number; revenue_in_tier: number; commission: number; calculation: string }> = [];

    for (const tier of sortedTiers) {
      const tierStart = tier.from;
      const tierEnd = tier.to || Infinity;

      if (revenue <= tierStart) {
        // Revenue doesn't reach this tier
        break;
      }

      // Calculate revenue in this tier
      const revenueInTier = Math.min(revenue, tierEnd) - tierStart;

      if (revenueInTier > 0) {
        const tierCommission = revenueInTier * (tier.rate / 100);
        totalCommission += tierCommission;

        tierBreakdown.push({
          tier: `${tierStart.toLocaleString()} - ${tier.to ? tierEnd.toLocaleString() : '∞'}`,
          rate: tier.rate,
          revenue_in_tier: revenueInTier,
          commission: tierCommission,
          calculation: `${revenueInTier.toLocaleString()} * ${tier.rate}% = ${tierCommission.toLocaleString()} UZS`,
        });
      }
    }

    return {
      commissionAmount: totalCommission,
      calculationDetails: {
        formula: 'sum of (revenue_in_tier * tier_rate) for each tier',
        total_revenue: revenue,
        tiers: tierBreakdown,
        total_commission: totalCommission,
      },
    };
  }

  /**
   * Calculate HYBRID commission
   * Combination of fixed amount + percentage of revenue
   *
   * @example
   * Fixed: 1,000,000 UZS/month, Rate: 5%
   * Revenue: 20,000,000 UZS
   * Commission: 1,000,000 + (20,000,000 * 5%) = 2,000,000 UZS
   */
  private calculateHybridCommission(
    revenue: number,
    fixedAmount: number | null,
    rate: number | null,
    periodStart: Date,
    periodEnd: Date,
  ): { commissionAmount: number; calculationDetails: Record<string, any> } {
    if (fixedAmount === null || fixedAmount === undefined) {
      throw new BadRequestException('Fixed amount is required for HYBRID type');
    }

    if (rate === null || rate === undefined) {
      throw new BadRequestException('Commission rate is required for HYBRID type');
    }

    // Calculate fixed part (prorated for monthly)
    const daysInPeriod = differenceInDays(periodEnd, periodStart) + 1;
    const prorataFactor = daysInPeriod / 30;
    const proratedFixed = fixedAmount * prorataFactor;

    // Calculate percentage part
    const percentagePart = revenue * (rate / 100);

    const totalCommission = proratedFixed + percentagePart;

    return {
      commissionAmount: totalCommission,
      calculationDetails: {
        formula: '(fixedAmount * prorata) + (revenue * rate)',
        fixed_amount: fixedAmount,
        prorated_fixed: proratedFixed,
        prorata_days: daysInPeriod,
        percentage_rate: rate,
        revenue,
        percentage_part: percentagePart,
        total_commission: totalCommission,
        calculation: `${proratedFixed.toLocaleString()} + ${percentagePart.toLocaleString()} = ${totalCommission.toLocaleString()} UZS`,
      },
    };
  }

  /**
   * Create and save commission calculation record
   */
  async createCalculationRecord(
    contractId: string,
    periodStart: Date,
    periodEnd: Date,
    totalRevenue: number,
    transactionCount: number,
    calculationResult: CommissionCalculationResult,
    calculatedByUserId?: string,
  ): Promise<CommissionCalculation> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
    });

    if (!contract) {
      throw new BadRequestException(`Contract ${contractId} not found`);
    }

    // Calculate payment due date
    const paymentDueDate = add(periodEnd, { days: contract.payment_term_days });

    const calculation = this.calculationRepository.create({
      contract_id: contractId,
      period_start: periodStart,
      period_end: periodEnd,
      total_revenue: totalRevenue,
      transaction_count: transactionCount,
      commission_amount: calculationResult.commission_amount,
      commission_type: calculationResult.commission_type,
      calculation_details: calculationResult.calculation_details,
      payment_status: PaymentStatus.PENDING,
      payment_due_date: paymentDueDate,
      calculated_by_user_id: calculatedByUserId || null,
    });

    const saved = await this.calculationRepository.save(calculation);

    this.logger.log(
      `Created commission calculation ${saved.id} for contract ${contractId}: ` +
        `${calculationResult.commission_amount.toLocaleString()} UZS`,
    );

    return saved;
  }

  /**
   * Get commission calculations for a contract
   */
  async getCalculationsForContract(
    contractId: string,
    periodStart?: Date,
    periodEnd?: Date,
  ): Promise<CommissionCalculation[]> {
    const query = this.calculationRepository
      .createQueryBuilder('calc')
      .where('calc.contract_id = :contractId', { contractId })
      .orderBy('calc.period_start', 'DESC');

    if (periodStart && periodEnd) {
      query.andWhere({
        period_start: Between(periodStart, periodEnd),
      });
    }

    return query.getMany();
  }

  /**
   * Mark commission as paid
   */
  async markAsPaid(
    calculationId: string,
    paymentTransactionId: string,
    paymentDate?: Date,
  ): Promise<CommissionCalculation> {
    const calculation = await this.calculationRepository.findOne({
      where: { id: calculationId },
    });

    if (!calculation) {
      throw new BadRequestException(`Calculation ${calculationId} not found`);
    }

    calculation.payment_status = PaymentStatus.PAID;
    calculation.payment_date = paymentDate || new Date();
    calculation.payment_transaction_id = paymentTransactionId;

    return this.calculationRepository.save(calculation);
  }
}
