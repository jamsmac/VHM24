import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { WarehouseInventory } from './entities/warehouse-inventory.entity';
import { OperatorInventory } from './entities/operator-inventory.entity';
import { MachineInventory } from './entities/machine-inventory.entity';
import { InventoryMovement, MovementType } from './entities/inventory-movement.entity';
import {
  InventoryReservation,
  ReservationStatus,
  InventoryLevel,
} from './entities/inventory-reservation.entity';
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

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(WarehouseInventory)
    private readonly warehouseInventoryRepository: Repository<WarehouseInventory>,
    @InjectRepository(OperatorInventory)
    private readonly operatorInventoryRepository: Repository<OperatorInventory>,
    @InjectRepository(MachineInventory)
    private readonly machineInventoryRepository: Repository<MachineInventory>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepository: Repository<InventoryMovement>,
    @InjectRepository(InventoryReservation)
    private readonly reservationRepository: Repository<InventoryReservation>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Safe user fields for queries - excludes sensitive data
   * Prevents exposure of password_hash, two_fa_secret, refresh_token
   */
  private readonly SAFE_USER_FIELDS = [
    'id',
    'full_name',
    'email',
    'phone',
    'role',
    'status',
    'telegram_username',
  ];

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

  // ============================================================================
  // WAREHOUSE INVENTORY (Уровень 1: Склад)
  // ============================================================================

  /**
   * Получение всего инвентаря на складе
   */
  async getWarehouseInventory(): Promise<WarehouseInventory[]> {
    return this.warehouseInventoryRepository.find({
      order: { nomenclature: { name: 'ASC' } },
    });
  }

  /**
   * Получение инвентаря конкретного товара на складе
   */
  async getWarehouseInventoryByNomenclature(nomenclatureId: string): Promise<WarehouseInventory> {
    let inventory = await this.warehouseInventoryRepository.findOne({
      where: { nomenclature_id: nomenclatureId },
    });

    // Если записи нет, создаем с нулевым количеством
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
   * Добавление товара на склад (поступление)
   */
  async addToWarehouse(dto: AddToWarehouseDto, userId: string): Promise<WarehouseInventory> {
    const inventory = await this.getWarehouseInventoryByNomenclature(dto.nomenclature_id);

    // Увеличиваем количество
    inventory.current_quantity = Number(inventory.current_quantity) + Number(dto.quantity);
    inventory.last_restocked_at = new Date();

    await this.warehouseInventoryRepository.save(inventory);

    // Регистрируем движение
    await this.createMovement({
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
   * Списание со склада (брак, просрочка, etc.)
   */
  async removeFromWarehouse(
    dto: RemoveFromWarehouseDto,
    userId: string,
  ): Promise<WarehouseInventory> {
    const inventory = await this.getWarehouseInventoryByNomenclature(dto.nomenclature_id);

    // Проверка наличия
    if (Number(inventory.current_quantity) < Number(dto.quantity)) {
      throw new BadRequestException(
        `Недостаточно товара на складе. Доступно: ${inventory.current_quantity}, запрошено: ${dto.quantity}`,
      );
    }

    // Уменьшаем количество
    inventory.current_quantity = Number(inventory.current_quantity) - Number(dto.quantity);
    await this.warehouseInventoryRepository.save(inventory);

    // Регистрируем движение
    await this.createMovement({
      movement_type: MovementType.WAREHOUSE_OUT,
      nomenclature_id: dto.nomenclature_id,
      quantity: dto.quantity,
      performed_by_user_id: userId,
      notes: dto.notes || `Списание со склада: -${dto.quantity}`,
    });

    return inventory;
  }

  /**
   * Обновление настроек складского инвентаря
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
   * Получить товары с низким уровнем запаса на складе
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

  // ============================================================================
  // OPERATOR INVENTORY (Уровень 2: Оператор)
  // ============================================================================

  /**
   * Получение инвентаря оператора
   */
  async getOperatorInventory(operatorId: string): Promise<OperatorInventory[]> {
    return this.operatorInventoryRepository.find({
      where: { operator_id: operatorId },
      order: { nomenclature: { name: 'ASC' } },
    });
  }

  /**
   * Получение инвентаря конкретного товара у оператора
   */
  async getOperatorInventoryByNomenclature(
    operatorId: string,
    nomenclatureId: string,
  ): Promise<OperatorInventory> {
    let inventory = await this.operatorInventoryRepository.findOne({
      where: {
        operator_id: operatorId,
        nomenclature_id: nomenclatureId,
      },
    });

    // Если записи нет, создаем с нулевым количеством
    if (!inventory) {
      inventory = this.operatorInventoryRepository.create({
        operator_id: operatorId,
        nomenclature_id: nomenclatureId,
        current_quantity: 0,
      });
      inventory = await this.operatorInventoryRepository.save(inventory);
    }

    return inventory;
  }

  /**
   * Перемещение: Склад -> Оператор
   *
   * ВАЖНО: Использует транзакцию с pessimistic locking для предотвращения race conditions
   */
  async transferWarehouseToOperator(
    dto: TransferWarehouseToOperatorDto,
    userId: string,
  ): Promise<{ warehouse: WarehouseInventory; operator: OperatorInventory }> {
    return await this.dataSource.transaction(async (manager) => {
      // Получаем warehouse inventory с pessimistic lock
      const warehouseInventory = await manager.findOne(WarehouseInventory, {
        where: { nomenclature_id: dto.nomenclature_id },
        lock: { mode: 'pessimistic_write' }, // Блокирует строку до конца транзакции
      });

      if (!warehouseInventory) {
        throw new NotFoundException(`Товар ${dto.nomenclature_id} не найден на складе`);
      }

      const warehouseQty = Number(warehouseInventory.current_quantity);
      const requestedQty = Number(dto.quantity);

      // Проверяем достаточность товара
      if (warehouseQty < requestedQty) {
        throw new BadRequestException(
          `Недостаточно товара на складе. Доступно: ${warehouseQty}, запрошено: ${requestedQty}`,
        );
      }

      // Уменьшаем количество на складе
      warehouseInventory.current_quantity = warehouseQty - requestedQty;
      await manager.save(WarehouseInventory, warehouseInventory);

      // Получаем operator inventory с pessimistic lock
      let operatorInventory = await manager.findOne(OperatorInventory, {
        where: {
          operator_id: dto.operator_id,
          nomenclature_id: dto.nomenclature_id,
        },
        lock: { mode: 'pessimistic_write' },
      });

      // Если записи нет, создаем новую
      if (!operatorInventory) {
        operatorInventory = manager.create(OperatorInventory, {
          operator_id: dto.operator_id,
          nomenclature_id: dto.nomenclature_id,
          current_quantity: 0,
          reserved_quantity: 0,
        });
      }

      // Увеличиваем количество у оператора
      operatorInventory.current_quantity =
        Number(operatorInventory.current_quantity) + requestedQty;
      operatorInventory.last_received_at = new Date();
      await manager.save(OperatorInventory, operatorInventory);

      // Регистрируем движение
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
   * Перемещение: Оператор -> Склад (возврат)
   *
   * ВАЖНО: Использует транзакцию с pessimistic locking для предотвращения race conditions
   */
  async transferOperatorToWarehouse(
    dto: TransferOperatorToWarehouseDto,
    userId: string,
  ): Promise<{ warehouse: WarehouseInventory; operator: OperatorInventory }> {
    return await this.dataSource.transaction(async (manager) => {
      // Получаем operator inventory с pessimistic lock
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

      // Проверяем достаточность товара
      if (operatorQty < requestedQty) {
        throw new BadRequestException(
          `Недостаточно товара у оператора. Доступно: ${operatorQty}, запрошено: ${requestedQty}`,
        );
      }

      // Уменьшаем количество у оператора
      operatorInventory.current_quantity = operatorQty - requestedQty;
      await manager.save(OperatorInventory, operatorInventory);

      // Получаем warehouse inventory с pessimistic lock
      const warehouseInventory = await manager.findOne(WarehouseInventory, {
        where: { nomenclature_id: dto.nomenclature_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!warehouseInventory) {
        throw new NotFoundException(`Товар ${dto.nomenclature_id} не найден на складе`);
      }

      // Увеличиваем количество на складе
      warehouseInventory.current_quantity =
        Number(warehouseInventory.current_quantity) + requestedQty;
      await manager.save(WarehouseInventory, warehouseInventory);

      // Регистрируем движение
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

  // ============================================================================
  // MACHINE INVENTORY (Уровень 3: Аппарат)
  // ============================================================================

  /**
   * Получение инвентаря аппарата
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
      .andWhere('machine.deleted_at IS NULL') // Exclude inventory for soft-deleted machines
      .orderBy('nomenclature.name', 'ASC')
      .getMany();
  }

  /**
   * Получение инвентаря конкретного товара в аппарате
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

    // Если записи нет, создаем с нулевым количеством
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
   * Перемещение: Оператор -> Аппарат (пополнение)
   * КРИТИЧНО: Вызывается при завершении задачи пополнения
   *
   * ВАЖНО: Использует транзакцию с pessimistic locking для предотвращения race conditions
   */
  async transferOperatorToMachine(
    dto: TransferOperatorToMachineDto,
    userId: string,
  ): Promise<{ operator: OperatorInventory; machine: MachineInventory }> {
    return await this.dataSource.transaction(async (manager) => {
      // Получаем operator inventory с pessimistic lock
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

      // Проверяем достаточность товара
      if (operatorQty < requestedQty) {
        throw new BadRequestException(
          `Недостаточно товара у оператора. Доступно: ${operatorQty}, запрошено: ${requestedQty}`,
        );
      }

      // Уменьшаем количество у оператора
      operatorInventory.current_quantity = operatorQty - requestedQty;
      if (dto.task_id) {
        operatorInventory.last_task_id = dto.task_id;
      }
      await manager.save(OperatorInventory, operatorInventory);

      // Получаем machine inventory с pessimistic lock
      let machineInventory = await manager.findOne(MachineInventory, {
        where: {
          machine_id: dto.machine_id,
          nomenclature_id: dto.nomenclature_id,
        },
        lock: { mode: 'pessimistic_write' },
      });

      // Если записи нет, создаем новую
      if (!machineInventory) {
        machineInventory = manager.create(MachineInventory, {
          machine_id: dto.machine_id,
          nomenclature_id: dto.nomenclature_id,
          current_quantity: 0,
          min_stock_level: 0,
        });
      }

      // Увеличиваем количество в аппарате
      machineInventory.current_quantity = Number(machineInventory.current_quantity) + requestedQty;
      machineInventory.last_refilled_at = new Date();
      if (dto.task_id) {
        machineInventory.last_refill_task_id = dto.task_id;
      }
      await manager.save(MachineInventory, machineInventory);

      // Регистрируем движение
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
   * Перемещение: Аппарат -> Оператор (изъятие)
   *
   * ВАЖНО: Использует транзакцию с pessimistic locking для предотвращения race conditions
   */
  async transferMachineToOperator(
    dto: TransferMachineToOperatorDto,
    userId: string,
  ): Promise<{ machine: MachineInventory; operator: OperatorInventory }> {
    return await this.dataSource.transaction(async (manager) => {
      // Получаем machine inventory с pessimistic lock
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

      // Проверяем достаточность товара
      if (machineQty < requestedQty) {
        throw new BadRequestException(
          `Недостаточно товара в аппарате. Доступно: ${machineQty}, запрошено: ${requestedQty}`,
        );
      }

      // Уменьшаем количество в аппарате
      machineInventory.current_quantity = machineQty - requestedQty;
      await manager.save(MachineInventory, machineInventory);

      // Получаем operator inventory с pessimistic lock
      let operatorInventory = await manager.findOne(OperatorInventory, {
        where: {
          operator_id: dto.operator_id,
          nomenclature_id: dto.nomenclature_id,
        },
        lock: { mode: 'pessimistic_write' },
      });

      // Если записи нет, создаем новую
      if (!operatorInventory) {
        operatorInventory = manager.create(OperatorInventory, {
          operator_id: dto.operator_id,
          nomenclature_id: dto.nomenclature_id,
          current_quantity: 0,
          reserved_quantity: 0,
        });
      }

      // Увеличиваем количество у оператора
      operatorInventory.current_quantity =
        Number(operatorInventory.current_quantity) + requestedQty;
      await manager.save(OperatorInventory, operatorInventory);

      // Регистрируем движение
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

  /**
   * Регистрация продажи (расход ингредиента из аппарата)
   */
  async recordSale(dto: RecordSaleDto, userId: string): Promise<MachineInventory> {
    const machineInventory = await this.getMachineInventoryByNomenclature(
      dto.machine_id,
      dto.nomenclature_id,
    );

    // Уменьшаем количество в аппарате
    if (Number(machineInventory.current_quantity) >= Number(dto.quantity)) {
      machineInventory.current_quantity =
        Number(machineInventory.current_quantity) - Number(dto.quantity);
      await this.machineInventoryRepository.save(machineInventory);
    }

    // Регистрируем движение
    await this.createMovement({
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
   * Резервирование товара на складе для задачи
   *
   * CRITICAL: This method reserves inventory when a REFILL task is created.
   * Prevents multiple operators from getting tasks for the same stock.
   *
   * ВАЖНО: Использует транзакцию с pessimistic locking для предотвращения race conditions
   *
   * @param nomenclatureId - Product ID
   * @param quantity - Quantity to reserve
   * @param reservedFor - What this reservation is for (e.g., "task:uuid")
   * @param userId - User ID who created the reservation
   *
   * @throws BadRequestException if insufficient stock available
   */
  async reserveWarehouseStock(
    nomenclatureId: string,
    quantity: number,
    reservedFor: string,
    userId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Получаем warehouse inventory с pessimistic lock
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

      // Проверяем достаточность товара
      if (availableQuantity < quantityToReserve) {
        throw new BadRequestException(
          `Недостаточно товара на складе для резервирования. ` +
            `Доступно: ${availableQuantity}, запрошено: ${quantityToReserve}. ` +
            `Товар: ${nomenclatureId}`,
        );
      }

      // Увеличиваем зарезервированное количество
      inventory.reserved_quantity = reservedQuantity + quantityToReserve;
      await manager.save(WarehouseInventory, inventory);

      // Создаем запись о движении для аудита
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
   * Освобождение резервирования товара на складе
   *
   * ВАЖНО: Использует транзакцию с pessimistic locking для предотвращения race conditions
   *
   * @param nomenclatureId - Product ID
   * @param quantity - Quantity to release
   * @param reservedFor - What this reservation was for (e.g., "task:uuid")
   */
  async releaseWarehouseReservation(
    nomenclatureId: string,
    quantity: number,
    reservedFor: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Получаем warehouse inventory с pessimistic lock
      const inventory = await manager.findOne(WarehouseInventory, {
        where: { nomenclature_id: nomenclatureId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException(`Товар ${nomenclatureId} не найден на складе`);
      }

      const reservedQuantity = Number(inventory.reserved_quantity || 0);
      const quantityToRelease = Number(quantity);

      // Уменьшаем зарезервированное количество (не может быть меньше 0)
      inventory.reserved_quantity = Math.max(0, reservedQuantity - quantityToRelease);
      await manager.save(WarehouseInventory, inventory);

      // Создаем запись о движении для аудита
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

  /**
   * Списание товара с аппарата (для импорта продаж)
   *
   * CRITICAL FIX: This method was called in sales-import.processor.ts but was missing!
   * Now properly implements inventory deduction during sales import.
   *
   * @param machineId - Machine ID
   * @param nomenclatureId - Product ID
   * @param quantity - Quantity to deduct
   * @param reason - Reason for deduction
   *
   * @throws BadRequestException if insufficient stock
   */
  async deductFromMachine(
    machineId: string,
    nomenclatureId: string,
    quantity: number,
    reason: string,
  ): Promise<void> {
    const machineInventory = await this.getMachineInventoryByNomenclature(
      machineId,
      nomenclatureId,
    );

    const currentQuantity = Number(machineInventory.current_quantity);
    const deductQuantity = Number(quantity);

    // Check if sufficient stock available
    if (currentQuantity < deductQuantity) {
      throw new BadRequestException(
        `Недостаточно товара в аппарате. ` +
          `Доступно: ${currentQuantity}, требуется: ${deductQuantity}. ` +
          `Аппарат: ${machineId}, товар: ${nomenclatureId}`,
      );
    }

    // Deduct quantity
    machineInventory.current_quantity = currentQuantity - deductQuantity;
    await this.machineInventoryRepository.save(machineInventory);

    // Create movement record
    await this.createMovement({
      movement_type: MovementType.MACHINE_SALE,
      nomenclature_id: nomenclatureId,
      quantity: deductQuantity,
      performed_by_user_id: null, // Automated import, no specific user
      machine_id: machineId,
      operation_date: new Date(),
      notes: reason,
    });
  }

  /**
   * Обновление настроек инвентаря аппарата
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
   * Получить аппараты с низким уровнем запаса
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
      .andWhere('machine.deleted_at IS NULL') // Exclude soft-deleted machines
      .orderBy('machine.machine_number', 'ASC')
      .addOrderBy('inventory.current_quantity', 'ASC')
      .getMany();
  }

  /**
   * Корректировка инвентаря (инвентаризация)
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

    // Регистрируем движение
    await this.createMovement({
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

  // ============================================================================
  // ДВИЖЕНИЯ ИНВЕНТАРЯ
  // ============================================================================

  /**
   * Создание записи о движении инвентаря
   */
  private async createMovement(data: Partial<InventoryMovement>): Promise<InventoryMovement> {
    const movement = this.movementRepository.create(data);
    return this.movementRepository.save(movement);
  }

  /**
   * Получение истории движений с фильтрацией
   * Оптимизированная версия с выборкой только необходимых полей
   */
  async getMovements(
    movementType?: MovementType,
    nomenclatureId?: string,
    machineId?: string,
    operatorId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<InventoryMovement[]> {
    const query = this.movementRepository
      .createQueryBuilder('movement')
      // Nomenclature - select only necessary fields
      .leftJoin('movement.nomenclature', 'nomenclature')
      .addSelect(this.SAFE_NOMENCLATURE_FIELDS.map((f) => `nomenclature.${f}`))
      // Performed By User - select only safe fields (no password_hash, two_fa_secret, refresh_token)
      .leftJoin('movement.performed_by', 'performed_by')
      .addSelect(this.SAFE_USER_FIELDS.map((f) => `performed_by.${f}`))
      // Operator User - select only safe fields
      .leftJoin('movement.operator', 'operator')
      .addSelect(this.SAFE_USER_FIELDS.map((f) => `operator.${f}`))
      // Machine - select only necessary fields
      .leftJoin('movement.machine', 'machine')
      .addSelect(this.SAFE_MACHINE_FIELDS.map((f) => `machine.${f}`));

    if (movementType) {
      query.andWhere('movement.movement_type = :movementType', { movementType });
    }

    if (nomenclatureId) {
      query.andWhere('movement.nomenclature_id = :nomenclatureId', {
        nomenclatureId,
      });
    }

    if (machineId) {
      query.andWhere('movement.machine_id = :machineId', { machineId });
    }

    if (operatorId) {
      query.andWhere('movement.operator_id = :operatorId', { operatorId });
    }

    if (dateFrom && dateTo) {
      query.andWhere('movement.created_at BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      });
    }

    query.orderBy('movement.created_at', 'DESC');

    return query.getMany();
  }

  /**
   * Получение статистики движений
   */
  async getMovementStats(dateFrom?: Date, dateTo?: Date) {
    const query = this.movementRepository.createQueryBuilder('movement');

    if (dateFrom && dateTo) {
      query.where('movement.created_at BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      });
    }

    const total = await query.getCount();

    const byType = await this.movementRepository
      .createQueryBuilder('movement')
      .select('movement.movement_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(movement.quantity)', 'total_quantity')
      .groupBy('movement.movement_type')
      .getRawMany();

    return {
      total,
      by_type: byType.map((item) => ({
        type: item.type,
        count: parseInt(item.count),
        total_quantity: parseFloat(item.total_quantity) || 0,
      })),
    };
  }

  // ============================================================================
  // INVENTORY RESERVATIONS (Резервирование инвентаря)
  // ============================================================================

  /**
   * Создание резервации инвентаря для задачи
   *
   * Резервирует товары у оператора для выполнения задачи.
   * Проверяет доступность товаров и создает записи резервации.
   *
   * @param taskId - ID задачи
   * @param operatorId - ID оператора
   * @param items - Список товаров для резервирования [{nomenclature_id, quantity}]
   * @param expiresInHours - Срок действия резервации в часах (по умолчанию 24)
   * @returns Массив созданных резерваций
   * @throws BadRequestException если недостаточно товаров
   */
  async createReservation(
    taskId: string,
    operatorId: string,
    items: Array<{ nomenclature_id: string; quantity: number }>,
    expiresInHours: number = 24,
  ): Promise<InventoryReservation[]> {
    return await this.dataSource.transaction(async (manager) => {
      const reservations: InventoryReservation[] = [];

      for (const item of items) {
        // Получаем инвентарь оператора для этого товара
        const operatorInventory = await manager.findOne(OperatorInventory, {
          where: {
            operator_id: operatorId,
            nomenclature_id: item.nomenclature_id,
          },
        });

        if (!operatorInventory) {
          throw new BadRequestException(`У оператора нет товара ${item.nomenclature_id}`);
        }

        // Вычисляем доступное количество (текущее - зарезервированное)
        const available =
          Number(operatorInventory.current_quantity) - Number(operatorInventory.reserved_quantity);

        if (available < item.quantity) {
          throw new BadRequestException(
            `Недостаточно товара ${item.nomenclature_id}. ` +
              `Доступно: ${available}, требуется: ${item.quantity}`,
          );
        }

        // Обновляем reserved_quantity
        operatorInventory.reserved_quantity =
          Number(operatorInventory.reserved_quantity) + item.quantity;

        await manager.save(OperatorInventory, operatorInventory);

        // Создаем запись резервации
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiresInHours);

        const reservation = manager.create(InventoryReservation, {
          task_id: taskId,
          nomenclature_id: item.nomenclature_id,
          quantity_reserved: item.quantity,
          quantity_fulfilled: 0,
          status: ReservationStatus.PENDING,
          inventory_level: InventoryLevel.OPERATOR,
          reference_id: operatorId,
          expires_at: expiresAt,
          notes: `Автоматическая резервация при создании задачи`,
        });

        const savedReservation = await manager.save(InventoryReservation, reservation);
        reservations.push(savedReservation);
      }

      return reservations;
    });
  }

  /**
   * Выполнение резервации при завершении задачи
   *
   * Обновляет статус резервации на FULFILLED и освобождает зарезервированное количество.
   * Фактическое перемещение товаров происходит через transferOperatorToMachine.
   *
   * @param taskId - ID задачи
   * @returns Обновленные резервации
   */
  async fulfillReservation(taskId: string): Promise<InventoryReservation[]> {
    return await this.dataSource.transaction(async (manager) => {
      // Найти все резервации для этой задачи
      const reservations = await manager.find(InventoryReservation, {
        where: {
          task_id: taskId,
          status: ReservationStatus.PENDING,
        },
      });

      if (!reservations.length) {
        return [];
      }

      for (const reservation of reservations) {
        // Обновляем статус резервации
        reservation.status = ReservationStatus.FULFILLED;
        reservation.quantity_fulfilled = reservation.quantity_reserved;
        reservation.fulfilled_at = new Date();

        await manager.save(InventoryReservation, reservation);

        // Уменьшаем reserved_quantity в operator_inventory
        const operatorInventory = await manager.findOne(OperatorInventory, {
          where: {
            operator_id: reservation.reference_id,
            nomenclature_id: reservation.nomenclature_id,
          },
        });

        if (operatorInventory) {
          operatorInventory.reserved_quantity = Math.max(
            0,
            Number(operatorInventory.reserved_quantity) - Number(reservation.quantity_reserved),
          );
          await manager.save(OperatorInventory, operatorInventory);
        }
      }

      return reservations;
    });
  }

  /**
   * Отмена резервации при отмене задачи
   *
   * Освобождает зарезервированное количество обратно в доступный инвентарь.
   *
   * @param taskId - ID задачи
   * @returns Отмененные резервации
   */
  async cancelReservation(taskId: string): Promise<InventoryReservation[]> {
    return await this.dataSource.transaction(async (manager) => {
      // Найти все активные резервации для этой задачи
      const reservations = await manager.find(InventoryReservation, {
        where: {
          task_id: taskId,
          status: ReservationStatus.PENDING,
        },
      });

      if (!reservations.length) {
        return [];
      }

      for (const reservation of reservations) {
        // Обновляем статус резервации
        reservation.status = ReservationStatus.CANCELLED;
        reservation.cancelled_at = new Date();

        await manager.save(InventoryReservation, reservation);

        // Уменьшаем reserved_quantity в inventory (освобождаем)
        if (reservation.inventory_level === InventoryLevel.OPERATOR) {
          const operatorInventory = await manager.findOne(OperatorInventory, {
            where: {
              operator_id: reservation.reference_id,
              nomenclature_id: reservation.nomenclature_id,
            },
          });

          if (operatorInventory) {
            operatorInventory.reserved_quantity = Math.max(
              0,
              Number(operatorInventory.reserved_quantity) - Number(reservation.quantity_reserved),
            );
            await manager.save(OperatorInventory, operatorInventory);
          }
        } else if (reservation.inventory_level === InventoryLevel.WAREHOUSE) {
          const warehouseInventory = await manager.findOne(WarehouseInventory, {
            where: {
              nomenclature_id: reservation.nomenclature_id,
            },
          });

          if (warehouseInventory) {
            warehouseInventory.reserved_quantity = Math.max(
              0,
              Number(warehouseInventory.reserved_quantity) - Number(reservation.quantity_reserved),
            );
            await manager.save(WarehouseInventory, warehouseInventory);
          }
        }
      }

      return reservations;
    });
  }

  /**
   * Автоматическая отмена истекших резерваций
   *
   * Вызывается через CRON job для освобождения зависших резерваций.
   *
   * @returns Количество отмененных резерваций
   */
  async expireOldReservations(): Promise<number> {
    return await this.dataSource.transaction(async (manager) => {
      // Найти все истекшие резервации
      const expiredReservations = await manager.find(InventoryReservation, {
        where: {
          status: ReservationStatus.PENDING,
          expires_at: LessThan(new Date()),
        },
      });

      if (!expiredReservations.length) {
        return 0;
      }

      for (const reservation of expiredReservations) {
        // Обновляем статус
        reservation.status = ReservationStatus.EXPIRED;
        reservation.cancelled_at = new Date();

        await manager.save(InventoryReservation, reservation);

        // Освобождаем зарезервированное количество
        if (reservation.inventory_level === InventoryLevel.OPERATOR) {
          const operatorInventory = await manager.findOne(OperatorInventory, {
            where: {
              operator_id: reservation.reference_id,
              nomenclature_id: reservation.nomenclature_id,
            },
          });

          if (operatorInventory) {
            operatorInventory.reserved_quantity = Math.max(
              0,
              Number(operatorInventory.reserved_quantity) - Number(reservation.quantity_reserved),
            );
            await manager.save(OperatorInventory, operatorInventory);
          }
        } else if (reservation.inventory_level === InventoryLevel.WAREHOUSE) {
          const warehouseInventory = await manager.findOne(WarehouseInventory, {
            where: {
              nomenclature_id: reservation.nomenclature_id,
            },
          });

          if (warehouseInventory) {
            warehouseInventory.reserved_quantity = Math.max(
              0,
              Number(warehouseInventory.reserved_quantity) - Number(reservation.quantity_reserved),
            );
            await manager.save(WarehouseInventory, warehouseInventory);
          }
        }
      }

      return expiredReservations.length;
    });
  }

  /**
   * Получение резерваций для задачи
   */
  async getReservationsByTask(taskId: string): Promise<InventoryReservation[]> {
    return this.reservationRepository.find({
      where: { task_id: taskId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Получение активных резерваций оператора
   */
  async getActiveReservationsByOperator(operatorId: string): Promise<InventoryReservation[]> {
    return this.reservationRepository.find({
      where: {
        reference_id: operatorId,
        inventory_level: InventoryLevel.OPERATOR,
        status: ReservationStatus.PENDING,
      },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Получение всех активных резерваций в системе
   */
  async getActiveReservations(): Promise<InventoryReservation[]> {
    return this.reservationRepository.find({
      where: {
        status: ReservationStatus.PENDING,
      },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Получение всех резерваций оператора (включая завершенные и отмененные)
   */
  async getReservationsByOperator(operatorId: string): Promise<InventoryReservation[]> {
    return this.reservationRepository.find({
      where: {
        reference_id: operatorId,
        inventory_level: InventoryLevel.OPERATOR,
      },
      order: { created_at: 'DESC' },
    });
  }
}
