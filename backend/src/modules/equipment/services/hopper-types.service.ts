import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HopperType } from '../entities/hopper-type.entity';

/**
 * Service для управления типами бункеров (REQ-ASSET-BH-01)
 *
 * Простой CRUD для справочника типов ингредиентов
 */
@Injectable()
export class HopperTypesService {
  constructor(
    @InjectRepository(HopperType)
    private readonly hopperTypeRepository: Repository<HopperType>,
  ) {}

  /**
   * Создать новый тип бункера
   */
  async create(data: {
    code: string;
    name: string;
    name_en?: string;
    description?: string;
    category?: string;
    requires_refrigeration?: boolean;
    shelf_life_days?: number;
    typical_capacity_kg?: number;
    unit_of_measure?: string;
  }): Promise<HopperType> {
    // Проверка уникальности code
    const existing = await this.hopperTypeRepository.findOne({
      where: { code: data.code },
    });

    if (existing) {
      throw new BadRequestException(`Hopper type with code "${data.code}" already exists`);
    }

    const hopperType = this.hopperTypeRepository.create(data);
    return await this.hopperTypeRepository.save(hopperType);
  }

  /**
   * Получить все типы бункеров
   */
  async findAll(category?: string): Promise<HopperType[]> {
    const where = category ? { category } : {};
    return await this.hopperTypeRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  /**
   * Получить тип по ID
   */
  async findOne(id: string): Promise<HopperType> {
    const hopperType = await this.hopperTypeRepository.findOne({
      where: { id },
    });

    if (!hopperType) {
      throw new NotFoundException(`Hopper type with ID ${id} not found`);
    }

    return hopperType;
  }

  /**
   * Получить тип по code
   */
  async findByCode(code: string): Promise<HopperType> {
    const hopperType = await this.hopperTypeRepository.findOne({
      where: { code },
    });

    if (!hopperType) {
      throw new NotFoundException(`Hopper type with code "${code}" not found`);
    }

    return hopperType;
  }

  /**
   * Обновить тип бункера
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      name_en: string;
      description: string;
      category: string;
      requires_refrigeration: boolean;
      shelf_life_days: number;
      typical_capacity_kg: number;
      unit_of_measure: string;
    }>,
  ): Promise<HopperType> {
    await this.findOne(id); // Проверяем существование

    await this.hopperTypeRepository.update(id, data);
    return await this.findOne(id);
  }

  /**
   * Удалить тип бункера (soft delete)
   */
  async remove(id: string): Promise<void> {
    await this.findOne(id); // Проверяем существование
    await this.hopperTypeRepository.softDelete(id);
  }

  /**
   * Получить категории (уникальный список)
   */
  async getCategories(): Promise<string[]> {
    const result = await this.hopperTypeRepository
      .createQueryBuilder('hopper_type')
      .select('DISTINCT hopper_type.category', 'category')
      .where('hopper_type.category IS NOT NULL')
      .getRawMany();

    return result.map((row) => row.category);
  }
}
