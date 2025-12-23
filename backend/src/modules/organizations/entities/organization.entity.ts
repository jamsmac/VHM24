import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Organization types for multi-tenant franchise system
 */
export enum OrganizationType {
  /** Main company (headquarters) */
  HEADQUARTERS = 'headquarters',
  /** Franchise partner */
  FRANCHISE = 'franchise',
  /** Regional branch */
  BRANCH = 'branch',
  /** Individual operator */
  OPERATOR = 'operator',
}

/**
 * Organization entity for multi-tenant franchise system
 * Supports hierarchical structure (parent-child relationships)
 */
@Entity('organizations')
@Index(['slug'], { unique: true })
@Index(['parent_id'])
@Index(['type'])
@Index(['is_active'])
export class Organization extends BaseEntity {
  @ApiProperty({
    example: 'VendHub Uzbekistan',
    description: 'Organization name',
  })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({
    example: 'vendhub-uzbekistan',
    description: 'Unique URL-friendly identifier',
  })
  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @ApiProperty({
    example: 'franchise',
    description: 'Organization type',
    enum: OrganizationType,
  })
  @Column({
    type: 'varchar',
    length: 50,
    default: OrganizationType.FRANCHISE,
  })
  type: OrganizationType;

  @ApiProperty({
    example: 'uuid',
    description: 'Parent organization ID (for hierarchical structure)',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @ManyToOne(() => Organization, (org) => org.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Organization | null;

  @OneToMany(() => Organization, (org) => org.parent)
  children: Organization[];

  @ApiProperty({
    example: { timezone: 'Asia/Tashkent', currency: 'UZS' },
    description: 'Organization-specific settings (JSON)',
  })
  @Column({ type: 'jsonb', default: {} })
  settings: OrganizationSettings;

  @ApiProperty({
    example: true,
    description: 'Whether the organization is active',
  })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiProperty({
    example: '+998901234567',
    description: 'Contact phone number',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @ApiProperty({
    example: 'contact@vendhub.uz',
    description: 'Contact email',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @ApiProperty({
    example: 'Tashkent, Mirzo Ulugbek district',
    description: 'Physical address',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  address: string | null;

  @ApiProperty({
    example: 'https://example.com/logo.png',
    description: 'Organization logo URL',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;

  @ApiProperty({
    example: '123456789',
    description: 'Tax identification number (INN)',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  tax_id: string | null;

  @ApiProperty({
    example: '2025-01-01',
    description: 'Contract start date',
    nullable: true,
  })
  @Column({ type: 'date', nullable: true })
  contract_start_date: Date | null;

  @ApiProperty({
    example: '2026-01-01',
    description: 'Contract end date',
    nullable: true,
  })
  @Column({ type: 'date', nullable: true })
  contract_end_date: Date | null;

  @ApiProperty({
    example: 10,
    description: 'Commission percentage for franchise',
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commission_rate: number | null;
}

/**
 * Organization settings stored as JSONB
 */
export interface OrganizationSettings {
  /** Timezone for the organization */
  timezone?: string;
  /** Default currency */
  currency?: string;
  /** Default language */
  language?: string;
  /** Working hours */
  working_hours?: {
    start: string;
    end: string;
  };
  /** Notification settings */
  notifications?: {
    email_enabled?: boolean;
    telegram_enabled?: boolean;
    low_stock_threshold?: number;
  };
  /** Branding settings */
  branding?: {
    primary_color?: string;
    secondary_color?: string;
  };
  /** Custom settings */
  custom?: Record<string, unknown>;
}
