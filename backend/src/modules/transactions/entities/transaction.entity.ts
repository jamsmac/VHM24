import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { User } from '../../users/entities/user.entity';
import { Contract } from '../../counterparty/entities/contract.entity';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Тип транзакции
 */
export enum TransactionType {
  SALE = 'sale', // Продажа напитка
  COLLECTION = 'collection', // Инкассация (изъятие денег)
  EXPENSE = 'expense', // Расход (покупка товара, аренда, ремонт)
  REFUND = 'refund', // Возврат
}

/**
 * Метод оплаты
 */
export enum PaymentMethod {
  CASH = 'cash', // Наличные
  CARD = 'card', // Банковская карта
  MOBILE = 'mobile', // Мобильный платеж (Apple Pay, Google Pay)
  QR = 'qr', // QR-код оплата
}

/**
 * Категория расхода (для type = EXPENSE)
 */
export enum ExpenseCategory {
  RENT = 'rent', // Аренда локации
  PURCHASE = 'purchase', // Закупка товара
  REPAIR = 'repair', // Ремонт
  SALARY = 'salary', // Зарплата
  UTILITIES = 'utilities', // Коммунальные услуги
  DEPRECIATION = 'depreciation', // Амортизация оборудования
  WRITEOFF = 'writeoff', // Списание оборудования/товара
  OTHER = 'other', // Прочее
}

/**
 * Транзакция
 * Отслеживает все финансовые операции: продажи, инкассации, расходы
 */
@Entity('transactions')
@Index(['transaction_type'])
@Index(['machine_id'])
@Index(['user_id'])
@Index(['transaction_date'])
@Index(['organization_id'])
export class Transaction extends BaseEntity {
  @ApiProperty({ enum: TransactionType, example: TransactionType.SALE })
  @Column({ type: 'enum', enum: TransactionType })
  transaction_type: TransactionType;

  @ApiProperty({
    example: '2025-11-14T10:30:00Z',
    description: 'Дата и время транзакции',
  })
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  transaction_date: Date;

  @ApiProperty({
    example: '2025-11-14T10:30:00Z',
    description: 'Дата продажи (для type=SALE, от аппарата или из импорта)',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  sale_date: Date | null;

  @ApiProperty({ example: 150000, description: 'Сумма транзакции (в UZS)' })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @ApiProperty({ example: 'UZS', description: 'Валюта транзакции' })
  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  payment_method: PaymentMethod | null;

  // Связь с аппаратом (для продаж и инкассаций)
  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;

  @ManyToOne(() => Machine, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine | null;

  // Пользователь, выполнивший транзакцию
  @ApiProperty({ example: 'uuid', description: 'ID пользователя' })
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  // Связь с контрактом (для расчета комиссий) - Phase 3
  @ApiProperty({ example: 'uuid', description: 'ID контракта (для расчета комиссий)' })
  @Column({ type: 'uuid', nullable: true })
  contract_id: string | null;

  @ManyToOne(() => Contract, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract | null;

  // Связь с контрагентом (для расходов и закупок)
  @ApiProperty({ example: 'uuid', description: 'ID контрагента' })
  @Column({ type: 'uuid', nullable: true })
  counterparty_id: string | null;

  // Для продаж (type = SALE)
  @ApiProperty({ example: 'uuid', description: 'ID рецепта (для продаж)' })
  @Column({ type: 'uuid', nullable: true })
  recipe_id: string | null;

  @ApiProperty({ example: 'uuid', description: 'ID snapshot рецепта (для исторической точности)' })
  @Column({ type: 'uuid', nullable: true })
  recipe_snapshot_id: string | null;

  @ApiProperty({ example: 5, description: 'Версия рецепта на момент продажи' })
  @Column({ type: 'integer', nullable: true })
  recipe_version: number | null;

  @ApiProperty({ example: 1, description: 'Количество проданных порций' })
  @Column({ type: 'integer', nullable: true })
  quantity: number | null;

  // Для расходов (type = EXPENSE)
  @ApiProperty({ enum: ExpenseCategory, example: ExpenseCategory.PURCHASE })
  @Column({ type: 'enum', enum: ExpenseCategory, nullable: true })
  expense_category: ExpenseCategory | null;

  // Для инкассаций (type = COLLECTION)
  @ApiProperty({ example: 'uuid', description: 'ID задачи инкассации' })
  @Column({ type: 'uuid', nullable: true })
  collection_task_id: string | null;

  @ApiProperty({
    example: 'Инкассация аппарата M-001',
    description: 'Описание транзакции',
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    example: { invoice_number: 'INV-2024-001', supplier: 'Coffee Beans Ltd' },
    description: 'Дополнительные метаданные',
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @ApiProperty({
    example: 'TXN-20241114-001',
    description: 'Уникальный номер транзакции',
  })
  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  transaction_number: string | null;

  // Organization for multi-tenant franchise system (Sprint 4)
  @ApiProperty({ example: 'uuid', description: 'ID организации (для multi-tenant)' })
  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @ManyToOne(() => Organization, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;
}
