import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '@modules/transactions/entities/transaction.entity';
import { Nomenclature } from '@modules/nomenclature/entities/nomenclature.entity';

export interface ProductSalesReport {
  product: {
    id: string;
    name: string;
    category: string;
    type: string;
    sale_price: number;
    purchase_price: number;
  };
  period: {
    start_date: Date;
    end_date: Date;
  };
  sales: {
    total_quantity: number;
    total_revenue: number;
    total_cost: number;
    gross_profit: number;
    profit_margin: number;
    average_price: number;
  };
  by_machine: Array<{
    machine_number: string;
    machine_name: string;
    location_name: string;
    quantity: number;
    revenue: number;
    contribution_percentage: number;
  }>;
  by_payment_method: Array<{
    payment_method: string;
    quantity: number;
    revenue: number;
    percentage: number;
  }>;
  daily_trend: Array<{
    date: string;
    quantity: number;
    revenue: number;
  }>;
  generated_at: Date;
}

export interface AllProductsSalesReport {
  period: {
    start_date: Date;
    end_date: Date;
  };
  summary: {
    total_products: number;
    total_quantity_sold: number;
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    average_margin: number;
  };
  products: Array<{
    product_name: string;
    category: string;
    quantity_sold: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    contribution_percentage: number;
  }>;
  top_performers: Array<{
    product_name: string;
    revenue: number;
    quantity: number;
  }>;
  low_performers: Array<{
    product_name: string;
    revenue: number;
    quantity: number;
  }>;
  generated_at: Date;
}

@Injectable()
export class ProductSalesService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Nomenclature)
    private readonly nomenclatureRepository: Repository<Nomenclature>,
  ) {}

  /**
   * Generate sales report for a specific product
   */
  async generateProductReport(
    productId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProductSalesReport> {
    const product = await this.nomenclatureRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const [sales, byMachine, byPaymentMethod, dailyTrend] = await Promise.all([
      this.getSalesData(product.name, startDate, endDate),
      this.getSalesByMachine(product.name, startDate, endDate),
      this.getSalesByPaymentMethod(product.name, startDate, endDate),
      this.getDailyTrend(product.name, startDate, endDate),
    ]);

    return {
      product: {
        id: product.id,
        name: product.name,
        category: product.category_code,
        type: product.unit_of_measure_code, // Using unit_of_measure as type proxy since type doesn't exist
        sale_price: product.selling_price || 0,
        purchase_price: product.purchase_price || 0,
      },
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      sales,
      by_machine: byMachine,
      by_payment_method: byPaymentMethod,
      daily_trend: dailyTrend,
      generated_at: new Date(),
    };
  }

  /**
   * Generate sales report for all products
   */
  async generateAllProductsReport(startDate: Date, endDate: Date): Promise<AllProductsSalesReport> {
    const productsRaw = await this.transactionRepository
      .createQueryBuilder('t')
      .select('t.product_name', 'product_name')
      .addSelect('SUM(t.quantity)', 'quantity_sold')
      .addSelect('SUM(t.amount)', 'revenue')
      .where('t.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('t.product_name')
      .getRawMany();

    const totalRevenue = productsRaw.reduce((sum, p) => sum + parseFloat(p.revenue), 0);

    // Enrich with product details and calculate cost
    const products = await Promise.all(
      productsRaw.map(async (item) => {
        const product = await this.nomenclatureRepository.findOne({
          where: { name: item.product_name },
        });

        const quantity = parseInt(item.quantity_sold);
        const revenue = parseFloat(item.revenue);
        const cost = product ? (product.purchase_price || 0) * quantity : 0;
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        return {
          product_name: item.product_name,
          category: product?.category_code || 'Unknown',
          quantity_sold: quantity,
          revenue,
          cost,
          profit,
          margin,
          contribution_percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
        };
      }),
    );

    // Sort by revenue
    products.sort((a, b) => b.revenue - a.revenue);

    const summary = {
      total_products: products.length,
      total_quantity_sold: products.reduce((sum, p) => sum + p.quantity_sold, 0),
      total_revenue: products.reduce((sum, p) => sum + p.revenue, 0),
      total_cost: products.reduce((sum, p) => sum + p.cost, 0),
      total_profit: products.reduce((sum, p) => sum + p.profit, 0),
      average_margin:
        products.length > 0 ? products.reduce((sum, p) => sum + p.margin, 0) / products.length : 0,
    };

    return {
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      summary,
      products,
      top_performers: products.slice(0, 10).map((p) => ({
        product_name: p.product_name,
        revenue: p.revenue,
        quantity: p.quantity_sold,
      })),
      low_performers: products.slice(-10).map((p) => ({
        product_name: p.product_name,
        revenue: p.revenue,
        quantity: p.quantity_sold,
      })),
      generated_at: new Date(),
    };
  }

  /**
   * Get sales data for a product
   */
  private async getSalesData(
    productName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProductSalesReport['sales']> {
    const stats = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.quantity)', 'total_quantity')
      .addSelect('SUM(t.amount)', 'total_revenue')
      .addSelect('AVG(t.price)', 'average_price')
      .where('t.product_name = :productName', { productName })
      .andWhere('t.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const totalQuantity = parseInt(stats?.total_quantity || '0');
    const totalRevenue = parseFloat(stats?.total_revenue || '0');
    const averagePrice = parseFloat(stats?.average_price || '0');

    // Get product to calculate cost
    const product = await this.nomenclatureRepository.findOne({
      where: { name: productName },
    });

    const totalCost = product ? (product.purchase_price || 0) * totalQuantity : 0;
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      total_quantity: totalQuantity,
      total_revenue: totalRevenue,
      total_cost: totalCost,
      gross_profit: grossProfit,
      profit_margin: profitMargin,
      average_price: averagePrice,
    };
  }

  /**
   * Get sales by machine for a product
   */
  private async getSalesByMachine(
    productName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProductSalesReport['by_machine']> {
    const salesRaw = await this.transactionRepository
      .createQueryBuilder('t')
      .leftJoin('machines', 'm', 't.machine_id = m.id')
      .leftJoin('locations', 'l', 'm.location_id = l.id')
      .select('m.machine_number', 'machine_number')
      .addSelect('m.name', 'machine_name')
      .addSelect('l.name', 'location_name')
      .addSelect('SUM(t.quantity)', 'quantity')
      .addSelect('SUM(t.amount)', 'revenue')
      .where('t.product_name = :productName', { productName })
      .andWhere('t.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('m.machine_number')
      .addGroupBy('m.name')
      .addGroupBy('l.name')
      .orderBy('SUM(t.amount)', 'DESC')
      .getRawMany();

    const totalRevenue = salesRaw.reduce((sum, item) => sum + parseFloat(item.revenue), 0);

    return salesRaw.map((item) => ({
      machine_number: item.machine_number || 'Unknown',
      machine_name: item.machine_name || 'Unknown',
      location_name: item.location_name || 'Unknown',
      quantity: parseInt(item.quantity),
      revenue: parseFloat(item.revenue),
      contribution_percentage:
        totalRevenue > 0 ? (parseFloat(item.revenue) / totalRevenue) * 100 : 0,
    }));
  }

  /**
   * Get sales by payment method for a product
   */
  private async getSalesByPaymentMethod(
    productName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProductSalesReport['by_payment_method']> {
    const salesRaw = await this.transactionRepository
      .createQueryBuilder('t')
      .select('t.payment_method', 'payment_method')
      .addSelect('SUM(t.quantity)', 'quantity')
      .addSelect('SUM(t.amount)', 'revenue')
      .where('t.product_name = :productName', { productName })
      .andWhere('t.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('t.payment_method')
      .getRawMany();

    const totalRevenue = salesRaw.reduce((sum, item) => sum + parseFloat(item.revenue), 0);

    return salesRaw.map((item) => ({
      payment_method: item.payment_method,
      quantity: parseInt(item.quantity),
      revenue: parseFloat(item.revenue),
      percentage: totalRevenue > 0 ? (parseFloat(item.revenue) / totalRevenue) * 100 : 0,
    }));
  }

  /**
   * Get daily sales trend for a product
   */
  private async getDailyTrend(
    productName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProductSalesReport['daily_trend']> {
    const trendRaw = await this.transactionRepository
      .createQueryBuilder('t')
      .select('DATE(t.transaction_date)', 'date')
      .addSelect('SUM(t.quantity)', 'quantity')
      .addSelect('SUM(t.amount)', 'revenue')
      .where('t.product_name = :productName', { productName })
      .andWhere('t.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(t.transaction_date)')
      .orderBy('DATE(t.transaction_date)', 'ASC')
      .getRawMany();

    return trendRaw.map((item) => ({
      date: item.date,
      quantity: parseInt(item.quantity),
      revenue: parseFloat(item.revenue),
    }));
  }
}
