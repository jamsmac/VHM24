/**
 * Inventory Movement Service
 *
 * Handles inventory movement tracking and history:
 * - Create movement records
 * - Get movement history with filters
 * - Movement statistics
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryMovement, MovementType } from '../entities/inventory-movement.entity';

@Injectable()
export class InventoryMovementService {
  /**
   * Safe user fields for queries - excludes sensitive data
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

  constructor(
    @InjectRepository(InventoryMovement)
    private readonly movementRepository: Repository<InventoryMovement>,
  ) {}

  /**
   * Create an inventory movement record
   */
  async createMovement(data: Partial<InventoryMovement>): Promise<InventoryMovement> {
    const movement = this.movementRepository.create(data);
    return this.movementRepository.save(movement);
  }

  /**
   * Get movement history with optional filters
   * Optimized version with selected fields only
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
      .leftJoin('movement.nomenclature', 'nomenclature')
      .addSelect(this.SAFE_NOMENCLATURE_FIELDS.map((f) => `nomenclature.${f}`))
      .leftJoin('movement.performed_by', 'performed_by')
      .addSelect(this.SAFE_USER_FIELDS.map((f) => `performed_by.${f}`))
      .leftJoin('movement.operator', 'operator')
      .addSelect(this.SAFE_USER_FIELDS.map((f) => `operator.${f}`))
      .leftJoin('movement.machine', 'machine')
      .addSelect(this.SAFE_MACHINE_FIELDS.map((f) => `machine.${f}`));

    if (movementType) {
      query.andWhere('movement.movement_type = :movementType', { movementType });
    }

    if (nomenclatureId) {
      query.andWhere('movement.nomenclature_id = :nomenclatureId', { nomenclatureId });
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
   * Get movement statistics
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
}
