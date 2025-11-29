import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Тип жалобы (из справочника complaint_types)
 */
export enum ComplaintType {
  PRODUCT_QUALITY = 'product_quality', // Качество продукта
  NO_CHANGE = 'no_change', // Не выдана сдача
  PRODUCT_NOT_DISPENSED = 'product_not_dispensed', // Продукт не выдан
  MACHINE_DIRTY = 'machine_dirty', // Грязный аппарат
  OTHER = 'other', // Прочее
}

/**
 * Статус жалобы
 */
export enum ComplaintStatus {
  NEW = 'new', // Новая
  IN_REVIEW = 'in_review', // На рассмотрении
  RESOLVED = 'resolved', // Решена
  REJECTED = 'rejected', // Отклонена
}

/**
 * Жалоба
 * Жалобы клиентов через QR-код на аппарате
 */
@Entity('complaints')
@Index(['complaint_type'])
@Index(['status'])
@Index(['machine_id'])
@Index(['submitted_at'])
export class Complaint extends BaseEntity {
  @ApiProperty({ enum: ComplaintType, example: ComplaintType.PRODUCT_QUALITY })
  @Column({ type: 'enum', enum: ComplaintType })
  complaint_type: ComplaintType;

  @ApiProperty({ enum: ComplaintStatus, default: ComplaintStatus.NEW })
  @Column({ type: 'enum', enum: ComplaintStatus, default: ComplaintStatus.NEW })
  status: ComplaintStatus;

  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @ApiProperty({
    example: 'Кофе был холодным',
    description: 'Описание жалобы',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    example: 'Иван Иванов',
    description: 'Имя клиента (опционально)',
  })
  @Column({ type: 'varchar', length: 200, nullable: true })
  customer_name: string | null;

  @ApiProperty({
    example: '+79991234567',
    description: 'Телефон клиента (опционально)',
  })
  @Column({ type: 'varchar', length: 20, nullable: true })
  customer_phone: string | null;

  @ApiProperty({
    example: 'client@example.com',
    description: 'Email клиента (опционально)',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_email: string | null;

  @ApiProperty({
    example: '2025-11-14T10:30:00Z',
    description: 'Дата подачи жалобы',
  })
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  submitted_at: Date;

  @ApiProperty({
    example: 'uuid',
    description: 'ID пользователя, обрабатывающего жалобу',
  })
  @Column({ type: 'uuid', nullable: true })
  handled_by_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'handled_by_user_id' })
  handled_by: User | null;

  @ApiProperty({
    example: '2025-11-14T15:00:00Z',
    description: 'Дата решения жалобы',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date | null;

  @ApiProperty({
    example: 'Возврат денег выполнен',
    description: 'Ответ на жалобу',
  })
  @Column({ type: 'text', nullable: true })
  response: string | null;

  @ApiProperty({
    example: 150.0,
    description: 'Сумма возврата',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refund_amount: number | null;

  @ApiProperty({
    example: 'uuid',
    description: 'ID транзакции возврата',
  })
  @Column({ type: 'uuid', nullable: true })
  refund_transaction_id: string | null;

  @ApiProperty({
    example: { ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0' },
    description: 'Дополнительные метаданные',
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @ApiProperty({
    example: 5,
    description: 'Оценка клиента (1-5)',
  })
  @Column({ type: 'integer', nullable: true })
  rating: number | null;
}
