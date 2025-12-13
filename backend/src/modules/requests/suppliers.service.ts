import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';

/**
 * Сервис управления поставщиками.
 */
@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  /**
   * Создать нового поставщика.
   *
   * @param dto - Данные поставщика
   * @returns Созданный поставщик
   */
  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const supplier = this.supplierRepository.create(dto);
    return await this.supplierRepository.save(supplier);
  }

  /**
   * Получить всех поставщиков.
   *
   * @param options - Опции фильтрации
   * @returns Список поставщиков
   */
  async findAll(options?: {
    is_active?: boolean;
    category?: string;
    search?: string;
  }): Promise<Supplier[]> {
    const query = this.supplierRepository.createQueryBuilder('supplier');

    if (options?.is_active !== undefined) {
      query.andWhere('supplier.is_active = :is_active', {
        is_active: options.is_active,
      });
    }

    if (options?.category) {
      query.andWhere(':category = ANY(supplier.categories)', {
        category: options.category,
      });
    }

    if (options?.search) {
      query.andWhere(
        '(supplier.name ILIKE :search OR supplier.phone ILIKE :search OR supplier.email ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    query.orderBy('supplier.name', 'ASC');

    return await query.getMany();
  }

  /**
   * Получить поставщика по ID.
   *
   * @param id - ID поставщика
   * @returns Поставщик
   * @throws NotFoundException если не найден
   */
  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
      relations: ['materials'],
    });

    if (!supplier) {
      throw new NotFoundException(`Поставщик с ID ${id} не найден`);
    }

    return supplier;
  }

  /**
   * Найти поставщика по Telegram ID.
   *
   * @param telegramId - Telegram ID
   * @returns Поставщик или null
   */
  async findByTelegramId(telegramId: string): Promise<Supplier | null> {
    return await this.supplierRepository.findOne({
      where: { telegram_id: telegramId },
    });
  }

  /**
   * Обновить поставщика.
   *
   * @param id - ID поставщика
   * @param dto - Данные для обновления
   * @returns Обновлённый поставщик
   */
  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    await this.findOne(id); // Проверка существования
    await this.supplierRepository.update(id, dto);
    return await this.findOne(id);
  }

  /**
   * Удалить поставщика (soft delete).
   *
   * @param id - ID поставщика
   */
  async remove(id: string): Promise<void> {
    const supplier = await this.findOne(id);

    // Проверяем, нет ли активных материалов
    const activeMaterials = supplier.materials?.filter((m) => m.is_active) || [];
    if (activeMaterials.length > 0) {
      throw new BadRequestException(
        `Невозможно удалить поставщика: есть ${activeMaterials.length} активных материалов`,
      );
    }

    await this.supplierRepository.softDelete(id);
  }
}
