/**
 * Operator Inventory Service
 *
 * Handles operator-level inventory operations:
 * - Get operator inventory
 * - Get inventory by nomenclature
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperatorInventory } from '../entities/operator-inventory.entity';

@Injectable()
export class OperatorInventoryService {
  constructor(
    @InjectRepository(OperatorInventory)
    private readonly operatorInventoryRepository: Repository<OperatorInventory>,
  ) {}

  /**
   * Get all inventory for an operator
   */
  async getOperatorInventory(operatorId: string): Promise<OperatorInventory[]> {
    return this.operatorInventoryRepository.find({
      where: { operator_id: operatorId },
      order: { nomenclature: { name: 'ASC' } },
    });
  }

  /**
   * Get operator inventory for a specific product
   * Creates record with zero quantity if not exists
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
}
