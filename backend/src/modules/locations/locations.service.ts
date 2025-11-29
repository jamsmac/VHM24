import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location, LocationStatus } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
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
}
