import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Request, RequestStatus, RequestPriority } from './entities/request.entity';
import { RequestItem } from './entities/request-item.entity';
import { Material } from './entities/material.entity';
import {
  CreateRequestDto,
  UpdateRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  SendToSupplierDto,
  CompleteRequestDto,
  UpdateReceivedQuantityDto,
} from './dto';

/**
 * Сервис управления заявками на материалы.
 */
@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Request)
    private readonly requestRepository: Repository<Request>,
    @InjectRepository(RequestItem)
    private readonly requestItemRepository: Repository<RequestItem>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Создать новую заявку.
   *
   * @param userId - ID пользователя-создателя
   * @param dto - Данные заявки
   * @returns Созданная заявка
   */
  async create(userId: string, dto: CreateRequestDto): Promise<Request> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Генерируем номер заявки
      const requestNumber = await this.generateRequestNumber();

      // Создаём заявку
      const request = queryRunner.manager.create(Request, {
        request_number: requestNumber,
        status: RequestStatus.NEW,
        priority: dto.priority || RequestPriority.NORMAL,
        created_by_user_id: userId,
        comment: dto.comment,
        desired_delivery_date: dto.desired_delivery_date
          ? new Date(dto.desired_delivery_date)
          : null,
      });

      const savedRequest = await queryRunner.manager.save(request);

      // Добавляем позиции
      let totalAmount = 0;
      const items: RequestItem[] = [];

      for (const itemDto of dto.items) {
        const material = await this.materialRepository.findOne({
          where: { id: itemDto.material_id },
        });

        if (!material) {
          throw new BadRequestException(`Материал с ID ${itemDto.material_id} не найден`);
        }

        const unitPrice = itemDto.unit_price ?? material.unit_price ?? 0;
        const totalPrice = unitPrice * itemDto.quantity;
        totalAmount += totalPrice;

        const item = queryRunner.manager.create(RequestItem, {
          request_id: savedRequest.id,
          material_id: itemDto.material_id,
          supplier_id: itemDto.supplier_id || material.supplier_id,
          quantity: itemDto.quantity,
          unit: itemDto.unit || material.unit,
          unit_price: unitPrice,
          total_price: totalPrice,
          notes: itemDto.notes,
        });

        items.push(await queryRunner.manager.save(item));
      }

      // Обновляем общую сумму
      await queryRunner.manager.update(Request, savedRequest.id, {
        total_amount: totalAmount,
      });

      await queryRunner.commitTransaction();

      return await this.findOne(savedRequest.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Генерация номера заявки.
   * Формат: REQ-YYYY-NNNNNN
   */
  private async generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}-`;

    const lastRequest = await this.requestRepository
      .createQueryBuilder('request')
      .where('request.request_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('request.request_number', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastRequest) {
      const lastNumber = parseInt(lastRequest.request_number.split('-')[2], 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
  }

  /**
   * Получить все заявки с фильтрацией.
   */
  async findAll(options?: {
    status?: RequestStatus;
    statuses?: RequestStatus[];
    priority?: RequestPriority;
    created_by_user_id?: string;
    date_from?: Date;
    date_to?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ items: Request[]; total: number }> {
    const query = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.items', 'items')
      .leftJoinAndSelect('items.material', 'material')
      .leftJoinAndSelect('items.supplier', 'supplier')
      .leftJoinAndSelect('request.created_by', 'created_by')
      .leftJoinAndSelect('request.approved_by', 'approved_by');

    if (options?.status) {
      query.andWhere('request.status = :status', { status: options.status });
    }

    if (options?.statuses?.length) {
      query.andWhere('request.status IN (:...statuses)', {
        statuses: options.statuses,
      });
    }

    if (options?.priority) {
      query.andWhere('request.priority = :priority', {
        priority: options.priority,
      });
    }

    if (options?.created_by_user_id) {
      query.andWhere('request.created_by_user_id = :userId', {
        userId: options.created_by_user_id,
      });
    }

    if (options?.date_from && options?.date_to) {
      query.andWhere('request.created_at BETWEEN :from AND :to', {
        from: options.date_from,
        to: options.date_to,
      });
    }

    query.orderBy('request.created_at', 'DESC');

    const total = await query.getCount();

    if (options?.limit) {
      query.limit(options.limit);
    }
    if (options?.offset) {
      query.offset(options.offset);
    }

    const items = await query.getMany();

    return { items, total };
  }

  /**
   * Получить заявку по ID.
   */
  async findOne(id: string): Promise<Request> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: [
        'items',
        'items.material',
        'items.supplier',
        'created_by',
        'approved_by',
        'rejected_by',
        'completed_by',
      ],
    });

    if (!request) {
      throw new NotFoundException(`Заявка с ID ${id} не найдена`);
    }

    return request;
  }

  /**
   * Получить заявку по номеру.
   */
  async findByNumber(requestNumber: string): Promise<Request> {
    const request = await this.requestRepository.findOne({
      where: { request_number: requestNumber },
      relations: ['items', 'items.material', 'items.supplier', 'created_by'],
    });

    if (!request) {
      throw new NotFoundException(`Заявка ${requestNumber} не найдена`);
    }

    return request;
  }

  /**
   * Обновить заявку.
   */
  async update(id: string, dto: UpdateRequestDto): Promise<Request> {
    const request = await this.findOne(id);

    if (request.status !== RequestStatus.NEW) {
      throw new BadRequestException('Можно редактировать только новые заявки');
    }

    await this.requestRepository.update(id, {
      ...dto,
      desired_delivery_date: dto.desired_delivery_date
        ? new Date(dto.desired_delivery_date)
        : undefined,
    });

    return await this.findOne(id);
  }

  /**
   * Одобрить заявку.
   */
  async approve(id: string, userId: string, dto?: ApproveRequestDto): Promise<Request> {
    const request = await this.findOne(id);

    if (request.status !== RequestStatus.NEW) {
      throw new BadRequestException('Можно одобрить только новые заявки');
    }

    await this.requestRepository.update(id, {
      status: RequestStatus.APPROVED,
      approved_by_user_id: userId,
      approved_at: new Date(),
      admin_notes: dto?.admin_notes,
    });

    return await this.findOne(id);
  }

  /**
   * Отклонить заявку.
   */
  async reject(id: string, userId: string, dto?: RejectRequestDto): Promise<Request> {
    const request = await this.findOne(id);

    if (request.status !== RequestStatus.NEW) {
      throw new BadRequestException('Можно отклонить только новые заявки');
    }

    await this.requestRepository.update(id, {
      status: RequestStatus.REJECTED,
      rejected_by_user_id: userId,
      rejected_at: new Date(),
      rejection_reason: dto?.rejection_reason,
    });

    return await this.findOne(id);
  }

  /**
   * Отметить заявку как отправленную поставщику.
   */
  async markAsSent(id: string, dto?: SendToSupplierDto): Promise<Request> {
    const request = await this.findOne(id);

    if (request.status !== RequestStatus.APPROVED) {
      throw new BadRequestException('Можно отправить только одобренные заявки');
    }

    await this.requestRepository.update(id, {
      status: RequestStatus.SENT,
      sent_at: new Date(),
      sent_message_id: dto?.sent_message_id,
    });

    return await this.findOne(id);
  }

  /**
   * Обновить полученное количество позиции.
   */
  async updateReceivedQuantity(
    itemId: string,
    dto: UpdateReceivedQuantityDto,
  ): Promise<RequestItem> {
    const item = await this.requestItemRepository.findOne({
      where: { id: itemId },
      relations: ['request'],
    });

    if (!item) {
      throw new NotFoundException(`Позиция с ID ${itemId} не найдена`);
    }

    const allowedStatuses = [RequestStatus.SENT, RequestStatus.PARTIAL_DELIVERED];
    if (!allowedStatuses.includes(item.request.status)) {
      throw new BadRequestException('Нельзя обновить полученное количество для этой заявки');
    }

    await this.requestItemRepository.update(itemId, {
      received_quantity: dto.received_quantity,
      is_fulfilled:
        dto.received_quantity !== null &&
        dto.received_quantity !== undefined &&
        dto.received_quantity >= item.quantity,
    });

    // Проверяем, все ли позиции получены
    await this.checkAndUpdateRequestStatus(item.request_id);

    const updatedItem = await this.requestItemRepository.findOne({ where: { id: itemId } });
    if (!updatedItem) {
      throw new NotFoundException(`Позиция с ID ${itemId} не найдена`);
    }
    return updatedItem;
  }

  /**
   * Проверить и обновить статус заявки на основе позиций.
   */
  private async checkAndUpdateRequestStatus(requestId: string): Promise<void> {
    const items = await this.requestItemRepository.find({
      where: { request_id: requestId },
    });

    const totalItems = items.length;
    const fulfilledItems = items.filter((i) => i.is_fulfilled).length;
    const partialItems = items.filter(
      (i) => i.received_quantity !== null && !i.is_fulfilled,
    ).length;

    if (fulfilledItems === totalItems) {
      await this.requestRepository.update(requestId, {
        status: RequestStatus.COMPLETED,
        completed_at: new Date(),
      });
    } else if (fulfilledItems > 0 || partialItems > 0) {
      await this.requestRepository.update(requestId, {
        status: RequestStatus.PARTIAL_DELIVERED,
      });
    }
  }

  /**
   * Завершить заявку вручную.
   */
  async complete(id: string, userId: string, dto?: CompleteRequestDto): Promise<Request> {
    const request = await this.findOne(id);

    const allowedStatuses = [RequestStatus.SENT, RequestStatus.PARTIAL_DELIVERED];
    if (!allowedStatuses.includes(request.status)) {
      throw new BadRequestException('Невозможно завершить эту заявку');
    }

    await this.requestRepository.update(id, {
      status: RequestStatus.COMPLETED,
      completed_at: new Date(),
      completed_by_user_id: userId,
      actual_delivery_date: dto?.actual_delivery_date
        ? new Date(dto.actual_delivery_date)
        : new Date(),
      completion_notes: dto?.completion_notes,
    });

    return await this.findOne(id);
  }

  /**
   * Отменить заявку.
   */
  async cancel(id: string, _userId: string): Promise<Request> {
    const request = await this.findOne(id);

    const forbiddenStatuses = [RequestStatus.COMPLETED, RequestStatus.CANCELLED];
    if (forbiddenStatuses.includes(request.status)) {
      throw new BadRequestException('Невозможно отменить эту заявку');
    }

    await this.requestRepository.update(id, {
      status: RequestStatus.CANCELLED,
    });

    return await this.findOne(id);
  }

  /**
   * Удалить заявку (только новые).
   */
  async remove(id: string): Promise<void> {
    const request = await this.findOne(id);

    if (request.status !== RequestStatus.NEW) {
      throw new BadRequestException('Можно удалить только новые заявки');
    }

    await this.requestRepository.softDelete(id);
  }

  /**
   * Получить статистику заявок.
   */
  async getStatistics(options?: { date_from?: Date; date_to?: Date }): Promise<{
    total: number;
    byStatus: Record<RequestStatus, number>;
    byPriority: Record<RequestPriority, number>;
    totalAmount: number;
  }> {
    const query = this.requestRepository.createQueryBuilder('request');

    if (options?.date_from && options?.date_to) {
      query.where('request.created_at BETWEEN :from AND :to', {
        from: options.date_from,
        to: options.date_to,
      });
    }

    const requests = await query.getMany();

    const byStatus: Record<RequestStatus, number> = {
      [RequestStatus.NEW]: 0,
      [RequestStatus.APPROVED]: 0,
      [RequestStatus.REJECTED]: 0,
      [RequestStatus.SENT]: 0,
      [RequestStatus.PARTIAL_DELIVERED]: 0,
      [RequestStatus.COMPLETED]: 0,
      [RequestStatus.CANCELLED]: 0,
    };

    const byPriority: Record<RequestPriority, number> = {
      [RequestPriority.LOW]: 0,
      [RequestPriority.NORMAL]: 0,
      [RequestPriority.HIGH]: 0,
      [RequestPriority.URGENT]: 0,
    };

    let totalAmount = 0;

    for (const req of requests) {
      byStatus[req.status]++;
      byPriority[req.priority]++;
      totalAmount += Number(req.total_amount || 0);
    }

    return {
      total: requests.length,
      byStatus,
      byPriority,
      totalAmount,
    };
  }
}
