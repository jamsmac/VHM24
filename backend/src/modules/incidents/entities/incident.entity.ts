import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Тип инцидента (из справочника incident_types)
 */
export enum IncidentType {
  TECHNICAL_FAILURE = 'technical_failure', // Техническая неисправность
  OUT_OF_STOCK = 'out_of_stock', // Закончился товар
  CASH_FULL = 'cash_full', // Купюроприемник переполнен
  CASH_DISCREPANCY = 'cash_discrepancy', // Расхождение в инкассации
  VANDALISM = 'vandalism', // Вандализм
  POWER_OUTAGE = 'power_outage', // Отключение электричества
  OTHER = 'other', // Прочее
}

/**
 * Статус инцидента
 */
export enum IncidentStatus {
  OPEN = 'open', // Открыт
  IN_PROGRESS = 'in_progress', // В работе
  RESOLVED = 'resolved', // Решен
  CLOSED = 'closed', // Закрыт
}

/**
 * Приоритет инцидента
 */
export enum IncidentPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Инцидент
 * Отслеживает сбои и проблемы с оборудованием
 */
@Entity('incidents')
@Index(['incident_type'])
@Index(['status'])
@Index(['priority'])
@Index(['machine_id'])
@Index(['reported_at'])
export class Incident extends BaseEntity {
  @ApiProperty({ enum: IncidentType, example: IncidentType.TECHNICAL_FAILURE })
  @Column({ type: 'enum', enum: IncidentType })
  incident_type: IncidentType;

  @ApiProperty({ enum: IncidentStatus, default: IncidentStatus.OPEN })
  @Column({ type: 'enum', enum: IncidentStatus, default: IncidentStatus.OPEN })
  status: IncidentStatus;

  @ApiProperty({ enum: IncidentPriority, default: IncidentPriority.MEDIUM })
  @Column({
    type: 'enum',
    enum: IncidentPriority,
    default: IncidentPriority.MEDIUM,
  })
  priority: IncidentPriority;

  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @ApiProperty({ example: 'Аппарат не выдает сдачу', description: 'Заголовок' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({
    example: 'Купюроприемник не возвращает сдачу при оплате',
    description: 'Подробное описание',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    example: 'uuid',
    description: 'ID пользователя, сообщившего об инциденте',
  })
  @Column({ type: 'uuid', nullable: true })
  reported_by_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'reported_by_user_id' })
  reported_by: User | null;

  @ApiProperty({
    example: '2025-11-14T10:00:00Z',
    description: 'Дата сообщения об инциденте',
  })
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  reported_at: Date;

  @ApiProperty({
    example: 'uuid',
    description: 'ID назначенного специалиста',
  })
  @Column({ type: 'uuid', nullable: true })
  assigned_to_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assigned_to: User | null;

  @ApiProperty({
    example: '2025-11-14T11:00:00Z',
    description: 'Дата начала работы над инцидентом',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  started_at: Date | null;

  @ApiProperty({
    example: '2025-11-14T14:00:00Z',
    description: 'Дата решения инцидента',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date | null;

  @ApiProperty({
    example: '2025-11-14T15:00:00Z',
    description: 'Дата закрытия инцидента',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  closed_at: Date | null;

  @ApiProperty({
    example: 'Заменен модуль купюроприемника',
    description: 'Описание решения',
  })
  @Column({ type: 'text', nullable: true })
  resolution_notes: string | null;

  @ApiProperty({
    example: 'uuid',
    description: 'ID связанной задачи ремонта',
  })
  @Column({ type: 'uuid', nullable: true })
  repair_task_id: string | null;

  @ApiProperty({
    example: { error_code: 'E42', component: 'bill_validator' },
    description: 'Дополнительные метаданные',
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @ApiProperty({
    example: 2500.5,
    description: 'Стоимость ремонта',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  repair_cost: number | null;
}
