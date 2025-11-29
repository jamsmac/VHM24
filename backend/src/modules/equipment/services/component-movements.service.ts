import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComponentMovement, MovementType } from '../entities/component-movement.entity';
import { EquipmentComponent, ComponentLocationType } from '../entities/equipment-component.entity';

/**
 * Service для управления перемещениями компонентов (REQ-ASSET-11)
 *
 * Отвечает за:
 * - Создание записей о перемещениях
 * - Обновление текущего местоположения компонента
 * - Валидацию перемещений
 * - Получение истории перемещений
 */
@Injectable()
export class ComponentMovementsService {
  private readonly logger = new Logger(ComponentMovementsService.name);

  constructor(
    @InjectRepository(ComponentMovement)
    private readonly movementRepository: Repository<ComponentMovement>,
    @InjectRepository(EquipmentComponent)
    private readonly componentRepository: Repository<EquipmentComponent>,
  ) {}

  /**
   * Создать перемещение компонента
   *
   * Автоматически обновляет current_location в компоненте
   */
  async createMovement(params: {
    componentId: string;
    toLocationType: ComponentLocationType;
    toLocationRef?: string;
    movementType: MovementType;
    relatedMachineId?: string;
    taskId?: string;
    performedByUserId?: string;
    comment?: string;
  }): Promise<ComponentMovement> {
    const {
      componentId,
      toLocationType,
      toLocationRef,
      movementType,
      relatedMachineId,
      taskId,
      performedByUserId,
      comment,
    } = params;

    // Получаем текущее состояние компонента
    const component = await this.componentRepository.findOne({
      where: { id: componentId },
    });

    if (!component) {
      throw new BadRequestException(`Component with ID ${componentId} not found`);
    }

    // Сохраняем текущую локацию как "from"
    const fromLocationType = component.current_location_type;
    const fromLocationRef = component.current_location_ref;

    // Валидация перемещения
    this.validateMovement(fromLocationType, toLocationType, movementType);

    // Создаём запись о перемещении
    const movement = this.movementRepository.create({
      component_id: componentId,
      from_location_type: fromLocationType,
      from_location_ref: fromLocationRef,
      to_location_type: toLocationType,
      to_location_ref: toLocationRef || null,
      movement_type: movementType,
      related_machine_id: relatedMachineId || null,
      task_id: taskId || null,
      performed_by_user_id: performedByUserId || null,
      moved_at: new Date(),
      comment: comment || null,
    });

    await this.movementRepository.save(movement);

    // Обновляем текущую локацию компонента
    await this.componentRepository.update(componentId, {
      current_location_type: toLocationType,
      current_location_ref: toLocationRef || null,
      machine_id: toLocationType === ComponentLocationType.MACHINE ? relatedMachineId : null,
    });

    this.logger.log(
      `Component ${componentId} moved from ${fromLocationType} to ${toLocationType}. Movement type: ${movementType}`,
    );

    return movement;
  }

  /**
   * Валидация перемещения
   *
   * Проверяет, что переход из одной локации в другую логичен
   */
  private validateMovement(
    from: ComponentLocationType,
    to: ComponentLocationType,
    type: MovementType,
  ): void {
    // Базовая валидация: нельзя перемещать в ту же локацию
    if (from === to) {
      throw new BadRequestException(
        `Component is already in ${to}. Cannot move to the same location.`,
      );
    }

    // Специфичные проверки по типу движения
    const validTransitions: Record<
      MovementType,
      { from: ComponentLocationType[]; to: ComponentLocationType[] }
    > = {
      [MovementType.INSTALL]: {
        from: [ComponentLocationType.WAREHOUSE],
        to: [ComponentLocationType.MACHINE],
      },
      [MovementType.REMOVE]: {
        from: [ComponentLocationType.MACHINE],
        to: [
          ComponentLocationType.WAREHOUSE,
          ComponentLocationType.WASHING,
          ComponentLocationType.REPAIR,
        ],
      },
      [MovementType.SEND_TO_WASH]: {
        from: [ComponentLocationType.WAREHOUSE, ComponentLocationType.MACHINE],
        to: [ComponentLocationType.WASHING],
      },
      [MovementType.RETURN_FROM_WASH]: {
        from: [ComponentLocationType.WASHING],
        to: [ComponentLocationType.WAREHOUSE, ComponentLocationType.DRYING],
      },
      [MovementType.SEND_TO_DRYING]: {
        from: [ComponentLocationType.WASHING],
        to: [ComponentLocationType.DRYING],
      },
      [MovementType.RETURN_FROM_DRYING]: {
        from: [ComponentLocationType.DRYING],
        to: [ComponentLocationType.WAREHOUSE],
      },
      [MovementType.MOVE_TO_WAREHOUSE]: {
        from: [
          ComponentLocationType.MACHINE,
          ComponentLocationType.REPAIR,
          ComponentLocationType.DRYING,
        ],
        to: [ComponentLocationType.WAREHOUSE],
      },
      [MovementType.MOVE_TO_MACHINE]: {
        from: [ComponentLocationType.WAREHOUSE],
        to: [ComponentLocationType.MACHINE],
      },
      [MovementType.SEND_TO_REPAIR]: {
        from: [ComponentLocationType.WAREHOUSE, ComponentLocationType.MACHINE],
        to: [ComponentLocationType.REPAIR],
      },
      [MovementType.RETURN_FROM_REPAIR]: {
        from: [ComponentLocationType.REPAIR],
        to: [ComponentLocationType.WAREHOUSE, ComponentLocationType.MACHINE],
      },
    };

    const transition = validTransitions[type];
    if (!transition) {
      // Неизвестный тип перемещения - пропускаем валидацию
      return;
    }

    if (!transition.from.includes(from)) {
      throw new BadRequestException(
        `Invalid movement: ${type} cannot be performed from ${from}. Expected: ${transition.from.join(', ')}`,
      );
    }

    if (!transition.to.includes(to)) {
      throw new BadRequestException(
        `Invalid movement: ${type} cannot move to ${to}. Expected: ${transition.to.join(', ')}`,
      );
    }
  }

  /**
   * Получить историю перемещений компонента
   */
  async getComponentHistory(componentId: string): Promise<ComponentMovement[]> {
    return await this.movementRepository.find({
      where: { component_id: componentId },
      relations: ['related_machine', 'task', 'performed_by'],
      order: { moved_at: 'DESC' },
    });
  }

  /**
   * Получить последнее перемещение компонента
   */
  async getLastMovement(componentId: string): Promise<ComponentMovement | null> {
    return await this.movementRepository.findOne({
      where: { component_id: componentId },
      relations: ['related_machine', 'task', 'performed_by'],
      order: { moved_at: 'DESC' },
    });
  }

  /**
   * Получить все перемещения за период
   */
  async getMovementsByDateRange(startDate: Date, endDate: Date): Promise<ComponentMovement[]> {
    return await this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.component', 'component')
      .leftJoinAndSelect('movement.related_machine', 'machine')
      .leftJoinAndSelect('movement.performed_by', 'user')
      .where('movement.moved_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('movement.moved_at', 'DESC')
      .getMany();
  }
}
