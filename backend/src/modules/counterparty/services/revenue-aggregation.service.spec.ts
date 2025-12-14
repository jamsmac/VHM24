import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevenueAggregationService } from './revenue-aggregation.service';
import { Transaction, TransactionType } from '@/modules/transactions/entities/transaction.entity';

describe('RevenueAggregationService', () => {
  let service: RevenueAggregationService;
  let transactionRepository: jest.Mocked<Repository<Transaction>>;

  const periodStart = new Date('2025-01-01');
  const periodEnd = new Date('2025-01-31');

  const createMockQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  });

  beforeEach(async () => {
    const mockTransactionRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueAggregationService,
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionRepository },
      ],
    }).compile();

    service = module.get<RevenueAggregationService>(RevenueAggregationService);
    transactionRepository = module.get(getRepositoryToken(Transaction));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRevenueForContract', () => {
    it('should aggregate revenue for a contract', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({
        total_revenue: '500000',
        transaction_count: '100',
        average_transaction: '5000',
      });
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getRevenueForContract('contract-uuid', periodStart, periodEnd);

      expect(result.total_revenue).toBe(500000);
      expect(result.transaction_count).toBe(100);
      expect(result.average_transaction).toBe(5000);
      expect(result.period_start).toEqual(periodStart);
      expect(result.period_end).toEqual(periodEnd);
    });

    it('should handle null values in aggregation result', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({
        total_revenue: null,
        transaction_count: null,
        average_transaction: null,
      });
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getRevenueForContract('contract-uuid', periodStart, periodEnd);

      expect(result.total_revenue).toBe(0);
      expect(result.transaction_count).toBe(0);
      expect(result.average_transaction).toBe(0);
    });

    it('should filter by contract ID and SALE transaction type', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({
        total_revenue: '0',
        transaction_count: '0',
        average_transaction: '0',
      });
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getRevenueForContract('contract-uuid', periodStart, periodEnd);

      expect(qb.where).toHaveBeenCalledWith('t.contract_id = :contractId', {
        contractId: 'contract-uuid',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('t.transaction_type = :type', {
        type: TransactionType.SALE,
      });
    });

    it('should include breakdown when requested', async () => {
      const mainQb = createMockQueryBuilder();
      mainQb.getRawOne.mockResolvedValue({
        total_revenue: '100000',
        transaction_count: '20',
        average_transaction: '5000',
      });

      const byDateQb = createMockQueryBuilder();
      byDateQb.getRawMany.mockResolvedValue([
        { date: '2025-01-01', revenue: '30000' },
        { date: '2025-01-02', revenue: '70000' },
      ]);

      const byMachineQb = createMockQueryBuilder();
      byMachineQb.getRawMany.mockResolvedValue([
        { machine_id: 'm1', machine_number: 'M-001', revenue: '60000' },
        { machine_id: 'm2', machine_number: 'M-002', revenue: '40000' },
      ]);

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(mainQb as any)
        .mockReturnValueOnce(byDateQb as any)
        .mockReturnValueOnce(byMachineQb as any);

      const result = await service.getRevenueForContract(
        'contract-uuid',
        periodStart,
        periodEnd,
        true,
      );

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown?.by_date).toHaveLength(2);
      expect(result.breakdown?.by_date?.[0]).toEqual({ date: '2025-01-01', revenue: 30000 });
      expect(result.breakdown?.by_machine).toHaveLength(2);
      expect(result.breakdown?.by_machine?.[0]).toEqual({
        machine_id: 'm1',
        machine_number: 'M-001',
        revenue: 60000,
      });
    });

    it('should not include breakdown when not requested', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({
        total_revenue: '100000',
        transaction_count: '20',
        average_transaction: '5000',
      });
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getRevenueForContract(
        'contract-uuid',
        periodStart,
        periodEnd,
        false,
      );

      expect(result.breakdown).toBeUndefined();
      expect(transactionRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRevenueForMachine', () => {
    it('should aggregate revenue for a specific machine', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({
        total_revenue: '250000',
        transaction_count: '50',
        average_transaction: '5000',
      });
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getRevenueForMachine('machine-uuid', periodStart, periodEnd);

      expect(result.total_revenue).toBe(250000);
      expect(result.transaction_count).toBe(50);
      expect(result.average_transaction).toBe(5000);
    });

    it('should filter by machine ID', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({
        total_revenue: '0',
        transaction_count: '0',
        average_transaction: '0',
      });
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getRevenueForMachine('machine-uuid', periodStart, periodEnd);

      expect(qb.where).toHaveBeenCalledWith('t.machine_id = :machineId', {
        machineId: 'machine-uuid',
      });
    });
  });

  describe('getRevenueForLocation', () => {
    it('should aggregate revenue for a location', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({
        total_revenue: '750000',
        transaction_count: '150',
        average_transaction: '5000',
      });
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getRevenueForLocation('location-uuid', periodStart, periodEnd);

      expect(result.total_revenue).toBe(750000);
      expect(result.transaction_count).toBe(150);
    });

    it('should join with machine table to filter by location', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({
        total_revenue: '0',
        transaction_count: '0',
        average_transaction: '0',
      });
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getRevenueForLocation('location-uuid', periodStart, periodEnd);

      expect(qb.innerJoin).toHaveBeenCalledWith('t.machine', 'm');
      expect(qb.where).toHaveBeenCalledWith('m.location_id = :locationId', {
        locationId: 'location-uuid',
      });
    });
  });

  describe('getRevenueForContracts', () => {
    it('should return empty map for empty contract IDs array', async () => {
      const result = await service.getRevenueForContracts([], periodStart, periodEnd);

      expect(result.size).toBe(0);
      expect(transactionRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should aggregate revenue for multiple contracts', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawMany.mockResolvedValue([
        {
          contract_id: 'c1',
          total_revenue: '100000',
          transaction_count: '20',
          average_transaction: '5000',
        },
        {
          contract_id: 'c2',
          total_revenue: '200000',
          transaction_count: '40',
          average_transaction: '5000',
        },
      ]);
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getRevenueForContracts(
        ['c1', 'c2', 'c3'],
        periodStart,
        periodEnd,
      );

      expect(result.size).toBe(3);
      expect(result.get('c1')?.total_revenue).toBe(100000);
      expect(result.get('c2')?.total_revenue).toBe(200000);
      // c3 has no transactions, should have zero values
      expect(result.get('c3')?.total_revenue).toBe(0);
    });

    it('should add zero revenue entries for contracts without transactions', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawMany.mockResolvedValue([
        {
          contract_id: 'c1',
          total_revenue: '100000',
          transaction_count: '20',
          average_transaction: '5000',
        },
      ]);
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getRevenueForContracts(['c1', 'c2'], periodStart, periodEnd);

      expect(result.get('c2')).toEqual({
        total_revenue: 0,
        transaction_count: 0,
        average_transaction: 0,
        period_start: periodStart,
        period_end: periodEnd,
      });
    });

    it('should use IN clause for contract IDs', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawMany.mockResolvedValue([]);
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getRevenueForContracts(['c1', 'c2'], periodStart, periodEnd);

      expect(qb.where).toHaveBeenCalledWith('t.contract_id IN (:...contractIds)', {
        contractIds: ['c1', 'c2'],
      });
    });
  });

  describe('getTotalRevenue', () => {
    it('should aggregate total revenue across all contracts', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({
        total_revenue: '1000000',
        transaction_count: '200',
        average_transaction: '5000',
      });
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getTotalRevenue(periodStart, periodEnd);

      expect(result.total_revenue).toBe(1000000);
      expect(result.transaction_count).toBe(200);
      expect(result.average_transaction).toBe(5000);
    });

    it('should only filter by transaction type and date range', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({
        total_revenue: '0',
        transaction_count: '0',
        average_transaction: '0',
      });
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getTotalRevenue(periodStart, periodEnd);

      expect(qb.where).toHaveBeenCalledWith('t.transaction_type = :type', {
        type: TransactionType.SALE,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('t.sale_date >= :periodStart', { periodStart });
      expect(qb.andWhere).toHaveBeenCalledWith('t.sale_date < :periodEnd', { periodEnd });
    });

    it('should handle no transactions', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({
        total_revenue: null,
        transaction_count: null,
        average_transaction: null,
      });
      transactionRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getTotalRevenue(periodStart, periodEnd);

      expect(result.total_revenue).toBe(0);
      expect(result.transaction_count).toBe(0);
    });
  });
});
