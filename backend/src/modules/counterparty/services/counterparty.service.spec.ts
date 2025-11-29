import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CounterpartyService } from './counterparty.service';
import { Counterparty } from '../entities/counterparty.entity';
import { CreateCounterpartyDto, CounterpartyType } from '../dto/create-counterparty.dto';
import { UpdateCounterpartyDto } from '../dto/update-counterparty.dto';
import { ContractStatus } from '../entities/contract.entity';

describe('CounterpartyService', () => {
  let service: CounterpartyService;
  let mockRepository: jest.Mocked<Repository<Counterparty>>;
  let mockQueryBuilder: Partial<SelectQueryBuilder<Counterparty>>;

  // Test fixtures
  const mockCounterparty: Partial<Counterparty> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Company LLC',
    short_name: 'Test Co',
    type: 'client',
    inn: '123456789',
    oked: '12345',
    mfo: '00001',
    bank_account: '20208000100001234567',
    bank_name: 'National Bank of Uzbekistan',
    legal_address: 'Tashkent, Main Street 1',
    actual_address: 'Tashkent, Main Street 1',
    contact_person: 'John Doe',
    phone: '+998901234567',
    email: 'test@example.com',
    director_name: 'Jane Director',
    director_position: 'CEO',
    is_vat_payer: true,
    vat_rate: 15,
    payment_term_days: 30,
    credit_limit: 10_000_000,
    is_active: true,
    notes: 'Test notes',
    contracts: [],
    locations: [],
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    deleted_at: null,
  };

  const mockDeletedCounterparty: Partial<Counterparty> = {
    ...mockCounterparty,
    id: '223e4567-e89b-12d3-a456-426614174001',
    inn: '987654321',
    deleted_at: new Date('2025-01-15'),
  };

  const mockCreateDto: CreateCounterpartyDto = {
    name: 'New Company LLC',
    type: CounterpartyType.CLIENT,
    inn: '111222333',
    is_active: true,
  };

  beforeEach(async () => {
    // Setup query builder mock
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockCounterparty]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      softRemove: jest.fn(),
      restore: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounterpartyService,
        {
          provide: getRepositoryToken(Counterparty),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CounterpartyService>(CounterpartyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new counterparty successfully', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockCounterparty as Counterparty);
      mockRepository.save.mockResolvedValue(mockCounterparty as Counterparty);

      // Act
      const result = await service.create(mockCreateDto);

      // Assert
      expect(result).toEqual(mockCounterparty);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { inn: mockCreateDto.inn },
        withDeleted: true,
      });
      expect(mockRepository.create).toHaveBeenCalledWith(mockCreateDto);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when INN already exists', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockCounterparty as Counterparty);

      // Act & Assert
      await expect(service.create(mockCreateDto)).rejects.toThrow(ConflictException);
      await expect(service.create(mockCreateDto)).rejects.toThrow(/уже существует/);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException with special message when INN exists in soft-deleted record', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockDeletedCounterparty as Counterparty);

      // Act & Assert
      await expect(
        service.create({
          ...mockCreateDto,
          inn: mockDeletedCounterparty.inn!,
        }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create({
          ...mockCreateDto,
          inn: mockDeletedCounterparty.inn!,
        }),
      ).rejects.toThrow(/удален/);
    });

    it('should create counterparty with all optional fields', async () => {
      // Arrange
      const fullDto: CreateCounterpartyDto = {
        name: 'Full Company LLC',
        short_name: 'Full Co',
        type: CounterpartyType.LOCATION_OWNER,
        inn: '444555666',
        oked: '67890',
        mfo: '00002',
        bank_account: '20208000100009999999',
        bank_name: 'Kapitalbank',
        legal_address: 'Samarkand, Central 10',
        actual_address: 'Samarkand, Central 10',
        contact_person: 'Ivan Petrov',
        phone: '+998901112233',
        email: 'full@company.uz',
        director_name: 'Director Full',
        director_position: 'General Director',
        is_vat_payer: true,
        vat_rate: 15,
        payment_term_days: 45,
        credit_limit: 50_000_000,
        is_active: true,
        notes: 'Full notes',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({ ...mockCounterparty, ...fullDto } as Counterparty);
      mockRepository.save.mockResolvedValue({ ...mockCounterparty, ...fullDto } as Counterparty);

      // Act
      const result = await service.create(fullDto);

      // Assert
      expect(result.name).toBe(fullDto.name);
      expect(mockRepository.create).toHaveBeenCalledWith(fullDto);
    });
  });

  describe('findAll', () => {
    it('should return all counterparties without filters', async () => {
      // Arrange
      const counterparties = [mockCounterparty, { ...mockCounterparty, id: '2' }];
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(counterparties);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('counterparty');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('counterparty.name', 'ASC');
    });

    it('should filter by type when provided', async () => {
      // Arrange
      const type = 'client';

      // Act
      await service.findAll(type);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('counterparty.type = :type', { type });
    });

    it('should filter by isActive when provided', async () => {
      // Arrange
      const isActive = true;

      // Act
      await service.findAll(undefined, isActive);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('counterparty.is_active = :isActive', {
        isActive,
      });
    });

    it('should filter inactive counterparties when isActive is false', async () => {
      // Arrange
      const isActive = false;

      // Act
      await service.findAll(undefined, isActive);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('counterparty.is_active = :isActive', {
        isActive: false,
      });
    });

    it('should search by name, short_name, or INN when search provided', async () => {
      // Arrange
      const search = 'Test';

      // Act
      await service.findAll(undefined, undefined, search);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), {
        search: '%Test%',
      });
    });

    it('should apply all filters when all provided', async () => {
      // Arrange
      const type = 'supplier';
      const isActive = true;
      const search = 'Company';

      // Act
      await service.findAll(type, isActive, search);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });
  });

  describe('findOne', () => {
    it('should return counterparty when found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockCounterparty as Counterparty);

      // Act
      const result = await service.findOne(mockCounterparty.id!);

      // Assert
      expect(result).toEqual(mockCounterparty);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCounterparty.id },
        relations: ['contracts', 'locations'],
      });
    });

    it('should throw NotFoundException when counterparty not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);
      const nonExistentId = 'non-existent-id';

      // Act & Assert
      await expect(service.findOne(nonExistentId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(nonExistentId)).rejects.toThrow(/не найден/);
    });
  });

  describe('findByInn', () => {
    it('should return counterparty when INN found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockCounterparty as Counterparty);

      // Act
      const result = await service.findByInn(mockCounterparty.inn!);

      // Assert
      expect(result).toEqual(mockCounterparty);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { inn: mockCounterparty.inn },
      });
    });

    it('should return null when INN not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findByInn('999999999');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update counterparty successfully', async () => {
      // Arrange
      const updateDto: UpdateCounterpartyDto = {
        name: 'Updated Company Name',
        contact_person: 'New Contact',
      };
      const updatedCounterparty = { ...mockCounterparty, ...updateDto };

      mockRepository.findOne.mockResolvedValue(mockCounterparty as Counterparty);
      mockRepository.save.mockResolvedValue(updatedCounterparty as Counterparty);

      // Act
      const result = await service.update(mockCounterparty.id!, updateDto);

      // Assert
      expect(result.name).toBe(updateDto.name);
      expect(result.contact_person).toBe(updateDto.contact_person);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when counterparty not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('non-existent-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow updating INN when new INN is unique', async () => {
      // Arrange
      const updateDto: UpdateCounterpartyDto = { inn: '555666777' };

      // First call for findOne(id), second call for INN check
      mockRepository.findOne
        .mockResolvedValueOnce(mockCounterparty as Counterparty)
        .mockResolvedValueOnce(null);
      mockRepository.save.mockResolvedValue({
        ...mockCounterparty,
        inn: updateDto.inn,
      } as Counterparty);

      // Act
      const result = await service.update(mockCounterparty.id!, updateDto);

      // Assert
      expect(result.inn).toBe(updateDto.inn);
    });

    it('should throw ConflictException when updating to existing INN', async () => {
      // Arrange
      const updateDto: UpdateCounterpartyDto = { inn: '999888777' };
      const existingCounterparty = { ...mockCounterparty, id: 'another-id', inn: updateDto.inn };

      mockRepository.findOne
        .mockResolvedValueOnce(mockCounterparty as Counterparty)
        .mockResolvedValueOnce(existingCounterparty as Counterparty);

      // Act & Assert
      await expect(service.update(mockCounterparty.id!, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should not check for INN conflict when INN unchanged', async () => {
      // Arrange
      const updateDto: UpdateCounterpartyDto = {
        inn: mockCounterparty.inn, // Same INN
        name: 'New Name',
      };

      mockRepository.findOne.mockResolvedValue(mockCounterparty as Counterparty);
      mockRepository.save.mockResolvedValue({
        ...mockCounterparty,
        name: updateDto.name,
      } as Counterparty);

      // Act
      await service.update(mockCounterparty.id!, updateDto);

      // Assert
      // Should only be called once for findOne
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should update updated_at timestamp', async () => {
      // Arrange
      const updateDto: UpdateCounterpartyDto = { name: 'Updated Name' };
      mockRepository.findOne.mockResolvedValue(mockCounterparty as Counterparty);

      const saveMock = jest.fn().mockImplementation((entity) => {
        expect(entity.updated_at).toBeInstanceOf(Date);
        return Promise.resolve(entity);
      });
      mockRepository.save = saveMock;

      // Act
      await service.update(mockCounterparty.id!, updateDto);

      // Assert
      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete counterparty without active contracts', async () => {
      // Arrange
      const counterpartyWithoutContracts = {
        ...mockCounterparty,
        contracts: [],
      };
      mockRepository.findOne.mockResolvedValue(counterpartyWithoutContracts as Counterparty);
      mockRepository.softRemove.mockResolvedValue(counterpartyWithoutContracts as Counterparty);

      // Act
      await service.remove(mockCounterparty.id!);

      // Assert
      expect(mockRepository.softRemove).toHaveBeenCalledWith(counterpartyWithoutContracts);
    });

    it('should soft delete counterparty with only inactive contracts', async () => {
      // Arrange
      const counterpartyWithInactiveContracts = {
        ...mockCounterparty,
        contracts: [
          { id: '1', status: ContractStatus.TERMINATED },
          { id: '2', status: ContractStatus.EXPIRED },
          { id: '3', status: ContractStatus.DRAFT },
        ],
      };
      mockRepository.findOne.mockResolvedValue(counterpartyWithInactiveContracts as any);
      mockRepository.softRemove.mockResolvedValue(counterpartyWithInactiveContracts as any);

      // Act
      await service.remove(mockCounterparty.id!);

      // Assert
      expect(mockRepository.softRemove).toHaveBeenCalled();
    });

    it('should throw BadRequestException when counterparty has active contracts', async () => {
      // Arrange
      const counterpartyWithActiveContracts = {
        ...mockCounterparty,
        contracts: [
          { id: '1', status: ContractStatus.ACTIVE },
          { id: '2', status: ContractStatus.TERMINATED },
        ],
      };
      mockRepository.findOne.mockResolvedValue(counterpartyWithActiveContracts as any);

      // Act & Assert
      await expect(service.remove(mockCounterparty.id!)).rejects.toThrow(BadRequestException);
      await expect(service.remove(mockCounterparty.id!)).rejects.toThrow(/активными договорами/);
      expect(mockRepository.softRemove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when counterparty not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should restore soft-deleted counterparty', async () => {
      // Arrange
      mockRepository.findOne
        .mockResolvedValueOnce(mockDeletedCounterparty as Counterparty)
        .mockResolvedValueOnce({ ...mockDeletedCounterparty, deleted_at: null } as Counterparty);
      mockRepository.restore.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.restore(mockDeletedCounterparty.id!);

      // Assert
      expect(result.deleted_at).toBeNull();
      expect(mockRepository.restore).toHaveBeenCalledWith(mockDeletedCounterparty.id);
    });

    it('should throw NotFoundException when counterparty not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.restore('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when counterparty was not deleted', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockCounterparty as Counterparty);

      // Act & Assert
      await expect(service.restore(mockCounterparty.id!)).rejects.toThrow(BadRequestException);
      await expect(service.restore(mockCounterparty.id!)).rejects.toThrow(/не был удален/);
    });
  });

  describe('getByType', () => {
    it('should return active counterparties of specified type', async () => {
      // Arrange
      const type = 'supplier';
      const suppliers = [
        { ...mockCounterparty, type: 'supplier' },
        { ...mockCounterparty, id: '2', type: 'supplier' },
      ];
      mockRepository.find.mockResolvedValue(suppliers as Counterparty[]);

      // Act
      const result = await service.getByType(type);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { type: type as any, is_active: true },
        order: { name: 'ASC' },
      });
    });
  });

  describe('getLocationOwners', () => {
    it('should return active location owners', async () => {
      // Arrange
      const locationOwners = [{ ...mockCounterparty, type: 'location_owner' }];
      mockRepository.find.mockResolvedValue(locationOwners as Counterparty[]);

      // Act
      const result = await service.getLocationOwners();

      // Assert
      expect(result).toHaveLength(1);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { type: 'location_owner' as any, is_active: true },
        order: { name: 'ASC' },
      });
    });
  });

  describe('getStats', () => {
    it('should return statistics for all counterparties', async () => {
      // Arrange
      mockRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85); // active

      const byTypeResults = [
        { type: 'client', count: '40' },
        { type: 'supplier', count: '30' },
        { type: 'location_owner', count: '15' },
      ];
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue(byTypeResults);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 100,
        active: 85,
        inactive: 15,
        by_type: {
          client: 40,
          supplier: 30,
          location_owner: 15,
        },
      });
    });

    it('should handle empty counterparties', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        by_type: {},
      });
    });
  });
});
