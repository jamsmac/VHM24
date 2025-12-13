import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nomenclature } from './entities/nomenclature.entity';
import { CreateNomenclatureDto } from './dto/create-nomenclature.dto';
import { UpdateNomenclatureDto } from './dto/update-nomenclature.dto';

@Injectable()
export class NomenclatureService {
  constructor(
    @InjectRepository(Nomenclature)
    private readonly nomenclatureRepository: Repository<Nomenclature>,
  ) {}

  /**
   * Создание позиции номенклатуры
   */
  async create(createNomenclatureDto: CreateNomenclatureDto): Promise<Nomenclature> {
    // Проверка уникальности SKU
    const existing = await this.nomenclatureRepository.findOne({
      where: { sku: createNomenclatureDto.sku },
    });

    if (existing) {
      throw new ConflictException(`Номенклатура с SKU ${createNomenclatureDto.sku} уже существует`);
    }

    const nomenclature = this.nomenclatureRepository.create(createNomenclatureDto);
    return this.nomenclatureRepository.save(nomenclature);
  }

  /**
   * Получение всей номенклатуры
   */
  async findAll(
    category?: string,
    isIngredient?: boolean,
    isActive?: boolean,
    search?: string,
  ): Promise<Nomenclature[]> {
    const query = this.nomenclatureRepository.createQueryBuilder('nomenclature');

    if (category) {
      query.andWhere('nomenclature.category_code = :category', { category });
    }

    if (isIngredient !== undefined) {
      query.andWhere('nomenclature.is_ingredient = :isIngredient', { isIngredient });
    }

    if (isActive !== undefined) {
      query.andWhere('nomenclature.is_active = :isActive', { isActive });
    }

    if (search) {
      query.andWhere(
        '(nomenclature.name ILIKE :search OR nomenclature.sku ILIKE :search OR :search = ANY(nomenclature.tags))',
        { search: `%${search}%` },
      );
    }

    query.orderBy('nomenclature.name', 'ASC');

    return query.getMany();
  }

  /**
   * Получение номенклатуры по ID
   */
  async findOne(id: string): Promise<Nomenclature> {
    const nomenclature = await this.nomenclatureRepository.findOne({
      where: { id },
    });

    if (!nomenclature) {
      throw new NotFoundException(`Номенклатура с ID ${id} не найдена`);
    }

    return nomenclature;
  }

  /**
   * Получение номенклатуры по SKU
   */
  async findBySKU(sku: string): Promise<Nomenclature> {
    const nomenclature = await this.nomenclatureRepository.findOne({
      where: { sku },
    });

    if (!nomenclature) {
      throw new NotFoundException(`Номенклатура с SKU ${sku} не найдена`);
    }

    return nomenclature;
  }

  /**
   * Обновление номенклатуры
   */
  async update(id: string, updateNomenclatureDto: UpdateNomenclatureDto): Promise<Nomenclature> {
    const nomenclature = await this.findOne(id);

    Object.assign(nomenclature, updateNomenclatureDto);
    return this.nomenclatureRepository.save(nomenclature);
  }

  /**
   * Удаление номенклатуры (soft delete)
   */
  async remove(id: string): Promise<void> {
    const nomenclature = await this.findOne(id);
    await this.nomenclatureRepository.softRemove(nomenclature);
  }

  /**
   * Получение только товаров (не ингредиентов)
   */
  async findProducts(category?: string): Promise<Nomenclature[]> {
    return this.findAll(category, false);
  }

  /**
   * Получение только ингредиентов
   */
  async findIngredients(category?: string): Promise<Nomenclature[]> {
    return this.findAll(category, true);
  }

  /**
   * Статистика по номенклатуре
   */
  async getStats() {
    const total = await this.nomenclatureRepository.count();
    const products = await this.nomenclatureRepository.count({
      where: { is_ingredient: false },
    });
    const ingredients = await this.nomenclatureRepository.count({
      where: { is_ingredient: true },
    });
    const active = await this.nomenclatureRepository.count({
      where: { is_active: true },
    });

    return {
      total,
      products,
      ingredients,
      active,
      inactive: total - active,
    };
  }

  /**
   * Поиск по штрих-коду
   */
  async findByBarcode(barcode: string): Promise<Nomenclature | null> {
    return this.nomenclatureRepository.findOne({
      where: { barcode },
    });
  }
}
