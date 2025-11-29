import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../entities/warehouse.entity';
import { WarehouseZone } from '../entities/warehouse-zone.entity';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    @InjectRepository(WarehouseZone)
    private zoneRepository: Repository<WarehouseZone>,
  ) {}

  async findAll(): Promise<Warehouse[]> {
    return this.warehouseRepository.find({
      relations: ['location', 'zones'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
      relations: ['location', 'zones'],
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    return warehouse;
  }

  async findByCode(code: string): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { code },
      relations: ['location', 'zones'],
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with code ${code} not found`);
    }

    return warehouse;
  }

  async getActiveWarehouses(): Promise<Warehouse[]> {
    return this.warehouseRepository.find({
      where: { is_active: true },
      relations: ['location'],
      order: { name: 'ASC' },
    });
  }

  async getWarehouseUtilization(warehouseId: string): Promise<{
    total_capacity: number;
    current_occupancy: number;
    utilization_percentage: number;
    zones: Array<{
      zone_name: string;
      capacity: number;
      occupancy: number;
      utilization: number;
    }>;
  }> {
    const warehouse = await this.findOne(warehouseId);
    const zones = warehouse.zones || [];

    const totalCapacity = zones.reduce((sum, zone) => sum + (zone.capacity || 0), 0);
    const currentOccupancy = zones.reduce((sum, zone) => sum + zone.current_occupancy, 0);

    return {
      total_capacity: totalCapacity,
      current_occupancy: currentOccupancy,
      utilization_percentage: totalCapacity > 0 ? (currentOccupancy / totalCapacity) * 100 : 0,
      zones: zones.map((zone) => ({
        zone_name: zone.name,
        capacity: zone.capacity || 0,
        occupancy: zone.current_occupancy,
        utilization: zone.capacity ? (zone.current_occupancy / zone.capacity) * 100 : 0,
      })),
    };
  }

  async getZones(warehouseId: string): Promise<WarehouseZone[]> {
    return this.zoneRepository.find({
      where: { warehouse_id: warehouseId, is_active: true },
      order: { name: 'ASC' },
    });
  }
}
