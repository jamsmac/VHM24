import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseHistory } from './entities/purchase-history.entity';
import { CreatePurchaseDto, PurchaseStatus } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

export interface StatusStats {
  status: string;
  count: string;
  total: string;
}

export interface SupplierStats {
  supplier_id: string;
  supplier_name: string;
  purchase_count: string;
  total_amount: string;
}

export interface MonthStats {
  month: string;
  count: string;
  total: string;
}

export interface ImportError {
  row: CreatePurchaseDto;
  error: string;
}

export interface PriceHistoryItem {
  date: string;
  price: number;
  quantity: number;
  supplier_id: string;
  supplier_name: string;
}

@Injectable()
export class PurchaseHistoryService {
  constructor(
    @InjectRepository(PurchaseHistory)
    private readonly purchaseRepository: Repository<PurchaseHistory>,
  ) {}

  /**
   * Create new purchase record
   * REQ-STK-04: История закупок с датой, поставщиком, ценой
   */
  async create(dto: CreatePurchaseDto, userId?: string): Promise<PurchaseHistory> {
    // Calculate VAT and total
    const vatRate = dto.vat_rate ?? 15; // Default 15% VAT in Uzbekistan
    const vatAmount = (dto.quantity * dto.unit_price * vatRate) / 100;
    const totalAmount = dto.quantity * dto.unit_price + vatAmount;

    const purchase = this.purchaseRepository.create({
      ...dto,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      currency: dto.currency || 'UZS',
      exchange_rate: dto.exchange_rate || 1,
      status: dto.status || PurchaseStatus.RECEIVED,
      created_by_id: userId,
      import_source: 'manual',
    });

    return await this.purchaseRepository.save(purchase);
  }

  /**
   * Get all purchases with filters
   * REQ-STK-05: Связь закупок с номенклатурой
   */
  async findAll(filters: {
    supplier_id?: string;
    nomenclature_id?: string;
    warehouse_id?: string;
    status?: PurchaseStatus;
    date_from?: string;
    date_to?: string;
    invoice_number?: string;
  }): Promise<PurchaseHistory[]> {
    const query = this.purchaseRepository
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.supplier', 'supplier')
      .leftJoinAndSelect('purchase.nomenclature', 'nomenclature')
      .leftJoinAndSelect('purchase.warehouse', 'warehouse')
      .leftJoinAndSelect('purchase.created_by', 'user');

    if (filters.supplier_id) {
      query.andWhere('purchase.supplier_id = :supplier_id', {
        supplier_id: filters.supplier_id,
      });
    }

    if (filters.nomenclature_id) {
      query.andWhere('purchase.nomenclature_id = :nomenclature_id', {
        nomenclature_id: filters.nomenclature_id,
      });
    }

    if (filters.warehouse_id) {
      query.andWhere('purchase.warehouse_id = :warehouse_id', {
        warehouse_id: filters.warehouse_id,
      });
    }

    if (filters.status) {
      query.andWhere('purchase.status = :status', { status: filters.status });
    }

    if (filters.date_from && filters.date_to) {
      query.andWhere('purchase.purchase_date BETWEEN :date_from AND :date_to', {
        date_from: filters.date_from,
        date_to: filters.date_to,
      });
    } else if (filters.date_from) {
      query.andWhere('purchase.purchase_date >= :date_from', {
        date_from: filters.date_from,
      });
    } else if (filters.date_to) {
      query.andWhere('purchase.purchase_date <= :date_to', {
        date_to: filters.date_to,
      });
    }

    if (filters.invoice_number) {
      query.andWhere('purchase.invoice_number LIKE :invoice', {
        invoice: `%${filters.invoice_number}%`,
      });
    }

    query.orderBy('purchase.purchase_date', 'DESC').addOrderBy('purchase.created_at', 'DESC');

    return await query.getMany();
  }

  /**
   * Get single purchase by ID
   */
  async findOne(id: string): Promise<PurchaseHistory> {
    const purchase = await this.purchaseRepository.findOne({
      where: { id },
      relations: ['supplier', 'nomenclature', 'warehouse', 'created_by'],
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`);
    }

    return purchase;
  }

  /**
   * Update purchase record
   */
  async update(id: string, dto: UpdatePurchaseDto): Promise<PurchaseHistory> {
    const purchase = await this.findOne(id);

    // Recalculate if price/quantity/vat changed
    if (dto.quantity !== undefined || dto.unit_price !== undefined || dto.vat_rate !== undefined) {
      const quantity = dto.quantity ?? purchase.quantity;
      const unitPrice = dto.unit_price ?? purchase.unit_price;
      const vatRate = dto.vat_rate ?? purchase.vat_rate;

      const vatAmount = (quantity * unitPrice * vatRate) / 100;
      const totalAmount = quantity * unitPrice + vatAmount;

      Object.assign(dto, {
        vat_amount: vatAmount,
        total_amount: totalAmount,
      });
    }

    await this.purchaseRepository.update(id, dto);
    return await this.findOne(id);
  }

  /**
   * Delete purchase record
   */
  async remove(id: string): Promise<void> {
    await this.findOne(id); // Verify exists
    await this.purchaseRepository.softDelete(id);
  }

  /**
   * Get purchase statistics
   */
  async getStats(filters: {
    supplier_id?: string;
    warehouse_id?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{
    total_purchases: number;
    total_amount: number;
    total_vat: number;
    by_status: StatusStats[];
    by_supplier: SupplierStats[];
    by_month: MonthStats[];
  }> {
    const query = this.purchaseRepository.createQueryBuilder('purchase');

    if (filters.supplier_id) {
      query.where('purchase.supplier_id = :supplier_id', {
        supplier_id: filters.supplier_id,
      });
    }

    if (filters.warehouse_id) {
      query.andWhere('purchase.warehouse_id = :warehouse_id', {
        warehouse_id: filters.warehouse_id,
      });
    }

    if (filters.date_from && filters.date_to) {
      query.andWhere('purchase.purchase_date BETWEEN :date_from AND :date_to', {
        date_from: filters.date_from,
        date_to: filters.date_to,
      });
    }

    const stats = await query
      .select('COUNT(*)', 'total_purchases')
      .addSelect('SUM(purchase.total_amount)', 'total_amount')
      .addSelect('SUM(purchase.vat_amount)', 'total_vat')
      .getRawOne();

    // By status
    const byStatus = await this.purchaseRepository
      .createQueryBuilder('purchase')
      .select('purchase.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(purchase.total_amount)', 'total')
      .groupBy('purchase.status')
      .getRawMany();

    // By supplier
    const bySupplier = await this.purchaseRepository
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.supplier', 'supplier')
      .select('supplier.id', 'supplier_id')
      .addSelect('supplier.name', 'supplier_name')
      .addSelect('COUNT(*)', 'purchase_count')
      .addSelect('SUM(purchase.total_amount)', 'total_amount')
      .groupBy('supplier.id')
      .addGroupBy('supplier.name')
      .orderBy('total_amount', 'DESC')
      .limit(10)
      .getRawMany();

    // By month
    const byMonth = await this.purchaseRepository
      .createQueryBuilder('purchase')
      .select("TO_CHAR(purchase.purchase_date, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(purchase.total_amount)', 'total')
      .groupBy('month')
      .orderBy('month', 'DESC')
      .limit(12)
      .getRawMany();

    return {
      total_purchases: parseInt(stats.total_purchases) || 0,
      total_amount: parseFloat(stats.total_amount) || 0,
      total_vat: parseFloat(stats.total_vat) || 0,
      by_status: byStatus,
      by_supplier: bySupplier,
      by_month: byMonth,
    };
  }

  /**
   * Get price history for nomenclature
   */
  async getPriceHistory(nomenclature_id: string, supplier_id?: string): Promise<PriceHistoryItem[]> {
    const query = this.purchaseRepository
      .createQueryBuilder('purchase')
      .where('purchase.nomenclature_id = :nomenclature_id', { nomenclature_id });

    if (supplier_id) {
      query.andWhere('purchase.supplier_id = :supplier_id', { supplier_id });
    }

    const history = await query
      .select('purchase.purchase_date', 'date')
      .addSelect('purchase.unit_price', 'price')
      .addSelect('purchase.quantity', 'quantity')
      .addSelect('purchase.supplier_id', 'supplier_id')
      .addSelect('supplier.name', 'supplier_name')
      .leftJoin('purchase.supplier', 'supplier')
      .orderBy('purchase.purchase_date', 'DESC')
      .limit(50)
      .getRawMany();

    return history;
  }

  /**
   * Import purchases from CSV/Excel
   * REQ-IMP-02: Импорт исторических данных
   */
  async importPurchases(
    data: CreatePurchaseDto[],
    import_session_id: string,
    userId: string,
  ): Promise<{ imported: number; failed: number; errors: ImportError[] }> {
    let imported = 0;
    let failed = 0;
    const errors = [];

    for (const item of data) {
      try {
        await this.create(
          {
            ...item,
            import_source: 'csv',
            import_session_id,
          } as any,
          userId,
        );
        imported++;
      } catch (error) {
        failed++;
        errors.push({
          row: item,
          error: error.message,
        });
      }
    }

    return { imported, failed, errors };
  }

  /**
   * Calculate average price for nomenclature
   */
  async getAveragePrice(
    nomenclature_id: string,
    period_days: number = 90,
  ): Promise<{
    average_price: number;
    min_price: number;
    max_price: number;
    purchase_count: number;
  }> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - period_days);

    const stats = await this.purchaseRepository
      .createQueryBuilder('purchase')
      .where('purchase.nomenclature_id = :nomenclature_id', { nomenclature_id })
      .andWhere('purchase.purchase_date >= :dateFrom', { dateFrom })
      .andWhere('purchase.status = :status', { status: PurchaseStatus.RECEIVED })
      .select('AVG(purchase.unit_price)', 'average_price')
      .addSelect('MIN(purchase.unit_price)', 'min_price')
      .addSelect('MAX(purchase.unit_price)', 'max_price')
      .addSelect('COUNT(*)', 'purchase_count')
      .getRawOne();

    return {
      average_price: parseFloat(stats.average_price) || 0,
      min_price: parseFloat(stats.min_price) || 0,
      max_price: parseFloat(stats.max_price) || 0,
      purchase_count: parseInt(stats.purchase_count) || 0,
    };
  }

  /**
   * Calculate weighted average cost for nomenclature
   * REQ-PROC-02: Расчёт средневзвешенной стоимости запасов
   *
   * Formula: WAC = (Sum of (Quantity × Unit Price)) / Sum of Quantity
   *
   * @param nomenclature_id - ID номенклатуры
   * @param upToDate - Дата до которой считать (по умолчанию - сейчас)
   * @param warehouse_id - Опционально: только по конкретному складу
   * @returns Средневзвешенная стоимость и детали расчёта
   */
  async getWeightedAverageCost(
    nomenclature_id: string,
    upToDate?: Date,
    warehouse_id?: string,
  ): Promise<{
    weighted_average_cost: number;
    total_quantity: number;
    total_cost: number;
    purchase_count: number;
    oldest_purchase_date: Date | null;
    latest_purchase_date: Date | null;
  }> {
    const query = this.purchaseRepository
      .createQueryBuilder('purchase')
      .where('purchase.nomenclature_id = :nomenclature_id', { nomenclature_id })
      .andWhere('purchase.status = :status', { status: PurchaseStatus.RECEIVED });

    if (upToDate) {
      query.andWhere('purchase.purchase_date <= :upToDate', { upToDate });
    }

    if (warehouse_id) {
      query.andWhere('purchase.warehouse_id = :warehouse_id', { warehouse_id });
    }

    // Calculate weighted average: SUM(quantity * unit_price) / SUM(quantity)
    const result = await query
      .select('SUM(purchase.quantity * purchase.unit_price)', 'total_cost')
      .addSelect('SUM(purchase.quantity)', 'total_quantity')
      .addSelect('COUNT(*)', 'purchase_count')
      .addSelect('MIN(purchase.purchase_date)', 'oldest_purchase_date')
      .addSelect('MAX(purchase.purchase_date)', 'latest_purchase_date')
      .getRawOne();

    const totalQuantity = parseFloat(result.total_quantity) || 0;
    const totalCost = parseFloat(result.total_cost) || 0;
    const weightedAverageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    return {
      weighted_average_cost: Math.round(weightedAverageCost * 100) / 100, // Round to 2 decimals
      total_quantity: totalQuantity,
      total_cost: totalCost,
      purchase_count: parseInt(result.purchase_count) || 0,
      oldest_purchase_date: result.oldest_purchase_date,
      latest_purchase_date: result.latest_purchase_date,
    };
  }

  /**
   * Calculate moving average cost for nomenclature
   * REQ-PROC-02: Расчёт средневзвешенной стоимости запасов
   *
   * This is a simplified version that uses recent purchases (FIFO-like)
   *
   * @param nomenclature_id - ID номенклатуры
   * @param period_days - Период в днях для расчёта (по умолчанию 90)
   * @returns Скользящая средняя стоимость
   */
  async getMovingAverageCost(
    nomenclature_id: string,
    period_days: number = 90,
  ): Promise<{
    moving_average_cost: number;
    total_quantity: number;
    total_cost: number;
    purchase_count: number;
    period_start_date: Date;
    period_end_date: Date;
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period_days);

    const result = await this.purchaseRepository
      .createQueryBuilder('purchase')
      .where('purchase.nomenclature_id = :nomenclature_id', { nomenclature_id })
      .andWhere('purchase.purchase_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('purchase.status = :status', { status: PurchaseStatus.RECEIVED })
      .select('SUM(purchase.quantity * purchase.unit_price)', 'total_cost')
      .addSelect('SUM(purchase.quantity)', 'total_quantity')
      .addSelect('COUNT(*)', 'purchase_count')
      .getRawOne();

    const totalQuantity = parseFloat(result.total_quantity) || 0;
    const totalCost = parseFloat(result.total_cost) || 0;
    const movingAverageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    return {
      moving_average_cost: Math.round(movingAverageCost * 100) / 100,
      total_quantity: totalQuantity,
      total_cost: totalCost,
      purchase_count: parseInt(result.purchase_count) || 0,
      period_start_date: startDate,
      period_end_date: endDate,
    };
  }
}
