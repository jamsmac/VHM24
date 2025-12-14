import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import {
  InventoryDifferenceThreshold,
  ThresholdType,
  SeverityLevel,
} from '../entities/inventory-difference-threshold.entity';
import {
  CreateThresholdDto,
  UpdateThresholdDto,
  GetThresholdsFilterDto,
} from '../dto/inventory-threshold.dto';

/**
 * InventoryThresholdService
 *
 * CRUD операции для управления порогами расхождений инвентаря
 *
 * REQ-STK-CALC-04, REQ-ANL-05: Настройка порогов для расхождений
 */
@Injectable()
export class InventoryThresholdService {
  private readonly logger = new Logger(InventoryThresholdService.name);

  constructor(
    @InjectRepository(InventoryDifferenceThreshold)
    private readonly thresholdRepository: Repository<InventoryDifferenceThreshold>,
  ) {}

  /**
   * Создать новый порог
   */
  async create(dto: CreateThresholdDto, userId?: string): Promise<InventoryDifferenceThreshold> {
    this.logger.log(`Creating threshold: ${dto.name}`);

    // Валидация: должен быть указан хотя бы один порог
    if (dto.threshold_abs === null && dto.threshold_rel === null) {
      throw new BadRequestException(
        'At least one threshold value must be specified (threshold_abs or threshold_rel)',
      );
    }

    // Валидация: GLOBAL не должен иметь reference_id
    if (dto.threshold_type === ThresholdType.GLOBAL && dto.reference_id) {
      throw new BadRequestException('GLOBAL threshold type should not have reference_id');
    }

    // Валидация: остальные типы должны иметь reference_id
    if (dto.threshold_type !== ThresholdType.GLOBAL && !dto.reference_id) {
      throw new BadRequestException(`${dto.threshold_type} threshold type requires reference_id`);
    }

    const threshold = this.thresholdRepository.create({
      ...dto,
      created_by_user_id: userId,
    });

    const saved = await this.thresholdRepository.save(threshold);
    this.logger.log(`Threshold created: ${saved.id}`);

    return saved;
  }

  /**
   * Получить все пороги с фильтрацией
   */
  async findAll(filter?: GetThresholdsFilterDto): Promise<InventoryDifferenceThreshold[]> {
    this.logger.debug(`Finding thresholds with filter: ${JSON.stringify(filter)}`);

    const where: FindOptionsWhere<InventoryDifferenceThreshold> = {};

    if (filter?.threshold_type) {
      where.threshold_type = filter.threshold_type;
    }

    if (filter?.reference_id) {
      where.reference_id = filter.reference_id;
    }

    if (filter?.severity_level) {
      where.severity_level = filter.severity_level;
    }

    if (filter?.is_active !== undefined) {
      where.is_active = filter.is_active;
    }

    return this.thresholdRepository.find({
      where,
      order: { priority: 'DESC', created_at: 'DESC' },
      relations: ['created_by'],
    });
  }

  /**
   * Получить порог по ID
   */
  async findOne(id: string): Promise<InventoryDifferenceThreshold> {
    const threshold = await this.thresholdRepository.findOne({
      where: { id },
      relations: ['created_by'],
    });

    if (!threshold) {
      throw new NotFoundException(`Threshold with ID ${id} not found`);
    }

    return threshold;
  }

  /**
   * Получить пороги для конкретного товара
   */
  async findByNomenclature(nomenclatureId: string): Promise<InventoryDifferenceThreshold[]> {
    return this.thresholdRepository.find({
      where: [
        {
          threshold_type: ThresholdType.NOMENCLATURE,
          reference_id: nomenclatureId,
          is_active: true,
        },
        { threshold_type: ThresholdType.GLOBAL, is_active: true },
      ],
      order: { priority: 'DESC' },
    });
  }

  /**
   * Получить пороги для конкретной машины
   */
  async findByMachine(machineId: string): Promise<InventoryDifferenceThreshold[]> {
    return this.thresholdRepository.find({
      where: [
        { threshold_type: ThresholdType.MACHINE, reference_id: machineId, is_active: true },
        { threshold_type: ThresholdType.GLOBAL, is_active: true },
      ],
      order: { priority: 'DESC' },
    });
  }

  /**
   * Получить пороги для конкретного оператора
   */
  async findByOperator(operatorId: string): Promise<InventoryDifferenceThreshold[]> {
    return this.thresholdRepository.find({
      where: [
        { threshold_type: ThresholdType.OPERATOR, reference_id: operatorId, is_active: true },
        { threshold_type: ThresholdType.GLOBAL, is_active: true },
      ],
      order: { priority: 'DESC' },
    });
  }

  /**
   * Получить пороги для конкретной локации
   */
  async findByLocation(locationId: string): Promise<InventoryDifferenceThreshold[]> {
    return this.thresholdRepository.find({
      where: [
        { threshold_type: ThresholdType.LOCATION, reference_id: locationId, is_active: true },
        { threshold_type: ThresholdType.GLOBAL, is_active: true },
      ],
      order: { priority: 'DESC' },
    });
  }

  /**
   * Получить глобальные пороги
   */
  async findGlobal(): Promise<InventoryDifferenceThreshold[]> {
    return this.thresholdRepository.find({
      where: { threshold_type: ThresholdType.GLOBAL, is_active: true },
      order: { priority: 'DESC' },
    });
  }

  /**
   * Найти применимый порог для расхождения
   * Возвращает наиболее специфичный порог с наивысшим приоритетом
   */
  async findApplicableThreshold(
    nomenclatureId: string,
    machineId?: string,
    operatorId?: string,
    locationId?: string,
  ): Promise<InventoryDifferenceThreshold | null> {
    this.logger.debug(
      `Finding applicable threshold for nomenclature=${nomenclatureId}, machine=${machineId}`,
    );

    // Приоритет: NOMENCLATURE > MACHINE > OPERATOR > LOCATION > GLOBAL
    const conditions: FindOptionsWhere<InventoryDifferenceThreshold>[] = [];

    // 1. По конкретному товару
    conditions.push({
      threshold_type: ThresholdType.NOMENCLATURE,
      reference_id: nomenclatureId,
      is_active: true,
    });

    // 2. По машине
    if (machineId) {
      conditions.push({
        threshold_type: ThresholdType.MACHINE,
        reference_id: machineId,
        is_active: true,
      });
    }

    // 3. По оператору
    if (operatorId) {
      conditions.push({
        threshold_type: ThresholdType.OPERATOR,
        reference_id: operatorId,
        is_active: true,
      });
    }

    // 4. По локации
    if (locationId) {
      conditions.push({
        threshold_type: ThresholdType.LOCATION,
        reference_id: locationId,
        is_active: true,
      });
    }

    // 5. Глобальный
    conditions.push({
      threshold_type: ThresholdType.GLOBAL,
      is_active: true,
    });

    const thresholds = await this.thresholdRepository.find({
      where: conditions,
      order: { priority: 'DESC' },
    });

    if (thresholds.length === 0) {
      return null;
    }

    // Возвращаем наиболее специфичный порог
    // Приоритет типов: NOMENCLATURE > MACHINE > OPERATOR > LOCATION > GLOBAL
    const typePriority = {
      [ThresholdType.NOMENCLATURE]: 5,
      [ThresholdType.MACHINE]: 4,
      [ThresholdType.OPERATOR]: 3,
      [ThresholdType.LOCATION]: 2,
      [ThresholdType.CATEGORY]: 2,
      [ThresholdType.GLOBAL]: 1,
    };

    thresholds.sort((a, b) => {
      // Сначала по типу (более специфичный выше)
      const typeA = typePriority[a.threshold_type] || 0;
      const typeB = typePriority[b.threshold_type] || 0;
      if (typeA !== typeB) {
        return typeB - typeA;
      }
      // Затем по приоритету
      return b.priority - a.priority;
    });

    return thresholds[0];
  }

  /**
   * Обновить порог
   */
  async update(id: string, dto: UpdateThresholdDto): Promise<InventoryDifferenceThreshold> {
    this.logger.log(`Updating threshold: ${id}`);

    const threshold = await this.findOne(id);

    // Валидация при обновлении типа
    if (dto.threshold_type !== undefined) {
      if (
        dto.threshold_type === ThresholdType.GLOBAL &&
        (dto.reference_id || threshold.reference_id)
      ) {
        if (dto.reference_id !== null) {
          throw new BadRequestException('GLOBAL threshold type should not have reference_id');
        }
      }

      if (dto.threshold_type !== ThresholdType.GLOBAL) {
        const refId = dto.reference_id !== undefined ? dto.reference_id : threshold.reference_id;
        if (!refId) {
          throw new BadRequestException(
            `${dto.threshold_type} threshold type requires reference_id`,
          );
        }
      }
    }

    Object.assign(threshold, dto);
    const updated = await this.thresholdRepository.save(threshold);

    this.logger.log(`Threshold updated: ${updated.id}`);
    return updated;
  }

  /**
   * Удалить порог
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removing threshold: ${id}`);

    const threshold = await this.findOne(id);
    await this.thresholdRepository.remove(threshold);

    this.logger.log(`Threshold removed: ${id}`);
  }

  /**
   * Активировать порог
   */
  async activate(id: string): Promise<InventoryDifferenceThreshold> {
    return this.update(id, { is_active: true });
  }

  /**
   * Деактивировать порог
   */
  async deactivate(id: string): Promise<InventoryDifferenceThreshold> {
    return this.update(id, { is_active: false });
  }

  /**
   * Получить статистику по порогам
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: Record<ThresholdType, number>;
    bySeverity: Record<SeverityLevel, number>;
  }> {
    const all = await this.thresholdRepository.find();

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let active = 0;
    let inactive = 0;

    for (const threshold of all) {
      // По типу
      byType[threshold.threshold_type] = (byType[threshold.threshold_type] || 0) + 1;

      // По серьёзности
      bySeverity[threshold.severity_level] = (bySeverity[threshold.severity_level] || 0) + 1;

      // Активность
      if (threshold.is_active) {
        active++;
      } else {
        inactive++;
      }
    }

    return {
      total: all.length,
      active,
      inactive,
      byType: byType as Record<ThresholdType, number>,
      bySeverity: bySeverity as Record<SeverityLevel, number>,
    };
  }

  /**
   * Создать глобальные пороги по умолчанию
   */
  async createDefaultThresholds(userId?: string): Promise<InventoryDifferenceThreshold[]> {
    this.logger.log('Creating default thresholds');

    const defaults = [
      {
        name: 'Предупреждение (10%)',
        threshold_type: ThresholdType.GLOBAL,
        threshold_rel: 10,
        severity_level: SeverityLevel.WARNING,
        priority: 0,
        description: 'Глобальный порог предупреждения при расхождении более 10%',
      },
      {
        name: 'Критическое (25%)',
        threshold_type: ThresholdType.GLOBAL,
        threshold_rel: 25,
        severity_level: SeverityLevel.CRITICAL,
        create_incident: true,
        notify_roles: ['ADMIN', 'MANAGER'],
        priority: 1,
        description: 'Глобальный критический порог при расхождении более 25%',
      },
    ];

    const created: InventoryDifferenceThreshold[] = [];

    for (const def of defaults) {
      const existing = await this.thresholdRepository.findOne({
        where: {
          name: def.name,
          threshold_type: def.threshold_type as ThresholdType,
        },
      });

      if (!existing) {
        const threshold = await this.create(
          {
            ...def,
            threshold_type: def.threshold_type as ThresholdType,
            severity_level: def.severity_level as SeverityLevel,
          },
          userId,
        );
        created.push(threshold);
      }
    }

    this.logger.log(`Created ${created.length} default thresholds`);
    return created;
  }
}
