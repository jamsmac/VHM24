/**
 * Inventory Service - Facade
 *
 * This service acts as a facade for the inventory module, delegating
 * to specialized services for different inventory operations.
 *
 * Specialized services:
 * - WarehouseInventoryService: Warehouse-level operations
 * - OperatorInventoryService: Operator-level operations
 * - MachineInventoryService: Machine-level operations
 * - InventoryTransferService: Transfers between levels
 * - InventoryMovementService: Movement tracking and history
 * - InventoryReservationService: Reservation management
 */

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { WarehouseInventory } from './entities/warehouse-inventory.entity';
import { OperatorInventory } from './entities/operator-inventory.entity';
import { MachineInventory } from './entities/machine-inventory.entity';
import { InventoryMovement, MovementType } from './entities/inventory-movement.entity';
import { InventoryReservation } from './entities/inventory-reservation.entity';
import {
  AddToWarehouseDto,
  RemoveFromWarehouseDto,
  UpdateWarehouseInventoryDto,
} from './dto/warehouse-inventory.dto';
import {
  TransferWarehouseToOperatorDto,
  TransferOperatorToWarehouseDto,
  TransferOperatorToMachineDto,
  TransferMachineToOperatorDto,
} from './dto/transfer-inventory.dto';
import {
  UpdateMachineInventoryDto,
  RecordSaleDto,
  AdjustInventoryDto,
} from './dto/machine-inventory.dto';
import { WarehouseInventoryService } from './services/warehouse-inventory.service';
import { OperatorInventoryService } from './services/operator-inventory.service';
import { MachineInventoryService } from './services/machine-inventory.service';
import { InventoryTransferService } from './services/inventory-transfer.service';
import { InventoryMovementService } from './services/inventory-movement.service';
import { InventoryReservationService } from './services/inventory-reservation.service';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(forwardRef(() => WarehouseInventoryService))
    private readonly warehouseInventoryService: WarehouseInventoryService,
    @Inject(forwardRef(() => OperatorInventoryService))
    private readonly operatorInventoryService: OperatorInventoryService,
    @Inject(forwardRef(() => MachineInventoryService))
    private readonly machineInventoryService: MachineInventoryService,
    @Inject(forwardRef(() => InventoryTransferService))
    private readonly inventoryTransferService: InventoryTransferService,
    @Inject(forwardRef(() => InventoryMovementService))
    private readonly inventoryMovementService: InventoryMovementService,
    @Inject(forwardRef(() => InventoryReservationService))
    private readonly inventoryReservationService: InventoryReservationService,
  ) {}

  // ============================================================================
  // WAREHOUSE INVENTORY (Level 1: Warehouse)
  // ============================================================================

  async getWarehouseInventory(): Promise<WarehouseInventory[]> {
    return this.warehouseInventoryService.getWarehouseInventory();
  }

  async getWarehouseInventoryByNomenclature(nomenclatureId: string): Promise<WarehouseInventory> {
    return this.warehouseInventoryService.getWarehouseInventoryByNomenclature(nomenclatureId);
  }

  async addToWarehouse(dto: AddToWarehouseDto, userId: string): Promise<WarehouseInventory> {
    return this.warehouseInventoryService.addToWarehouse(dto, userId);
  }

  async removeFromWarehouse(
    dto: RemoveFromWarehouseDto,
    userId: string,
  ): Promise<WarehouseInventory> {
    return this.warehouseInventoryService.removeFromWarehouse(dto, userId);
  }

  async updateWarehouseInventory(
    nomenclatureId: string,
    dto: UpdateWarehouseInventoryDto,
  ): Promise<WarehouseInventory> {
    return this.warehouseInventoryService.updateWarehouseInventory(nomenclatureId, dto);
  }

  async getWarehouseLowStock(): Promise<WarehouseInventory[]> {
    return this.warehouseInventoryService.getWarehouseLowStock();
  }

  async reserveWarehouseStock(
    nomenclatureId: string,
    quantity: number,
    reservedFor: string,
    userId: string,
  ): Promise<void> {
    return this.warehouseInventoryService.reserveWarehouseStock(
      nomenclatureId,
      quantity,
      reservedFor,
      userId,
    );
  }

  async releaseWarehouseReservation(
    nomenclatureId: string,
    quantity: number,
    reservedFor: string,
  ): Promise<void> {
    return this.warehouseInventoryService.releaseWarehouseReservation(
      nomenclatureId,
      quantity,
      reservedFor,
    );
  }

  // ============================================================================
  // OPERATOR INVENTORY (Level 2: Operator)
  // ============================================================================

  async getOperatorInventory(operatorId: string): Promise<OperatorInventory[]> {
    return this.operatorInventoryService.getOperatorInventory(operatorId);
  }

  async getOperatorInventoryByNomenclature(
    operatorId: string,
    nomenclatureId: string,
  ): Promise<OperatorInventory> {
    return this.operatorInventoryService.getOperatorInventoryByNomenclature(
      operatorId,
      nomenclatureId,
    );
  }

  // ============================================================================
  // MACHINE INVENTORY (Level 3: Machine)
  // ============================================================================

  async getMachineInventory(machineId: string): Promise<MachineInventory[]> {
    return this.machineInventoryService.getMachineInventory(machineId);
  }

  async getMachineInventoryByNomenclature(
    machineId: string,
    nomenclatureId: string,
  ): Promise<MachineInventory> {
    return this.machineInventoryService.getMachineInventoryByNomenclature(machineId, nomenclatureId);
  }

  async recordSale(dto: RecordSaleDto, userId: string): Promise<MachineInventory> {
    return this.machineInventoryService.recordSale(dto, userId);
  }

  async deductFromMachine(
    machineId: string,
    nomenclatureId: string,
    quantity: number,
    reason: string,
  ): Promise<void> {
    return this.machineInventoryService.deductFromMachine(
      machineId,
      nomenclatureId,
      quantity,
      reason,
    );
  }

  async updateMachineInventory(
    machineId: string,
    nomenclatureId: string,
    dto: UpdateMachineInventoryDto,
  ): Promise<MachineInventory> {
    return this.machineInventoryService.updateMachineInventory(machineId, nomenclatureId, dto);
  }

  async getMachinesLowStock(): Promise<MachineInventory[]> {
    return this.machineInventoryService.getMachinesLowStock();
  }

  async adjustMachineInventory(
    machineId: string,
    nomenclatureId: string,
    dto: AdjustInventoryDto,
    userId: string,
  ): Promise<MachineInventory> {
    return this.machineInventoryService.adjustMachineInventory(
      machineId,
      nomenclatureId,
      dto,
      userId,
    );
  }

  // ============================================================================
  // TRANSFERS
  // ============================================================================

  async transferWarehouseToOperator(
    dto: TransferWarehouseToOperatorDto,
    userId: string,
  ): Promise<{ warehouse: WarehouseInventory; operator: OperatorInventory }> {
    return this.inventoryTransferService.transferWarehouseToOperator(dto, userId);
  }

  async transferOperatorToWarehouse(
    dto: TransferOperatorToWarehouseDto,
    userId: string,
  ): Promise<{ warehouse: WarehouseInventory; operator: OperatorInventory }> {
    return this.inventoryTransferService.transferOperatorToWarehouse(dto, userId);
  }

  async transferOperatorToMachine(
    dto: TransferOperatorToMachineDto,
    userId: string,
  ): Promise<{ operator: OperatorInventory; machine: MachineInventory }> {
    return this.inventoryTransferService.transferOperatorToMachine(dto, userId);
  }

  async transferMachineToOperator(
    dto: TransferMachineToOperatorDto,
    userId: string,
  ): Promise<{ machine: MachineInventory; operator: OperatorInventory }> {
    return this.inventoryTransferService.transferMachineToOperator(dto, userId);
  }

  // ============================================================================
  // MOVEMENTS
  // ============================================================================

  async getMovements(
    movementType?: MovementType,
    nomenclatureId?: string,
    machineId?: string,
    operatorId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<InventoryMovement[]> {
    return this.inventoryMovementService.getMovements(
      movementType,
      nomenclatureId,
      machineId,
      operatorId,
      dateFrom,
      dateTo,
    );
  }

  async getMovementStats(dateFrom?: Date, dateTo?: Date) {
    return this.inventoryMovementService.getMovementStats(dateFrom, dateTo);
  }

  // ============================================================================
  // RESERVATIONS
  // ============================================================================

  async createReservation(
    taskId: string,
    operatorId: string,
    items: Array<{ nomenclature_id: string; quantity: number }>,
    expiresInHours?: number,
  ): Promise<InventoryReservation[]> {
    return this.inventoryReservationService.createReservation(
      taskId,
      operatorId,
      items,
      expiresInHours,
    );
  }

  async fulfillReservation(taskId: string): Promise<InventoryReservation[]> {
    return this.inventoryReservationService.fulfillReservation(taskId);
  }

  async cancelReservation(taskId: string): Promise<InventoryReservation[]> {
    return this.inventoryReservationService.cancelReservation(taskId);
  }

  async expireOldReservations(): Promise<number> {
    return this.inventoryReservationService.expireOldReservations();
  }

  async getReservationsByTask(taskId: string): Promise<InventoryReservation[]> {
    return this.inventoryReservationService.getReservationsByTask(taskId);
  }

  async getActiveReservationsByOperator(operatorId: string): Promise<InventoryReservation[]> {
    return this.inventoryReservationService.getActiveReservationsByOperator(operatorId);
  }

  async getActiveReservations(): Promise<InventoryReservation[]> {
    return this.inventoryReservationService.getActiveReservations();
  }

  async getReservationsByOperator(operatorId: string): Promise<InventoryReservation[]> {
    return this.inventoryReservationService.getReservationsByOperator(operatorId);
  }
}
