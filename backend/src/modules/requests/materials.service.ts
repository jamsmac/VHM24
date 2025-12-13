import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material, MaterialCategory } from './entities/material.entity';
import { CreateMaterialDto, UpdateMaterialDto } from './dto';

/**
 * Сервис управления материалами (каталог).
 */
@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
  ) {}

  /**
   * Создать новый материал.
   *
   * @param dto - Данные материала
   * @returns Созданный материал
   */
  async create(dto: CreateMaterialDto): Promise<Material> {
    const material = this.materialRepository.create(dto);
    return await this.materialRepository.save(material);
  }

  /**
   * Получить все материалы с фильтрацией.
   *
   * @param options - Опции фильтрации
   * @returns Список материалов
   */
  async findAll(options?: {
    is_active?: boolean;
    category?: MaterialCategory;
    supplier_id?: string;
    search?: string;
  }): Promise<Material[]> {
    const query = this.materialRepository
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.supplier', 'supplier');

    if (options?.is_active !== undefined) {
      query.andWhere('material.is_active = :is_active', {
        is_active: options.is_active,
      });
    }

    if (options?.category) {
      query.andWhere('material.category = :category', {
        category: options.category,
      });
    }

    if (options?.supplier_id) {
      query.andWhere('material.supplier_id = :supplier_id', {
        supplier_id: options.supplier_id,
      });
    }

    if (options?.search) {
      query.andWhere('(material.name ILIKE :search OR material.sku ILIKE :search)', {
        search: `%${options.search}%`,
      });
    }

    query.orderBy('material.sort_order', 'ASC').addOrderBy('material.name', 'ASC');

    return await query.getMany();
  }

  /**
   * Получить материалы, сгруппированные по категориям.
   * Используется для каталога в Telegram боте.
   *
   * @returns Материалы по категориям
   */
  async findGroupedByCategory(): Promise<Record<MaterialCategory, Material[]>> {
    const materials = await this.findAll({ is_active: true });

    const grouped: Record<MaterialCategory, Material[]> = {
      [MaterialCategory.INGREDIENTS]: [],
      [MaterialCategory.CONSUMABLES]: [],
      [MaterialCategory.CLEANING]: [],
      [MaterialCategory.SPARE_PARTS]: [],
      [MaterialCategory.PACKAGING]: [],
      [MaterialCategory.OTHER]: [],
    };

    for (const material of materials) {
      grouped[material.category].push(material);
    }

    return grouped;
  }

  /**
   * Получить материал по ID.
   *
   * @param id - ID материала
   * @returns Материал
   * @throws NotFoundException если не найден
   */
  async findOne(id: string): Promise<Material> {
    const material = await this.materialRepository.findOne({
      where: { id },
      relations: ['supplier'],
    });

    if (!material) {
      throw new NotFoundException(`Материал с ID ${id} не найден`);
    }

    return material;
  }

  /**
   * Обновить материал.
   *
   * @param id - ID материала
   * @param dto - Данные для обновления
   * @returns Обновлённый материал
   */
  async update(id: string, dto: UpdateMaterialDto): Promise<Material> {
    await this.findOne(id);
    await this.materialRepository.update(id, dto);
    return await this.findOne(id);
  }

  /**
   * Удалить материал (soft delete).
   *
   * @param id - ID материала
   */
  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.materialRepository.softDelete(id);
  }

  /**
   * Деактивировать материал (вместо удаления).
   *
   * @param id - ID материала
   */
  async deactivate(id: string): Promise<Material> {
    await this.findOne(id);
    await this.materialRepository.update(id, { is_active: false });
    return await this.findOne(id);
  }
}
