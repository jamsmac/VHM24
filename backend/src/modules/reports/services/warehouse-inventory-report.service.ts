import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WarehouseInventory } from '@modules/inventory/entities/warehouse-inventory.entity';
import { InventoryMovement } from '@modules/inventory/entities/inventory-movement.entity';
import { InventoryBatch } from '@modules/warehouse/entities/inventory-batch.entity';
import { Warehouse } from '@modules/warehouse/entities/warehouse.entity';
import { Nomenclature } from '@modules/nomenclature/entities/nomenclature.entity';

export interface WarehouseInventoryReport {
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
  period: {
    start_date: Date;
    end_date: Date;
  };
  current_stock: {
    total_items: number;
    total_value: number;
    low_stock_items: number;
    out_of_stock_items: number;
    items: Array<{
      product_name: string;
      current_quantity: number;
      reserved_quantity: number;
      available_quantity: number;
      min_stock_level: number;
      unit_price: number;
      total_value: number;
      status: string; // 'ok', 'low', 'out'
    }>;
  };
  movements: {
    total_movements: number;
    inbound: number;
    outbound: number;
    adjustments: number;
    by_type: Array<{
      type: string;
      count: number;
      total_quantity: number;
    }>;
  };
  expiry_tracking: {
    total_batches: number;
    expiring_soon: number; // Within 30 days
    expired: number;
    batches: Array<{
      batch_number: string;
      product_name: string;
      quantity: number;
      expiry_date: Date;
      days_until_expiry: number;
      status: string; // 'expired', 'urgent', 'warning', 'ok'
    }>;
  };
  generated_at: Date;
}

@Injectable()
export class WarehouseInventoryReportService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(WarehouseInventory)
    private readonly warehouseInventoryRepository: Repository<WarehouseInventory>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepository: Repository<InventoryMovement>,
    @InjectRepository(InventoryBatch)
    private readonly batchRepository: Repository<InventoryBatch>,
    @InjectRepository(Nomenclature)
    private readonly nomenclatureRepository: Repository<Nomenclature>,
  ) {}

  /**
   * Generate warehouse inventory report
   */
  async generateReport(
    warehouseId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WarehouseInventoryReport> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: warehouseId },
    });

    if (!warehouse) {
      throw new Error(`Warehouse with ID ${warehouseId} not found`);
    }

    const [currentStock, movements, expiryTracking] = await Promise.all([
      this.getCurrentStock(warehouseId),
      this.getMovements(warehouseId, startDate, endDate),
      this.getExpiryTracking(warehouseId),
    ]);

    return {
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        location: warehouse.address || warehouse.location?.address || '',
      },
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      current_stock: currentStock,
      movements,
      expiry_tracking: expiryTracking,
      generated_at: new Date(),
    };
  }

  /**
   * Get current stock levels
   */
  private async getCurrentStock(
    _warehouseId: string,
  ): Promise<WarehouseInventoryReport['current_stock']> {
    // Note: WarehouseInventory doesn't have warehouse_id - it's global inventory
    // For warehouse-specific inventory, use InventoryBatch entity
    const inventory = await this.warehouseInventoryRepository.find({
      relations: ['nomenclature'],
    });

    let totalValue = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;

    const items = inventory.map((item) => {
      const currentQuantity = item.current_quantity || 0;
      const reservedQuantity = item.reserved_quantity || 0;
      const availableQuantity = currentQuantity - reservedQuantity;
      const minStockLevel = item.min_stock_level || 0;
      const unitPrice = item.nomenclature?.purchase_price || 0;
      const itemTotalValue = currentQuantity * unitPrice;

      totalValue += itemTotalValue;

      let status = 'ok';
      if (currentQuantity === 0) {
        status = 'out';
        outOfStockItems++;
      } else if (currentQuantity <= minStockLevel) {
        status = 'low';
        lowStockItems++;
      }

      return {
        product_name: item.nomenclature?.name || 'Unknown',
        current_quantity: currentQuantity,
        reserved_quantity: reservedQuantity,
        available_quantity: availableQuantity,
        min_stock_level: minStockLevel,
        unit_price: unitPrice,
        total_value: itemTotalValue,
        status,
      };
    });

    return {
      total_items: inventory.length,
      total_value: totalValue,
      low_stock_items: lowStockItems,
      out_of_stock_items: outOfStockItems,
      items: items.sort((a, b) => b.total_value - a.total_value),
    };
  }

  /**
   * Get inventory movements for period
   */
  private async getMovements(
    warehouseId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WarehouseInventoryReport['movements']> {
    const movementsRaw = await this.movementRepository
      .createQueryBuilder('m')
      .select('COUNT(m.id)', 'total')
      .addSelect("SUM(CASE WHEN m.movement_type = 'in' THEN 1 ELSE 0 END)", 'inbound')
      .addSelect("SUM(CASE WHEN m.movement_type = 'out' THEN 1 ELSE 0 END)", 'outbound')
      .addSelect("SUM(CASE WHEN m.movement_type = 'adjustment' THEN 1 ELSE 0 END)", 'adjustments')
      .where('m.warehouse_id = :warehouseId', { warehouseId })
      .andWhere('m.movement_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const byTypeRaw = await this.movementRepository
      .createQueryBuilder('m')
      .select('m.movement_type', 'type')
      .addSelect('COUNT(m.id)', 'count')
      .addSelect('SUM(m.quantity)', 'total_quantity')
      .where('m.warehouse_id = :warehouseId', { warehouseId })
      .andWhere('m.movement_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('m.movement_type')
      .getRawMany();

    const byType = byTypeRaw.map((item) => ({
      type: item.type,
      count: parseInt(item.count),
      total_quantity: parseFloat(item.total_quantity || '0'),
    }));

    return {
      total_movements: parseInt(movementsRaw?.total || '0'),
      inbound: parseInt(movementsRaw?.inbound || '0'),
      outbound: parseInt(movementsRaw?.outbound || '0'),
      adjustments: parseInt(movementsRaw?.adjustments || '0'),
      by_type: byType,
    };
  }

  /**
   * Get expiry tracking information
   */
  private async getExpiryTracking(
    warehouseId: string,
  ): Promise<WarehouseInventoryReport['expiry_tracking']> {
    const batches = await this.batchRepository.find({
      where: {
        warehouse_id: warehouseId,
        is_active: true,
      },
    });

    // Load product names in bulk
    const productIds = [...new Set(batches.map((b) => b.product_id))];
    const productNames = await this.loadProductNames(productIds);

    const now = new Date();
    let expiringSoon = 0;
    let expired = 0;

    const batchesData = batches
      .filter((batch) => batch.expiry_date != null)
      .map((batch) => {
        const expiryDate = new Date(batch.expiry_date!);
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        let status = 'ok';
        if (daysUntilExpiry < 0) {
          status = 'expired';
          expired++;
        } else if (daysUntilExpiry <= 7) {
          status = 'urgent';
          expiringSoon++;
        } else if (daysUntilExpiry <= 30) {
          status = 'warning';
          expiringSoon++;
        }

        return {
          batch_number: batch.batch_number,
          product_name: productNames.get(batch.product_id) || 'Unknown Product',
          quantity: batch.current_quantity || 0,
          expiry_date: expiryDate,
          days_until_expiry: daysUntilExpiry,
          status,
        };
      });

    // Sort by days until expiry (urgent first)
    batchesData.sort((a, b) => a.days_until_expiry - b.days_until_expiry);

    return {
      total_batches: batches.length,
      expiring_soon: expiringSoon,
      expired,
      batches: batchesData,
    };
  }

  /**
   * Load product names in bulk for a list of product IDs
   */
  private async loadProductNames(
    productIds: string[],
  ): Promise<Map<string, string>> {
    const nameMap = new Map<string, string>();

    if (productIds.length === 0) {
      return nameMap;
    }

    const products = await this.nomenclatureRepository.find({
      where: { id: In(productIds) },
      select: ['id', 'name', 'sku'],
    });

    for (const product of products) {
      // Include SKU for better identification
      const displayName = product.sku
        ? `${product.name} (${product.sku})`
        : product.name;
      nameMap.set(product.id, displayName);
    }

    return nameMap;
  }
}
