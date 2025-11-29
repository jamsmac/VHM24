import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ContractService } from './contract.service';
import { CounterpartyService } from './counterparty.service';
import { Contract, ContractStatus, CommissionType } from '../entities/contract.entity';
import { CreateContractDto } from '../dto/create-contract.dto';
import { UpdateContractDto } from '../dto/update-contract.dto';

describe('ContractService', () => {
  let service: ContractService;
  let mockRepository: jest.Mocked<Repository<Contract>>;
  let mockCounterpartyService: jest.Mocked<CounterpartyService>;
  let mockQueryBuilder: Partial<SelectQueryBuilder<Contract>>;

  // Test fixtures
  const mockContract: Partial<Contract> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    contract_number: 'CONTRACT-001',
    start_date: new Date('2025-01-01'),
    end_date: new Date('2025-12-31'),
    status: ContractStatus.ACTIVE,
    counterparty_id: 'counterparty-123',
    commission_type: CommissionType.PERCENTAGE,
    commission_rate: 15,
    commission_fixed_amount: null,
    commission_fixed_period: null,
    commission_tiers: null,
    commission_hybrid_fixed: null,
    commission_hybrid_rate: null,
    currency: 'UZS',
    payment_term_days: 30,
    payment_type: 'postpayment',
    minimum_monthly_revenue: null,
    penalty_rate: null,
    special_conditions: null,
    notes: 'Test contract',
    contract_file_id: null,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    deleted_at: null,
  };

  const mockDeletedContract: Partial<Contract> = {
    ...mockContract,
    id: '223e4567-e89b-12d3-a456-426614174001',
    contract_number: 'CONTRACT-DELETED',
    deleted_at: new Date('2025-01-15'),
  };

  const mockCounterparty = {
    id: 'counterparty-123',
    name: 'Test Counterparty',
    inn: '123456789',
  };

  beforeEach(async () => {
    // Setup query builder mock
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockContract]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    } as any;

    // Add set method after base object is created
    (mockQueryBuilder as any).set = jest.fn().mockReturnValue(mockQueryBuilder);

    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      softRemove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockCounterpartyService = {
      findOne: jest.fn().mockResolvedValue(mockCounterparty),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractService,
        {
          provide: getRepositoryToken(Contract),
          useValue: mockRepository,
        },
        {
          provide: CounterpartyService,
          useValue: mockCounterpartyService,
        },
      ],
    }).compile();

    service = module.get<ContractService>(ContractService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a contract with PERCENTAGE commission type', async () => {
      // Arrange
      const createDto: CreateContractDto = {
        contract_number: 'NEW-CONTRACT-001',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        counterparty_id: mockCounterparty.id,
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: 15,
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockContract as Contract);
      mockRepository.save.mockResolvedValue(mockContract as Contract);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockContract);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { contract_number: createDto.contract_number },
        withDeleted: true,
      });
      expect(mockCounterpartyService.findOne).toHaveBeenCalledWith(createDto.counterparty_id);
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when contract number already exists', async () => {
      // Arrange
      const createDto: CreateContractDto = {
        contract_number: mockContract.contract_number!,
        start_date: '2025-01-01',
        counterparty_id: mockCounterparty.id,
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: 15,
      };

      mockRepository.findOne.mockResolvedValue(mockContract as Contract);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(/уже существует/);
    });

    it('should throw ConflictException with special message when contract number exists in soft-deleted record', async () => {
      // Arrange
      const createDto: CreateContractDto = {
        contract_number: mockDeletedContract.contract_number!,
        start_date: '2025-01-01',
        counterparty_id: mockCounterparty.id,
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: 15,
      };

      mockRepository.findOne.mockResolvedValue(mockDeletedContract as Contract);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(/удален/);
    });

    it('should throw BadRequestException when end_date is before start_date', async () => {
      // Arrange
      const createDto: CreateContractDto = {
        contract_number: 'NEW-CONTRACT-002',
        start_date: '2025-12-31',
        end_date: '2025-01-01', // Before start_date
        counterparty_id: mockCounterparty.id,
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: 15,
      };

      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(/раньше даты начала/);
    });

    it('should allow creating contract without end_date (indefinite)', async () => {
      // Arrange
      const createDto: CreateContractDto = {
        contract_number: 'INDEFINITE-001',
        start_date: '2025-01-01',
        end_date: null,
        counterparty_id: mockCounterparty.id,
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: 15,
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({ ...mockContract, end_date: null } as Contract);
      mockRepository.save.mockResolvedValue({ ...mockContract, end_date: null } as Contract);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result.end_date).toBeNull();
    });
  });

  describe('validateCommissionConfig', () => {
    describe('PERCENTAGE type', () => {
      it('should throw BadRequestException when commission_rate is missing for PERCENTAGE type', async () => {
        // Arrange
        const createDto: CreateContractDto = {
          contract_number: 'PERCENT-001',
          start_date: '2025-01-01',
          counterparty_id: mockCounterparty.id,
          commission_type: CommissionType.PERCENTAGE,
          commission_rate: null, // Missing
        };

        mockRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
        await expect(service.create(createDto)).rejects.toThrow(/commission_rate/);
      });

      it('should accept valid PERCENTAGE configuration', async () => {
        // Arrange
        const createDto: CreateContractDto = {
          contract_number: 'PERCENT-002',
          start_date: '2025-01-01',
          counterparty_id: mockCounterparty.id,
          commission_type: CommissionType.PERCENTAGE,
          commission_rate: 20,
        };

        mockRepository.findOne.mockResolvedValue(null);
        mockRepository.create.mockReturnValue(mockContract as Contract);
        mockRepository.save.mockResolvedValue(mockContract as Contract);

        // Act
        const result = await service.create(createDto);

        // Assert
        expect(result).toBeDefined();
      });
    });

    describe('FIXED type', () => {
      it('should throw BadRequestException when commission_fixed_amount is missing for FIXED type', async () => {
        // Arrange
        const createDto: CreateContractDto = {
          contract_number: 'FIXED-001',
          start_date: '2025-01-01',
          counterparty_id: mockCounterparty.id,
          commission_type: CommissionType.FIXED,
          commission_fixed_amount: null, // Missing
          commission_fixed_period: 'monthly',
        };

        mockRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
        await expect(service.create(createDto)).rejects.toThrow(/commission_fixed_amount/);
      });

      it('should throw BadRequestException when commission_fixed_period is missing for FIXED type', async () => {
        // Arrange
        const createDto: CreateContractDto = {
          contract_number: 'FIXED-002',
          start_date: '2025-01-01',
          counterparty_id: mockCounterparty.id,
          commission_type: CommissionType.FIXED,
          commission_fixed_amount: 5_000_000,
          commission_fixed_period: null, // Missing
        };

        mockRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
        await expect(service.create(createDto)).rejects.toThrow(/commission_fixed_period/);
      });

      it('should accept valid FIXED configuration', async () => {
        // Arrange
        const createDto: CreateContractDto = {
          contract_number: 'FIXED-003',
          start_date: '2025-01-01',
          counterparty_id: mockCounterparty.id,
          commission_type: CommissionType.FIXED,
          commission_fixed_amount: 5_000_000,
          commission_fixed_period: 'monthly',
        };

        mockRepository.findOne.mockResolvedValue(null);
        mockRepository.create.mockReturnValue({
          ...mockContract,
          commission_type: CommissionType.FIXED,
        } as Contract);
        mockRepository.save.mockResolvedValue({
          ...mockContract,
          commission_type: CommissionType.FIXED,
        } as Contract);

        // Act
        const result = await service.create(createDto);

        // Assert
        expect(result).toBeDefined();
      });
    });

    describe('TIERED type', () => {
      it('should throw BadRequestException when commission_tiers is missing for TIERED type', async () => {
        // Arrange
        const createDto: CreateContractDto = {
          contract_number: 'TIERED-001',
          start_date: '2025-01-01',
          counterparty_id: mockCounterparty.id,
          commission_type: CommissionType.TIERED,
          commission_tiers: null, // Missing
        };

        mockRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
        await expect(service.create(createDto)).rejects.toThrow(/commission_tiers/);
      });

      it('should throw BadRequestException when commission_tiers is empty for TIERED type', async () => {
        // Arrange
        const createDto: CreateContractDto = {
          contract_number: 'TIERED-002',
          start_date: '2025-01-01',
          counterparty_id: mockCounterparty.id,
          commission_type: CommissionType.TIERED,
          commission_tiers: [], // Empty
        };

        mockRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
        await expect(service.create(createDto)).rejects.toThrow(/commission_tiers/);
      });

      it('should accept valid TIERED configuration', async () => {
        // Arrange
        const createDto: CreateContractDto = {
          contract_number: 'TIERED-003',
          start_date: '2025-01-01',
          counterparty_id: mockCounterparty.id,
          commission_type: CommissionType.TIERED,
          commission_tiers: [
            { from: 0, to: 10_000_000, rate: 10 },
            { from: 10_000_000, to: 50_000_000, rate: 12 },
            { from: 50_000_000, to: null, rate: 15 },
          ],
        };

        mockRepository.findOne.mockResolvedValue(null);
        mockRepository.create.mockReturnValue({
          ...mockContract,
          commission_type: CommissionType.TIERED,
        } as Contract);
        mockRepository.save.mockResolvedValue({
          ...mockContract,
          commission_type: CommissionType.TIERED,
        } as Contract);

        // Act
        const result = await service.create(createDto);

        // Assert
        expect(result).toBeDefined();
      });
    });

    describe('HYBRID type', () => {
      it('should throw BadRequestException when commission_hybrid_fixed is missing for HYBRID type', async () => {
        // Arrange
        const createDto: CreateContractDto = {
          contract_number: 'HYBRID-001',
          start_date: '2025-01-01',
          counterparty_id: mockCounterparty.id,
          commission_type: CommissionType.HYBRID,
          commission_hybrid_fixed: null, // Missing
          commission_hybrid_rate: 5,
        };

        mockRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
        await expect(service.create(createDto)).rejects.toThrow(/commission_hybrid_fixed/);
      });

      it('should throw BadRequestException when commission_hybrid_rate is missing for HYBRID type', async () => {
        // Arrange
        const createDto: CreateContractDto = {
          contract_number: 'HYBRID-002',
          start_date: '2025-01-01',
          counterparty_id: mockCounterparty.id,
          commission_type: CommissionType.HYBRID,
          commission_hybrid_fixed: 1_000_000,
          commission_hybrid_rate: null, // Missing
        };

        mockRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
        await expect(service.create(createDto)).rejects.toThrow(/commission_hybrid_rate/);
      });

      it('should accept valid HYBRID configuration', async () => {
        // Arrange
        const createDto: CreateContractDto = {
          contract_number: 'HYBRID-003',
          start_date: '2025-01-01',
          counterparty_id: mockCounterparty.id,
          commission_type: CommissionType.HYBRID,
          commission_hybrid_fixed: 1_000_000,
          commission_hybrid_rate: 5,
        };

        mockRepository.findOne.mockResolvedValue(null);
        mockRepository.create.mockReturnValue({
          ...mockContract,
          commission_type: CommissionType.HYBRID,
        } as Contract);
        mockRepository.save.mockResolvedValue({
          ...mockContract,
          commission_type: CommissionType.HYBRID,
        } as Contract);

        // Act
        const result = await service.create(createDto);

        // Assert
        expect(result).toBeDefined();
      });
    });
  });

  describe('findAll', () => {
    it('should return all contracts without filters', async () => {
      // Arrange
      const contracts = [mockContract, { ...mockContract, id: '2' }];
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(contracts);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('contract');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'contract.counterparty',
        'counterparty',
      );
    });

    it('should filter by counterpartyId when provided', async () => {
      // Arrange
      const counterpartyId = 'counterparty-123';

      // Act
      await service.findAll(counterpartyId);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'contract.counterparty_id = :counterpartyId',
        { counterpartyId },
      );
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const status = ContractStatus.ACTIVE;

      // Act
      await service.findAll(undefined, status);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('contract.status = :status', {
        status,
      });
    });

    it('should filter by activeOnly when true', async () => {
      // Act
      await service.findAll(undefined, undefined, true);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('contract.status = :activeStatus', {
        activeStatus: ContractStatus.ACTIVE,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'contract.start_date <= :now',
        expect.any(Object),
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(contract.end_date IS NULL OR contract.end_date >= :now)',
        expect.any(Object),
      );
    });
  });

  describe('findOne', () => {
    it('should return contract when found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockContract as Contract);

      // Act
      const result = await service.findOne(mockContract.id!);

      // Assert
      expect(result).toEqual(mockContract);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockContract.id },
        relations: ['counterparty', 'commission_calculations'],
      });
    });

    it('should throw NotFoundException when contract not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByNumber', () => {
    it('should return contract when contract number found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockContract as Contract);

      // Act
      const result = await service.findByNumber(mockContract.contract_number!);

      // Assert
      expect(result).toEqual(mockContract);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { contract_number: mockContract.contract_number },
        relations: ['counterparty'],
      });
    });

    it('should return null when contract number not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findByNumber('NON-EXISTENT');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update contract successfully', async () => {
      // Arrange
      const updateDto: UpdateContractDto = {
        notes: 'Updated notes',
        payment_term_days: 45,
      };

      mockRepository.findOne.mockResolvedValue(mockContract as Contract);
      mockRepository.save.mockResolvedValue({
        ...mockContract,
        ...updateDto,
      } as Contract);

      // Act
      const result = await service.update(mockContract.id!, updateDto);

      // Assert
      expect(result.notes).toBe(updateDto.notes);
      expect(result.payment_term_days).toBe(updateDto.payment_term_days);
    });

    it('should throw ConflictException when updating to existing contract number', async () => {
      // Arrange
      const updateDto: UpdateContractDto = {
        contract_number: 'EXISTING-CONTRACT',
      };

      mockRepository.findOne
        .mockResolvedValueOnce(mockContract as Contract)
        .mockResolvedValueOnce({ id: 'other-id' } as Contract);

      // Act & Assert
      await expect(service.update(mockContract.id!, updateDto)).rejects.toThrow(ConflictException);
    });

    it('should validate dates when updating both start_date and end_date', async () => {
      // Arrange
      const updateDto: UpdateContractDto = {
        start_date: '2025-12-31',
        end_date: '2025-01-01',
      };

      mockRepository.findOne.mockResolvedValue(mockContract as Contract);

      // Act & Assert
      await expect(service.update(mockContract.id!, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate end_date against existing start_date when only end_date is updated', async () => {
      // Arrange
      const updateDto: UpdateContractDto = {
        end_date: '2024-01-01', // Before existing start_date (2025-01-01)
      };

      mockRepository.findOne.mockResolvedValue(mockContract as Contract);

      // Act & Assert
      await expect(service.update(mockContract.id!, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate commission config when updating commission type', async () => {
      // Arrange
      const updateDto: UpdateContractDto = {
        commission_type: CommissionType.FIXED,
        commission_fixed_amount: null, // Invalid
      };

      mockRepository.findOne.mockResolvedValue(mockContract as Contract);

      // Act & Assert
      await expect(service.update(mockContract.id!, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete non-active contract', async () => {
      // Arrange
      const inactiveContract = {
        ...mockContract,
        status: ContractStatus.TERMINATED,
      };
      mockRepository.findOne.mockResolvedValue(inactiveContract as Contract);
      mockRepository.softRemove.mockResolvedValue(inactiveContract as Contract);

      // Act
      await service.remove(mockContract.id!);

      // Assert
      expect(mockRepository.softRemove).toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to delete active contract', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.ACTIVE,
      } as Contract);

      // Act & Assert
      await expect(service.remove(mockContract.id!)).rejects.toThrow(BadRequestException);
      await expect(service.remove(mockContract.id!)).rejects.toThrow(/активный договор/);
    });
  });

  describe('changeStatus', () => {
    it('should change status from DRAFT to ACTIVE', async () => {
      // Arrange
      const draftContract = { ...mockContract, status: ContractStatus.DRAFT };
      mockRepository.findOne.mockResolvedValue(draftContract as Contract);
      mockRepository.save.mockResolvedValue({
        ...draftContract,
        status: ContractStatus.ACTIVE,
      } as Contract);

      // Act
      const result = await service.changeStatus(mockContract.id!, ContractStatus.ACTIVE);

      // Assert
      expect(result.status).toBe(ContractStatus.ACTIVE);
    });

    it('should change status from ACTIVE to SUSPENDED', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockContract as Contract);
      mockRepository.save.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.SUSPENDED,
      } as Contract);

      // Act
      const result = await service.changeStatus(mockContract.id!, ContractStatus.SUSPENDED);

      // Assert
      expect(result.status).toBe(ContractStatus.SUSPENDED);
    });

    it('should change status from SUSPENDED to ACTIVE', async () => {
      // Arrange
      const suspendedContract = { ...mockContract, status: ContractStatus.SUSPENDED };
      mockRepository.findOne.mockResolvedValue(suspendedContract as Contract);
      mockRepository.save.mockResolvedValue({
        ...suspendedContract,
        status: ContractStatus.ACTIVE,
      } as Contract);

      // Act
      const result = await service.changeStatus(mockContract.id!, ContractStatus.ACTIVE);

      // Assert
      expect(result.status).toBe(ContractStatus.ACTIVE);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      // Arrange - cannot go from TERMINATED to anything
      const terminatedContract = { ...mockContract, status: ContractStatus.TERMINATED };
      mockRepository.findOne.mockResolvedValue(terminatedContract as Contract);

      // Act & Assert
      await expect(service.changeStatus(mockContract.id!, ContractStatus.ACTIVE)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.changeStatus(mockContract.id!, ContractStatus.ACTIVE)).rejects.toThrow(
        /Недопустимый переход/,
      );
    });

    it('should throw BadRequestException when going from DRAFT to SUSPENDED', async () => {
      // Arrange
      const draftContract = { ...mockContract, status: ContractStatus.DRAFT };
      mockRepository.findOne.mockResolvedValue(draftContract as Contract);

      // Act & Assert
      await expect(
        service.changeStatus(mockContract.id!, ContractStatus.SUSPENDED),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getActiveContractsForCounterparty', () => {
    it('should return active contracts for counterparty', async () => {
      // Arrange
      const activeContracts = [mockContract, { ...mockContract, id: '2' }];
      mockRepository.find.mockResolvedValue(activeContracts as Contract[]);

      // Act
      const result = await service.getActiveContractsForCounterparty('counterparty-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          counterparty_id: 'counterparty-123',
          status: ContractStatus.ACTIVE,
          start_date: expect.any(Object),
        },
        relations: ['counterparty'],
      });
    });
  });

  describe('getExpiringContracts', () => {
    it('should return contracts expiring within specified days', async () => {
      // Arrange
      const expiringContracts = [mockContract];
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(expiringContracts);

      // Act
      const result = await service.getExpiringContracts(30);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('contract.status = :status', {
        status: ContractStatus.ACTIVE,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('contract.end_date IS NOT NULL');
    });

    it('should use default 30 days when no parameter provided', async () => {
      // Arrange
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.getExpiringContracts();

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'contract.end_date BETWEEN :now AND :futureDate',
        expect.any(Object),
      );
    });
  });

  describe('autoExpireContracts', () => {
    it('should update expired contracts to EXPIRED status', async () => {
      // Arrange
      (mockQueryBuilder.execute as jest.Mock).mockResolvedValue({ affected: 5 });

      // Act
      const result = await service.autoExpireContracts();

      // Assert
      expect(result).toBe(5);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(Contract);
      expect((mockQueryBuilder as any).set).toHaveBeenCalledWith({
        status: ContractStatus.EXPIRED,
        updated_at: expect.any(Date),
      });
    });

    it('should return 0 when no contracts expired', async () => {
      // Arrange
      (mockQueryBuilder.execute as jest.Mock).mockResolvedValue({ affected: 0 });

      // Act
      const result = await service.autoExpireContracts();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return contract statistics', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(50);

      const byStatusResults = [
        { status: 'active', count: '30' },
        { status: 'draft', count: '10' },
        { status: 'terminated', count: '10' },
      ];
      const byCommissionTypeResults = [
        { commission_type: 'percentage', count: '20' },
        { commission_type: 'fixed', count: '8' },
        { commission_type: 'tiered', count: '2' },
      ];

      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce(byStatusResults)
        .mockResolvedValueOnce(byCommissionTypeResults);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 50,
        by_status: {
          active: 30,
          draft: 10,
          terminated: 10,
        },
        by_commission_type: {
          percentage: 20,
          fixed: 8,
          tiered: 2,
        },
      });
    });
  });
});
