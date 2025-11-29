import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dictionary } from './entities/dictionary.entity';
import { DictionaryItem } from './entities/dictionary-item.entity';
import { CreateDictionaryDto } from './dto/create-dictionary.dto';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto';
import { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';
import { UpdateDictionaryItemDto } from './dto/update-dictionary-item.dto';

@Injectable()
export class DictionariesService {
  constructor(
    @InjectRepository(Dictionary)
    private readonly dictionaryRepository: Repository<Dictionary>,
    @InjectRepository(DictionaryItem)
    private readonly dictionaryItemRepository: Repository<DictionaryItem>,
  ) {}

  // ==================== DICTIONARIES ====================

  /**
   * Создание справочника
   */
  async createDictionary(createDictionaryDto: CreateDictionaryDto): Promise<Dictionary> {
    const existing = await this.dictionaryRepository.findOne({
      where: { code: createDictionaryDto.code },
    });

    if (existing) {
      throw new ConflictException(`Справочник с кодом ${createDictionaryDto.code} уже существует`);
    }

    const dictionary = this.dictionaryRepository.create(createDictionaryDto);
    return this.dictionaryRepository.save(dictionary);
  }

  /**
   * Получение всех справочников
   */
  async findAllDictionaries(includeItems = false): Promise<Dictionary[]> {
    const query = this.dictionaryRepository.createQueryBuilder('dictionary');

    if (includeItems) {
      query.leftJoinAndSelect('dictionary.items', 'items');
      query.addOrderBy('items.sort_order', 'ASC');
    }

    query.orderBy('dictionary.sort_order', 'ASC');

    return query.getMany();
  }

  /**
   * Получение справочника по ID
   */
  async findOneDictionary(id: string, includeItems = true): Promise<Dictionary> {
    const query = this.dictionaryRepository.createQueryBuilder('dictionary');
    query.where('dictionary.id = :id', { id });

    if (includeItems) {
      query.leftJoinAndSelect('dictionary.items', 'items');
      query.addOrderBy('items.sort_order', 'ASC');
    }

    const dictionary = await query.getOne();

    if (!dictionary) {
      throw new NotFoundException(`Справочник с ID ${id} не найден`);
    }

    return dictionary;
  }

  /**
   * Получение справочника по коду
   */
  async findByCode(code: string, includeItems = true): Promise<Dictionary> {
    const query = this.dictionaryRepository.createQueryBuilder('dictionary');
    query.where('dictionary.code = :code', { code });

    if (includeItems) {
      query.leftJoinAndSelect('dictionary.items', 'items');
      query.addOrderBy('items.sort_order', 'ASC');
    }

    const dictionary = await query.getOne();

    if (!dictionary) {
      throw new NotFoundException(`Справочник с кодом ${code} не найден`);
    }

    return dictionary;
  }

  /**
   * Обновление справочника
   */
  async updateDictionary(
    id: string,
    updateDictionaryDto: UpdateDictionaryDto,
  ): Promise<Dictionary> {
    const dictionary = await this.findOneDictionary(id, false);

    // Проверка: нельзя изменять системные справочники
    if (dictionary.is_system && updateDictionaryDto.is_system === false) {
      throw new BadRequestException('Невозможно изменить статус системного справочника');
    }

    Object.assign(dictionary, updateDictionaryDto);
    return this.dictionaryRepository.save(dictionary);
  }

  /**
   * Удаление справочника
   */
  async removeDictionary(id: string): Promise<void> {
    const dictionary = await this.findOneDictionary(id, false);

    // Проверка: нельзя удалять системные справочники
    if (dictionary.is_system) {
      throw new BadRequestException('Невозможно удалить системный справочник');
    }

    await this.dictionaryRepository.softRemove(dictionary);
  }

  // ==================== DICTIONARY ITEMS ====================

  /**
   * Создание элемента справочника
   */
  async createDictionaryItem(
    dictionaryId: string,
    createDictionaryItemDto: CreateDictionaryItemDto,
  ): Promise<DictionaryItem> {
    // Проверка существования справочника
    await this.findOneDictionary(dictionaryId, false);

    // Проверка уникальности кода в рамках справочника
    const existing = await this.dictionaryItemRepository.findOne({
      where: {
        dictionary_id: dictionaryId,
        code: createDictionaryItemDto.code,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Элемент с кодом ${createDictionaryItemDto.code} уже существует в этом справочнике`,
      );
    }

    const item = this.dictionaryItemRepository.create({
      ...createDictionaryItemDto,
      dictionary_id: dictionaryId,
    });

    return this.dictionaryItemRepository.save(item);
  }

  /**
   * Получение всех элементов справочника
   */
  async findAllDictionaryItems(dictionaryId: string): Promise<DictionaryItem[]> {
    // Проверка существования справочника
    await this.findOneDictionary(dictionaryId, false);

    return this.dictionaryItemRepository.find({
      where: { dictionary_id: dictionaryId },
      order: { sort_order: 'ASC' },
    });
  }

  /**
   * Получение элемента справочника по ID
   */
  async findOneDictionaryItem(id: string): Promise<DictionaryItem> {
    const item = await this.dictionaryItemRepository.findOne({
      where: { id },
      relations: ['dictionary'],
    });

    if (!item) {
      throw new NotFoundException(`Элемент справочника с ID ${id} не найден`);
    }

    return item;
  }

  /**
   * Обновление элемента справочника
   * Проверяет, что элемент не принадлежит системному справочнику
   */
  async updateDictionaryItem(
    id: string,
    updateDictionaryItemDto: UpdateDictionaryItemDto,
  ): Promise<DictionaryItem> {
    const item = await this.findOneDictionaryItem(id);

    // Проверка: нельзя изменять элементы системных справочников
    if (item.dictionary && item.dictionary.is_system) {
      throw new BadRequestException('Невозможно изменить элемент системного справочника');
    }

    Object.assign(item, updateDictionaryItemDto);
    return this.dictionaryItemRepository.save(item);
  }

  /**
   * Удаление элемента справочника
   * Проверяет, что элемент не принадлежит системному справочнику
   */
  async removeDictionaryItem(id: string): Promise<void> {
    const item = await this.findOneDictionaryItem(id);

    // Проверка: нельзя удалять элементы системных справочников
    if (item.dictionary && item.dictionary.is_system) {
      throw new BadRequestException('Невозможно удалить элемент системного справочника');
    }

    await this.dictionaryItemRepository.softRemove(item);
  }
}
