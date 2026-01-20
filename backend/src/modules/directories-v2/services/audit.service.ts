import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DirectoryEntryAudit,
  AuditActionType,
} from '../entities/directory-entry-audit.entity';

export interface AuditContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditFilters {
  entry_id?: string;
  action?: AuditActionType;
  changed_by_id?: string;
  from_date?: Date;
  to_date?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(DirectoryEntryAudit)
    private readonly auditRepository: Repository<DirectoryEntryAudit>,
  ) {}

  /**
   * Create an audit log entry
   */
  async log(
    entryId: string,
    action: AuditActionType,
    context: AuditContext,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    changeReason?: string,
  ): Promise<DirectoryEntryAudit> {
    const audit = this.auditRepository.create({
      entry_id: entryId,
      action,
      changed_by_id: context.userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      old_values: oldValues,
      new_values: newValues,
      change_reason: changeReason,
    });

    return this.auditRepository.save(audit);
  }

  /**
   * Get audit history for an entry
   */
  async getEntryHistory(
    entryId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: DirectoryEntryAudit[]; total: number }> {
    const [data, total] = await this.auditRepository.findAndCount({
      where: { entry_id: entryId },
      order: { changed_at: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { data, total };
  }

  /**
   * Search audit logs with filters
   */
  async search(
    filters: AuditFilters,
  ): Promise<{ data: DirectoryEntryAudit[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;

    const qb = this.auditRepository
      .createQueryBuilder('a')
      .orderBy('a.changed_at', 'DESC');

    if (filters.entry_id) {
      qb.andWhere('a.entry_id = :entryId', { entryId: filters.entry_id });
    }

    if (filters.action) {
      qb.andWhere('a.action = :action', { action: filters.action });
    }

    if (filters.changed_by_id) {
      qb.andWhere('a.changed_by_id = :changedById', {
        changedById: filters.changed_by_id,
      });
    }

    if (filters.from_date) {
      qb.andWhere('a.changed_at >= :fromDate', { fromDate: filters.from_date });
    }

    if (filters.to_date) {
      qb.andWhere('a.changed_at <= :toDate', { toDate: filters.to_date });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  /**
   * Compute changes between old and new values
   */
  computeChanges(
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
  ): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};
    const allKeys = new Set([
      ...Object.keys(oldValues || {}),
      ...Object.keys(newValues || {}),
    ]);

    for (const key of allKeys) {
      const oldVal = oldValues?.[key];
      const newVal = newValues?.[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = { old: oldVal, new: newVal };
      }
    }

    return changes;
  }
}
