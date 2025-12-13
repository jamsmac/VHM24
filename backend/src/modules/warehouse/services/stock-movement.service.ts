import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMovement, MovementType, MovementStatus } from '../entities/stock-movement.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { StockReservation } from '../entities/stock-reservation.entity';

@Injectable()
export class StockMovementService {
  constructor(
    @InjectRepository(StockMovement)
    private movementRepository: Repository<StockMovement>,
    @InjectRepository(InventoryBatch)
    private batchRepository: Repository<InventoryBatch>,
    @InjectRepository(StockReservation)
    private reservationRepository: Repository<StockReservation>,
  ) {}

  async createReceipt(data: {
    warehouse_id: string;
    product_id: string;
    quantity: number;
    unit: string;
    unit_cost?: number;
    batch_number?: string;
    production_date?: Date;
    expiry_date?: Date;
    supplier?: string;
    reference_document?: string;
  }): Promise<StockMovement> {
    const movementNumber = await this.generateMovementNumber('RCV');

    const movement = this.movementRepository.create({
      movement_number: movementNumber,
      movement_type: MovementType.RECEIPT,
      status: MovementStatus.COMPLETED,
      warehouse_id: data.warehouse_id,
      product_id: data.product_id,
      quantity: data.quantity,
      unit: data.unit,
      unit_cost: data.unit_cost,
      total_cost: data.unit_cost ? data.unit_cost * data.quantity : null,
      movement_date: new Date(),
      reference_document: data.reference_document,
      metadata: {
        supplier: data.supplier,
      },
    });

    const savedMovement = await this.movementRepository.save(movement);

    // Create or update batch
    if (data.batch_number) {
      await this.updateOrCreateBatch({
        warehouse_id: data.warehouse_id,
        product_id: data.product_id,
        batch_number: data.batch_number,
        quantity: data.quantity,
        unit: data.unit,
        unit_cost: data.unit_cost,
        production_date: data.production_date,
        expiry_date: data.expiry_date,
        supplier: data.supplier,
      });
    }

    return savedMovement;
  }

  async createShipment(data: {
    warehouse_id: string;
    product_id: string;
    quantity: number;
    unit: string;
    batch_id?: string;
    reference_document?: string;
  }): Promise<StockMovement> {
    // Check if stock is available
    const available = await this.getAvailableStock(data.warehouse_id, data.product_id);

    if (available < data.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${available}, Requested: ${data.quantity}`,
      );
    }

    const movementNumber = await this.generateMovementNumber('SHP');

    const movement = this.movementRepository.create({
      movement_number: movementNumber,
      movement_type: MovementType.SHIPMENT,
      status: MovementStatus.COMPLETED,
      warehouse_id: data.warehouse_id,
      product_id: data.product_id,
      batch_id: data.batch_id,
      quantity: -data.quantity, // Negative for outbound
      unit: data.unit,
      movement_date: new Date(),
      reference_document: data.reference_document,
    });

    const savedMovement = await this.movementRepository.save(movement);

    // Update batch if specified
    if (data.batch_id) {
      await this.updateBatchQuantity(data.batch_id, -data.quantity);
    }

    return savedMovement;
  }

  async createTransfer(data: {
    from_warehouse_id: string;
    to_warehouse_id: string;
    product_id: string;
    quantity: number;
    unit: string;
    batch_id?: string;
  }): Promise<{ outbound: StockMovement; inbound: StockMovement }> {
    // Check stock availability
    const available = await this.getAvailableStock(data.from_warehouse_id, data.product_id);

    if (available < data.quantity) {
      throw new BadRequestException('Insufficient stock for transfer');
    }

    const transferNumber = await this.generateMovementNumber('TRF');

    // Outbound movement
    const outbound = this.movementRepository.create({
      movement_number: `${transferNumber}-OUT`,
      movement_type: MovementType.TRANSFER,
      status: MovementStatus.COMPLETED,
      warehouse_id: data.from_warehouse_id,
      destination_warehouse_id: data.to_warehouse_id,
      product_id: data.product_id,
      batch_id: data.batch_id,
      quantity: -data.quantity,
      unit: data.unit,
      movement_date: new Date(),
    });

    // Inbound movement
    const inbound = this.movementRepository.create({
      movement_number: `${transferNumber}-IN`,
      movement_type: MovementType.TRANSFER,
      status: MovementStatus.COMPLETED,
      warehouse_id: data.to_warehouse_id,
      product_id: data.product_id,
      batch_id: data.batch_id,
      quantity: data.quantity,
      unit: data.unit,
      movement_date: new Date(),
    });

    const savedOutbound = await this.movementRepository.save(outbound);
    const savedInbound = await this.movementRepository.save(inbound);

    // Update batches
    if (data.batch_id) {
      await this.updateBatchQuantity(data.batch_id, -data.quantity);
      // Create new batch in destination warehouse
      const originalBatch = await this.batchRepository.findOne({
        where: { id: data.batch_id },
      });
      if (originalBatch) {
        await this.updateOrCreateBatch({
          warehouse_id: data.to_warehouse_id,
          product_id: data.product_id,
          batch_number: originalBatch.batch_number,
          quantity: data.quantity,
          unit: data.unit,
          unit_cost: originalBatch.unit_cost ?? undefined,
          expiry_date: originalBatch.expiry_date ?? undefined,
        });
      }
    }

    return { outbound: savedOutbound, inbound: savedInbound };
  }

  async getMovementHistory(
    warehouseId: string,
    filters?: {
      product_id?: string;
      movement_type?: MovementType;
      start_date?: Date;
      end_date?: Date;
    },
  ): Promise<StockMovement[]> {
    const query = this.movementRepository
      .createQueryBuilder('movement')
      .where('movement.warehouse_id = :warehouseId', { warehouseId });

    if (filters?.product_id) {
      query.andWhere('movement.product_id = :productId', { productId: filters.product_id });
    }

    if (filters?.movement_type) {
      query.andWhere('movement.movement_type = :movementType', {
        movementType: filters.movement_type,
      });
    }

    if (filters?.start_date && filters?.end_date) {
      query.andWhere('movement.movement_date BETWEEN :startDate AND :endDate', {
        startDate: filters.start_date,
        endDate: filters.end_date,
      });
    }

    query.orderBy('movement.movement_date', 'DESC');

    return query.getMany();
  }

  private async getAvailableStock(warehouseId: string, productId: string): Promise<number> {
    const batches = await this.batchRepository.find({
      where: {
        warehouse_id: warehouseId,
        product_id: productId,
        is_active: true,
        is_quarantined: false,
      },
    });

    return batches.reduce((sum, batch) => sum + Number(batch.available_quantity), 0);
  }

  private async updateOrCreateBatch(data: {
    warehouse_id: string;
    product_id: string;
    batch_number: string;
    quantity: number;
    unit: string;
    unit_cost?: number;
    production_date?: Date;
    expiry_date?: Date;
    supplier?: string;
  }): Promise<InventoryBatch> {
    const existing = await this.batchRepository.findOne({
      where: {
        warehouse_id: data.warehouse_id,
        batch_number: data.batch_number,
      },
    });

    if (existing) {
      existing.current_quantity = Number(existing.current_quantity) + data.quantity;
      existing.available_quantity = Number(existing.available_quantity) + data.quantity;
      return this.batchRepository.save(existing);
    }

    const batch = this.batchRepository.create({
      batch_number: data.batch_number,
      warehouse_id: data.warehouse_id,
      product_id: data.product_id,
      initial_quantity: data.quantity,
      current_quantity: data.quantity,
      available_quantity: data.quantity,
      unit: data.unit,
      unit_cost: data.unit_cost,
      production_date: data.production_date,
      expiry_date: data.expiry_date,
      received_date: new Date(),
      supplier: data.supplier,
    });

    return this.batchRepository.save(batch);
  }

  private async updateBatchQuantity(batchId: string, quantityChange: number): Promise<void> {
    const batch = await this.batchRepository.findOne({ where: { id: batchId } });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    batch.current_quantity = Number(batch.current_quantity) + quantityChange;
    batch.available_quantity = Number(batch.available_quantity) + quantityChange;

    await this.batchRepository.save(batch);
  }

  private async generateMovementNumber(prefix: string): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${prefix}-${dateStr}-${random}`;
  }
}
