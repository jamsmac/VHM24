import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location, LocationStatus } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Machine, MachineStatus } from '@modules/machines/entities/machine.entity';

export interface MapLocationData {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  status: LocationStatus;
  machine_count: number;
  machines_active: number;
  machines_error: number;
  machines_low_stock: number;
}

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
  ) {}

  /**
   * Создание локации
   */
  async create(createLocationDto: CreateLocationDto): Promise<Location> {
    // Проверка уникальности названия в городе
    const existing = await this.locationRepository.findOne({
      where: {
        city: createLocationDto.city,
        name: createLocationDto.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Локация с названием "${createLocationDto.name}" уже существует в городе ${createLocationDto.city}`,
      );
    }

    const location = this.locationRepository.create(createLocationDto);
    return this.locationRepository.save(location);
  }

  /**
   * Получение всех локаций
   */
  async findAll(status?: LocationStatus): Promise<Location[]> {
    const query = this.locationRepository.createQueryBuilder('location');

    if (status) {
      query.where('location.status = :status', { status });
    }

    query.orderBy('location.city', 'ASC');
    query.addOrderBy('location.name', 'ASC');

    return query.getMany();
  }

  /**
   * Получение локации по ID
   */
  async findOne(id: string): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException(`Локация с ID ${id} не найдена`);
    }

    return location;
  }

  /**
   * Получение локаций по городу
   */
  async findByCity(city: string): Promise<Location[]> {
    return this.locationRepository.find({
      where: { city },
      order: { name: 'ASC' },
    });
  }

  /**
   * Обновление локации
   */
  async update(id: string, updateLocationDto: UpdateLocationDto): Promise<Location> {
    const location = await this.findOne(id);

    // Проверка уникальности названия при изменении
    if (
      updateLocationDto.name &&
      (updateLocationDto.name !== location.name || updateLocationDto.city !== location.city)
    ) {
      const city = updateLocationDto.city || location.city;
      const existing = await this.locationRepository.findOne({
        where: {
          city,
          name: updateLocationDto.name,
        },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Локация с названием "${updateLocationDto.name}" уже существует в городе ${city}`,
        );
      }
    }

    Object.assign(location, updateLocationDto);
    return this.locationRepository.save(location);
  }

  /**
   * Удаление локации (soft delete)
   */
  async remove(id: string): Promise<void> {
    const location = await this.findOne(id);
    await this.locationRepository.softRemove(location);
  }

  /**
   * Получение локаций по типу
   */
  async findByType(type_code: string): Promise<Location[]> {
    return this.locationRepository.find({
      where: { type_code },
      order: { city: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Статистика по локациям
   */
  async getStats() {
    const total = await this.locationRepository.count();
    const active = await this.locationRepository.count({
      where: { status: LocationStatus.ACTIVE },
    });
    const inactive = await this.locationRepository.count({
      where: { status: LocationStatus.INACTIVE },
    });

    return {
      total,
      active,
      inactive,
      pending: total - active - inactive,
    };
  }

  /**
   * Получение данных для карты
   * Возвращает локации с координатами и статистикой по аппаратам
   */
  async getMapData(): Promise<MapLocationData[]> {
    // Get locations with coordinates
    const locations = await this.locationRepository
      .createQueryBuilder('location')
      .where('location.latitude IS NOT NULL')
      .andWhere('location.longitude IS NOT NULL')
      .getMany();

    if (locations.length === 0) {
      return [];
    }

    // Get machine counts per location
    const locationIds = locations.map((l) => l.id);

    const machineStats = await this.machineRepository
      .createQueryBuilder('machine')
      .select('machine.location_id', 'location_id')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN machine.status = '${MachineStatus.ACTIVE}' THEN 1 ELSE 0 END)`,
        'active',
      )
      .addSelect(
        `SUM(CASE WHEN machine.status = '${MachineStatus.ERROR}' THEN 1 ELSE 0 END)`,
        'error',
      )
      .addSelect(
        `SUM(CASE WHEN machine.status = '${MachineStatus.LOW_STOCK}' THEN 1 ELSE 0 END)`,
        'low_stock',
      )
      .where('machine.location_id IN (:...locationIds)', { locationIds })
      .groupBy('machine.location_id')
      .getRawMany();

    // Create a map for quick lookup
    const statsMap = new Map<
      string,
      { total: number; active: number; error: number; low_stock: number }
    >();
    for (const stat of machineStats) {
      statsMap.set(stat.location_id, {
        total: parseInt(stat.total, 10) || 0,
        active: parseInt(stat.active, 10) || 0,
        error: parseInt(stat.error, 10) || 0,
        low_stock: parseInt(stat.low_stock, 10) || 0,
      });
    }

    return locations.map((location) => {
      const stats = statsMap.get(location.id) || {
        total: 0,
        active: 0,
        error: 0,
        low_stock: 0,
      };

      return {
        id: location.id,
        name: location.name,
        address: location.address,
        city: location.city,
        latitude: parseFloat(String(location.latitude)),
        longitude: parseFloat(String(location.longitude)),
        status: location.status,
        machine_count: stats.total,
        machines_active: stats.active,
        machines_error: stats.error,
        machines_low_stock: stats.low_stock,
      };
    });
  }
}
