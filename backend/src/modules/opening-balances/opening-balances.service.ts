import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockOpeningBalance } from './entities/opening-balance.entity';
import { CreateOpeningBalanceDto } from './dto/create-opening-balance.dto';
import { UpdateOpeningBalanceDto } from './dto/update-opening-balance.dto';
import { WarehouseInventory } from '@/modules/inventory/entities/warehouse-inventory.entity';

interface BalanceWhereCondition {
  nomenclature_id?: string;
  balance_date?: Date;
  warehouse_id?: string;
  is_applied?: boolean;
}

export interface BulkError {
  nomenclature_id: string;
  error: string;
}

export interface ImportError {
  row: CreateOpeningBalanceDto;
  error: string;
}

/** Extended DTO for import operations with metadata fields */
interface ImportBalanceData extends CreateOpeningBalanceDto {
  import_source: string;
  import_session_id: string;
}

export interface WarehouseStats {
  warehouse_id: string;
  warehouse_name: string;
  item_count: string;
  total_value: string;
}

@Injectable()
export class OpeningBalancesService {
  private readonly logger = new Logger(OpeningBalancesService.name);

  constructor(
    @InjectRepository(StockOpeningBalance)
    private readonly balanceRepository: Repository<StockOpeningBalance>,
    @InjectRepository(WarehouseInventory)
    private readonly warehouseInventoryRepository: Repository<WarehouseInventory>,
  ) {}

  /**
   * Create new opening balance
   * REQ-STK-01: Начальные остатки для каждой номенклатуры
   */
  async create(dto: CreateOpeningBalanceDto | ImportBalanceData): Promise<StockOpeningBalance> {
    // Check if balance already exists for this nomenclature/warehouse/date
    const whereCondition: BalanceWhereCondition = {
      nomenclature_id: dto.nomenclature_id,
      balance_date: new Date(dto.balance_date),
    };

    if (dto.warehouse_id) {
      whereCondition.warehouse_id = dto.warehouse_id;
    }

    const existing = await this.balanceRepository.findOne({
      where: whereCondition,
    });

    if (existing) {
      throw new BadRequestException(
        'Opening balance already exists for this nomenclature, warehouse and date',
      );
    }

    // Calculate total cost
    const totalCost = dto.quantity * dto.unit_cost;

    // Extract import fields if present
    const importData = dto as Partial<ImportBalanceData>;

    const balance = this.balanceRepository.create({
      ...dto,
      total_cost: totalCost,
      import_source: importData.import_source ?? 'manual',
      import_session_id: importData.import_session_id,
    });

    return await this.balanceRepository.save(balance);
  }

  /**
   * Get all opening balances with filters
   */
  async findAll(filters: {
    warehouse_id?: string;
    balance_date?: string;
    is_applied?: boolean;
    nomenclature_id?: string;
  }): Promise<StockOpeningBalance[]> {
    const query = this.balanceRepository
      .createQueryBuilder('balance')
      .leftJoinAndSelect('balance.nomenclature', 'nomenclature')
      .leftJoinAndSelect('balance.warehouse', 'warehouse')
      .leftJoinAndSelect('balance.applied_by', 'user');

    if (filters.warehouse_id) {
      query.andWhere('balance.warehouse_id = :warehouse_id', {
        warehouse_id: filters.warehouse_id,
      });
    }

    if (filters.balance_date) {
      query.andWhere('balance.balance_date = :balance_date', {
        balance_date: filters.balance_date,
      });
    }

    if (filters.is_applied !== undefined) {
      query.andWhere('balance.is_applied = :is_applied', {
        is_applied: filters.is_applied,
      });
    }

    if (filters.nomenclature_id) {
      query.andWhere('balance.nomenclature_id = :nomenclature_id', {
        nomenclature_id: filters.nomenclature_id,
      });
    }

    query.orderBy('balance.balance_date', 'DESC').addOrderBy('nomenclature.name', 'ASC');

    return await query.getMany();
  }

  /**
   * Get single opening balance by ID
   */
  async findOne(id: string): Promise<StockOpeningBalance> {
    const balance = await this.balanceRepository.findOne({
      where: { id },
      relations: ['nomenclature', 'warehouse', 'applied_by'],
    });

    if (!balance) {
      throw new NotFoundException(`Opening balance with ID ${id} not found`);
    }

    return balance;
  }

  /**
   * Update opening balance
   * Cannot update if already applied
   */
  async update(id: string, dto: UpdateOpeningBalanceDto): Promise<StockOpeningBalance> {
    const balance = await this.findOne(id);

    if (balance.is_applied) {
      throw new BadRequestException('Cannot update opening balance that has been applied');
    }

    // Recalculate total cost if quantity or unit_cost changed
    if (dto.quantity !== undefined || dto.unit_cost !== undefined) {
      const quantity = dto.quantity ?? balance.quantity;
      const unitCost = dto.unit_cost ?? balance.unit_cost;
      dto.total_cost = quantity * unitCost;
    }

    await this.balanceRepository.update(id, dto);
    return await this.findOne(id);
  }

  /**
   * Delete opening balance
   * Cannot delete if already applied
   */
  async remove(id: string): Promise<void> {
    const balance = await this.findOne(id);

    if (balance.is_applied) {
      throw new BadRequestException('Cannot delete opening balance that has been applied');
    }

    await this.balanceRepository.softDelete(id);
  }

  /**
   * Apply opening balances to current inventory
   * REQ-STK-03: Связь с датой начала учета
   */
  async applyBalances(
    balance_date: string,
    warehouse_id: string,
    user_id: string,
  ): Promise<{ applied: number; skipped: number }> {
    // Use query builder for flexible where clause
    const query = this.balanceRepository.createQueryBuilder('balance')
      .where('balance.balance_date = :balance_date', { balance_date })
      .andWhere('balance.is_applied = :is_applied', { is_applied: false });

    if (warehouse_id) {
      query.andWhere('balance.warehouse_id = :warehouse_id', { warehouse_id });
    }

    const balances = await query.getMany();

    let applied = 0;
    let skipped = 0;

    for (const balance of balances) {
      try {
        // Check if warehouse inventory already exists
        const existing = await this.warehouseInventoryRepository.findOne({
          where: {
            nomenclature_id: balance.nomenclature_id,
          },
        });

        if (existing) {
          // Update existing inventory
          await this.warehouseInventoryRepository.update(existing.id, {
            current_quantity: Number(existing.current_quantity) + balance.quantity,
            last_restocked_at: new Date(),
          });
        } else {
          // Create new inventory record
          await this.warehouseInventoryRepository.save({
            nomenclature_id: balance.nomenclature_id,
            current_quantity: balance.quantity,
            reserved_quantity: 0,
            min_stock_level: 0,
            max_stock_level: balance.quantity * 2,
            last_restocked_at: new Date(),
          });
        }

        // Mark balance as applied
        await this.balanceRepository.update(balance.id, {
          is_applied: true,
          applied_at: new Date(),
          applied_by_id: user_id,
        });

        applied++;
      } catch (error) {
        this.logger.error(`Failed to apply balance ${balance.id}: ${error.message}`);
        skipped++;
      }
    }

    return { applied, skipped };
  }

  /**
   * Bulk create opening balances
   * REQ-STK-OPEN-01: Массовое создание начальных остатков
   */
  async bulkCreate(
    balances: CreateOpeningBalanceDto[],
  ): Promise<{ created: number; failed: number; errors: BulkError[] }> {
    let created = 0;
    let failed = 0;
    const errors = [];

    for (const item of balances) {
      try {
        await this.create(item);
        created++;
      } catch (error) {
        failed++;
        errors.push({
          nomenclature_id: item.nomenclature_id,
          error: error.message,
        });
      }
    }

    return { created, failed, errors };
  }

  /**
   * Import opening balances from CSV/Excel
   * REQ-IMP-01: Импорт справочников из CSV
   */
  async importBalances(
    data: CreateOpeningBalanceDto[],
    import_session_id: string,
  ): Promise<{ imported: number; failed: number; errors: ImportError[] }> {
    let imported = 0;
    let failed = 0;
    const errors = [];

    for (const item of data) {
      try {
        const importData: ImportBalanceData = {
          ...item,
          import_source: 'csv',
          import_session_id,
        };
        await this.create(importData);
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
   * Get summary statistics for opening balances
   */
  async getStats(warehouse_id?: string): Promise<{
    total_items: number;
    total_value: number;
    applied_count: number;
    pending_count: number;
    by_warehouse: WarehouseStats[];
  }> {
    const query = this.balanceRepository.createQueryBuilder('balance');

    if (warehouse_id) {
      query.where('balance.warehouse_id = :warehouse_id', { warehouse_id });
    }

    const stats = await query
      .select('COUNT(*)', 'total_items')
      .addSelect('SUM(balance.total_cost)', 'total_value')
      .addSelect('SUM(CASE WHEN balance.is_applied = true THEN 1 ELSE 0 END)', 'applied_count')
      .addSelect('SUM(CASE WHEN balance.is_applied = false THEN 1 ELSE 0 END)', 'pending_count')
      .getRawOne();

    const byWarehouse = await this.balanceRepository
      .createQueryBuilder('balance')
      .leftJoinAndSelect('balance.warehouse', 'warehouse')
      .select('warehouse.id', 'warehouse_id')
      .addSelect('warehouse.name', 'warehouse_name')
      .addSelect('COUNT(*)', 'item_count')
      .addSelect('SUM(balance.total_cost)', 'total_value')
      .groupBy('warehouse.id')
      .addGroupBy('warehouse.name')
      .getRawMany();

    return {
      total_items: parseInt(stats.total_items) || 0,
      total_value: parseFloat(stats.total_value) || 0,
      applied_count: parseInt(stats.applied_count) || 0,
      pending_count: parseInt(stats.pending_count) || 0,
      by_warehouse: byWarehouse,
    };
  }
}
