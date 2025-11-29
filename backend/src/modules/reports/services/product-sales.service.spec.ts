import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductSalesService } from './product-sales.service';
import { Transaction } from '@modules/transactions/entities/transaction.entity';
import { Nomenclature } from '@modules/nomenclature/entities/nomenclature.entity';

describe('ProductSalesService', () => {
  let service: ProductSalesService;
  let transactionRepository: jest.Mocked<Repository<Transaction>>;
  let nomenclatureRepository: jest.Mocked<Repository<Nomenclature>>;

  const mockProduct: Partial<Nomenclature> = {
    id: 'product-uuid',
    name: 'Coffee Espresso',
    category_code: 'beverages',
    unit_of_measure_code: 'cup',
    selling_price: 100,
    purchase_price: 30,
  };

  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-31');

  beforeEach(async () => {
    const mockTransactionQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
    };

    const mockTransactionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockTransactionQueryBuilder),
    };

    const mockNomenclatureRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductSalesService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(Nomenclature),
          useValue: mockNomenclatureRepository,
        },
      ],
    }).compile();

    service = module.get<ProductSalesService>(ProductSalesService);
    transactionRepository = module.get(getRepositoryToken(Transaction));
    nomenclatureRepository = module.get(getRepositoryToken(Nomenclature));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateProductReport', () => {
    it('should generate product sales report', async () => {
      nomenclatureRepository.findOne.mockResolvedValue(mockProduct as Nomenclature);

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: '100',
        total_revenue: '10000',
        average_price: '100',
      });
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([]) // byMachine
        .mockResolvedValueOnce([]) // byPaymentMethod
        .mockResolvedValueOnce([]); // dailyTrend

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result).toBeDefined();
      expect(result.product.id).toBe('product-uuid');
      expect(result.product.name).toBe('Coffee Espresso');
      expect(result.period.start_date).toEqual(startDate);
      expect(result.period.end_date).toEqual(endDate);
      expect(result.generated_at).toBeDefined();
    });

    it('should throw NotFoundException when product not found', async () => {
      nomenclatureRepository.findOne.mockResolvedValue(null);

      await expect(
        service.generateProductReport('non-existent', startDate, endDate),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate sales metrics correctly', async () => {
      nomenclatureRepository.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(mockProduct as Nomenclature); // For getSalesData call

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: '100',
        total_revenue: '10000',
        average_price: '100',
      });
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result.sales.total_quantity).toBe(100);
      expect(result.sales.total_revenue).toBe(10000);
      expect(result.sales.average_price).toBe(100);
    });

    it('should calculate profit margin correctly', async () => {
      nomenclatureRepository.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(mockProduct as Nomenclature);

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      // Revenue = 10000, Quantity = 100, Cost = 30 * 100 = 3000
      // Profit = 10000 - 3000 = 7000
      // Margin = (7000 / 10000) * 100 = 70%
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: '100',
        total_revenue: '10000',
        average_price: '100',
      });
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result.sales.total_cost).toBe(3000);
      expect(result.sales.gross_profit).toBe(7000);
      expect(result.sales.profit_margin).toBe(70);
    });

    it('should include sales by machine', async () => {
      nomenclatureRepository.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(mockProduct as Nomenclature);

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: '100',
        total_revenue: '10000',
        average_price: '100',
      });
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([
          {
            machine_number: 'M-001',
            machine_name: 'Coffee Machine 1',
            location_name: 'Office A',
            quantity: '60',
            revenue: '6000',
          },
          {
            machine_number: 'M-002',
            machine_name: 'Coffee Machine 2',
            location_name: 'Office B',
            quantity: '40',
            revenue: '4000',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result.by_machine.length).toBe(2);
      expect(result.by_machine[0].contribution_percentage).toBe(60);
      expect(result.by_machine[1].contribution_percentage).toBe(40);
    });

    it('should include sales by payment method', async () => {
      nomenclatureRepository.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(mockProduct as Nomenclature);

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: '100',
        total_revenue: '10000',
        average_price: '100',
      });
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { payment_method: 'cash', quantity: '70', revenue: '7000' },
          { payment_method: 'card', quantity: '30', revenue: '3000' },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result.by_payment_method.length).toBe(2);
      expect(result.by_payment_method[0].percentage).toBe(70);
      expect(result.by_payment_method[1].percentage).toBe(30);
    });

    it('should include daily sales trend', async () => {
      nomenclatureRepository.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(mockProduct as Nomenclature);

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: '100',
        total_revenue: '10000',
        average_price: '100',
      });
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { date: '2025-01-01', quantity: '10', revenue: '1000' },
          { date: '2025-01-02', quantity: '15', revenue: '1500' },
          { date: '2025-01-03', quantity: '20', revenue: '2000' },
        ]);

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result.daily_trend.length).toBe(3);
      expect(result.daily_trend[0].date).toBe('2025-01-01');
      expect(result.daily_trend[1].quantity).toBe(15);
    });
  });

  describe('generateAllProductsReport', () => {
    it('should generate report for all products', async () => {
      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
        { product_name: 'Coffee', quantity_sold: '100', revenue: '10000' },
        { product_name: 'Tea', quantity_sold: '50', revenue: '2500' },
      ]);

      nomenclatureRepository.findOne
        .mockResolvedValueOnce({
          ...mockProduct,
          name: 'Coffee',
          purchase_price: 30,
        } as Nomenclature)
        .mockResolvedValueOnce({ ...mockProduct, name: 'Tea', purchase_price: 20 } as Nomenclature);

      const result = await service.generateAllProductsReport(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.summary.total_products).toBe(2);
      expect(result.summary.total_quantity_sold).toBe(150);
      expect(result.summary.total_revenue).toBe(12500);
      expect(result.products.length).toBe(2);
    });

    it('should calculate contribution percentage for each product', async () => {
      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
        { product_name: 'Coffee', quantity_sold: '100', revenue: '8000' },
        { product_name: 'Tea', quantity_sold: '50', revenue: '2000' },
      ]);

      nomenclatureRepository.findOne
        .mockResolvedValueOnce({ ...mockProduct, name: 'Coffee' } as Nomenclature)
        .mockResolvedValueOnce({ ...mockProduct, name: 'Tea' } as Nomenclature);

      const result = await service.generateAllProductsReport(startDate, endDate);

      // Coffee: 8000/10000 = 80%, Tea: 2000/10000 = 20%
      expect(result.products[0].contribution_percentage).toBe(80);
      expect(result.products[1].contribution_percentage).toBe(20);
    });

    it('should include top and low performers', async () => {
      const products = Array.from({ length: 15 }, (_, i) => ({
        product_name: `Product ${i + 1}`,
        quantity_sold: `${100 - i * 5}`,
        revenue: `${(100 - i * 5) * 100}`,
      }));

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue(products);

      nomenclatureRepository.findOne.mockResolvedValue(mockProduct as Nomenclature);

      const result = await service.generateAllProductsReport(startDate, endDate);

      expect(result.top_performers.length).toBe(10);
      expect(result.low_performers.length).toBe(10);
    });

    it('should handle empty sales data', async () => {
      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateAllProductsReport(startDate, endDate);

      expect(result.summary.total_products).toBe(0);
      expect(result.summary.total_quantity_sold).toBe(0);
      expect(result.summary.total_revenue).toBe(0);
      expect(result.summary.average_margin).toBe(0);
      expect(result.products).toEqual([]);
    });

    it('should handle products not found in nomenclature', async () => {
      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
        { product_name: 'Unknown Product', quantity_sold: '10', revenue: '500' },
      ]);

      nomenclatureRepository.findOne.mockResolvedValue(null);

      const result = await service.generateAllProductsReport(startDate, endDate);

      expect(result.products.length).toBe(1);
      expect(result.products[0].category).toBe('Unknown');
      expect(result.products[0].cost).toBe(0);
    });

    it('should handle zero revenue when calculating margin', async () => {
      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
        { product_name: 'Free Product', quantity_sold: '10', revenue: '0' },
      ]);

      nomenclatureRepository.findOne.mockResolvedValue(mockProduct as Nomenclature);

      const result = await service.generateAllProductsReport(startDate, endDate);

      expect(result.products[0].margin).toBe(0);
      expect(result.products[0].contribution_percentage).toBe(0);
    });

    it('should handle product with null purchase_price', async () => {
      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
        { product_name: 'No Price', quantity_sold: '10', revenue: '1000' },
      ]);

      nomenclatureRepository.findOne.mockResolvedValue({
        ...mockProduct,
        purchase_price: null,
      } as Nomenclature);

      const result = await service.generateAllProductsReport(startDate, endDate);

      expect(result.products[0].cost).toBe(0);
    });
  });

  describe('getSalesData edge cases', () => {
    it('should handle null values in sales stats', async () => {
      nomenclatureRepository.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(mockProduct as Nomenclature);

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: null,
        total_revenue: null,
        average_price: null,
      });
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result.sales.total_quantity).toBe(0);
      expect(result.sales.total_revenue).toBe(0);
      expect(result.sales.average_price).toBe(0);
    });

    it('should handle zero revenue when calculating profit margin', async () => {
      nomenclatureRepository.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(mockProduct as Nomenclature);

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: '0',
        total_revenue: '0',
        average_price: '0',
      });
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result.sales.profit_margin).toBe(0);
    });

    it('should handle product not found in getSalesData', async () => {
      nomenclatureRepository.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(null); // Product not found in second call

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: '100',
        total_revenue: '10000',
        average_price: '100',
      });
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result.sales.total_cost).toBe(0);
    });

    it('should handle product with null selling_price', async () => {
      nomenclatureRepository.findOne.mockResolvedValue({
        ...mockProduct,
        selling_price: null,
      } as Nomenclature);

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: '100',
        total_revenue: '10000',
        average_price: '100',
      });
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result.product.sale_price).toBe(0);
    });

    it('should handle product with null purchase_price in getSalesData', async () => {
      nomenclatureRepository.findOne.mockResolvedValue({
        ...mockProduct,
        purchase_price: null,
      } as Nomenclature);

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: '100',
        total_revenue: '10000',
        average_price: '100',
      });
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result.product.purchase_price).toBe(0);
    });
  });

  describe('getSalesByMachine edge cases', () => {
    it('should handle null values in machine data', async () => {
      nomenclatureRepository.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(mockProduct as Nomenclature);

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: '100',
        total_revenue: '10000',
        average_price: '100',
      });
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([
          {
            machine_number: null,
            machine_name: null,
            location_name: null,
            quantity: '50',
            revenue: '5000',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result.by_machine[0].machine_number).toBe('Unknown');
      expect(result.by_machine[0].machine_name).toBe('Unknown');
      expect(result.by_machine[0].location_name).toBe('Unknown');
    });

    it('should handle zero total revenue in machine contribution calculation', async () => {
      nomenclatureRepository.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(mockProduct as Nomenclature);

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: '0',
        total_revenue: '0',
        average_price: '0',
      });
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([
          {
            machine_number: 'M-001',
            machine_name: 'Machine',
            location_name: 'Office',
            quantity: '0',
            revenue: '0',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result.by_machine[0].contribution_percentage).toBe(0);
    });
  });

  describe('getSalesByPaymentMethod edge cases', () => {
    it('should handle zero total revenue in payment method percentage calculation', async () => {
      nomenclatureRepository.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(mockProduct as Nomenclature);

      const mockQueryBuilder = transactionRepository.createQueryBuilder();
      (mockQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_quantity: '0',
        total_revenue: '0',
        average_price: '0',
      });
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ payment_method: 'cash', quantity: '0', revenue: '0' }])
        .mockResolvedValueOnce([]);

      const result = await service.generateProductReport('product-uuid', startDate, endDate);

      expect(result.by_payment_method[0].percentage).toBe(0);
    });
  });
});
