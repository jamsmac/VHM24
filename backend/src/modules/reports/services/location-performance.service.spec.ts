import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { LocationPerformanceService } from './location-performance.service';
import { Location } from '@modules/locations/entities/location.entity';
import { Machine } from '@modules/machines/entities/machine.entity';
import { Transaction } from '@modules/transactions/entities/transaction.entity';

describe('LocationPerformanceService', () => {
  let service: LocationPerformanceService;
  let mockLocationRepository: any;
  let mockMachineRepository: any;
  let mockTransactionRepository: any;
  let transactionQueryBuilder: any;

  const locationId = 'location-123';
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-31');

  beforeEach(async () => {
    transactionQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(null),
    };

    mockLocationRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockMachineRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockTransactionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(transactionQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationPerformanceService,
        {
          provide: getRepositoryToken(Location),
          useValue: mockLocationRepository,
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
      ],
    }).compile();

    service = module.get<LocationPerformanceService>(LocationPerformanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    it('should throw NotFoundException when location not found', async () => {
      mockLocationRepository.findOne.mockResolvedValue(null);

      await expect(service.generateReport(locationId, startDate, endDate)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should generate a complete report', async () => {
      const mockLocation = {
        id: locationId,
        name: 'Shopping Mall',
        address: '123 Main St',
        type_code: 'mall',
        counterparty: { name: 'Mall Owner LLC' },
      };

      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockMachineRepository.find.mockResolvedValue([]);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ total_revenue: '0' });

      const result = await service.generateReport(locationId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.location.id).toBe(locationId);
      expect(result.location.name).toBe('Shopping Mall');
      expect(result.location.address).toBe('123 Main St');
      expect(result.location.type).toBe('mall');
      expect(result.location.owner_name).toBe('Mall Owner LLC');
      expect(result.period.start_date).toEqual(startDate);
      expect(result.period.end_date).toEqual(endDate);
      expect(result.generated_at).toBeInstanceOf(Date);
    });

    it('should handle location without counterparty', async () => {
      const mockLocation = {
        id: locationId,
        name: 'Shopping Mall',
        address: '123 Main St',
        type_code: 'mall',
        counterparty: null,
      };

      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockMachineRepository.find.mockResolvedValue([]);

      const result = await service.generateReport(locationId, startDate, endDate);

      expect(result.location.owner_name).toBe('Unknown');
    });

    it('should calculate machines data correctly', async () => {
      const mockLocation = {
        id: locationId,
        name: 'Shopping Mall',
        address: '123 Main St',
        type_code: 'mall',
        counterparty: null,
      };

      const mockMachines = [
        { id: 'm-1', machine_number: 'M001', name: 'Machine 1', status: 'active' },
        { id: 'm-2', machine_number: 'M002', name: 'Machine 2', status: 'active' },
        { id: 'm-3', machine_number: 'M003', name: 'Machine 3', status: 'offline' },
        { id: 'm-4', machine_number: 'M004', name: 'Machine 4', status: 'disabled' },
      ];

      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockMachineRepository.find.mockResolvedValue(mockMachines);
      transactionQueryBuilder.getRawOne.mockResolvedValue({
        revenue: '1000',
        transactions: '10',
        total_revenue: '10000',
      });

      const result = await service.generateReport(locationId, startDate, endDate);

      expect(result.machines.total).toBe(4);
      expect(result.machines.active).toBe(2);
      expect(result.machines.offline).toBe(2); // offline + disabled
      expect(result.machines.performance).toHaveLength(4);
      // Machines are returned in the order they were processed
      const machine1 = result.machines.performance.find((m: any) => m.machine_number === 'M001');
      expect(machine1).toBeDefined();
      expect(machine1?.revenue).toBe(1000);
      expect(machine1?.transactions).toBe(10);
    });

    it('should handle null values in transaction stats', async () => {
      const mockLocation = {
        id: locationId,
        name: 'Shopping Mall',
        address: '123 Main St',
        type_code: 'mall',
        counterparty: null,
      };

      const mockMachines = [
        { id: 'm-1', machine_number: 'M001', name: 'Machine 1', status: 'active' },
      ];

      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockMachineRepository.find.mockResolvedValue(mockMachines);
      transactionQueryBuilder.getRawOne.mockResolvedValue(null);

      const result = await service.generateReport(locationId, startDate, endDate);

      expect(result.machines.performance[0].revenue).toBe(0);
      expect(result.machines.performance[0].transactions).toBe(0);
    });

    it('should return zero financial data when no machines', async () => {
      const mockLocation = {
        id: locationId,
        name: 'Shopping Mall',
        address: '123 Main St',
        type_code: 'mall',
        counterparty: null,
      };

      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockMachineRepository.find.mockResolvedValue([]);

      const result = await service.generateReport(locationId, startDate, endDate);

      expect(result.financial.total_revenue).toBe(0);
      expect(result.financial.total_expenses).toBe(0);
      expect(result.financial.owner_commission).toBe(0);
      expect(result.financial.net_profit).toBe(0);
      expect(result.financial.profit_margin).toBe(0);
      expect(result.financial.average_revenue_per_machine).toBe(0);
    });

    it('should calculate financial data correctly', async () => {
      const mockLocation = {
        id: locationId,
        name: 'Shopping Mall',
        address: '123 Main St',
        type_code: 'mall',
        counterparty: null,
      };

      const mockMachines = [
        { id: 'm-1', machine_number: 'M001', name: 'Machine 1', status: 'active' },
        { id: 'm-2', machine_number: 'M002', name: 'Machine 2', status: 'active' },
      ];

      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockMachineRepository.find.mockResolvedValue(mockMachines);

      let callCount = 0;
      transactionQueryBuilder.getRawOne.mockImplementation(() => {
        callCount++;
        // First 2 calls for machine performance, 3rd for total revenue
        if (callCount <= 2) {
          return Promise.resolve({ revenue: '5000', transactions: '50' });
        }
        return Promise.resolve({ total_revenue: '10000' });
      });

      const result = await service.generateReport(locationId, startDate, endDate);

      expect(result.financial.total_revenue).toBe(10000);
      expect(result.financial.total_expenses).toBe(0); // Currently hardcoded to 0
      expect(result.financial.net_profit).toBe(10000);
      expect(result.financial.profit_margin).toBe(100); // No expenses
      expect(result.financial.average_revenue_per_machine).toBe(5000);
    });

    it('should calculate top performers correctly', async () => {
      const mockLocation = {
        id: locationId,
        name: 'Shopping Mall',
        address: '123 Main St',
        type_code: 'mall',
        counterparty: null,
      };

      const mockMachines = [
        { id: 'm-1', machine_number: 'M001', name: 'Machine 1', status: 'active' },
        { id: 'm-2', machine_number: 'M002', name: 'Machine 2', status: 'active' },
        { id: 'm-3', machine_number: 'M003', name: 'Machine 3', status: 'active' },
      ];

      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockMachineRepository.find.mockResolvedValue(mockMachines);

      let callCount = 0;
      transactionQueryBuilder.getRawOne.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ revenue: '3000', transactions: '30' });
        if (callCount === 2) return Promise.resolve({ revenue: '5000', transactions: '50' });
        if (callCount === 3) return Promise.resolve({ revenue: '2000', transactions: '20' });
        return Promise.resolve({ total_revenue: '10000' });
      });

      const result = await service.generateReport(locationId, startDate, endDate);

      expect(result.top_performers).toHaveLength(3);
      // Should be sorted by revenue descending
      expect(result.top_performers[0].machine_number).toBe('M002');
      expect(result.top_performers[0].revenue).toBe(5000);
      expect(result.top_performers[0].contribution_percentage).toBe(50);

      expect(result.top_performers[1].machine_number).toBe('M001');
      expect(result.top_performers[1].revenue).toBe(3000);
      expect(result.top_performers[1].contribution_percentage).toBe(30);

      expect(result.top_performers[2].machine_number).toBe('M003');
      expect(result.top_performers[2].revenue).toBe(2000);
      expect(result.top_performers[2].contribution_percentage).toBe(20);
    });

    it('should limit top performers to 5', async () => {
      const mockLocation = {
        id: locationId,
        name: 'Shopping Mall',
        address: '123 Main St',
        type_code: 'mall',
        counterparty: null,
      };

      const mockMachines = Array.from({ length: 10 }, (_, i) => ({
        id: `m-${i}`,
        machine_number: `M00${i}`,
        name: `Machine ${i}`,
        status: 'active',
      }));

      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockMachineRepository.find.mockResolvedValue(mockMachines);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: '1000', transactions: '10' });

      const result = await service.generateReport(locationId, startDate, endDate);

      expect(result.top_performers).toHaveLength(5);
    });

    it('should handle zero total revenue in contribution percentage', async () => {
      const mockLocation = {
        id: locationId,
        name: 'Shopping Mall',
        address: '123 Main St',
        type_code: 'mall',
        counterparty: null,
      };

      const mockMachines = [
        { id: 'm-1', machine_number: 'M001', name: 'Machine 1', status: 'active' },
      ];

      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockMachineRepository.find.mockResolvedValue(mockMachines);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ revenue: '0', transactions: '0' });

      const result = await service.generateReport(locationId, startDate, endDate);

      expect(result.top_performers[0].contribution_percentage).toBe(0);
    });

    it('should handle zero revenue in profit margin calculation', async () => {
      const mockLocation = {
        id: locationId,
        name: 'Shopping Mall',
        address: '123 Main St',
        type_code: 'mall',
        counterparty: null,
      };

      const mockMachines = [
        { id: 'm-1', machine_number: 'M001', name: 'Machine 1', status: 'active' },
      ];

      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockMachineRepository.find.mockResolvedValue(mockMachines);
      transactionQueryBuilder.getRawOne.mockResolvedValue({ total_revenue: '0' });

      const result = await service.generateReport(locationId, startDate, endDate);

      expect(result.financial.profit_margin).toBe(0);
    });
  });
});
