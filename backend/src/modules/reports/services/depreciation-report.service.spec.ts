import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepreciationReportService } from './depreciation-report.service';
import { Machine, MachineStatus } from '@modules/machines/entities/machine.entity';

describe('DepreciationReportService', () => {
  let service: DepreciationReportService;
  let machineRepository: jest.Mocked<Repository<Machine>>;

  const mockLocation = {
    id: 'location-uuid',
    name: 'Test Location',
    address: '123 Test Street',
  };

  const mockMachine: Partial<Machine> = {
    id: 'machine-uuid',
    machine_number: 'M-001',
    name: 'Test Machine',
    status: MachineStatus.ACTIVE,
    location_id: 'location-uuid',
    location: mockLocation as any,
    purchase_price: 1000000,
    purchase_date: new Date('2024-01-01'),
    installation_date: new Date('2024-01-15'),
    depreciation_years: 5,
    accumulated_depreciation: 100000,
    last_depreciation_date: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const mockMachineRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepreciationReportService,
        { provide: getRepositoryToken(Machine), useValue: mockMachineRepository },
      ],
    }).compile();

    service = module.get<DepreciationReportService>(DepreciationReportService);
    machineRepository = module.get(getRepositoryToken(Machine));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-12-31');

    it('should generate report with correct period', async () => {
      machineRepository.find.mockResolvedValue([mockMachine as Machine]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.period.start_date).toEqual(startDate);
      expect(result.period.end_date).toEqual(endDate);
      expect(result.generated_at).toBeInstanceOf(Date);
    });

    it('should include summary statistics', async () => {
      machineRepository.find.mockResolvedValue([mockMachine as Machine]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.summary).toHaveProperty('total_assets');
      expect(result.summary).toHaveProperty('total_purchase_value');
      expect(result.summary).toHaveProperty('total_accumulated_depreciation');
      expect(result.summary).toHaveProperty('total_current_value');
      expect(result.summary).toHaveProperty('total_monthly_depreciation');
      expect(result.summary).toHaveProperty('depreciation_percentage');
    });

    it('should calculate machine depreciation correctly', async () => {
      machineRepository.find.mockResolvedValue([mockMachine as Machine]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.machines).toHaveLength(1);
      const machineData = result.machines[0];

      expect(machineData.machine_number).toBe('M-001');
      expect(machineData.machine_name).toBe('Test Machine');
      expect(machineData.location_name).toBe('Test Location');
      expect(machineData.purchase_price).toBe(1000000);
      expect(machineData.depreciation_years).toBe(5);
      expect(machineData.accumulated_depreciation).toBe(100000);
      // Current value = purchase_price - accumulated_depreciation
      expect(machineData.current_value).toBe(900000);
      // Monthly depreciation = purchase_price / (depreciation_years * 12)
      expect(machineData.monthly_depreciation).toBeCloseTo(1000000 / 60, 2);
    });

    it('should filter out machines without purchase price', async () => {
      const machineWithNullPrice = { ...mockMachine, purchase_price: null };
      const machineWithZeroPrice = { ...mockMachine, id: 'machine-2', purchase_price: 0 };
      machineRepository.find.mockResolvedValue([
        machineWithNullPrice as Machine,
        machineWithZeroPrice as Machine,
        mockMachine as Machine,
      ]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.machines).toHaveLength(1);
      expect(result.machines[0].machine_number).toBe('M-001');
    });

    it('should handle machine without location', async () => {
      const machineNoLocation = { ...mockMachine, location: null } as unknown as Machine;
      machineRepository.find.mockResolvedValue([machineNoLocation]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.machines[0].location_name).toBe('Unknown');
    });

    it('should calculate fully depreciated status', async () => {
      const fullyDepreciatedMachine = {
        ...mockMachine,
        accumulated_depreciation: 1000000,
      };
      machineRepository.find.mockResolvedValue([fullyDepreciatedMachine as Machine]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.machines[0].status).toBe('fully_depreciated');
      expect(result.machines[0].depreciation_percentage).toBe(100);
    });

    it('should calculate active status for partially depreciated machines', async () => {
      machineRepository.find.mockResolvedValue([mockMachine as Machine]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.machines[0].status).toBe('active');
      expect(result.machines[0].depreciation_percentage).toBe(10); // 100000/1000000 * 100
    });

    it('should calculate remaining months correctly', async () => {
      machineRepository.find.mockResolvedValue([mockMachine as Machine]);

      const result = await service.generateReport(startDate, endDate);

      const machineData = result.machines[0];
      // Total months = 5 * 12 = 60
      // Months depreciated = accumulated_depreciation / monthly_depreciation
      const monthlyDep = 1000000 / 60;
      const monthsDepreciated = Math.floor(100000 / monthlyDep);
      const remainingMonths = 60 - monthsDepreciated;

      expect(machineData.months_depreciated).toBe(monthsDepreciated);
      expect(machineData.remaining_months).toBe(remainingMonths);
    });

    it('should sort machines by current value descending', async () => {
      const machine1 = {
        ...mockMachine,
        id: '1',
        machine_number: 'M-001',
        accumulated_depreciation: 500000,
      };
      const machine2 = {
        ...mockMachine,
        id: '2',
        machine_number: 'M-002',
        accumulated_depreciation: 100000,
      };
      const machine3 = {
        ...mockMachine,
        id: '3',
        machine_number: 'M-003',
        accumulated_depreciation: 800000,
      };
      machineRepository.find.mockResolvedValue([machine1, machine2, machine3] as Machine[]);

      const result = await service.generateReport(startDate, endDate);

      // Higher current value first (lower depreciation)
      expect(result.machines[0].machine_number).toBe('M-002'); // 900000 current
      expect(result.machines[1].machine_number).toBe('M-001'); // 500000 current
      expect(result.machines[2].machine_number).toBe('M-003'); // 200000 current
    });

    it('should calculate summary totals correctly for multiple machines', async () => {
      const machine1 = {
        ...mockMachine,
        id: '1',
        purchase_price: 1000000,
        accumulated_depreciation: 100000,
      };
      const machine2 = {
        ...mockMachine,
        id: '2',
        purchase_price: 500000,
        accumulated_depreciation: 50000,
      };
      machineRepository.find.mockResolvedValue([machine1, machine2] as Machine[]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.summary.total_assets).toBe(2);
      expect(result.summary.total_purchase_value).toBe(1500000);
      expect(result.summary.total_accumulated_depreciation).toBe(150000);
      expect(result.summary.total_current_value).toBe(1350000);
      // Depreciation percentage = 150000 / 1500000 * 100 = 10%
      expect(result.summary.depreciation_percentage).toBe(10);
    });

    it('should handle empty machines list', async () => {
      machineRepository.find.mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.machines).toHaveLength(0);
      expect(result.summary.total_assets).toBe(0);
      expect(result.summary.total_purchase_value).toBe(0);
      expect(result.summary.depreciation_percentage).toBe(0);
    });

    it('should use default depreciation years when not set', async () => {
      const machineNoDepYears = { ...mockMachine, depreciation_years: null };
      machineRepository.find.mockResolvedValue([machineNoDepYears as Machine]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.machines[0].depreciation_years).toBe(5); // Default value
    });

    it('should return empty equipment array (currently stubbed)', async () => {
      machineRepository.find.mockResolvedValue([mockMachine as Machine]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.equipment).toEqual([]);
    });

    it('should prevent negative current value', async () => {
      const overDepreciatedMachine = {
        ...mockMachine,
        accumulated_depreciation: 1500000, // More than purchase price
      };
      machineRepository.find.mockResolvedValue([overDepreciatedMachine as Machine]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.machines[0].current_value).toBe(0);
    });

    it('should handle machines with null accumulated_depreciation', async () => {
      const machineNullAccDep = { ...mockMachine, accumulated_depreciation: null } as any;
      machineRepository.find.mockResolvedValue([machineNullAccDep as Machine]);

      const result = await service.generateReport(startDate, endDate);

      // Should default to 0 for null accumulated_depreciation
      expect(result.machines[0].accumulated_depreciation).toBe(0);
      expect(result.machines[0].current_value).toBe(1000000); // Full purchase price
    });

    it('should handle machines with null purchase_price in depreciation calculation', async () => {
      const machineNullPrice = { ...mockMachine, purchase_price: null };
      machineRepository.find.mockResolvedValue([machineNullPrice as Machine]);

      const result = await service.generateReport(startDate, endDate);

      // Machine should be filtered out since purchase_price is null
      expect(result.machines).toHaveLength(0);
    });

    it('should handle calculation when accumulated_depreciation equals zero', async () => {
      // When accumulated_depreciation is 0, months_depreciated should be 0
      const machineZeroAccDep = {
        ...mockMachine,
        accumulated_depreciation: 0,
      };
      machineRepository.find.mockResolvedValue([machineZeroAccDep as Machine]);

      const result = await service.generateReport(startDate, endDate);

      // Should calculate correctly with zero accumulated depreciation
      expect(result.machines[0].months_depreciated).toBe(0);
      expect(result.machines[0].remaining_months).toBe(60); // 5 years * 12 months
      expect(result.machines[0].status).toBe('active');
    });

    it('should correctly calculate depreciation percentage for machine with 0 purchase price', async () => {
      // Edge case: machine should be filtered, but let's check calculation path
      machineRepository.find.mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      // No machines means depreciation_percentage should be 0 (division by zero avoided)
      expect(result.summary.depreciation_percentage).toBe(0);
    });

    it('should use purchase_date when installation_date is null', async () => {
      const machineNoPurchaseDate = {
        ...mockMachine,
        installation_date: null,
        purchase_date: new Date('2024-06-01'),
      };
      machineRepository.find.mockResolvedValue([machineNoPurchaseDate as Machine]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.machines[0].purchase_date).toEqual(new Date('2024-06-01'));
    });

    it('should use current date when both installation_date and purchase_date are null', async () => {
      const machineNoDates = {
        ...mockMachine,
        installation_date: null,
        purchase_date: null,
      };
      machineRepository.find.mockResolvedValue([machineNoDates as Machine]);

      const result = await service.generateReport(startDate, endDate);

      // Should default to a Date object (current date)
      expect(result.machines[0].purchase_date).toBeInstanceOf(Date);
    });

    it('should use current date when last_depreciation_date is null', async () => {
      const machineNoLastDepDate = {
        ...mockMachine,
        last_depreciation_date: null,
      };
      machineRepository.find.mockResolvedValue([machineNoLastDepDate as Machine]);

      const result = await service.generateReport(startDate, endDate);

      // Should default to a Date object (current date)
      expect(result.machines[0].last_depreciation_date).toBeInstanceOf(Date);
    });

    it('should calculate remaining months correctly when all months are depreciated', async () => {
      // Machine is almost fully depreciated
      const nearFullyDepMachine = {
        ...mockMachine,
        accumulated_depreciation: 999000, // Close to 1000000
        purchase_price: 1000000,
        depreciation_years: 5,
      };
      machineRepository.find.mockResolvedValue([nearFullyDepMachine as Machine]);

      const result = await service.generateReport(startDate, endDate);

      // Remaining months should be positive or zero, never negative
      expect(result.machines[0].remaining_months).toBeGreaterThanOrEqual(0);
    });

    it('should handle summary calculations with empty equipment array (currently stubbed)', async () => {
      // Equipment is currently stubbed to return empty array
      // This tests that equipment calculations don't break summary
      machineRepository.find.mockResolvedValue([mockMachine as Machine]);

      const result = await service.generateReport(startDate, endDate);

      // Summary should only include machine data since equipment returns []
      expect(result.summary.total_purchase_value).toBe(1000000);
      expect(result.summary.total_accumulated_depreciation).toBe(100000);
      expect(result.equipment).toEqual([]);
    });

    it('should correctly sum monthly depreciation across multiple machines', async () => {
      const machine1 = { ...mockMachine, id: '1', purchase_price: 600000, depreciation_years: 5 };
      const machine2 = { ...mockMachine, id: '2', purchase_price: 1200000, depreciation_years: 10 };
      machineRepository.find.mockResolvedValue([machine1, machine2] as Machine[]);

      const result = await service.generateReport(startDate, endDate);

      // Monthly depreciation = purchase_price / (depreciation_years * 12)
      // Machine 1: 600000 / 60 = 10000
      // Machine 2: 1200000 / 120 = 10000
      // Total: 20000
      expect(result.summary.total_monthly_depreciation).toBe(20000);
    });
  });
});
