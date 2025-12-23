import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { InventoryReservationService } from './inventory-reservation.service';
import { InventoryReservation, ReservationStatus, InventoryLevel } from '../entities/inventory-reservation.entity';

describe('InventoryReservationService', () => {
  let service: InventoryReservationService;
  const mockReservation = { id: 'res-1', task_id: 'task-1', nomenclature_id: 'nom-1', quantity_reserved: 10, status: ReservationStatus.PENDING, inventory_level: InventoryLevel.OPERATOR, reference_id: 'op-1' };
  const mockOperatorInventory = { operator_id: 'op-1', nomenclature_id: 'nom-1', current_quantity: 100, reserved_quantity: 0 };
  const mockManager = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn().mockImplementation((_, data) => data),
    save: jest.fn().mockImplementation((_, entity) => Promise.resolve(entity)),
  };
  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb) => cb(mockManager)),
  };
  const mockReservationRepo = {
    find: jest.fn().mockResolvedValue([mockReservation]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryReservationService,
        { provide: getRepositoryToken(InventoryReservation), useValue: mockReservationRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();
    service = module.get<InventoryReservationService>(InventoryReservationService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('createReservation', () => {
    it('should create reservations', async () => {
      mockManager.findOne.mockResolvedValue({ ...mockOperatorInventory, current_quantity: 100, reserved_quantity: 0 });
      const result = await service.createReservation('task-1', 'op-1', [{ nomenclature_id: 'nom-1', quantity: 10 }]);
      expect(result.length).toBe(1);
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should throw if operator has no inventory', async () => {
      mockManager.findOne.mockResolvedValue(null);
      await expect(service.createReservation('task-1', 'op-1', [{ nomenclature_id: 'nom-1', quantity: 10 }])).rejects.toThrow(BadRequestException);
    });

    it('should throw if insufficient quantity', async () => {
      mockManager.findOne.mockResolvedValue({ ...mockOperatorInventory, current_quantity: 5, reserved_quantity: 0 });
      await expect(service.createReservation('task-1', 'op-1', [{ nomenclature_id: 'nom-1', quantity: 10 }])).rejects.toThrow(BadRequestException);
    });
  });

  describe('fulfillReservation', () => {
    it('should fulfill reservations', async () => {
      mockManager.find.mockResolvedValue([{ ...mockReservation }]);
      mockManager.findOne.mockResolvedValue({ ...mockOperatorInventory, reserved_quantity: 10 });
      const result = await service.fulfillReservation('task-1');
      expect(result.length).toBe(1);
      expect(result[0].status).toBe(ReservationStatus.FULFILLED);
    });

    it('should return empty if no pending reservations', async () => {
      mockManager.find.mockResolvedValue([]);
      const result = await service.fulfillReservation('task-1');
      expect(result).toEqual([]);
    });
  });

  describe('cancelReservation', () => {
    it('should cancel reservations', async () => {
      mockManager.find.mockResolvedValue([{ ...mockReservation }]);
      mockManager.findOne.mockResolvedValue({ ...mockOperatorInventory, reserved_quantity: 10 });
      const result = await service.cancelReservation('task-1');
      expect(result.length).toBe(1);
      expect(result[0].status).toBe(ReservationStatus.CANCELLED);
    });

    it('should handle warehouse inventory level', async () => {
      mockManager.find.mockResolvedValue([{ ...mockReservation, inventory_level: InventoryLevel.WAREHOUSE }]);
      mockManager.findOne.mockResolvedValue({ nomenclature_id: 'nom-1', reserved_quantity: 10 });
      const result = await service.cancelReservation('task-1');
      expect(result.length).toBe(1);
    });
  });

  describe('expireOldReservations', () => {
    it('should expire old reservations', async () => {
      mockManager.find.mockResolvedValue([{ ...mockReservation }]);
      mockManager.findOne.mockResolvedValue({ ...mockOperatorInventory, reserved_quantity: 10 });
      const result = await service.expireOldReservations();
      expect(result).toBe(1);
    });

    it('should return 0 if no expired reservations', async () => {
      mockManager.find.mockResolvedValue([]);
      const result = await service.expireOldReservations();
      expect(result).toBe(0);
    });
  });

  describe('getReservationsByTask', () => {
    it('should return reservations by task', async () => {
      const result = await service.getReservationsByTask('task-1');
      expect(result).toEqual([mockReservation]);
    });
  });

  describe('getActiveReservationsByOperator', () => {
    it('should return active reservations by operator', async () => {
      const result = await service.getActiveReservationsByOperator('op-1');
      expect(result).toEqual([mockReservation]);
    });
  });

  describe('getActiveReservations', () => {
    it('should return all active reservations', async () => {
      const result = await service.getActiveReservations();
      expect(result).toEqual([mockReservation]);
    });
  });

  describe('getReservationsByOperator', () => {
    it('should return all reservations by operator', async () => {
      const result = await service.getReservationsByOperator('op-1');
      expect(result).toEqual([mockReservation]);
    });
  });
});
