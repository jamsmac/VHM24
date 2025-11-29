import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { SparePart } from '../entities/spare-part.entity';
import { ComponentType } from '../entities/equipment-component.entity';
import { CreateSparePartDto, UpdateSparePartDto, AdjustStockDto } from '../dto/spare-part.dto';

@Injectable()
export class SparePartsService {
  constructor(
    @InjectRepository(SparePart)
    private readonly sparePartRepository: Repository<SparePart>,
  ) {}

  async create(dto: CreateSparePartDto): Promise<SparePart> {
    // Check for duplicate part number
    const existing = await this.sparePartRepository.findOne({
      where: { part_number: dto.part_number },
    });

    if (existing) {
      throw new ConflictException(`Spare part with number ${dto.part_number} already exists`);
    }

    const sparePart = this.sparePartRepository.create(dto);
    return this.sparePartRepository.save(sparePart);
  }

  async findAll(componentType?: ComponentType, lowStock?: boolean): Promise<SparePart[]> {
    const query = this.sparePartRepository.createQueryBuilder('part');

    if (componentType) {
      query.andWhere('part.component_type = :componentType', {
        componentType,
      });
    }

    if (lowStock) {
      query.andWhere('part.quantity_in_stock <= part.min_stock_level');
    }

    query.orderBy('part.name', 'ASC');

    return query.getMany();
  }

  async findOne(id: string): Promise<SparePart> {
    const sparePart = await this.sparePartRepository.findOne({
      where: { id },
    });

    if (!sparePart) {
      throw new NotFoundException(`Spare part ${id} not found`);
    }

    return sparePart;
  }

  async findByPartNumber(partNumber: string): Promise<SparePart> {
    const sparePart = await this.sparePartRepository.findOne({
      where: { part_number: partNumber },
    });

    if (!sparePart) {
      throw new NotFoundException(`Spare part ${partNumber} not found`);
    }

    return sparePart;
  }

  async update(id: string, dto: UpdateSparePartDto): Promise<SparePart> {
    const sparePart = await this.findOne(id);

    Object.assign(sparePart, dto);

    return this.sparePartRepository.save(sparePart);
  }

  async remove(id: string): Promise<void> {
    const sparePart = await this.findOne(id);
    await this.sparePartRepository.softRemove(sparePart);
  }

  async adjustStock(id: string, dto: AdjustStockDto): Promise<SparePart> {
    const sparePart = await this.findOne(id);

    const newQuantity = sparePart.quantity_in_stock + dto.quantity;

    if (newQuantity < 0) {
      throw new ConflictException(
        `Cannot reduce stock below 0. Current: ${sparePart.quantity_in_stock}, Requested: ${dto.quantity}`,
      );
    }

    sparePart.quantity_in_stock = newQuantity;

    // Store adjustment history in metadata
    if (!sparePart.metadata) {
      sparePart.metadata = {};
    }

    if (!sparePart.metadata.stock_history) {
      sparePart.metadata.stock_history = [];
    }

    sparePart.metadata.stock_history.push({
      date: new Date().toISOString(),
      quantity: dto.quantity,
      reason: dto.reason,
      new_total: newQuantity,
    });

    return this.sparePartRepository.save(sparePart);
  }

  async getLowStockParts(): Promise<SparePart[]> {
    return this.sparePartRepository
      .createQueryBuilder('part')
      .where('part.quantity_in_stock <= part.min_stock_level')
      .andWhere('part.is_active = :active', { active: true })
      .orderBy('part.quantity_in_stock', 'ASC')
      .getMany();
  }

  async getStats() {
    const total = await this.sparePartRepository.count({
      where: { is_active: true },
    });

    const byComponentType = await this.sparePartRepository
      .createQueryBuilder('part')
      .select('part.component_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(part.quantity_in_stock)', 'total_quantity')
      .where('part.is_active = :active', { active: true })
      .groupBy('part.component_type')
      .getRawMany();

    const lowStock = await this.sparePartRepository.count({
      where: {
        quantity_in_stock: LessThanOrEqual(() => 'min_stock_level') as any,
        is_active: true,
      },
    });

    const totalValue = await this.sparePartRepository
      .createQueryBuilder('part')
      .select('SUM(part.quantity_in_stock * part.unit_price)', 'total')
      .where('part.is_active = :active', { active: true })
      .getRawOne();

    return {
      total,
      by_component_type: byComponentType.map((item) => ({
        type: item.type,
        count: parseInt(item.count),
        total_quantity: parseInt(item.total_quantity) || 0,
      })),
      low_stock_count: lowStock,
      total_inventory_value: parseFloat(totalValue?.total) || 0,
    };
  }
}
