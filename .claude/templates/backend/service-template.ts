/**
 * ШАБЛОН: Service для модуля
 *
 * Используй этот шаблон для создания новых services
 *
 * Замени:
 * - Entity на название твоей сущности (Task, Machine, User, и т.д.)
 * - Добавь свою бизнес-логику
 * - Добавь валидации
 * - Добавь комментарии JSDoc
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entity } from './entities/entity.entity';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';

@Injectable()
export class EntityService {
  constructor(
    @InjectRepository(Entity)
    private readonly entityRepository: Repository<Entity>,
    // Inject other services here
  ) {}

  /**
   * Создаёт новую сущность
   *
   * @param createDto - Данные для создания
   * @param userId - ID пользователя-создателя
   * @returns Созданная сущность
   * @throws BadRequestException если валидация не прошла
   */
  async create(createDto: CreateEntityDto, userId: string): Promise<Entity> {
    // 1. Валидация входных данных
    await this.validateCreateDto(createDto);

    // 2. Создание сущности
    const entity = this.entityRepository.create({
      ...createDto,
      createdBy: userId,
    });

    // 3. Сохранение
    const saved = await this.entityRepository.save(entity);

    // 4. Дополнительные действия (если нужны)
    // await this.doSomethingAfterCreate(saved);

    return saved;
  }

  /**
   * Возвращает список сущностей с пагинацией
   *
   * @param page - Номер страницы (начиная с 1)
   * @param limit - Количество элементов на странице
   * @param filters - Фильтры
   * @returns Список сущностей и общее количество
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    filters: any = {},
  ): Promise<{ data: Entity[]; total: number }> {
    const query = this.entityRepository.createQueryBuilder('entity');

    // Применение фильтров
    if (filters.status) {
      query.andWhere('entity.status = :status', { status: filters.status });
    }

    if (filters.search) {
      query.andWhere('entity.name ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    // Пагинация
    query.skip((page - 1) * limit).take(limit);

    // Сортировка
    query.orderBy('entity.createdAt', 'DESC');

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  /**
   * Возвращает одну сущность по ID
   *
   * @param id - ID сущности
   * @returns Найденная сущность
   * @throws NotFoundException если сущность не найдена
   */
  async findOne(id: string): Promise<Entity> {
    const entity = await this.entityRepository.findOne({
      where: { id },
      relations: ['relatedEntity'], // Загрузка связей, если нужно
    });

    if (!entity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }

    return entity;
  }

  /**
   * Обновляет сущность
   *
   * @param id - ID сущности
   * @param updateDto - Данные для обновления
   * @param userId - ID пользователя, выполняющего обновление
   * @returns Обновлённая сущность
   * @throws NotFoundException если сущность не найдена
   */
  async update(
    id: string,
    updateDto: UpdateEntityDto,
    userId: string,
  ): Promise<Entity> {
    // 1. Проверка существования
    const entity = await this.findOne(id);

    // 2. Валидация обновления
    await this.validateUpdateDto(updateDto, entity);

    // 3. Применение изменений
    Object.assign(entity, updateDto);
    entity.updatedBy = userId;

    // 4. Сохранение
    const updated = await this.entityRepository.save(entity);

    // 5. Дополнительные действия
    // await this.doSomethingAfterUpdate(updated);

    return updated;
  }

  /**
   * Удаляет сущность (мягкое удаление)
   *
   * @param id - ID сущности
   * @returns void
   * @throws NotFoundException если сущность не найдена
   * @throws BadRequestException если удаление невозможно
   */
  async remove(id: string): Promise<void> {
    // 1. Проверка существования
    const entity = await this.findOne(id);

    // 2. Проверка возможности удаления
    const canDelete = await this.canDelete(entity);
    if (!canDelete) {
      throw new BadRequestException('Cannot delete this entity (in use)');
    }

    // 3. Мягкое удаление
    await this.entityRepository.softDelete(id);

    // Или жёсткое удаление (если нужно):
    // await this.entityRepository.delete(id);
  }

  // ==================== Private methods ====================

  /**
   * Валидирует DTO создания
   */
  private async validateCreateDto(dto: CreateEntityDto): Promise<void> {
    // Пример валидации
    if (!dto.name || dto.name.trim() === '') {
      throw new BadRequestException('Name is required');
    }

    // Проверка уникальности
    const existing = await this.entityRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Entity with this name already exists');
    }

    // Другие валидации...
  }

  /**
   * Валидирует DTO обновления
   */
  private async validateUpdateDto(
    dto: UpdateEntityDto,
    entity: Entity,
  ): Promise<void> {
    // Валидации для обновления
    if (dto.name && dto.name !== entity.name) {
      const existing = await this.entityRepository.findOne({
        where: { name: dto.name },
      });

      if (existing) {
        throw new BadRequestException('Entity with this name already exists');
      }
    }
  }

  /**
   * Проверяет можно ли удалить сущность
   */
  private async canDelete(entity: Entity): Promise<boolean> {
    // Пример: проверка что сущность не используется
    // const relatedCount = await this.relatedRepository.count({
    //   where: { entityId: entity.id }
    // });

    // return relatedCount === 0;

    return true;
  }
}
