import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockReservation, ReservationStatus } from '../entities/stock-reservation.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { addHours } from 'date-fns';

@Injectable()
export class StockReservationService {
  constructor(
    @InjectRepository(StockReservation)
    private reservationRepository: Repository<StockReservation>,
    @InjectRepository(InventoryBatch)
    private batchRepository: Repository<InventoryBatch>,
  ) {}

  async createReservation(data: {
    warehouse_id: string;
    product_id: string;
    quantity: number;
    unit: string;
    reserved_for: string;
    reserved_by_id?: string;
    expires_in_hours?: number;
    batch_id?: string;
  }): Promise<StockReservation> {
    // Check if enough stock is available
    const available = await this.getAvailableQuantity(
      data.warehouse_id,
      data.product_id,
      data.batch_id,
    );

    if (available < data.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${available}, Requested: ${data.quantity}`,
      );
    }

    const reservationNumber = await this.generateReservationNumber();
    const expiresAt = data.expires_in_hours ? addHours(new Date(), data.expires_in_hours) : null;

    const reservation = this.reservationRepository.create({
      reservation_number: reservationNumber,
      warehouse_id: data.warehouse_id,
      product_id: data.product_id,
      batch_id: data.batch_id,
      quantity_reserved: data.quantity,
      unit: data.unit,
      reserved_for: data.reserved_for,
      reserved_by_id: data.reserved_by_id,
      reserved_at: new Date(),
      expires_at: expiresAt,
    });

    const saved = await this.reservationRepository.save(reservation);

    // Update batch reserved quantity
    if (data.batch_id) {
      await this.updateBatchReservedQuantity(data.batch_id, data.quantity);
    }

    return saved;
  }

  async fulfillReservation(
    reservationId: string,
    quantityFulfilled: number,
  ): Promise<StockReservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new Error(`Reservation with ID ${reservationId} not found`);
    }

    reservation.quantity_fulfilled = Number(reservation.quantity_fulfilled) + quantityFulfilled;

    if (reservation.quantity_fulfilled >= Number(reservation.quantity_reserved)) {
      reservation.status = ReservationStatus.FULFILLED;
      reservation.fulfilled_at = new Date();
    } else {
      reservation.status = ReservationStatus.PARTIALLY_FULFILLED;
    }

    const saved = await this.reservationRepository.save(reservation);

    // Release reserved quantity from batch
    if (reservation.batch_id) {
      await this.updateBatchReservedQuantity(reservation.batch_id, -quantityFulfilled);
    }

    return saved;
  }

  async cancelReservation(reservationId: string): Promise<StockReservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new Error(`Reservation with ID ${reservationId} not found`);
    }

    const quantityToRelease =
      Number(reservation.quantity_reserved) - Number(reservation.quantity_fulfilled);

    reservation.status = ReservationStatus.CANCELLED;

    const saved = await this.reservationRepository.save(reservation);

    // Release reserved quantity from batch
    if (reservation.batch_id && quantityToRelease > 0) {
      await this.updateBatchReservedQuantity(reservation.batch_id, -quantityToRelease);
    }

    return saved;
  }

  async getActiveReservations(warehouseId: string): Promise<StockReservation[]> {
    return this.reservationRepository.find({
      where: {
        warehouse_id: warehouseId,
        status: ReservationStatus.CONFIRMED,
      },
      order: { reserved_at: 'DESC' },
    });
  }

  async expireOldReservations(): Promise<number> {
    const expiredReservations = await this.reservationRepository.find({
      where: {
        status: ReservationStatus.PENDING,
      },
    });

    const now = new Date();
    let expiredCount = 0;

    for (const reservation of expiredReservations) {
      if (reservation.expires_at && now > new Date(reservation.expires_at)) {
        reservation.status = ReservationStatus.EXPIRED;
        await this.reservationRepository.save(reservation);

        // Release reserved quantity
        if (reservation.batch_id) {
          const quantityToRelease =
            Number(reservation.quantity_reserved) - Number(reservation.quantity_fulfilled);
          if (quantityToRelease > 0) {
            await this.updateBatchReservedQuantity(reservation.batch_id, -quantityToRelease);
          }
        }

        expiredCount++;
      }
    }

    return expiredCount;
  }

  private async getAvailableQuantity(
    warehouseId: string,
    productId: string,
    batchId?: string,
  ): Promise<number> {
    if (batchId) {
      const batch = await this.batchRepository.findOne({ where: { id: batchId } });
      return batch ? Number(batch.available_quantity) : 0;
    }

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

  private async updateBatchReservedQuantity(
    batchId: string,
    quantityChange: number,
  ): Promise<void> {
    const batch = await this.batchRepository.findOne({ where: { id: batchId } });

    if (!batch) {
      throw new Error(`Batch with ID ${batchId} not found`);
    }

    batch.reserved_quantity = Number(batch.reserved_quantity) + quantityChange;
    batch.available_quantity = Number(batch.current_quantity) - Number(batch.reserved_quantity);

    await this.batchRepository.save(batch);
  }

  private async generateReservationNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `RSV-${dateStr}-${random}`;
  }
}
