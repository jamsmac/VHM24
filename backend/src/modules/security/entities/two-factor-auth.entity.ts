import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum TwoFactorMethod {
  TOTP = 'totp', // Time-based One-Time Password (Google Authenticator)
  SMS = 'sms',
  EMAIL = 'email',
  BACKUP_CODES = 'backup_codes',
}

@Entity('two_factor_auth')
@Index(['user_id'])
export class TwoFactorAuth extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  user_id: string;

  @Column({ type: 'enum', enum: TwoFactorMethod })
  method: TwoFactorMethod;

  @Column({ type: 'boolean', default: false })
  is_enabled: boolean;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  secret: string | null; // Encrypted TOTP secret

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone_number: string | null; // For SMS

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null; // For email 2FA

  @Column({ type: 'jsonb', default: [] })
  backup_codes: string[]; // Hashed backup codes

  @Column({ type: 'integer', default: 0 })
  backup_codes_used: number;

  @Column({ type: 'timestamp', nullable: true })
  enabled_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_used_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  failed_attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  locked_until: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    device_info?: Record<string, any>;
    recovery_email?: string;
    [key: string]: any;
  };
}
