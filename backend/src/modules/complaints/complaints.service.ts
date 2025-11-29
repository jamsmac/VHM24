import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint, ComplaintStatus, ComplaintType } from './entities/complaint.entity';
import {
  CreateComplaintDto,
  CreatePublicComplaintDto,
  HandleComplaintDto,
} from './dto/create-complaint.dto';
import { MachinesService } from '../machines/machines.service';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(Complaint)
    private readonly complaintRepository: Repository<Complaint>,
    private readonly machinesService: MachinesService,
  ) {}

  /**
   * Создание жалобы (публичный endpoint через QR-код)
   */
  async create(dto: CreateComplaintDto): Promise<Complaint> {
    const complaint = this.complaintRepository.create({
      ...dto,
      status: ComplaintStatus.NEW,
      submitted_at: new Date(),
    });

    return this.complaintRepository.save(complaint);
  }

  /**
   * Создание жалобы через QR-код (публичный endpoint без авторизации)
   */
  async createFromQrCode(dto: CreatePublicComplaintDto): Promise<Complaint> {
    // Resolve QR code to machine
    const machine = await this.machinesService.findByQrCodePublic(dto.qr_code);

    // Create complaint with resolved machine_id
    const complaint = this.complaintRepository.create({
      machine_id: machine.id,
      complaint_type: dto.complaint_type,
      description: dto.description,
      customer_name: dto.customer_name,
      customer_phone: dto.customer_phone,
      customer_email: dto.customer_email,
      rating: dto.rating,
      metadata: dto.metadata,
      status: ComplaintStatus.NEW,
      submitted_at: new Date(),
    });

    return this.complaintRepository.save(complaint);
  }

  /**
   * Получение всех жалоб с фильтрацией
   */
  async findAll(
    status?: ComplaintStatus,
    type?: ComplaintType,
    machineId?: string,
  ): Promise<Complaint[]> {
    const query = this.complaintRepository
      .createQueryBuilder('complaint')
      .leftJoinAndSelect('complaint.machine', 'machine')
      .leftJoinAndSelect('complaint.handled_by', 'handled_by');

    if (status) {
      query.andWhere('complaint.status = :status', { status });
    }

    if (type) {
      query.andWhere('complaint.complaint_type = :type', { type });
    }

    if (machineId) {
      query.andWhere('complaint.machine_id = :machineId', { machineId });
    }

    query.orderBy('complaint.submitted_at', 'DESC');

    return query.getMany();
  }

  /**
   * Получение жалобы по ID
   */
  async findOne(id: string): Promise<Complaint> {
    const complaint = await this.complaintRepository.findOne({
      where: { id },
      relations: ['machine', 'machine.location', 'handled_by'],
    });

    if (!complaint) {
      throw new NotFoundException(`Жалоба с ID ${id} не найдена`);
    }

    return complaint;
  }

  /**
   * Взять жалобу в обработку
   */
  async takeInReview(id: string, userId: string): Promise<Complaint> {
    const complaint = await this.findOne(id);

    if (complaint.status !== ComplaintStatus.NEW) {
      throw new BadRequestException('Можно взять в обработку только новые жалобы');
    }

    complaint.status = ComplaintStatus.IN_REVIEW;
    complaint.handled_by_user_id = userId;

    return this.complaintRepository.save(complaint);
  }

  /**
   * Решить жалобу
   */
  async resolve(id: string, userId: string, dto: HandleComplaintDto): Promise<Complaint> {
    const complaint = await this.findOne(id);

    if (
      complaint.status !== ComplaintStatus.NEW &&
      complaint.status !== ComplaintStatus.IN_REVIEW
    ) {
      throw new BadRequestException('Жалоба уже обработана');
    }

    complaint.status = ComplaintStatus.RESOLVED;
    complaint.handled_by_user_id = userId;
    complaint.resolved_at = new Date();
    complaint.response = dto.response;
    complaint.refund_amount = dto.refund_amount || null;
    complaint.refund_transaction_id = dto.refund_transaction_id || null;

    return this.complaintRepository.save(complaint);
  }

  /**
   * Отклонить жалобу
   */
  async reject(id: string, userId: string, reason: string): Promise<Complaint> {
    const complaint = await this.findOne(id);

    if (
      complaint.status !== ComplaintStatus.NEW &&
      complaint.status !== ComplaintStatus.IN_REVIEW
    ) {
      throw new BadRequestException('Жалоба уже обработана');
    }

    complaint.status = ComplaintStatus.REJECTED;
    complaint.handled_by_user_id = userId;
    complaint.resolved_at = new Date();
    complaint.response = reason;

    return this.complaintRepository.save(complaint);
  }

  /**
   * Удаление жалобы
   */
  async remove(id: string): Promise<void> {
    const complaint = await this.findOne(id);
    await this.complaintRepository.softRemove(complaint);
  }

  /**
   * Статистика жалоб
   */
  async getStats() {
    const total = await this.complaintRepository.count();

    const byStatus = await this.complaintRepository
      .createQueryBuilder('complaint')
      .select('complaint.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('complaint.status')
      .getRawMany();

    const byType = await this.complaintRepository
      .createQueryBuilder('complaint')
      .select('complaint.complaint_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('complaint.complaint_type')
      .getRawMany();

    // Среднее время решения
    const avgResolutionTime = await this.complaintRepository
      .createQueryBuilder('complaint')
      .select(
        'AVG(EXTRACT(EPOCH FROM (complaint.resolved_at - complaint.submitted_at)))',
        'avg_seconds',
      )
      .where('complaint.status = :status', { status: ComplaintStatus.RESOLVED })
      .getRawOne();

    // Общая сумма возвратов
    const totalRefunds = await this.complaintRepository
      .createQueryBuilder('complaint')
      .select('SUM(complaint.refund_amount)', 'total')
      .getRawOne();

    // Средняя оценка
    const avgRating = await this.complaintRepository
      .createQueryBuilder('complaint')
      .select('AVG(complaint.rating)', 'avg')
      .where('complaint.rating IS NOT NULL')
      .getRawOne();

    return {
      total,
      by_status: byStatus.map((item) => ({
        status: item.status,
        count: parseInt(item.count),
      })),
      by_type: byType.map((item) => ({
        type: item.type,
        count: parseInt(item.count),
      })),
      avg_resolution_time_hours: avgResolutionTime?.avg_seconds
        ? parseFloat(avgResolutionTime.avg_seconds) / 3600
        : 0,
      total_refunds: parseFloat(totalRefunds?.total) || 0,
      avg_rating: avgRating?.avg ? parseFloat(avgRating.avg) : 0,
    };
  }

  /**
   * Получение новых жалоб (требуют внимания)
   */
  async getNewComplaints(): Promise<Complaint[]> {
    return this.complaintRepository.find({
      where: {
        status: ComplaintStatus.NEW,
      },
      relations: ['machine', 'machine.location'],
      order: {
        submitted_at: 'ASC',
      },
    });
  }
}
