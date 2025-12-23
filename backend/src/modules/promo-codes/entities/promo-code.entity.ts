import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { PromoCodeType, PromoCodeStatus } from '../enums';
import { PromoCodeRedemption } from './promo-code-redemption.entity';

/**
 * PromoCode entity - defines promotional codes for discounts and bonuses.
 */
@Entity('promo_codes')
@Index(['code'])
@Index(['status'])
@Index(['type'])
@Index(['valid_from'])
@Index(['valid_until'])
@Index(['deleted_at'])
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  type: PromoCodeType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  value: number;

  @Column({ type: 'timestamp with time zone' })
  valid_from: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  valid_until: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: PromoCodeStatus.DRAFT,
  })
  status: PromoCodeStatus;

  @Column({ type: 'integer', nullable: true })
  max_uses: number | null;

  @Column({ type: 'integer', default: 1 })
  max_uses_per_user: number;

  @Column({ type: 'integer', default: 0 })
  current_uses: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minimum_order_amount: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  maximum_discount: number | null;

  @Column({ type: 'jsonb', nullable: true })
  applicable_products: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  applicable_locations: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  applicable_machines: string[] | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @ManyToOne(() => Organization, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User | null;

  @OneToMany(() => PromoCodeRedemption, (redemption) => redemption.promo_code)
  redemptions: PromoCodeRedemption[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone' })
  deleted_at: Date | null;

  /**
   * Check if promo code is currently valid for use
   */
  isValid(): boolean {
    const now = new Date();

    if (this.status !== PromoCodeStatus.ACTIVE) {
      return false;
    }

    if (this.deleted_at) {
      return false;
    }

    if (now < this.valid_from) {
      return false;
    }

    if (this.valid_until && now > this.valid_until) {
      return false;
    }

    if (this.max_uses && this.current_uses >= this.max_uses) {
      return false;
    }

    return true;
  }
}
