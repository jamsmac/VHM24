/**
 * Inventory Transfer Service
 *
 * Handles all transfers between inventory levels:
 * - Warehouse → Operator
 * - Operator → Warehouse (return)
 * - Operator → Machine (refill)
 * - Machine → Operator (removal)
 *
 * All transfers use pessimistic locking to prevent race conditions.
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WarehouseInventory } from '../entities/warehouse-inventory.entity';
import { OperatorInventory } from '../entities/operator-inventory.entity';
import { MachineInventory } from '../entities/machine-inventory.entity';
import { InventoryMovement, MovementType } from '../entities/inventory-movement.entity';
import {
  TransferWarehouseToOperatorDto,
  TransferOperatorToWarehouseDto,
  TransferOperatorToMachineDto,
  TransferMachineToOperatorDto,
} from '../dto/transfer-inventory.dto';

@Injectable()
export class InventoryTransferService {
  constructor(
    @InjectRepository(WarehouseInventory)
    private readonly warehouseInventoryRepository: Repository<WarehouseInventory>,
    @InjectRepository(OperatorInventory)
    private readonly operatorInventoryRepository: Repository<OperatorInventory>,
    @InjectRepository(MachineInventory)
    private readonly machineInventoryRepository: Repository<MachineInventory>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Transfer: Warehouse → Operator
   *
   * Uses pessimistic locking to prevent race conditions.
   */
  async transferWarehouseToOperator(
    dto: TransferWarehouseToOperatorDto,
    userId: string,
  ): Promise<{ warehouse: WarehouseInventory; operator: OperatorInventory }> {
    return await this.dataSource.transaction(async (manager) => {
      const warehouseInventory = await manager.findOne(WarehouseInventory, {
        where: { nomenclature_id: dto.nomenclature_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!warehouseInventory) {
        throw new NotFoundException(`Товар ${dto.nomenclature_id} не найден на складе`);
      }

      const warehouseQty = Number(warehouseInventory.current_quantity);
      const requestedQty = Number(dto.quantity);

      if (warehouseQty < requestedQty) {
        throw new BadRequestException(
          `Недостаточно товара на складе. Доступно: ${warehouseQty}, запрошено: ${requestedQty}`,
        );
      }

      warehouseInventory.current_quantity = warehouseQty - requestedQty;
      await manager.save(WarehouseInventory, warehouseInventory);

      let operatorInventory = await manager.findOne(OperatorInventory, {
        where: {
          operator_id: dto.operator_id,
          nomenclature_id: dto.nomenclature_id,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!operatorInventory) {
        operatorInventory = manager.create(OperatorInventory, {
          operator_id: dto.operator_id,
          nomenclature_id: dto.nomenclature_id,
          current_quantity: 0,
          reserved_quantity: 0,
        });
      }

      operatorInventory.current_quantity = Number(operatorInventory.current_quantity) + requestedQty;
      operatorInventory.last_received_at = new Date();
      await manager.save(OperatorInventory, operatorInventory);

      const movement = manager.create(InventoryMovement, {
        movement_type: MovementType.WAREHOUSE_TO_OPERATOR,
        nomenclature_id: dto.nomenclature_id,
        quantity: dto.quantity,
        performed_by_user_id: userId,
        operator_id: dto.operator_id,
        notes: dto.notes || `Выдано оператору со склада: ${dto.quantity}`,
      });
      await manager.save(InventoryMovement, movement);

      return {
        warehouse: warehouseInventory,
        operator: operatorInventory,
      };
    });
  }

  /**
   * Transfer: Operator → Warehouse (return)
   *
   * Uses pessimistic locking to prevent race conditions.
   */
  async transferOperatorToWarehouse(
    dto: TransferOperatorToWarehouseDto,
    userId: string,
  ): Promise<{ warehouse: WarehouseInventory; operator: OperatorInventory }> {
    return await this.dataSource.transaction(async (manager) => {
      const operatorInventory = await manager.findOne(OperatorInventory, {
        where: {
          operator_id: dto.operator_id,
          nomenclature_id: dto.nomenclature_id,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!operatorInventory) {
        throw new NotFoundException(
          `Товар ${dto.nomenclature_id} не найден у оператора ${dto.operator_id}`,
        );
      }

      const operatorQty = Number(operatorInventory.current_quantity);
      const requestedQty = Number(dto.quantity);

      if (operatorQty < requestedQty) {
        throw new BadRequestException(
          `Недостаточно товара у оператора. Доступно: ${operatorQty}, запрошено: ${requestedQty}`,
        );
      }

      operatorInventory.current_quantity = operatorQty - requestedQty;
      await manager.save(OperatorInventory, operatorInventory);

      const warehouseInventory = await manager.findOne(WarehouseInventory, {
        where: { nomenclature_id: dto.nomenclature_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!warehouseInventory) {
        throw new NotFoundException(`Товар ${dto.nomenclature_id} не найден на складе`);
      }

      warehouseInventory.current_quantity =
        Number(warehouseInventory.current_quantity) + requestedQty;
      await manager.save(WarehouseInventory, warehouseInventory);

      const movement = manager.create(InventoryMovement, {
        movement_type: MovementType.OPERATOR_TO_WAREHOUSE,
        nomenclature_id: dto.nomenclature_id,
        quantity: dto.quantity,
        performed_by_user_id: userId,
        operator_id: dto.operator_id,
        notes: dto.notes || `Возврат на склад от оператора: ${dto.quantity}`,
      });
      await manager.save(InventoryMovement, movement);

      return {
        warehouse: warehouseInventory,
        operator: operatorInventory,
      };
    });
  }

  /**
   * Transfer: Operator → Machine (refill)
   * CRITICAL: Called when completing refill tasks
   *
   * Uses pessimistic locking to prevent race conditions.
   */
  async transferOperatorToMachine(
    dto: TransferOperatorToMachineDto,
    userId: string,
  ): Promise<{ operator: OperatorInventory; machine: MachineInventory }> {
    return await this.dataSource.transaction(async (manager) => {
      const operatorInventory = await manager.findOne(OperatorInventory, {
        where: {
          operator_id: dto.operator_id,
          nomenclature_id: dto.nomenclature_id,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!operatorInventory) {
        throw new NotFoundException(
          `Товар ${dto.nomenclature_id} не найден у оператора ${dto.operator_id}`,
        );
      }

      const operatorQty = Number(operatorInventory.current_quantity);
      const requestedQty = Number(dto.quantity);

      if (operatorQty < requestedQty) {
        throw new BadRequestException(
          `Недостаточно товара у оператора. Доступно: ${operatorQty}, запрошено: ${requestedQty}`,
        );
      }

      operatorInventory.current_quantity = operatorQty - requestedQty;
      if (dto.task_id) {
        operatorInventory.last_task_id = dto.task_id;
      }
      await manager.save(OperatorInventory, operatorInventory);

      let machineInventory = await manager.findOne(MachineInventory, {
        where: {
          machine_id: dto.machine_id,
          nomenclature_id: dto.nomenclature_id,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!machineInventory) {
        machineInventory = manager.create(MachineInventory, {
          machine_id: dto.machine_id,
          nomenclature_id: dto.nomenclature_id,
          current_quantity: 0,
          min_stock_level: 0,
        });
      }

      machineInventory.current_quantity = Number(machineInventory.current_quantity) + requestedQty;
      machineInventory.last_refilled_at = new Date();
      if (dto.task_id) {
        machineInventory.last_refill_task_id = dto.task_id;
      }
      await manager.save(MachineInventory, machineInventory);

      const movement = manager.create(InventoryMovement, {
        movement_type: MovementType.OPERATOR_TO_MACHINE,
        nomenclature_id: dto.nomenclature_id,
        quantity: dto.quantity,
        performed_by_user_id: userId,
        operator_id: dto.operator_id,
        machine_id: dto.machine_id,
        task_id: dto.task_id,
        operation_date: dto.operation_date ? new Date(dto.operation_date) : new Date(),
        notes: dto.notes || `Пополнение аппарата оператором: ${dto.quantity}`,
      });
      await manager.save(InventoryMovement, movement);

      return {
        operator: operatorInventory,
        machine: machineInventory,
      };
    });
  }

  /**
   * Transfer: Machine → Operator (removal)
   *
   * Uses pessimistic locking to prevent race conditions.
   */
  async transferMachineToOperator(
    dto: TransferMachineToOperatorDto,
    userId: string,
  ): Promise<{ machine: MachineInventory; operator: OperatorInventory }> {
    return await this.dataSource.transaction(async (manager) => {
      const machineInventory = await manager.findOne(MachineInventory, {
        where: {
          machine_id: dto.machine_id,
          nomenclature_id: dto.nomenclature_id,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!machineInventory) {
        throw new NotFoundException(
          `Товар ${dto.nomenclature_id} не найден в аппарате ${dto.machine_id}`,
        );
      }

      const machineQty = Number(machineInventory.current_quantity);
      const requestedQty = Number(dto.quantity);

      if (machineQty < requestedQty) {
        throw new BadRequestException(
          `Недостаточно товара в аппарате. Доступно: ${machineQty}, запрошено: ${requestedQty}`,
        );
      }

      machineInventory.current_quantity = machineQty - requestedQty;
      await manager.save(MachineInventory, machineInventory);

      let operatorInventory = await manager.findOne(OperatorInventory, {
        where: {
          operator_id: dto.operator_id,
          nomenclature_id: dto.nomenclature_id,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!operatorInventory) {
        operatorInventory = manager.create(OperatorInventory, {
          operator_id: dto.operator_id,
          nomenclature_id: dto.nomenclature_id,
          current_quantity: 0,
          reserved_quantity: 0,
        });
      }

      operatorInventory.current_quantity =
        Number(operatorInventory.current_quantity) + requestedQty;
      await manager.save(OperatorInventory, operatorInventory);

      const movement = manager.create(InventoryMovement, {
        movement_type: MovementType.MACHINE_TO_OPERATOR,
        nomenclature_id: dto.nomenclature_id,
        quantity: dto.quantity,
        performed_by_user_id: userId,
        operator_id: dto.operator_id,
        machine_id: dto.machine_id,
        notes: dto.notes || `Изъятие из аппарата оператором: ${dto.quantity}`,
      });
      await manager.save(InventoryMovement, movement);

      return {
        machine: machineInventory,
        operator: operatorInventory,
      };
    });
  }
}
