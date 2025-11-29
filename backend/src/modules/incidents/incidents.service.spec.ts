import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import {
  Incident,
  IncidentStatus,
  IncidentType,
  IncidentPriority,
} from './entities/incident.entity';
import {
  CreateIncidentDto,
  UpdateIncidentDto,
  ResolveIncidentDto,
} from './dto/create-incident.dto';

describe('IncidentsService', () => {
  let service: IncidentsService;
  let mockIncidentRepository: jest.Mocked<Repository<Incident>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Incident>>;

  // Test fixtures
  const mockMachineId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '223e4567-e89b-12d3-a456-426614174001';
  const mockIncidentId = '323e4567-e89b-12d3-a456-426614174002';

  const mockIncident: Partial<Incident> = {
    id: mockIncidentId,
    incident_type: IncidentType.TECHNICAL_FAILURE,
    status: IncidentStatus.OPEN,
    priority: IncidentPriority.MEDIUM,
    machine_id: mockMachineId,
    title: 'Test incident',
    description: 'Test incident description',
    reported_by_user_id: mockUserId,
    reported_at: new Date('2025-01-15T10:00:00Z'),
    assigned_to_user_id: null,
    started_at: null,
    resolved_at: null,
    closed_at: null,
    resolution_notes: null,
    repair_task_id: null,
    metadata: null,
    repair_cost: null,
    created_at: new Date('2025-01-15T10:00:00Z'),
    updated_at: new Date('2025-01-15T10:00:00Z'),
  };

  const createIncidentDto: CreateIncidentDto = {
    incident_type: IncidentType.TECHNICAL_FAILURE,
    priority: IncidentPriority.MEDIUM,
    machine_id: mockMachineId,
    title: 'Test incident',
    description: 'Test incident description',
    reported_by_user_id: mockUserId,
    metadata: { error_code: 'E42' },
  };

  beforeEach(async () => {
    // Create mock query builder
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue(null),
    } as any;

    // Create mock repository
    mockIncidentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        {
          provide: getRepositoryToken(Incident),
          useValue: mockIncidentRepository,
        },
      ],
    }).compile();

    service = module.get<IncidentsService>(IncidentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an incident with OPEN status and reported_at date', async () => {
      // Arrange
      const createdIncident = {
        ...mockIncident,
        ...createIncidentDto,
        status: IncidentStatus.OPEN,
        reported_at: expect.any(Date),
      };
      mockIncidentRepository.create.mockReturnValue(createdIncident as Incident);
      mockIncidentRepository.save.mockResolvedValue(createdIncident as Incident);

      // Act
      const result = await service.create(createIncidentDto);

      // Assert
      expect(mockIncidentRepository.create).toHaveBeenCalledWith({
        ...createIncidentDto,
        status: IncidentStatus.OPEN,
        reported_at: expect.any(Date),
      });
      expect(mockIncidentRepository.save).toHaveBeenCalledWith(createdIncident);
      expect(result.status).toBe(IncidentStatus.OPEN);
    });

    it('should create an incident with default MEDIUM priority when not specified', async () => {
      // Arrange
      const dtoWithoutPriority: CreateIncidentDto = {
        incident_type: IncidentType.TECHNICAL_FAILURE,
        machine_id: mockMachineId,
        title: 'Test incident',
        description: 'Test description',
      };
      const createdIncident = {
        ...mockIncident,
        ...dtoWithoutPriority,
        status: IncidentStatus.OPEN,
      };
      mockIncidentRepository.create.mockReturnValue(createdIncident as Incident);
      mockIncidentRepository.save.mockResolvedValue(createdIncident as Incident);

      // Act
      await service.create(dtoWithoutPriority);

      // Assert
      expect(mockIncidentRepository.create).toHaveBeenCalledWith({
        ...dtoWithoutPriority,
        status: IncidentStatus.OPEN,
        reported_at: expect.any(Date),
      });
    });

    it('should create an incident with CRITICAL priority', async () => {
      // Arrange
      const criticalDto: CreateIncidentDto = {
        ...createIncidentDto,
        priority: IncidentPriority.CRITICAL,
      };
      const createdIncident = {
        ...mockIncident,
        ...criticalDto,
        priority: IncidentPriority.CRITICAL,
      };
      mockIncidentRepository.create.mockReturnValue(createdIncident as Incident);
      mockIncidentRepository.save.mockResolvedValue(createdIncident as Incident);

      // Act
      const result = await service.create(criticalDto);

      // Assert
      expect(result.priority).toBe(IncidentPriority.CRITICAL);
    });
  });

  describe('findAll', () => {
    it('should return all incidents without filters', async () => {
      // Arrange
      const incidents = [mockIncident, { ...mockIncident, id: 'another-id' }];
      mockQueryBuilder.getMany.mockResolvedValue(incidents as Incident[]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockIncidentRepository.createQueryBuilder).toHaveBeenCalledWith('incident');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'incident.machine',
        'machine',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'incident.reported_by',
        'reported_by',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'incident.assigned_to',
        'assigned_to',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('incident.priority', 'DESC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('incident.reported_at', 'DESC');
      expect(result).toEqual(incidents);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockIncident as Incident]);

      // Act
      await service.findAll(IncidentStatus.OPEN);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('incident.status = :status', {
        status: IncidentStatus.OPEN,
      });
    });

    it('should filter by incident type when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockIncident as Incident]);

      // Act
      await service.findAll(undefined, IncidentType.TECHNICAL_FAILURE);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('incident.incident_type = :type', {
        type: IncidentType.TECHNICAL_FAILURE,
      });
    });

    it('should filter by machine ID when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockIncident as Incident]);

      // Act
      await service.findAll(undefined, undefined, mockMachineId);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('incident.machine_id = :machineId', {
        machineId: mockMachineId,
      });
    });

    it('should filter by priority when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockIncident as Incident]);

      // Act
      await service.findAll(undefined, undefined, undefined, IncidentPriority.CRITICAL);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('incident.priority = :priority', {
        priority: IncidentPriority.CRITICAL,
      });
    });

    it('should filter by assigned user when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockIncident as Incident]);

      // Act
      await service.findAll(undefined, undefined, undefined, undefined, mockUserId);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'incident.assigned_to_user_id = :assignedToUserId',
        { assignedToUserId: mockUserId },
      );
    });

    it('should apply multiple filters when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockIncident as Incident]);

      // Act
      await service.findAll(
        IncidentStatus.OPEN,
        IncidentType.TECHNICAL_FAILURE,
        mockMachineId,
        IncidentPriority.HIGH,
        mockUserId,
      );

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(5);
    });
  });

  describe('findOne', () => {
    it('should return an incident when found', async () => {
      // Arrange
      mockIncidentRepository.findOne.mockResolvedValue(mockIncident as Incident);

      // Act
      const result = await service.findOne(mockIncidentId);

      // Assert
      expect(mockIncidentRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockIncidentId },
        relations: ['machine', 'machine.location', 'reported_by', 'assigned_to'],
      });
      expect(result).toEqual(mockIncident);
    });

    it('should throw NotFoundException when incident not found', async () => {
      // Arrange
      mockIncidentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Инцидент с ID non-existent-id не найден',
      );
    });
  });

  describe('update', () => {
    it('should update incident with new values', async () => {
      // Arrange
      const updateDto: UpdateIncidentDto = {
        priority: IncidentPriority.HIGH,
        description: 'Updated description',
      };
      const existingIncident = { ...mockIncident };
      const updatedIncident = { ...mockIncident, ...updateDto };

      mockIncidentRepository.findOne.mockResolvedValue(existingIncident as Incident);
      mockIncidentRepository.save.mockResolvedValue(updatedIncident as Incident);

      // Act
      const result = await service.update(mockIncidentId, updateDto);

      // Assert
      expect(mockIncidentRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockIncidentId },
        relations: ['machine', 'machine.location', 'reported_by', 'assigned_to'],
      });
      expect(mockIncidentRepository.save).toHaveBeenCalled();
      expect(result.priority).toBe(IncidentPriority.HIGH);
      expect(result.description).toBe('Updated description');
    });

    it('should throw NotFoundException when updating non-existent incident', async () => {
      // Arrange
      mockIncidentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('non-existent-id', { priority: IncidentPriority.HIGH }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update incident metadata', async () => {
      // Arrange
      const updateDto: UpdateIncidentDto = {
        metadata: { error_code: 'E99', component: 'new_component' },
      };
      const existingIncident = { ...mockIncident };
      const updatedIncident = { ...mockIncident, metadata: updateDto.metadata };

      mockIncidentRepository.findOne.mockResolvedValue(existingIncident as Incident);
      mockIncidentRepository.save.mockResolvedValue(updatedIncident as Incident);

      // Act
      const result = await service.update(mockIncidentId, updateDto);

      // Assert
      expect(result.metadata).toEqual(updateDto.metadata);
    });
  });

  describe('assign', () => {
    it('should assign an OPEN incident to a user', async () => {
      // Arrange
      const openIncident = { ...mockIncident, status: IncidentStatus.OPEN };
      const assignedIncident = {
        ...openIncident,
        assigned_to_user_id: mockUserId,
        status: IncidentStatus.IN_PROGRESS,
        started_at: expect.any(Date),
      };

      mockIncidentRepository.findOne.mockResolvedValue(openIncident as Incident);
      mockIncidentRepository.save.mockResolvedValue(assignedIncident as Incident);

      // Act
      const result = await service.assign(mockIncidentId, mockUserId);

      // Assert
      expect(result.assigned_to_user_id).toBe(mockUserId);
      expect(result.status).toBe(IncidentStatus.IN_PROGRESS);
      expect(result.started_at).toEqual(expect.any(Date));
    });

    it('should throw BadRequestException when assigning non-OPEN incident', async () => {
      // Arrange
      const inProgressIncident = { ...mockIncident, status: IncidentStatus.IN_PROGRESS };
      mockIncidentRepository.findOne.mockResolvedValue(inProgressIncident as Incident);

      // Act & Assert
      await expect(service.assign(mockIncidentId, mockUserId)).rejects.toThrow(BadRequestException);
      await expect(service.assign(mockIncidentId, mockUserId)).rejects.toThrow(
        'Можно назначить только открытые инциденты',
      );
    });

    it('should throw BadRequestException when assigning RESOLVED incident', async () => {
      // Arrange
      const resolvedIncident = { ...mockIncident, status: IncidentStatus.RESOLVED };
      mockIncidentRepository.findOne.mockResolvedValue(resolvedIncident as Incident);

      // Act & Assert
      await expect(service.assign(mockIncidentId, mockUserId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when assigning CLOSED incident', async () => {
      // Arrange
      const closedIncident = { ...mockIncident, status: IncidentStatus.CLOSED };
      mockIncidentRepository.findOne.mockResolvedValue(closedIncident as Incident);

      // Act & Assert
      await expect(service.assign(mockIncidentId, mockUserId)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when assigning non-existent incident', async () => {
      // Arrange
      mockIncidentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.assign('non-existent-id', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resolve', () => {
    it('should resolve an OPEN incident', async () => {
      // Arrange
      const openIncident = { ...mockIncident, status: IncidentStatus.OPEN };
      const resolveDto: ResolveIncidentDto = {
        resolution_notes: 'Fixed the issue',
        repair_cost: 500.0,
        repair_task_id: '423e4567-e89b-12d3-a456-426614174003',
      };
      const resolvedIncident = {
        ...openIncident,
        status: IncidentStatus.RESOLVED,
        resolved_at: expect.any(Date),
        resolution_notes: resolveDto.resolution_notes,
        repair_cost: resolveDto.repair_cost,
        repair_task_id: resolveDto.repair_task_id,
      };

      mockIncidentRepository.findOne.mockResolvedValue(openIncident as Incident);
      mockIncidentRepository.save.mockResolvedValue(resolvedIncident as Incident);

      // Act
      const result = await service.resolve(mockIncidentId, resolveDto);

      // Assert
      expect(result.status).toBe(IncidentStatus.RESOLVED);
      expect(result.resolution_notes).toBe(resolveDto.resolution_notes);
      expect(result.repair_cost).toBe(resolveDto.repair_cost);
      expect(result.repair_task_id).toBe(resolveDto.repair_task_id);
      expect(result.resolved_at).toEqual(expect.any(Date));
    });

    it('should resolve an IN_PROGRESS incident', async () => {
      // Arrange
      const inProgressIncident = { ...mockIncident, status: IncidentStatus.IN_PROGRESS };
      const resolveDto: ResolveIncidentDto = {
        resolution_notes: 'Fixed the issue',
      };
      const resolvedIncident = {
        ...inProgressIncident,
        status: IncidentStatus.RESOLVED,
        resolved_at: expect.any(Date),
        resolution_notes: resolveDto.resolution_notes,
        repair_cost: null,
        repair_task_id: null,
      };

      mockIncidentRepository.findOne.mockResolvedValue(inProgressIncident as Incident);
      mockIncidentRepository.save.mockResolvedValue(resolvedIncident as Incident);

      // Act
      const result = await service.resolve(mockIncidentId, resolveDto);

      // Assert
      expect(result.status).toBe(IncidentStatus.RESOLVED);
    });

    it('should throw BadRequestException when resolving already RESOLVED incident', async () => {
      // Arrange
      const resolvedIncident = { ...mockIncident, status: IncidentStatus.RESOLVED };
      mockIncidentRepository.findOne.mockResolvedValue(resolvedIncident as Incident);

      // Act & Assert
      await expect(service.resolve(mockIncidentId, { resolution_notes: 'Notes' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resolve(mockIncidentId, { resolution_notes: 'Notes' })).rejects.toThrow(
        'Инцидент уже решен или закрыт',
      );
    });

    it('should throw BadRequestException when resolving CLOSED incident', async () => {
      // Arrange
      const closedIncident = { ...mockIncident, status: IncidentStatus.CLOSED };
      mockIncidentRepository.findOne.mockResolvedValue(closedIncident as Incident);

      // Act & Assert
      await expect(service.resolve(mockIncidentId, { resolution_notes: 'Notes' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should resolve with null repair_cost when not provided', async () => {
      // Arrange
      const openIncident = { ...mockIncident, status: IncidentStatus.OPEN };
      const resolveDto: ResolveIncidentDto = {
        resolution_notes: 'Fixed the issue',
      };
      const resolvedIncident = {
        ...openIncident,
        status: IncidentStatus.RESOLVED,
        resolved_at: new Date(),
        resolution_notes: resolveDto.resolution_notes,
        repair_cost: null,
        repair_task_id: null,
      };

      mockIncidentRepository.findOne.mockResolvedValue(openIncident as Incident);
      mockIncidentRepository.save.mockResolvedValue(resolvedIncident as Incident);

      // Act
      const result = await service.resolve(mockIncidentId, resolveDto);

      // Assert
      expect(result.repair_cost).toBeNull();
      expect(result.repair_task_id).toBeNull();
    });
  });

  describe('close', () => {
    it('should close a RESOLVED incident', async () => {
      // Arrange
      const resolvedIncident = { ...mockIncident, status: IncidentStatus.RESOLVED };
      const closedIncident = {
        ...resolvedIncident,
        status: IncidentStatus.CLOSED,
        closed_at: expect.any(Date),
      };

      mockIncidentRepository.findOne.mockResolvedValue(resolvedIncident as Incident);
      mockIncidentRepository.save.mockResolvedValue(closedIncident as Incident);

      // Act
      const result = await service.close(mockIncidentId);

      // Assert
      expect(result.status).toBe(IncidentStatus.CLOSED);
      expect(result.closed_at).toEqual(expect.any(Date));
    });

    it('should throw BadRequestException when closing OPEN incident', async () => {
      // Arrange
      const openIncident = { ...mockIncident, status: IncidentStatus.OPEN };
      mockIncidentRepository.findOne.mockResolvedValue(openIncident as Incident);

      // Act & Assert
      await expect(service.close(mockIncidentId)).rejects.toThrow(BadRequestException);
      await expect(service.close(mockIncidentId)).rejects.toThrow(
        'Можно закрыть только решенные инциденты',
      );
    });

    it('should throw BadRequestException when closing IN_PROGRESS incident', async () => {
      // Arrange
      const inProgressIncident = { ...mockIncident, status: IncidentStatus.IN_PROGRESS };
      mockIncidentRepository.findOne.mockResolvedValue(inProgressIncident as Incident);

      // Act & Assert
      await expect(service.close(mockIncidentId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when closing already CLOSED incident', async () => {
      // Arrange
      const closedIncident = { ...mockIncident, status: IncidentStatus.CLOSED };
      mockIncidentRepository.findOne.mockResolvedValue(closedIncident as Incident);

      // Act & Assert
      await expect(service.close(mockIncidentId)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when closing non-existent incident', async () => {
      // Arrange
      mockIncidentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.close('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reopen', () => {
    it('should reopen a CLOSED incident', async () => {
      // Arrange
      const closedIncident = {
        ...mockIncident,
        status: IncidentStatus.CLOSED,
        resolved_at: new Date(),
        closed_at: new Date(),
        metadata: { previous_data: 'test' },
      };
      const reopenedIncident = {
        ...closedIncident,
        status: IncidentStatus.OPEN,
        resolved_at: null,
        closed_at: null,
        metadata: {
          previous_data: 'test',
          reopen_reason: 'Issue reappeared',
          reopened_at: expect.any(String),
        },
      };

      mockIncidentRepository.findOne.mockResolvedValue(closedIncident as Incident);
      mockIncidentRepository.save.mockResolvedValue(reopenedIncident as Incident);

      // Act
      const result = await service.reopen(mockIncidentId, 'Issue reappeared');

      // Assert
      expect(result.status).toBe(IncidentStatus.OPEN);
      expect(result.resolved_at).toBeNull();
      expect(result.closed_at).toBeNull();
      expect(result.metadata).toHaveProperty('reopen_reason', 'Issue reappeared');
      expect(result.metadata).toHaveProperty('reopened_at');
    });

    it('should throw BadRequestException when reopening OPEN incident', async () => {
      // Arrange
      const openIncident = { ...mockIncident, status: IncidentStatus.OPEN };
      mockIncidentRepository.findOne.mockResolvedValue(openIncident as Incident);

      // Act & Assert
      await expect(service.reopen(mockIncidentId, 'reason')).rejects.toThrow(BadRequestException);
      await expect(service.reopen(mockIncidentId, 'reason')).rejects.toThrow(
        'Можно переоткрыть только закрытые инциденты',
      );
    });

    it('should throw BadRequestException when reopening IN_PROGRESS incident', async () => {
      // Arrange
      const inProgressIncident = { ...mockIncident, status: IncidentStatus.IN_PROGRESS };
      mockIncidentRepository.findOne.mockResolvedValue(inProgressIncident as Incident);

      // Act & Assert
      await expect(service.reopen(mockIncidentId, 'reason')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reopening RESOLVED incident', async () => {
      // Arrange
      const resolvedIncident = { ...mockIncident, status: IncidentStatus.RESOLVED };
      mockIncidentRepository.findOne.mockResolvedValue(resolvedIncident as Incident);

      // Act & Assert
      await expect(service.reopen(mockIncidentId, 'reason')).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete an incident', async () => {
      // Arrange
      mockIncidentRepository.findOne.mockResolvedValue(mockIncident as Incident);
      mockIncidentRepository.softRemove.mockResolvedValue(mockIncident as Incident);

      // Act
      await service.remove(mockIncidentId);

      // Assert
      expect(mockIncidentRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockIncidentId },
        relations: ['machine', 'machine.location', 'reported_by', 'assigned_to'],
      });
      expect(mockIncidentRepository.softRemove).toHaveBeenCalledWith(mockIncident);
    });

    it('should throw NotFoundException when removing non-existent incident', async () => {
      // Arrange
      mockIncidentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return incident statistics', async () => {
      // Arrange
      mockIncidentRepository.count.mockResolvedValue(10);

      const byStatus = [
        { status: IncidentStatus.OPEN, count: '5' },
        { status: IncidentStatus.IN_PROGRESS, count: '3' },
        { status: IncidentStatus.RESOLVED, count: '2' },
      ];
      const byType = [
        { type: IncidentType.TECHNICAL_FAILURE, count: '6' },
        { type: IncidentType.VANDALISM, count: '4' },
      ];
      const byPriority = [
        { priority: IncidentPriority.HIGH, count: '4' },
        { priority: IncidentPriority.MEDIUM, count: '6' },
      ];

      // Configure query builder chain for different calls
      let queryBuilderCallCount = 0;
      mockIncidentRepository.createQueryBuilder.mockImplementation(() => {
        queryBuilderCallCount++;
        const qb = {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawMany: jest.fn(),
          getRawOne: jest.fn(),
        } as any;

        // Return different results based on call
        if (queryBuilderCallCount === 1) {
          qb.getRawMany.mockResolvedValue(byStatus);
        } else if (queryBuilderCallCount === 2) {
          qb.getRawMany.mockResolvedValue(byType);
        } else if (queryBuilderCallCount === 3) {
          qb.getRawMany.mockResolvedValue(byPriority);
        } else if (queryBuilderCallCount === 4) {
          qb.getRawOne.mockResolvedValue({ avg_seconds: '7200' }); // 2 hours in seconds
        } else if (queryBuilderCallCount === 5) {
          qb.getRawOne.mockResolvedValue({ total: '5000.00' });
        }

        return qb;
      });

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 10,
        by_status: [
          { status: IncidentStatus.OPEN, count: 5 },
          { status: IncidentStatus.IN_PROGRESS, count: 3 },
          { status: IncidentStatus.RESOLVED, count: 2 },
        ],
        by_type: [
          { type: IncidentType.TECHNICAL_FAILURE, count: 6 },
          { type: IncidentType.VANDALISM, count: 4 },
        ],
        by_priority: [
          { priority: IncidentPriority.HIGH, count: 4 },
          { priority: IncidentPriority.MEDIUM, count: 6 },
        ],
        avg_resolution_time_hours: 2,
        total_repair_cost: 5000.0,
      });
    });

    it('should return zero values when no data exists', async () => {
      // Arrange
      mockIncidentRepository.count.mockResolvedValue(0);
      mockIncidentRepository.createQueryBuilder.mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([]),
          getRawOne: jest.fn().mockResolvedValue(null),
        } as any;
      });

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.total).toBe(0);
      expect(result.by_status).toEqual([]);
      expect(result.by_type).toEqual([]);
      expect(result.by_priority).toEqual([]);
      expect(result.avg_resolution_time_hours).toBe(0);
      expect(result.total_repair_cost).toBe(0);
    });
  });

  describe('getCriticalIncidents', () => {
    it('should return open critical incidents', async () => {
      // Arrange
      const criticalIncidents = [
        { ...mockIncident, priority: IncidentPriority.CRITICAL, status: IncidentStatus.OPEN },
        {
          ...mockIncident,
          id: 'another-id',
          priority: IncidentPriority.CRITICAL,
          status: IncidentStatus.OPEN,
        },
      ];
      mockIncidentRepository.find.mockResolvedValue(criticalIncidents as Incident[]);

      // Act
      const result = await service.getCriticalIncidents();

      // Assert
      expect(mockIncidentRepository.find).toHaveBeenCalledWith({
        where: {
          priority: IncidentPriority.CRITICAL,
          status: IncidentStatus.OPEN,
        },
        relations: ['machine', 'machine.location'],
        order: {
          reported_at: 'DESC',
        },
      });
      expect(result).toEqual(criticalIncidents);
    });

    it('should return empty array when no critical incidents exist', async () => {
      // Arrange
      mockIncidentRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getCriticalIncidents();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('status transition workflow', () => {
    it('should follow correct workflow: OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED', async () => {
      // This test validates the complete incident lifecycle

      // Step 1: Create incident (OPEN)
      const openIncident = { ...mockIncident, status: IncidentStatus.OPEN };
      mockIncidentRepository.create.mockReturnValue(openIncident as Incident);
      mockIncidentRepository.save.mockResolvedValue(openIncident as Incident);

      const created = await service.create(createIncidentDto);
      expect(created.status).toBe(IncidentStatus.OPEN);

      // Step 2: Assign (OPEN -> IN_PROGRESS)
      mockIncidentRepository.findOne.mockResolvedValue(openIncident as Incident);
      const inProgressIncident = {
        ...openIncident,
        status: IncidentStatus.IN_PROGRESS,
        assigned_to_user_id: mockUserId,
      };
      mockIncidentRepository.save.mockResolvedValue(inProgressIncident as Incident);

      const assigned = await service.assign(mockIncidentId, mockUserId);
      expect(assigned.status).toBe(IncidentStatus.IN_PROGRESS);

      // Step 3: Resolve (IN_PROGRESS -> RESOLVED)
      mockIncidentRepository.findOne.mockResolvedValue(inProgressIncident as Incident);
      const resolvedIncident = { ...inProgressIncident, status: IncidentStatus.RESOLVED };
      mockIncidentRepository.save.mockResolvedValue(resolvedIncident as Incident);

      const resolved = await service.resolve(mockIncidentId, { resolution_notes: 'Fixed' });
      expect(resolved.status).toBe(IncidentStatus.RESOLVED);

      // Step 4: Close (RESOLVED -> CLOSED)
      mockIncidentRepository.findOne.mockResolvedValue(resolvedIncident as Incident);
      const closedIncident = { ...resolvedIncident, status: IncidentStatus.CLOSED };
      mockIncidentRepository.save.mockResolvedValue(closedIncident as Incident);

      const closed = await service.close(mockIncidentId);
      expect(closed.status).toBe(IncidentStatus.CLOSED);
    });

    it('should allow reopening closed incidents', async () => {
      // Arrange
      const closedIncident = { ...mockIncident, status: IncidentStatus.CLOSED, metadata: {} };
      mockIncidentRepository.findOne.mockResolvedValue(closedIncident as Incident);

      const reopenedIncident = { ...closedIncident, status: IncidentStatus.OPEN };
      mockIncidentRepository.save.mockResolvedValue(reopenedIncident as Incident);

      // Act
      const result = await service.reopen(mockIncidentId, 'Issue reoccurred');

      // Assert
      expect(result.status).toBe(IncidentStatus.OPEN);
    });
  });
});
