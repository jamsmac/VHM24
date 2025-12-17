/**
 * Inventory Reservation Service
 *
 * Handles inventory reservations for tasks:
 * - Create reservations
 * - Fulfill reservations (on task completion)
 * - Cancel reservations (on task cancellation)
 * - Expire old reservations (CRON job)
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { OperatorInventory } from '../entities/operator-inventory.entity';
import { WarehouseInventory } from '../entities/warehouse-inventory.entity';
import {
  InventoryReservation,
  ReservationStatus,
  InventoryLevel,
} from '../entities/inventory-reservation.entity';

@Injectable()
export class InventoryReservationService {
  constructor(
    @InjectRepository(InventoryReservation)
    private readonly reservationRepository: Repository<InventoryReservation>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create inventory reservation for a task
   *
   * Reserves items from operator inventory for task execution.
   * Validates availability and creates reservation records.
   *
   * @param taskId - Task ID
   * @param operatorId - Operator ID
   * @param items - Items to reserve [{nomenclature_id, quantity}]
   * @param expiresInHours - Reservation expiration in hours (default: 24)
   * @returns Created reservations
   * @throws BadRequestException if insufficient stock
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
        const operatorInventory = await manager.findOne(OperatorInventory, {
          where: {
            operator_id: operatorId,
            nomenclature_id: item.nomenclature_id,
          },
        });

        if (!operatorInventory) {
          throw new BadRequestException(`У оператора нет товара ${item.nomenclature_id}`);
        }

        const available =
          Number(operatorInventory.current_quantity) - Number(operatorInventory.reserved_quantity);

        if (available < item.quantity) {
          throw new BadRequestException(
            `Недостаточно товара ${item.nomenclature_id}. ` +
              `Доступно: ${available}, требуется: ${item.quantity}`,
          );
        }

        operatorInventory.reserved_quantity =
          Number(operatorInventory.reserved_quantity) + item.quantity;

        await manager.save(OperatorInventory, operatorInventory);

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
   * Fulfill reservation on task completion
   *
   * Updates reservation status to FULFILLED and releases reserved quantity.
   * Actual item transfer happens through transferOperatorToMachine.
   *
   * @param taskId - Task ID
   * @returns Updated reservations
   */
  async fulfillReservation(taskId: string): Promise<InventoryReservation[]> {
    return await this.dataSource.transaction(async (manager) => {
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
        reservation.status = ReservationStatus.FULFILLED;
        reservation.quantity_fulfilled = reservation.quantity_reserved;
        reservation.fulfilled_at = new Date();

        await manager.save(InventoryReservation, reservation);

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
   * Cancel reservation on task cancellation
   *
   * Releases reserved quantity back to available inventory.
   *
   * @param taskId - Task ID
   * @returns Cancelled reservations
   */
  async cancelReservation(taskId: string): Promise<InventoryReservation[]> {
    return await this.dataSource.transaction(async (manager) => {
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
        reservation.status = ReservationStatus.CANCELLED;
        reservation.cancelled_at = new Date();

        await manager.save(InventoryReservation, reservation);

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
   * Expire old reservations (called via CRON job)
   *
   * Releases stuck reservations to free up inventory.
   *
   * @returns Number of expired reservations
   */
  async expireOldReservations(): Promise<number> {
    return await this.dataSource.transaction(async (manager) => {
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
        reservation.status = ReservationStatus.EXPIRED;
        reservation.cancelled_at = new Date();

        await manager.save(InventoryReservation, reservation);

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
   * Get reservations for a task
   */
  async getReservationsByTask(taskId: string): Promise<InventoryReservation[]> {
    return this.reservationRepository.find({
      where: { task_id: taskId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get active reservations for an operator
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
   * Get all active reservations in the system
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
   * Get all reservations for an operator (including completed and cancelled)
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
