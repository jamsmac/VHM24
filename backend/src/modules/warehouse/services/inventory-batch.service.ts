import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { addDays, isBefore } from 'date-fns';

@Injectable()
export class InventoryBatchService {
  private readonly logger = new Logger(InventoryBatchService.name);

  constructor(
    @InjectRepository(InventoryBatch)
    private batchRepository: Repository<InventoryBatch>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(warehouseId?: string, productId?: string): Promise<InventoryBatch[]> {
    const where: any = { is_active: true };

    if (warehouseId) {
      where.warehouse_id = warehouseId;
    }

    if (productId) {
      where.product_id = productId;
    }

    return this.batchRepository.find({
      where,
      order: { expiry_date: 'ASC', received_date: 'ASC' }, // FEFO - First Expired, First Out
    });
  }

  async getBatchesByProduct(warehouseId: string, productId: string): Promise<InventoryBatch[]> {
    return this.batchRepository.find({
      where: {
        warehouse_id: warehouseId,
        product_id: productId,
        is_active: true,
        is_quarantined: false,
      },
      order: { expiry_date: 'ASC' },
    });
  }

  async getExpiringBatches(
    warehouseId: string,
    daysThreshold: number = 30,
  ): Promise<InventoryBatch[]> {
    const thresholdDate = addDays(new Date(), daysThreshold);

    return this.batchRepository
      .find({
        where: {
          warehouse_id: warehouseId,
          is_active: true,
          is_quarantined: false,
        },
        order: { expiry_date: 'ASC' },
      })
      .then((batches) =>
        batches.filter(
          (batch) =>
            batch.expiry_date &&
            isBefore(new Date(batch.expiry_date), thresholdDate) &&
            Number(batch.current_quantity) > 0,
        ),
      );
  }

  async getExpiredBatches(warehouseId: string): Promise<InventoryBatch[]> {
    const today = new Date();

    return this.batchRepository
      .find({
        where: {
          warehouse_id: warehouseId,
          is_active: true,
        },
        order: { expiry_date: 'ASC' },
      })
      .then((batches) =>
        batches.filter(
          (batch) =>
            batch.expiry_date &&
            isBefore(new Date(batch.expiry_date), today) &&
            Number(batch.current_quantity) > 0,
        ),
      );
  }

  async quarantineBatch(batchId: string, reason: string): Promise<InventoryBatch> {
    const batch = await this.batchRepository.findOne({ where: { id: batchId } });

    if (!batch) {
      throw new Error(`Batch with ID ${batchId} not found`);
    }

    batch.is_quarantined = true;
    batch.quarantine_reason = reason;

    return this.batchRepository.save(batch);
  }

  async releaseFromQuarantine(batchId: string): Promise<InventoryBatch> {
    const batch = await this.batchRepository.findOne({ where: { id: batchId } });

    if (!batch) {
      throw new Error(`Batch with ID ${batchId} not found`);
    }

    batch.is_quarantined = false;
    batch.quarantine_reason = null;

    return this.batchRepository.save(batch);
  }

  /**
   * FIFO Write-off: Automatically write off stock from oldest batches first
   * Returns list of affected batches with amounts written off
   */
  async fifoWriteOff(
    warehouseId: string,
    productId: string,
    quantityToWriteOff: number,
    notes?: string,
  ): Promise<
    Array<{
      batch: InventoryBatch;
      quantity_written_off: number;
    }>
  > {
    return await this.dataSource.transaction(async (manager) => {
      // Get all active batches for this product, sorted by received_date ASC (FIFO)
      const batches = await manager.find(InventoryBatch, {
        where: {
          warehouse_id: warehouseId,
          product_id: productId,
          is_active: true,
          is_quarantined: false,
        },
        order: { received_date: 'ASC' }, // FIFO: First In, First Out
        lock: { mode: 'pessimistic_write' }, // Prevent race conditions
      });

      let remainingToWriteOff = quantityToWriteOff;
      const affectedBatches: Array<{
        batch: InventoryBatch;
        quantity_written_off: number;
      }> = [];

      for (const batch of batches) {
        if (remainingToWriteOff <= 0) break;

        const available = Number(batch.current_quantity);
        if (available <= 0) continue;

        const toWriteOffFromThisBatch = Math.min(available, remainingToWriteOff);

        batch.current_quantity = Number(batch.current_quantity) - toWriteOffFromThisBatch;
        batch.available_quantity = Number(batch.current_quantity) - Number(batch.reserved_quantity);

        // Deactivate batch if fully consumed
        if (Number(batch.current_quantity) <= 0) {
          batch.is_active = false;
        }

        await manager.save(InventoryBatch, batch);

        affectedBatches.push({
          batch,
          quantity_written_off: toWriteOffFromThisBatch,
        });

        remainingToWriteOff -= toWriteOffFromThisBatch;

        this.logger.log(
          `FIFO write-off: ${toWriteOffFromThisBatch} from batch ${batch.batch_number} (remaining in batch: ${batch.current_quantity})`,
        );
      }

      if (remainingToWriteOff > 0) {
        throw new BadRequestException(
          `Insufficient stock for FIFO write-off. ` +
            `Requested: ${quantityToWriteOff}, Available: ${quantityToWriteOff - remainingToWriteOff}`,
        );
      }

      this.logger.log(
        `FIFO write-off completed: ${quantityToWriteOff} from ${affectedBatches.length} batch(es)`,
      );

      return affectedBatches;
    });
  }

  /**
   * Automatically write off all expired stock
   * Returns count of batches processed and total quantity written off
   */
  async writeOffExpiredStock(warehouseId: string): Promise<{
    batches_processed: number;
    total_quantity_written_off: number;
    total_value_written_off: number;
  }> {
    const expiredBatches = await this.getExpiredBatches(warehouseId);

    let totalQuantityWrittenOff = 0;
    let totalValueWrittenOff = 0;

    for (const batch of expiredBatches) {
      const quantityToWriteOff = Number(batch.current_quantity);
      const valueToWriteOff = quantityToWriteOff * Number(batch.unit_cost || 0);

      batch.current_quantity = 0;
      batch.available_quantity = 0;
      batch.is_active = false;

      // Add metadata about write-off
      batch.metadata = {
        ...batch.metadata,
        written_off_at: new Date().toISOString(),
        written_off_reason: 'Expired stock',
        written_off_quantity: quantityToWriteOff,
        written_off_value: valueToWriteOff,
      };

      await this.batchRepository.save(batch);

      totalQuantityWrittenOff += quantityToWriteOff;
      totalValueWrittenOff += valueToWriteOff;

      this.logger.warn(
        `Wrote off expired batch ${batch.batch_number}: ${quantityToWriteOff} units (value: ${valueToWriteOff.toFixed(2)})`,
      );
    }

    return {
      batches_processed: expiredBatches.length,
      total_quantity_written_off: totalQuantityWrittenOff,
      total_value_written_off: totalValueWrittenOff,
    };
  }

  async getStockSummary(warehouseId: string): Promise<{
    total_batches: number;
    total_stock_value: number;
    expiring_soon: number;
    expired: number;
    quarantined: number;
  }> {
    const allBatches = await this.batchRepository.find({
      where: { warehouse_id: warehouseId, is_active: true },
    });

    const expiringSoon = await this.getExpiringBatches(warehouseId, 30);
    const expired = await this.getExpiredBatches(warehouseId);
    const quarantined = allBatches.filter((b) => b.is_quarantined);

    const totalValue = allBatches.reduce((sum, batch) => {
      return sum + Number(batch.current_quantity) * Number(batch.unit_cost || 0);
    }, 0);

    return {
      total_batches: allBatches.length,
      total_stock_value: totalValue,
      expiring_soon: expiringSoon.length,
      expired: expired.length,
      quarantined: quarantined.length,
    };
  }
}
