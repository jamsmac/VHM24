import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
} from '../../transactions/entities/transaction.entity';

export interface CashFlowReport {
  period: {
    start_date: Date;
    end_date: Date;
  };
  cash_inflows: {
    cash_sales: number;
    card_sales: number;
    mobile_sales: number;
    qr_sales: number;
    collections: number;
    total_inflows: number;
  };
  cash_outflows: {
    expenses: number;
    refunds: number;
    total_outflows: number;
  };
  net_cash_flow: number;
  cash_position: {
    opening_balance: number; // Would need to be tracked separately
    closing_balance: number;
  };
  payment_breakdown: Array<{
    payment_method: string;
    amount: number;
    transaction_count: number;
    percentage: number;
  }>;
  generated_at: Date;
}

@Injectable()
export class CashFlowService {
  private readonly logger = new Logger(CashFlowService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async generateReport(startDate: Date, endDate: Date): Promise<CashFlowReport> {
    this.logger.log(
      'Generating Cash Flow report for period: ' +
        startDate.toISOString() +
        ' to ' +
        endDate.toISOString(),
    );

    const transactions = await this.transactionRepository.find({
      where: {
        transaction_date: Between(startDate, endDate),
      },
    });

    // Cash Inflows
    const salesTransactions = transactions.filter(
      (t) => t.transaction_type === TransactionType.SALE,
    );

    const cashSales = salesTransactions
      .filter((t) => t.payment_method === PaymentMethod.CASH)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const cardSales = salesTransactions
      .filter((t) => t.payment_method === PaymentMethod.CARD)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const mobileSales = salesTransactions
      .filter((t) => t.payment_method === PaymentMethod.MOBILE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const qrSales = salesTransactions
      .filter((t) => t.payment_method === PaymentMethod.QR)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const collections = transactions
      .filter((t) => t.transaction_type === TransactionType.COLLECTION)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalInflows = cashSales + cardSales + mobileSales + qrSales + collections;

    // Cash Outflows
    const expenses = transactions
      .filter((t) => t.transaction_type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const refunds = transactions
      .filter((t) => t.transaction_type === TransactionType.REFUND)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalOutflows = expenses + refunds;

    // Net cash flow
    const netCashFlow = totalInflows - totalOutflows;

    // Payment breakdown
    const paymentBreakdown = [
      {
        payment_method: 'CASH',
        amount: cashSales,
        transaction_count: salesTransactions.filter((t) => t.payment_method === PaymentMethod.CASH)
          .length,
        percentage: totalInflows > 0 ? (cashSales / totalInflows) * 100 : 0,
      },
      {
        payment_method: 'CARD',
        amount: cardSales,
        transaction_count: salesTransactions.filter((t) => t.payment_method === PaymentMethod.CARD)
          .length,
        percentage: totalInflows > 0 ? (cardSales / totalInflows) * 100 : 0,
      },
      {
        payment_method: 'MOBILE',
        amount: mobileSales,
        transaction_count: salesTransactions.filter(
          (t) => t.payment_method === PaymentMethod.MOBILE,
        ).length,
        percentage: totalInflows > 0 ? (mobileSales / totalInflows) * 100 : 0,
      },
      {
        payment_method: 'QR',
        amount: qrSales,
        transaction_count: salesTransactions.filter((t) => t.payment_method === PaymentMethod.QR)
          .length,
        percentage: totalInflows > 0 ? (qrSales / totalInflows) * 100 : 0,
      },
    ];

    return {
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      cash_inflows: {
        cash_sales: cashSales,
        card_sales: cardSales,
        mobile_sales: mobileSales,
        qr_sales: qrSales,
        collections,
        total_inflows: totalInflows,
      },
      cash_outflows: {
        expenses,
        refunds,
        total_outflows: totalOutflows,
      },
      net_cash_flow: netCashFlow,
      cash_position: {
        opening_balance: 0, // Would need to be calculated from previous period
        closing_balance: netCashFlow, // Simplified - would add opening balance
      },
      payment_breakdown: paymentBreakdown,
      generated_at: new Date(),
    };
  }
}
