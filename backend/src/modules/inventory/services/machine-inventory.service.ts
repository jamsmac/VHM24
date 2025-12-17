/**
 * Machine Inventory Service
 *
 * Handles machine-level inventory operations:
 * - Get machine inventory
 * - Record sales
 * - Deduct from machine (sales import)
 * - Inventory adjustments (stock take)
 * - Low stock detection
 */

import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MachineInventory } from '../entities/machine-inventory.entity';
import { MovementType } from '../entities/inventory-movement.entity';
import {
  UpdateMachineInventoryDto,
  RecordSaleDto,
  AdjustInventoryDto,
} from '../dto/machine-inventory.dto';
import { InventoryMovementService } from './inventory-movement.service';

@Injectable()
export class MachineInventoryService {
  /**
   * Safe nomenclature fields for optimized queries
   */
  private readonly SAFE_NOMENCLATURE_FIELDS = ['id', 'name', 'sku', 'unit', 'category'];

  /**
   * Safe machine fields for optimized queries
   */
  private readonly SAFE_MACHINE_FIELDS = [
    'id',
    'machine_number',
    'name',
    'location_name',
    'status',
  ];

  constructor(
    @InjectRepository(MachineInventory)
    private readonly machineInventoryRepository: Repository<MachineInventory>,
    @Inject(forwardRef(() => InventoryMovementService))
    private readonly movementService: InventoryMovementService,
  ) {}

  /**
   * Get all inventory for a machine
   * NOTE: Automatically filters out soft-deleted inventory entries
   */
  async getMachineInventory(machineId: string): Promise<MachineInventory[]> {
    return this.machineInventoryRepository
      .createQueryBuilder('inventory')
      .leftJoin('inventory.nomenclature', 'nomenclature')
      .addSelect(this.SAFE_NOMENCLATURE_FIELDS.map((f) => `nomenclature.${f}`))
      .leftJoin('inventory.machine', 'machine')
      .addSelect(this.SAFE_MACHINE_FIELDS.map((f) => `machine.${f}`))
      .where('inventory.machine_id = :machineId', { machineId })
      .andWhere('inventory.deleted_at IS NULL')
      .andWhere('machine.deleted_at IS NULL')
      .orderBy('nomenclature.name', 'ASC')
      .getMany();
  }

  /**
   * Get machine inventory for a specific product
   * Creates record with zero quantity if not exists
   */
  async getMachineInventoryByNomenclature(
    machineId: string,
    nomenclatureId: string,
  ): Promise<MachineInventory> {
    let inventory = await this.machineInventoryRepository.findOne({
      where: {
        machine_id: machineId,
        nomenclature_id: nomenclatureId,
      },
    });

    if (!inventory) {
      inventory = this.machineInventoryRepository.create({
        machine_id: machineId,
        nomenclature_id: nomenclatureId,
        current_quantity: 0,
        min_stock_level: 0,
      });
      inventory = await this.machineInventoryRepository.save(inventory);
    }

    return inventory;
  }

  /**
   * Record a sale (ingredient consumption from machine)
   */
  async recordSale(dto: RecordSaleDto, userId: string): Promise<MachineInventory> {
    const machineInventory = await this.getMachineInventoryByNomenclature(
      dto.machine_id,
      dto.nomenclature_id,
    );

    if (Number(machineInventory.current_quantity) >= Number(dto.quantity)) {
      machineInventory.current_quantity =
        Number(machineInventory.current_quantity) - Number(dto.quantity);
      await this.machineInventoryRepository.save(machineInventory);
    }

    await this.movementService.createMovement({
      movement_type: MovementType.MACHINE_SALE,
      nomenclature_id: dto.nomenclature_id,
      quantity: dto.quantity,
      performed_by_user_id: userId,
      machine_id: dto.machine_id,
      operation_date: dto.operation_date ? new Date(dto.operation_date) : new Date(),
      notes: `Продажа: -${dto.quantity}`,
      metadata: dto.transaction_id ? { transaction_id: dto.transaction_id } : null,
    });

    return machineInventory;
  }

  /**
   * Deduct stock from machine (for sales import)
   *
   * CRITICAL: Used by sales-import.processor.ts
   *
   * @throws BadRequestException if insufficient stock
   */
  async deductFromMachine(
    machineId: string,
    nomenclatureId: string,
    quantity: number,
    reason: string,
  ): Promise<void> {
    const machineInventory = await this.getMachineInventoryByNomenclature(machineId, nomenclatureId);

    const currentQuantity = Number(machineInventory.current_quantity);
    const deductQuantity = Number(quantity);

    if (currentQuantity < deductQuantity) {
      throw new BadRequestException(
        `Недостаточно товара в аппарате. ` +
          `Доступно: ${currentQuantity}, требуется: ${deductQuantity}. ` +
          `Аппарат: ${machineId}, товар: ${nomenclatureId}`,
      );
    }

    machineInventory.current_quantity = currentQuantity - deductQuantity;
    await this.machineInventoryRepository.save(machineInventory);

    await this.movementService.createMovement({
      movement_type: MovementType.MACHINE_SALE,
      nomenclature_id: nomenclatureId,
      quantity: deductQuantity,
      performed_by_user_id: null, // Automated import
      machine_id: machineId,
      operation_date: new Date(),
      notes: reason,
    });
  }

  /**
   * Update machine inventory settings
   */
  async updateMachineInventory(
    machineId: string,
    nomenclatureId: string,
    dto: UpdateMachineInventoryDto,
  ): Promise<MachineInventory> {
    const inventory = await this.getMachineInventoryByNomenclature(machineId, nomenclatureId);

    Object.assign(inventory, dto);
    return this.machineInventoryRepository.save(inventory);
  }

  /**
   * Get machines with low stock
   * NOTE: Filters out inventory for soft-deleted machines
   */
  async getMachinesLowStock(): Promise<MachineInventory[]> {
    return this.machineInventoryRepository
      .createQueryBuilder('inventory')
      .leftJoin('inventory.machine', 'machine')
      .addSelect(this.SAFE_MACHINE_FIELDS.map((f) => `machine.${f}`))
      .leftJoin('inventory.nomenclature', 'nomenclature')
      .addSelect(this.SAFE_NOMENCLATURE_FIELDS.map((f) => `nomenclature.${f}`))
      .where('inventory.current_quantity <= inventory.min_stock_level')
      .andWhere('inventory.min_stock_level > 0')
      .andWhere('inventory.deleted_at IS NULL')
      .andWhere('machine.deleted_at IS NULL')
      .orderBy('machine.machine_number', 'ASC')
      .addOrderBy('inventory.current_quantity', 'ASC')
      .getMany();
  }

  /**
   * Adjust machine inventory (stock take)
   */
  async adjustMachineInventory(
    machineId: string,
    nomenclatureId: string,
    dto: AdjustInventoryDto,
    userId: string,
  ): Promise<MachineInventory> {
    const inventory = await this.getMachineInventoryByNomenclature(machineId, nomenclatureId);

    const oldQuantity = Number(inventory.current_quantity);
    const newQuantity = Number(dto.actual_quantity);
    const difference = newQuantity - oldQuantity;

    inventory.current_quantity = newQuantity;
    await this.machineInventoryRepository.save(inventory);

    await this.movementService.createMovement({
      movement_type: MovementType.ADJUSTMENT,
      nomenclature_id: nomenclatureId,
      quantity: Math.abs(difference),
      performed_by_user_id: userId,
      machine_id: machineId,
      notes:
        dto.notes ||
        `Корректировка: ${oldQuantity} -> ${newQuantity} (${difference >= 0 ? '+' : ''}${difference})`,
    });

    return inventory;
  }
}
