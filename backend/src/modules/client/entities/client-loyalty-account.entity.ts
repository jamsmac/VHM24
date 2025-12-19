import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ClientUser } from './client-user.entity';

/**
 * Client loyalty account - tracks accumulated loyalty points.
 * One account per client user.
 */
@Entity('client_loyalty_accounts')
@Index(['client_user_id'], { unique: true })
export class ClientLoyaltyAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @OneToOne(() => ClientUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @Column({ type: 'integer', default: 0 })
  points_balance: number;

  @Column({ type: 'integer', default: 0 })
  lifetime_points: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
