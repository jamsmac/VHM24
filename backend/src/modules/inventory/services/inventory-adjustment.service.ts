import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InventoryAdjustment,
  AdjustmentStatus,
  AdjustmentReason,
} from '../entities/inventory-adjustment.entity';
import { WarehouseInventory } from '../entities/warehouse-inventory.entity';
import { OperatorInventory } from '../entities/operator-inventory.entity';
import { MachineInventory } from '../entities/machine-inventory.entity';
import { InventoryLevelType } from '../entities/inventory-actual-count.entity';
import {
  CreateAdjustmentDto,
  ApproveAdjustmentDto,
  FilterAdjustmentsDto,
} from '../dto/inventory-adjustment.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/entities/notification.entity';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/entities/user.entity';

/**
 * InventoryAdjustmentService
 *
 * Workflow корректировки остатков товаров:
 * 1. Создание корректировки (на основе расхождения или вручную)
 * 2. Согласование (опционально)
 * 3. Применение к остаткам
 * 4. Audit trail
 */
@Injectable()
export class InventoryAdjustmentService {
  private readonly logger = new Logger(InventoryAdjustmentService.name);

  constructor(
    @InjectRepository(InventoryAdjustment)
    private readonly adjustmentRepository: Repository<InventoryAdjustment>,
    @InjectRepository(WarehouseInventory)
    private readonly warehouseInventoryRepository: Repository<WarehouseInventory>,
    @InjectRepository(OperatorInventory)
    private readonly operatorInventoryRepository: Repository<OperatorInventory>,
    @InjectRepository(MachineInventory)
    private readonly machineInventoryRepository: Repository<MachineInventory>,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Создать корректировку остатков
   */
  async createAdjustment(dto: CreateAdjustmentDto, userId: string): Promise<InventoryAdjustment> {
    this.logger.log(
      `Creating adjustment for ${dto.nomenclature_id} at ${dto.level_type}/${dto.level_ref_id}`,
    );

    // Вычислить adjustment_quantity
    const adjustmentQuantity = dto.new_quantity - dto.old_quantity;

    // Создать корректировку
    const adjustment = this.adjustmentRepository.create({
      nomenclature_id: dto.nomenclature_id,
      level_type: dto.level_type,
      level_ref_id: dto.level_ref_id,
      actual_count_id: dto.actual_count_id || null,
      old_quantity: dto.old_quantity,
      new_quantity: dto.new_quantity,
      adjustment_quantity: adjustmentQuantity,
      reason: dto.reason,
      comment: dto.comment || null,
      requires_approval: dto.requires_approval ?? true,
      status:
        dto.requires_approval === false ? AdjustmentStatus.APPROVED : AdjustmentStatus.PENDING,
      created_by_user_id: userId,
    });

    const saved = await this.adjustmentRepository.save(adjustment);

    // Если не требует согласования, сразу применить
    if (!dto.requires_approval) {
      await this.applyAdjustment(saved.id, userId);
    } else {
      // Отправить уведомление менеджерам о необходимости согласования
      await this.sendApprovalNotification(saved);
    }

    return await this.findOne(saved.id);
  }

  /**
   * Получить список корректировок с фильтрацией
   */
  async findAll(filters: FilterAdjustmentsDto): Promise<{
    data: InventoryAdjustment[];
    total: number;
  }> {
    const query = this.adjustmentRepository
      .createQueryBuilder('adjustment')
      .leftJoinAndSelect('adjustment.nomenclature', 'nomenclature')
      .leftJoinAndSelect('adjustment.created_by', 'created_by')
      .leftJoinAndSelect('adjustment.approved_by', 'approved_by')
      .leftJoinAndSelect('adjustment.actual_count', 'actual_count');

    // Применить фильтры
    if (filters.status) {
      query.andWhere('adjustment.status = :status', { status: filters.status });
    }

    if (filters.level_type) {
      query.andWhere('adjustment.level_type = :level_type', {
        level_type: filters.level_type,
      });
    }

    if (filters.level_ref_id) {
      query.andWhere('adjustment.level_ref_id = :level_ref_id', {
        level_ref_id: filters.level_ref_id,
      });
    }

    if (filters.nomenclature_id) {
      query.andWhere('adjustment.nomenclature_id = :nomenclature_id', {
        nomenclature_id: filters.nomenclature_id,
      });
    }

    if (filters.created_by_user_id) {
      query.andWhere('adjustment.created_by_user_id = :created_by_user_id', {
        created_by_user_id: filters.created_by_user_id,
      });
    }

    // Подсчитать total
    const total = await query.getCount();

    // Применить пагинацию
    query.orderBy('adjustment.created_at', 'DESC');

    if (filters.limit) {
      query.take(filters.limit);
    }

    if (filters.offset) {
      query.skip(filters.offset);
    }

    const data = await query.getMany();

    return { data, total };
  }

  /**
   * Получить корректировку по ID
   */
  async findOne(id: string): Promise<InventoryAdjustment> {
    const adjustment = await this.adjustmentRepository.findOne({
      where: { id },
      relations: ['nomenclature', 'created_by', 'approved_by', 'actual_count'],
    });

    if (!adjustment) {
      throw new NotFoundException(`Adjustment with ID ${id} not found`);
    }

    return adjustment;
  }

  /**
   * Одобрить или отклонить корректировку
   */
  async approveOrReject(
    id: string,
    dto: ApproveAdjustmentDto,
    userId: string,
  ): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(id);

    // Проверить, что корректировка в статусе PENDING
    if (adjustment.status !== AdjustmentStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve/reject adjustment with status ${adjustment.status}`,
      );
    }

    // Обновить статус
    adjustment.status = dto.status;
    adjustment.approved_by_user_id = userId;
    adjustment.approved_at = new Date();

    // Добавить комментарий к метаданным
    if (dto.comment) {
      adjustment.metadata = {
        ...(adjustment.metadata || {}),
        approval_comment: dto.comment,
      };
    }

    await this.adjustmentRepository.save(adjustment);

    // Если одобрено, применить к остаткам
    if (dto.status === AdjustmentStatus.APPROVED) {
      await this.applyAdjustment(id, userId);
    }

    // Отправить уведомление создателю
    await this.sendStatusNotification(adjustment);

    return await this.findOne(id);
  }

  /**
   * Применить корректировку к остаткам
   */
  async applyAdjustment(id: string, _userId: string): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(id);

    // Проверить статус
    if (adjustment.status === AdjustmentStatus.APPLIED) {
      throw new BadRequestException('Adjustment already applied');
    }

    if (
      adjustment.status !== AdjustmentStatus.APPROVED &&
      adjustment.status !== AdjustmentStatus.PENDING
    ) {
      throw new BadRequestException(`Cannot apply adjustment with status ${adjustment.status}`);
    }

    this.logger.log(
      `Applying adjustment ${id}: ${adjustment.old_quantity} -> ${adjustment.new_quantity}`,
    );

    // Применить корректировку в зависимости от уровня
    switch (adjustment.level_type) {
      case InventoryLevelType.WAREHOUSE:
        await this.applyWarehouseAdjustment(adjustment);
        break;
      case InventoryLevelType.OPERATOR:
        await this.applyOperatorAdjustment(adjustment);
        break;
      case InventoryLevelType.MACHINE:
        await this.applyMachineAdjustment(adjustment);
        break;
      default:
        throw new BadRequestException(`Unknown level type: ${adjustment.level_type}`);
    }

    // Обновить статус корректировки
    adjustment.status = AdjustmentStatus.APPLIED;
    adjustment.applied_at = new Date();
    await this.adjustmentRepository.save(adjustment);

    this.logger.log(`Adjustment ${id} applied successfully`);

    return await this.findOne(id);
  }

  /**
   * Отменить корректировку
   */
  async cancelAdjustment(id: string, userId: string): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(id);

    // Можно отменить только PENDING или APPROVED (но не APPLIED)
    if (adjustment.status === AdjustmentStatus.APPLIED) {
      throw new BadRequestException('Cannot cancel applied adjustment');
    }

    adjustment.status = AdjustmentStatus.CANCELLED;
    adjustment.metadata = {
      ...(adjustment.metadata || {}),
      cancelled_by_user_id: userId,
      cancelled_at: new Date(),
    };

    await this.adjustmentRepository.save(adjustment);

    return await this.findOne(id);
  }

  /**
   * Применить корректировку на уровне склада
   */
  private async applyWarehouseAdjustment(adjustment: InventoryAdjustment): Promise<void> {
    const inventory = await this.warehouseInventoryRepository.findOne({
      where: {
        nomenclature_id: adjustment.nomenclature_id,
      },
    });

    if (!inventory) {
      throw new NotFoundException(
        `Warehouse inventory not found for nomenclature ${adjustment.nomenclature_id}`,
      );
    }

    // Обновить current_quantity
    inventory.current_quantity = Number(adjustment.new_quantity);
    await this.warehouseInventoryRepository.save(inventory);
  }

  /**
   * Применить корректировку на уровне оператора
   */
  private async applyOperatorAdjustment(adjustment: InventoryAdjustment): Promise<void> {
    const inventory = await this.operatorInventoryRepository.findOne({
      where: {
        operator_id: adjustment.level_ref_id,
        nomenclature_id: adjustment.nomenclature_id,
      },
    });

    if (!inventory) {
      throw new NotFoundException(
        `Operator inventory not found for operator ${adjustment.level_ref_id} and nomenclature ${adjustment.nomenclature_id}`,
      );
    }

    inventory.current_quantity = Number(adjustment.new_quantity);
    await this.operatorInventoryRepository.save(inventory);
  }

  /**
   * Применить корректировку на уровне аппарата
   */
  private async applyMachineAdjustment(adjustment: InventoryAdjustment): Promise<void> {
    const inventory = await this.machineInventoryRepository.findOne({
      where: {
        machine_id: adjustment.level_ref_id,
        nomenclature_id: adjustment.nomenclature_id,
      },
    });

    if (!inventory) {
      throw new NotFoundException(
        `Machine inventory not found for machine ${adjustment.level_ref_id} and nomenclature ${adjustment.nomenclature_id}`,
      );
    }

    inventory.current_quantity = Number(adjustment.new_quantity);
    await this.machineInventoryRepository.save(inventory);
  }

  /**
   * Отправить уведомление о необходимости согласования
   */
  private async sendApprovalNotification(adjustment: InventoryAdjustment): Promise<void> {
    try {
      // Get managers and admins who can approve adjustments
      const approvers = await this.usersService.findByRoles([
        UserRole.OWNER,
        UserRole.ADMIN,
        UserRole.MANAGER,
      ]);

      if (approvers.length === 0) {
        this.logger.warn('No approvers found for inventory adjustment notification');
        return;
      }

      const title = '📝 Требуется согласование корректировки';
      const message =
        `Создана корректировка остатков, требующая согласования:\n\n` +
        `Товар: ${adjustment.nomenclature?.name || adjustment.nomenclature_id}\n` +
        `Уровень: ${this.translateLevelType(adjustment.level_type)}\n` +
        `Старое значение: ${adjustment.old_quantity}\n` +
        `Новое значение: ${adjustment.new_quantity}\n` +
        `Изменение: ${adjustment.adjustment_quantity > 0 ? '+' : ''}${adjustment.adjustment_quantity}\n` +
        `Причина: ${this.translateReason(adjustment.reason)}`;

      const notificationData = {
        adjustment_id: adjustment.id,
        nomenclature_id: adjustment.nomenclature_id,
        level_type: adjustment.level_type,
        level_ref_id: adjustment.level_ref_id,
      };

      // Send notifications to all approvers
      const notificationPromises: Promise<any>[] = [];

      for (const approver of approvers) {
        // Send in-app notification
        notificationPromises.push(
          this.notificationsService.create({
            type: NotificationType.OTHER,
            channel: NotificationChannel.IN_APP,
            recipient_id: approver.id,
            title,
            message,
            data: notificationData,
            action_url: `/inventory/adjustments/${adjustment.id}`,
          }),
        );

        // Send Telegram notification if user has telegram_user_id
        if (approver.telegram_user_id) {
          notificationPromises.push(
            this.notificationsService.create({
              type: NotificationType.OTHER,
              channel: NotificationChannel.TELEGRAM,
              recipient_id: approver.id,
              title,
              message,
              data: notificationData,
              action_url: `/inventory/adjustments/${adjustment.id}`,
            }),
          );
        }
      }

      await Promise.allSettled(notificationPromises);

      this.logger.log(
        `Sent approval notifications for adjustment ${adjustment.id} to ${approvers.length} approvers`,
      );
    } catch (error) {
      this.logger.error('Failed to send approval notification:', error.message);
    }
  }

  /**
   * Translate level type to Russian
   */
  private translateLevelType(levelType: InventoryLevelType): string {
    const translations = {
      [InventoryLevelType.WAREHOUSE]: 'Склад',
      [InventoryLevelType.OPERATOR]: 'Оператор',
      [InventoryLevelType.MACHINE]: 'Аппарат',
    };
    return translations[levelType] || levelType;
  }

  /**
   * Отправить уведомление об изменении статуса
   */
  private async sendStatusNotification(adjustment: InventoryAdjustment): Promise<void> {
    try {
      const statusText = adjustment.status === AdjustmentStatus.APPROVED ? 'одобрена' : 'отклонена';

      await this.notificationsService.create({
        type: NotificationType.OTHER,
        channel: NotificationChannel.IN_APP,
        recipient_id: adjustment.created_by_user_id,
        title: `✅ Корректировка ${statusText}`,
        message:
          `Ваша корректировка остатков ${statusText}:\n\n` +
          `Товар: ${adjustment.nomenclature?.name || adjustment.nomenclature_id}\n` +
          `Изменение: ${adjustment.adjustment_quantity > 0 ? '+' : ''}${adjustment.adjustment_quantity}\n` +
          `Согласовал: ${adjustment.approved_by?.full_name || 'Система'}`,
        data: {
          adjustment_id: adjustment.id,
          status: adjustment.status,
        },
        action_url: `/inventory/adjustments/${adjustment.id}`,
      });
    } catch (error) {
      this.logger.error('Failed to send status notification:', error.message);
    }
  }

  /**
   * Перевести причину на русский
   */
  private translateReason(reason: AdjustmentReason): string {
    const translations = {
      [AdjustmentReason.INVENTORY_DIFFERENCE]: 'Расхождение при инвентаризации',
      [AdjustmentReason.DAMAGE]: 'Повреждение товара',
      [AdjustmentReason.THEFT]: 'Кража',
      [AdjustmentReason.EXPIRY]: 'Истечение срока годности',
      [AdjustmentReason.RETURN]: 'Возврат',
      [AdjustmentReason.CORRECTION]: 'Исправление ошибки',
      [AdjustmentReason.OTHER]: 'Другое',
    };
    return translations[reason] || reason;
  }
}
