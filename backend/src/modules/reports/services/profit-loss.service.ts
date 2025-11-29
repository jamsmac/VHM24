import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  Transaction,
  TransactionType,
  ExpenseCategory,
} from '../../transactions/entities/transaction.entity';

export interface ProfitLossReport {
  period: {
    start_date: Date;
    end_date: Date;
  };
  revenue: {
    sales: number;
    other_income: number;
    total_revenue: number;
  };
  expenses: {
    rent: number;
    purchase: number;
    repair: number;
    salary: number;
    utilities: number;
    depreciation: number;
    writeoff: number;
    other: number;
    total_expenses: number;
  };
  profit: {
    gross_profit: number;
    operating_profit: number;
    net_profit: number;
    profit_margin_percent: number;
  };
  generated_at: Date;
}

@Injectable()
export class ProfitLossService {
  private readonly logger = new Logger(ProfitLossService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async generateReport(startDate: Date, endDate: Date): Promise<ProfitLossReport> {
    this.logger.log(
      'Generating P&L report for period: ' +
        startDate.toISOString() +
        ' to ' +
        endDate.toISOString(),
    );

    const transactions = await this.transactionRepository.find({
      where: {
        transaction_date: Between(startDate, endDate),
      },
    });

    // Calculate revenue
    const salesTransactions = transactions.filter(
      (t) => t.transaction_type === TransactionType.SALE,
    );
    const sales = salesTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const otherIncome = 0; // Can be extended for other income types
    const totalRevenue = sales + otherIncome;

    // Calculate expenses by category
    const expenseTransactions = transactions.filter(
      (t) => t.transaction_type === TransactionType.EXPENSE,
    );

    const rent = expenseTransactions
      .filter((t) => t.expense_category === ExpenseCategory.RENT)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const purchase = expenseTransactions
      .filter((t) => t.expense_category === ExpenseCategory.PURCHASE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const repair = expenseTransactions
      .filter((t) => t.expense_category === ExpenseCategory.REPAIR)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const salary = expenseTransactions
      .filter((t) => t.expense_category === ExpenseCategory.SALARY)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const utilities = expenseTransactions
      .filter((t) => t.expense_category === ExpenseCategory.UTILITIES)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const depreciation = expenseTransactions
      .filter((t) => t.expense_category === ExpenseCategory.DEPRECIATION)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const writeoff = expenseTransactions
      .filter((t) => t.expense_category === ExpenseCategory.WRITEOFF)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const other = expenseTransactions
      .filter((t) => t.expense_category === ExpenseCategory.OTHER || !t.expense_category)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses =
      rent + purchase + repair + salary + utilities + depreciation + writeoff + other;

    // Calculate profit metrics
    const grossProfit = sales - purchase; // Sales minus cost of goods sold
    const operatingProfit = totalRevenue - (rent + repair + salary + utilities + other); // Before depreciation/writeoff
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      revenue: {
        sales,
        other_income: otherIncome,
        total_revenue: totalRevenue,
      },
      expenses: {
        rent,
        purchase,
        repair,
        salary,
        utilities,
        depreciation,
        writeoff,
        other,
        total_expenses: totalExpenses,
      },
      profit: {
        gross_profit: grossProfit,
        operating_profit: operatingProfit,
        net_profit: netProfit,
        profit_margin_percent: profitMargin,
      },
      generated_at: new Date(),
    };
  }
}
