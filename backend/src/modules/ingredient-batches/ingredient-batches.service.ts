import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { IngredientBatch, IngredientBatchStatus } from './entities/ingredient-batch.entity';
import { CreateIngredientBatchDto } from './dto/create-batch.dto';
import { UpdateIngredientBatchDto } from './dto/update-batch.dto';
import { DeductBatchDto, DeductBatchResponseDto } from './dto/deduct-batch.dto';

/**
 * Stock information for a nomenclature
 */
export interface StockInfo {
  nomenclature_id: string;
  total_stock: number;
  active_batches_count: number;
  oldest_expiry_date: Date | null;
  unit: string;
}

/**
 * Ingredient Batches Service
 *
 * Manages ingredient batch operations with FIFO (First-In-First-Out)
 * inventory management for tracking ingredient usage.
 *
 * Part of VH24 Integration - Phase 4.1.3
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.3
 */
@Injectable()
export class IngredientBatchesService {
  private readonly logger = new Logger(IngredientBatchesService.name);

  constructor(
    @InjectRepository(IngredientBatch)
    private readonly batchRepository: Repository<IngredientBatch>,
  ) {}

  /**
   * Find all batches with optional filters and pagination
   *
   * @param filters - Optional filters for nomenclature_id, status, supplier_id
   * @param page - Page number (1-based), defaults to 1
   * @param limit - Items per page, defaults to 50, max 200
   * @returns Paginated result with batches
   */
  async findAll(
    filters?: {
      nomenclature_id?: string;
      status?: IngredientBatchStatus;
      supplier_id?: string;
    },
    page = 1,
    limit = 50,
  ): Promise<{
    data: IngredientBatch[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const sanitizedLimit = Math.min(Math.max(1, limit), 200);
    const sanitizedPage = Math.max(1, page);
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const query = this.batchRepository.createQueryBuilder('batch');
    query.leftJoinAndSelect('batch.nomenclature', 'nomenclature');
    query.leftJoinAndSelect('batch.supplier', 'supplier');

    if (filters?.nomenclature_id) {
      query.andWhere('batch.nomenclature_id = :nomenclature_id', {
        nomenclature_id: filters.nomenclature_id,
      });
    }

    if (filters?.status) {
      query.andWhere('batch.status = :status', { status: filters.status });
    }

    if (filters?.supplier_id) {
      query.andWhere('batch.supplier_id = :supplier_id', {
        supplier_id: filters.supplier_id,
      });
    }

    query.skip(skip).take(sanitizedLimit);
    query.orderBy('batch.received_date', 'DESC');
    query.addOrderBy('batch.created_at', 'DESC');

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page: sanitizedPage,
      limit: sanitizedLimit,
      totalPages: Math.ceil(total / sanitizedLimit),
    };
  }

  /**
   * Find a batch by its ID
   *
   * @param id - Batch UUID
   * @returns Batch entity with relations
   * @throws NotFoundException if batch not found
   */
  async findOne(id: string): Promise<IngredientBatch> {
    const batch = await this.batchRepository.findOne({
      where: { id },
      relations: ['nomenclature', 'supplier'],
    });

    if (!batch) {
      throw new NotFoundException(`Ingredient batch with ID ${id} not found`);
    }

    return batch;
  }

  /**
   * Find all batches for a specific nomenclature
   *
   * @param nomenclatureId - Nomenclature UUID
   * @param includeAll - If true, include depleted/expired/returned batches
   * @returns Array of batches ordered by received_date (FIFO order)
   */
  async findByNomenclature(
    nomenclatureId: string,
    includeAll = false,
  ): Promise<IngredientBatch[]> {
    const query = this.batchRepository.createQueryBuilder('batch');
    query.leftJoinAndSelect('batch.supplier', 'supplier');
    query.where('batch.nomenclature_id = :nomenclatureId', { nomenclatureId });

    if (!includeAll) {
      query.andWhere('batch.status = :status', {
        status: IngredientBatchStatus.IN_STOCK,
      });
    }

    query.orderBy('batch.received_date', 'ASC');

    return query.getMany();
  }

  /**
   * Create a new ingredient batch
   *
   * @param dto - Batch creation data
   * @returns Created batch
   * @throws ConflictException if batch_number already exists for nomenclature
   */
  async create(dto: CreateIngredientBatchDto): Promise<IngredientBatch> {
    // Check if batch_number already exists for this nomenclature
    const existingBatch = await this.batchRepository.findOne({
      where: {
        nomenclature_id: dto.nomenclature_id,
        batch_number: dto.batch_number,
      },
    });

    if (existingBatch) {
      throw new ConflictException(
        `Batch with number "${dto.batch_number}" already exists for this nomenclature`,
      );
    }

    // Set remaining_quantity to quantity if not specified
    const remainingQuantity = dto.remaining_quantity ?? dto.quantity;

    // Validate remaining_quantity doesn't exceed quantity
    if (remainingQuantity > dto.quantity) {
      throw new BadRequestException(
        'remaining_quantity cannot exceed quantity',
      );
    }

    const batch = this.batchRepository.create({
      ...dto,
      remaining_quantity: remainingQuantity,
      received_date: dto.received_date ? new Date(dto.received_date) : new Date(),
      manufacture_date: dto.manufacture_date ? new Date(dto.manufacture_date) : null,
      expiry_date: dto.expiry_date ? new Date(dto.expiry_date) : null,
      status: dto.status ?? IngredientBatchStatus.IN_STOCK,
    });

    const savedBatch = await this.batchRepository.save(batch);

    this.logger.log(
      `Created ingredient batch ${savedBatch.id} (${savedBatch.batch_number}) for nomenclature ${savedBatch.nomenclature_id}`,
    );

    return this.findOne(savedBatch.id);
  }

  /**
   * Update an existing batch
   *
   * @param id - Batch UUID
   * @param dto - Batch update data
   * @returns Updated batch
   * @throws NotFoundException if batch not found
   * @throws ConflictException if new batch_number already exists
   */
  async update(id: string, dto: UpdateIngredientBatchDto): Promise<IngredientBatch> {
    const batch = await this.findOne(id);

    // Check if changing batch_number to an existing one
    if (dto.batch_number && dto.batch_number !== batch.batch_number) {
      const existingBatch = await this.batchRepository.findOne({
        where: {
          nomenclature_id: batch.nomenclature_id,
          batch_number: dto.batch_number,
        },
      });

      if (existingBatch) {
        throw new ConflictException(
          `Batch with number "${dto.batch_number}" already exists for this nomenclature`,
        );
      }
    }

    // Validate remaining_quantity doesn't exceed quantity
    const newQuantity = dto.quantity ?? batch.quantity;
    const newRemainingQuantity = dto.remaining_quantity ?? batch.remaining_quantity;
    if (newRemainingQuantity > newQuantity) {
      throw new BadRequestException(
        'remaining_quantity cannot exceed quantity',
      );
    }

    // Update status to DEPLETED if remaining_quantity becomes 0
    let statusToSet = dto.status;
    if (dto.remaining_quantity === 0) {
      statusToSet = IngredientBatchStatus.DEPLETED;
    }

    // Build update data object, converting date strings to Date objects
    const updateData: Partial<IngredientBatch> = {};

    if (dto.batch_number !== undefined) updateData.batch_number = dto.batch_number;
    if (dto.quantity !== undefined) updateData.quantity = dto.quantity;
    if (dto.remaining_quantity !== undefined) updateData.remaining_quantity = dto.remaining_quantity;
    if (dto.purchase_price !== undefined) updateData.purchase_price = dto.purchase_price;
    if (dto.supplier_id !== undefined) updateData.supplier_id = dto.supplier_id;
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata;
    if (statusToSet !== undefined) updateData.status = statusToSet;

    // Process date fields (convert strings to Date objects)
    if (dto.manufacture_date !== undefined) {
      updateData.manufacture_date = dto.manufacture_date ? new Date(dto.manufacture_date) : null;
    }
    if (dto.expiry_date !== undefined) {
      updateData.expiry_date = dto.expiry_date ? new Date(dto.expiry_date) : null;
    }
    if (dto.received_date !== undefined) {
      updateData.received_date = new Date(dto.received_date);
    }

    await this.batchRepository.update(id, updateData);

    this.logger.log(`Updated ingredient batch ${id}`);

    return this.findOne(id);
  }

  /**
   * Soft delete a batch
   *
   * @param id - Batch UUID
   * @throws NotFoundException if batch not found
   */
  async remove(id: string): Promise<void> {
    const batch = await this.findOne(id);

    await this.batchRepository.softDelete(id);

    this.logger.log(
      `Deleted ingredient batch ${id} (${batch.batch_number})`,
    );
  }

  /**
   * Deduct quantity from batches using FIFO (First-In-First-Out)
   *
   * Deducts from the oldest batches first (by received_date).
   * Multiple batches may be affected if quantity exceeds single batch.
   *
   * @param dto - Deduction data with nomenclature_id and quantity
   * @returns Details of the deduction operation
   * @throws BadRequestException if not enough stock available
   */
  async deductWithFIFO(dto: DeductBatchDto): Promise<DeductBatchResponseDto> {
    const { nomenclature_id, quantity, reason, reference_id, reference_type } = dto;

    // Get all in-stock batches for this nomenclature, ordered by received_date (FIFO)
    const batches = await this.batchRepository.find({
      where: {
        nomenclature_id,
        status: IngredientBatchStatus.IN_STOCK,
      },
      order: { received_date: 'ASC' },
    });

    // Calculate total available stock
    const totalStock = batches.reduce(
      (sum, batch) => sum + Number(batch.remaining_quantity),
      0,
    );

    if (totalStock < quantity) {
      throw new BadRequestException(
        `Insufficient stock for nomenclature ${nomenclature_id}. ` +
        `Available: ${totalStock}, Requested: ${quantity}`,
      );
    }

    // Perform FIFO deduction
    let remaining = quantity;
    const affectedBatches: DeductBatchResponseDto['affected_batches'] = [];

    for (const batch of batches) {
      if (remaining <= 0) break;

      const batchRemaining = Number(batch.remaining_quantity);
      const deductFromBatch = Math.min(batchRemaining, remaining);
      const newRemaining = batchRemaining - deductFromBatch;

      // Update batch
      const newStatus = newRemaining === 0
        ? IngredientBatchStatus.DEPLETED
        : IngredientBatchStatus.IN_STOCK;

      // Add deduction record to metadata
      const metadata = batch.metadata || {};
      const deductionHistory = metadata.deduction_history || [];
      deductionHistory.push({
        date: new Date().toISOString(),
        quantity: deductFromBatch,
        reason,
        reference_id,
        reference_type,
      });
      // Keep only last 50 deduction records
      if (deductionHistory.length > 50) {
        deductionHistory.shift();
      }

      await this.batchRepository.update(batch.id, {
        remaining_quantity: newRemaining,
        status: newStatus,
        metadata: { ...metadata, deduction_history: deductionHistory },
      });

      affectedBatches.push({
        batch_id: batch.id,
        batch_number: batch.batch_number,
        deducted_from_batch: deductFromBatch,
        remaining_after: newRemaining,
        status_after: newStatus,
      });

      remaining -= deductFromBatch;
    }

    const remainingStock = totalStock - quantity;

    this.logger.log(
      `FIFO deduction: ${quantity} from nomenclature ${nomenclature_id}. ` +
      `Affected ${affectedBatches.length} batches. Remaining stock: ${remainingStock}`,
    );

    return {
      deducted_quantity: quantity,
      batches_affected: affectedBatches.length,
      affected_batches: affectedBatches,
      remaining_stock: remainingStock,
    };
  }

  /**
   * Check and mark expired batches
   *
   * Finds all in-stock batches with expiry_date before today
   * and marks them as EXPIRED.
   *
   * @returns Array of batch IDs that were marked as expired
   */
  async checkExpired(): Promise<string[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all in-stock batches with expired dates
    const expiredBatches = await this.batchRepository.find({
      where: {
        status: IngredientBatchStatus.IN_STOCK,
        expiry_date: LessThan(today),
      },
    });

    if (expiredBatches.length === 0) {
      return [];
    }

    const expiredIds = expiredBatches.map((batch) => batch.id);

    // Update all expired batches
    await this.batchRepository.update(
      { id: In(expiredIds) },
      { status: IngredientBatchStatus.EXPIRED },
    );

    this.logger.warn(
      `Marked ${expiredIds.length} batches as expired: ${expiredIds.join(', ')}`,
    );

    return expiredIds;
  }

  /**
   * Get total stock for a nomenclature
   *
   * Returns the sum of remaining_quantity from all in-stock batches.
   *
   * @param nomenclatureId - Nomenclature UUID
   * @returns Stock information
   */
  async getStock(nomenclatureId: string): Promise<StockInfo> {
    const batches = await this.batchRepository.find({
      where: {
        nomenclature_id: nomenclatureId,
        status: IngredientBatchStatus.IN_STOCK,
      },
      order: { expiry_date: 'ASC' },
    });

    const totalStock = batches.reduce(
      (sum, batch) => sum + Number(batch.remaining_quantity),
      0,
    );

    const oldestExpiryDate = batches.find((b) => b.expiry_date)?.expiry_date || null;
    const unit = batches[0]?.unit || '';

    return {
      nomenclature_id: nomenclatureId,
      total_stock: totalStock,
      active_batches_count: batches.length,
      oldest_expiry_date: oldestExpiryDate,
      unit,
    };
  }

  /**
   * Get batches expiring soon
   *
   * @param daysUntilExpiry - Number of days to look ahead (default: 7)
   * @returns Array of batches expiring within the specified days
   */
  async getExpiringBatches(daysUntilExpiry = 7): Promise<IngredientBatch[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysUntilExpiry);

    return this.batchRepository
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.nomenclature', 'nomenclature')
      .leftJoinAndSelect('batch.supplier', 'supplier')
      .where('batch.status = :status', { status: IngredientBatchStatus.IN_STOCK })
      .andWhere('batch.expiry_date IS NOT NULL')
      .andWhere('batch.expiry_date <= :futureDate', { futureDate })
      .andWhere('batch.expiry_date >= :today', { today })
      .orderBy('batch.expiry_date', 'ASC')
      .getMany();
  }

  /**
   * Get stock summary for all nomenclatures with active batches
   *
   * @returns Array of stock information for each nomenclature
   */
  async getStockSummary(): Promise<StockInfo[]> {
    const result = await this.batchRepository
      .createQueryBuilder('batch')
      .select('batch.nomenclature_id', 'nomenclature_id')
      .addSelect('SUM(batch.remaining_quantity)', 'total_stock')
      .addSelect('COUNT(batch.id)', 'active_batches_count')
      .addSelect('MIN(batch.expiry_date)', 'oldest_expiry_date')
      .addSelect('MAX(batch.unit)', 'unit')
      .where('batch.status = :status', { status: IngredientBatchStatus.IN_STOCK })
      .groupBy('batch.nomenclature_id')
      .getRawMany();

    return result.map((row) => ({
      nomenclature_id: row.nomenclature_id,
      total_stock: Number(row.total_stock) || 0,
      active_batches_count: Number(row.active_batches_count) || 0,
      oldest_expiry_date: row.oldest_expiry_date,
      unit: row.unit || '',
    }));
  }
}
