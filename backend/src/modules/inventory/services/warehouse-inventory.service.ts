/**
 * Warehouse Inventory Service
 *
 * Handles warehouse-level inventory operations:
 * - Get warehouse inventory
 * - Add to warehouse (incoming stock)
 * - Remove from warehouse (write-offs)
 * - Low stock detection
 * - Stock reservations
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WarehouseInventory } from '../entities/warehouse-inventory.entity';
import { InventoryMovement, MovementType } from '../entities/inventory-movement.entity';
import {
  AddToWarehouseDto,
  RemoveFromWarehouseDto,
  UpdateWarehouseInventoryDto,
} from '../dto/warehouse-inventory.dto';
import { InventoryMovementService } from './inventory-movement.service';

@Injectable()
export class WarehouseInventoryService {
  /**
   * Safe nomenclature fields for optimized queries
   */
  private readonly SAFE_NOMENCLATURE_FIELDS = ['id', 'name', 'sku', 'unit', 'category'];

  constructor(
    @InjectRepository(WarehouseInventory)
    private readonly warehouseInventoryRepository: Repository<WarehouseInventory>,
    private readonly dataSource: DataSource,
    private readonly movementService: InventoryMovementService,
  ) {}

  /**
   * Get all warehouse inventory
   */
  async getWarehouseInventory(): Promise<WarehouseInventory[]> {
    return this.warehouseInventoryRepository.find({
      order: { nomenclature: { name: 'ASC' } },
    });
  }

  /**
   * Get warehouse inventory for a specific product
   * Creates record with zero quantity if not exists
   */
  async getWarehouseInventoryByNomenclature(nomenclatureId: string): Promise<WarehouseInventory> {
    let inventory = await this.warehouseInventoryRepository.findOne({
      where: { nomenclature_id: nomenclatureId },
    });

    if (!inventory) {
      inventory = this.warehouseInventoryRepository.create({
        nomenclature_id: nomenclatureId,
        current_quantity: 0,
        min_stock_level: 0,
      });
      inventory = await this.warehouseInventoryRepository.save(inventory);
    }

    return inventory;
  }

  /**
   * Add stock to warehouse (incoming shipment)
   */
  async addToWarehouse(dto: AddToWarehouseDto, userId: string): Promise<WarehouseInventory> {
    const inventory = await this.getWarehouseInventoryByNomenclature(dto.nomenclature_id);

    inventory.current_quantity = Number(inventory.current_quantity) + Number(dto.quantity);
    inventory.last_restocked_at = new Date();

    await this.warehouseInventoryRepository.save(inventory);

    await this.movementService.createMovement({
      movement_type: MovementType.WAREHOUSE_IN,
      nomenclature_id: dto.nomenclature_id,
      quantity: dto.quantity,
      performed_by_user_id: userId,
      notes: dto.notes || `Приход на склад: +${dto.quantity}`,
      metadata: dto.metadata,
    });

    return inventory;
  }

  /**
   * Remove stock from warehouse (write-off, spoilage, etc.)
   */
  async removeFromWarehouse(
    dto: RemoveFromWarehouseDto,
    userId: string,
  ): Promise<WarehouseInventory> {
    const inventory = await this.getWarehouseInventoryByNomenclature(dto.nomenclature_id);

    if (Number(inventory.current_quantity) < Number(dto.quantity)) {
      throw new BadRequestException(
        `Недостаточно товара на складе. Доступно: ${inventory.current_quantity}, запрошено: ${dto.quantity}`,
      );
    }

    inventory.current_quantity = Number(inventory.current_quantity) - Number(dto.quantity);
    await this.warehouseInventoryRepository.save(inventory);

    await this.movementService.createMovement({
      movement_type: MovementType.WAREHOUSE_OUT,
      nomenclature_id: dto.nomenclature_id,
      quantity: dto.quantity,
      performed_by_user_id: userId,
      notes: dto.notes || `Списание со склада: -${dto.quantity}`,
    });

    return inventory;
  }

  /**
   * Update warehouse inventory settings
   */
  async updateWarehouseInventory(
    nomenclatureId: string,
    dto: UpdateWarehouseInventoryDto,
  ): Promise<WarehouseInventory> {
    const inventory = await this.getWarehouseInventoryByNomenclature(nomenclatureId);

    Object.assign(inventory, dto);
    return this.warehouseInventoryRepository.save(inventory);
  }

  /**
   * Get low stock items in warehouse
   */
  async getWarehouseLowStock(): Promise<WarehouseInventory[]> {
    return this.warehouseInventoryRepository
      .createQueryBuilder('inventory')
      .leftJoin('inventory.nomenclature', 'nomenclature')
      .addSelect(this.SAFE_NOMENCLATURE_FIELDS.map((f) => `nomenclature.${f}`))
      .where('inventory.current_quantity <= inventory.min_stock_level')
      .andWhere('inventory.min_stock_level > 0')
      .orderBy('inventory.current_quantity', 'ASC')
      .getMany();
  }

  /**
   * Reserve warehouse stock for a task
   *
   * CRITICAL: Prevents multiple operators from getting tasks for the same stock.
   * Uses pessimistic locking to prevent race conditions.
   */
  async reserveWarehouseStock(
    nomenclatureId: string,
    quantity: number,
    reservedFor: string,
    userId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(WarehouseInventory, {
        where: { nomenclature_id: nomenclatureId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException(`Товар ${nomenclatureId} не найден на складе`);
      }

      const currentQuantity = Number(inventory.current_quantity);
      const reservedQuantity = Number(inventory.reserved_quantity || 0);
      const availableQuantity = currentQuantity - reservedQuantity;
      const quantityToReserve = Number(quantity);

      if (availableQuantity < quantityToReserve) {
        throw new BadRequestException(
          `Недостаточно товара на складе для резервирования. ` +
            `Доступно: ${availableQuantity}, запрошено: ${quantityToReserve}. ` +
            `Товар: ${nomenclatureId}`,
        );
      }

      inventory.reserved_quantity = reservedQuantity + quantityToReserve;
      await manager.save(WarehouseInventory, inventory);

      const movement = manager.create(InventoryMovement, {
        movement_type: MovementType.WAREHOUSE_RESERVATION,
        nomenclature_id: nomenclatureId,
        quantity: quantityToReserve,
        performed_by_user_id: userId,
        operation_date: new Date(),
        notes: `Резервирование для: ${reservedFor}`,
      });
      await manager.save(InventoryMovement, movement);
    });
  }

  /**
   * Release warehouse stock reservation
   * Uses pessimistic locking to prevent race conditions.
   */
  async releaseWarehouseReservation(
    nomenclatureId: string,
    quantity: number,
    reservedFor: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(WarehouseInventory, {
        where: { nomenclature_id: nomenclatureId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException(`Товар ${nomenclatureId} не найден на складе`);
      }

      const reservedQuantity = Number(inventory.reserved_quantity || 0);
      const quantityToRelease = Number(quantity);

      inventory.reserved_quantity = Math.max(0, reservedQuantity - quantityToRelease);
      await manager.save(WarehouseInventory, inventory);

      const movement = manager.create(InventoryMovement, {
        movement_type: MovementType.WAREHOUSE_RESERVATION_RELEASE,
        nomenclature_id: nomenclatureId,
        quantity: quantityToRelease,
        performed_by_user_id: null,
        operation_date: new Date(),
        notes: `Освобождение резервирования для: ${reservedFor}`,
      });
      await manager.save(InventoryMovement, movement);
    });
  }
}
