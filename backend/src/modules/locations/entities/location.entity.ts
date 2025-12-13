import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Counterparty } from '@/modules/counterparty/entities/counterparty.entity';

export enum LocationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

@Entity('locations')
@Index(['city', 'name'])
export class Location extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type_code: string; // from dictionaries: location_types

  @Column({
    type: 'enum',
    enum: LocationStatus,
    default: LocationStatus.ACTIVE,
  })
  status: LocationStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Address fields
  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 200 })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postal_code: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  // Contact info
  @Column({ type: 'varchar', length: 100, nullable: true })
  contact_person: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contact_phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contact_email: string | null;

  // Business info
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  monthly_rent: number | null; // Аренда в месяц (UZS)

  @Column({ type: 'uuid', nullable: true })
  counterparty_id: string | null; // Контрагент-владелец локации

  @ManyToOne(() => Counterparty, (counterparty) => counterparty.locations, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'counterparty_id' })
  counterparty: Counterparty | null; // Владелец локации (контрагент)

  @Column({ type: 'integer', default: 0 })
  estimated_traffic: number; // Примерное количество людей в день

  // Working hours (JSONB)
  @Column({ type: 'jsonb', nullable: true })
  working_hours: {
    monday?: { from: string; to: string };
    tuesday?: { from: string; to: string };
    wednesday?: { from: string; to: string };
    thursday?: { from: string; to: string };
    friday?: { from: string; to: string };
    saturday?: { from: string; to: string };
    sunday?: { from: string; to: string };
  } | null;

  // Contract details
  @Column({ type: 'date', nullable: true })
  contract_start_date: Date | null;

  @Column({ type: 'date', nullable: true })
  contract_end_date: Date | null;

  @Column({ type: 'text', nullable: true })
  contract_notes: string | null;

  // Additional metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
