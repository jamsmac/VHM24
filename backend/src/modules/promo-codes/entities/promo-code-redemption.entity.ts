import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PromoCode } from './promo-code.entity';
import { ClientUser } from '../../client/entities/client-user.entity';
import { ClientOrder } from '../../client/entities/client-order.entity';

/**
 * PromoCodeRedemption entity - tracks promo code usage history.
 */
@Entity('promo_code_redemptions')
@Index(['promo_code_id'])
@Index(['client_user_id'])
@Index(['order_id'])
@Index(['created_at'])
export class PromoCodeRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  promo_code_id: string;

  @ManyToOne(() => PromoCode, (promoCode) => promoCode.redemptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'promo_code_id' })
  promo_code: PromoCode;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @ManyToOne(() => ClientUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @Column({ type: 'uuid', nullable: true })
  order_id: string | null;

  @ManyToOne(() => ClientOrder, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: ClientOrder | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  discount_applied: number;

  @Column({ type: 'integer', default: 0 })
  loyalty_bonus_awarded: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
