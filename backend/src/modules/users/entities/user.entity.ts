import { Entity, Column, Index, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Role } from '@modules/rbac/entities/role.entity';

export enum UserRole {
  OWNER = 'Owner',
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  OPERATOR = 'Operator',
  COLLECTOR = 'Collector',
  TECHNICIAN = 'Technician',
  VIEWER = 'Viewer',
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PASSWORD_CHANGE_REQUIRED = 'password_change_required',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true, where: 'phone IS NOT NULL' })
@Index(['telegram_user_id'], { unique: true, where: 'telegram_user_id IS NOT NULL' })
@Index(['username'], { unique: true, where: 'username IS NOT NULL' })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  full_name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'text', select: false })
  password_hash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  password_changed_by_user: boolean;

  // Approval workflow fields
  @Column({ type: 'uuid', nullable: true })
  approved_by_id: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  rejected_by_id: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  rejected_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telegram_user_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_username: string | null;

  @Column({ type: 'boolean', default: false })
  is_2fa_enabled: boolean;

  @Column({ type: 'text', nullable: true, select: false })
  two_fa_secret: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_login_at: Date | null;

  @Column({ type: 'inet', nullable: true })
  last_login_ip: string | null;

  @Column({ type: 'text', nullable: true, select: false })
  refresh_token: string | null;

  // Login attempt tracking for security
  @Column({ type: 'integer', default: 0 })
  failed_login_attempts: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  account_locked_until: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_failed_login_at: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any> | null;

  // IP Whitelist (REQ-AUTH-60)
  @Column({ type: 'boolean', default: false })
  ip_whitelist_enabled: boolean;

  @Column({ type: 'simple-array', nullable: true })
  allowed_ips: string[] | null;

  // First Login Password Change (REQ-AUTH-31)
  @Column({ type: 'boolean', default: false })
  requires_password_change: boolean;

  // RBAC - many-to-many relationship with roles
  @ManyToMany(() => Role, { eager: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  /**
   * Check if account is currently locked
   */
  get isLocked(): boolean {
    if (!this.account_locked_until) {
      return false;
    }
    return new Date() < this.account_locked_until;
  }
}
