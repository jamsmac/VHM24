import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  DirectoryEntry,
  EntryOrigin,
  EntryStatus,
  ApprovalStatus,
} from '../entities/directory-entry.entity';
import { AuditActionType } from '../entities/directory-entry-audit.entity';
import { CreateEntryDto } from '../dto/create-entry.dto';
import { UpdateEntryDto } from '../dto/update-entry.dto';
import { DirectoryService } from './directory.service';
import { ValidationService } from './validation.service';
import { AuditService, AuditContext } from './audit.service';

export interface EntryFilters {
  status?: EntryStatus;
  origin?: EntryOrigin;
  parent_id?: string | null;
  tags?: string[];
  page?: number;
  limit?: number;
  sort?: string;
}

@Injectable()
export class EntryService {
  constructor(
    @InjectRepository(DirectoryEntry)
    private readonly entryRepository: Repository<DirectoryEntry>,
    private readonly dataSource: DataSource,
    private readonly directoryService: DirectoryService,
    private readonly validationService: ValidationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Find all entries in a directory with filters
   */
  async findAll(
    directoryId: string,
    filters?: EntryFilters,
  ): Promise<{ data: DirectoryEntry[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    const qb = this.entryRepository
      .createQueryBuilder('e')
      .where('e.directory_id = :directoryId', { directoryId })
      .andWhere('e.deleted_at IS NULL');

    if (filters?.status) {
      qb.andWhere('e.status = :status', { status: filters.status });
    }

    if (filters?.origin) {
      qb.andWhere('e.origin = :origin', { origin: filters.origin });
    }

    if (filters?.parent_id !== undefined) {
      if (filters.parent_id === null) {
        qb.andWhere('e.parent_id IS NULL');
      } else {
        qb.andWhere('e.parent_id = :parentId', { parentId: filters.parent_id });
      }
    }

    if (filters?.tags?.length) {
      qb.andWhere('e.tags && :tags', { tags: filters.tags });
    }

    // Sorting
    const sort = filters?.sort || 'name_ru';
    const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
    const sortField = sort.replace(/^-/, '');

    const allowedSortFields = [
      'name_ru',
      'name_en',
      'code',
      'sort_order',
      'created_at',
      'updated_at',
    ];
    if (allowedSortFields.includes(sortField)) {
      qb.orderBy(`e.${sortField}`, sortDir);
    } else {
      qb.orderBy('e.sort_order', 'ASC').addOrderBy('e.name_ru', 'ASC');
    }

    const [data, total] = await qb.skip(offset).take(limit).getManyAndCount();

    return { data, total };
  }

  /**
   * Find a single entry by ID
   */
  async findOne(id: string): Promise<DirectoryEntry> {
    const entry = await this.entryRepository.findOne({
      where: { id },
      relations: ['parent', 'replacement_entry', 'files'],
    });

    if (!entry) {
      throw new NotFoundException(`Entry with ID "${id}" not found`);
    }

    return entry;
  }

  /**
   * Find entry by code within a directory
   */
  async findByCode(directoryId: string, code: string): Promise<DirectoryEntry | null> {
    return this.entryRepository.findOne({
      where: { directory_id: directoryId, code },
    });
  }

  /**
   * Create a new entry
   */
  async create(
    directoryId: string,
    dto: CreateEntryDto,
    context: AuditContext,
  ): Promise<DirectoryEntry> {
    const directory = await this.directoryService.findOne(directoryId);

    // Check code uniqueness
    const existingCode = await this.findByCode(directoryId, dto.code);
    if (existingCode) {
      throw new ConflictException(`Entry with code "${dto.code}" already exists`);
    }

    // Validate data against field rules
    if (dto.data) {
      const validation = await this.validationService.validateEntryData(directory, dto.data);
      if (!validation.valid) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: validation.errors,
        });
      }
    }

    // Check hierarchy if parent_id provided
    if (dto.parent_id) {
      await this.validateParent(directoryId, dto.parent_id);
    }

    // Determine initial status based on directory settings
    let status = dto.status || EntryStatus.ACTIVE;
    let approvalStatus: ApprovalStatus | null = null;

    if (directory.settings?.requires_approval && dto.origin !== EntryOrigin.OFFICIAL) {
      status = EntryStatus.PENDING_APPROVAL;
      approvalStatus = ApprovalStatus.PENDING;
    }

    // Create entry
    const entry = this.entryRepository.create({
      directory_id: directoryId,
      code: dto.code,
      name_ru: dto.name_ru,
      name_en: dto.name_en,
      parent_id: dto.parent_id,
      origin: dto.origin || EntryOrigin.LOCAL,
      external_id: dto.external_id,
      status,
      approval_status: approvalStatus,
      tags: dto.tags,
      sort_order: dto.sort_order || 0,
      data: dto.data || {},
      valid_from: dto.valid_from ? new Date(dto.valid_from) : null,
      valid_to: dto.valid_to ? new Date(dto.valid_to) : null,
      created_by_id: context.userId,
      updated_by_id: context.userId,
    });

    const saved = await this.entryRepository.save(entry);

    // Audit log
    await this.auditService.log(saved.id, AuditActionType.CREATE, context, null, {
      code: saved.code,
      name_ru: saved.name_ru,
      name_en: saved.name_en,
      origin: saved.origin,
      status: saved.status,
      data: saved.data,
    });

    return saved;
  }

  /**
   * Update an existing entry
   */
  async update(
    id: string,
    dto: UpdateEntryDto,
    context: AuditContext,
  ): Promise<DirectoryEntry> {
    const entry = await this.findOne(id);

    // Cannot edit OFFICIAL entries
    if (entry.origin === EntryOrigin.OFFICIAL) {
      throw new BadRequestException('Cannot edit OFFICIAL entry');
    }

    const directory = await this.directoryService.findOne(entry.directory_id);

    // Validate data
    if (dto.data) {
      const validation = await this.validationService.validateEntryData(
        directory,
        { ...entry.data, ...dto.data },
        id,
      );
      if (!validation.valid) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: validation.errors,
        });
      }
    }

    // Check hierarchy cycle
    if (dto.parent_id && dto.parent_id !== entry.parent_id) {
      await this.checkHierarchyCycle(id, dto.parent_id);
    }

    // Capture old values for audit
    const oldValues = {
      name_ru: entry.name_ru,
      name_en: entry.name_en,
      status: entry.status,
      parent_id: entry.parent_id,
      tags: entry.tags,
      sort_order: entry.sort_order,
      data: entry.data,
    };

    // Update fields
    if (dto.name_ru !== undefined) entry.name_ru = dto.name_ru;
    if (dto.name_en !== undefined) entry.name_en = dto.name_en;
    if (dto.parent_id !== undefined) entry.parent_id = dto.parent_id;
    if (dto.status !== undefined) entry.status = dto.status;
    if (dto.tags !== undefined) entry.tags = dto.tags;
    if (dto.sort_order !== undefined) entry.sort_order = dto.sort_order;
    if (dto.data !== undefined) entry.data = { ...entry.data, ...dto.data };
    if (dto.valid_from !== undefined) entry.valid_from = dto.valid_from ? new Date(dto.valid_from) : null;
    if (dto.valid_to !== undefined) entry.valid_to = dto.valid_to ? new Date(dto.valid_to) : null;
    if (dto.replacement_entry_id !== undefined) entry.replacement_entry_id = dto.replacement_entry_id;

    entry.updated_by_id = context.userId;
    entry.version += 1;

    const saved = await this.entryRepository.save(entry);

    // Audit log
    const newValues = {
      name_ru: saved.name_ru,
      name_en: saved.name_en,
      status: saved.status,
      parent_id: saved.parent_id,
      tags: saved.tags,
      sort_order: saved.sort_order,
      data: saved.data,
    };

    await this.auditService.log(saved.id, AuditActionType.UPDATE, context, oldValues, newValues);

    return saved;
  }

  /**
   * Archive an entry (soft delete)
   */
  async archive(id: string, context: AuditContext): Promise<void> {
    const entry = await this.findOne(id);

    if (entry.origin === EntryOrigin.OFFICIAL) {
      throw new BadRequestException('Cannot archive OFFICIAL entry');
    }

    const oldStatus = entry.status;
    entry.status = EntryStatus.ARCHIVED;
    entry.updated_by_id = context.userId;
    await this.entryRepository.save(entry);

    // Audit log
    await this.auditService.log(
      entry.id,
      AuditActionType.ARCHIVE,
      context,
      { status: oldStatus },
      { status: EntryStatus.ARCHIVED },
    );
  }

  /**
   * Restore an archived entry
   */
  async restore(id: string, context: AuditContext): Promise<DirectoryEntry> {
    const entry = await this.findOne(id);

    if (entry.status !== EntryStatus.ARCHIVED) {
      throw new BadRequestException('Entry is not archived');
    }

    entry.status = EntryStatus.ACTIVE;
    entry.updated_by_id = context.userId;
    const saved = await this.entryRepository.save(entry);

    // Audit log
    await this.auditService.log(
      entry.id,
      AuditActionType.RESTORE,
      context,
      { status: EntryStatus.ARCHIVED },
      { status: EntryStatus.ACTIVE },
    );

    return saved;
  }

  /**
   * Approve a pending entry
   */
  async approve(id: string, context: AuditContext): Promise<DirectoryEntry> {
    const entry = await this.findOne(id);

    if (entry.approval_status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Entry is not pending approval');
    }

    entry.status = EntryStatus.ACTIVE;
    entry.approval_status = ApprovalStatus.APPROVED;
    entry.approved_by_id = context.userId;
    entry.approved_at = new Date();
    entry.updated_by_id = context.userId;

    const saved = await this.entryRepository.save(entry);

    // Audit log
    await this.auditService.log(entry.id, AuditActionType.APPROVE, context, {
      status: EntryStatus.PENDING_APPROVAL,
      approval_status: ApprovalStatus.PENDING,
    }, {
      status: EntryStatus.ACTIVE,
      approval_status: ApprovalStatus.APPROVED,
    });

    return saved;
  }

  /**
   * Reject a pending entry
   */
  async reject(
    id: string,
    reason: string,
    context: AuditContext,
  ): Promise<DirectoryEntry> {
    const entry = await this.findOne(id);

    if (entry.approval_status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Entry is not pending approval');
    }

    entry.approval_status = ApprovalStatus.REJECTED;
    entry.rejection_reason = reason;
    entry.updated_by_id = context.userId;

    const saved = await this.entryRepository.save(entry);

    // Audit log
    await this.auditService.log(entry.id, AuditActionType.REJECT, context, {
      approval_status: ApprovalStatus.PENDING,
    }, {
      approval_status: ApprovalStatus.REJECTED,
      rejection_reason: reason,
    });

    return saved;
  }

  /**
   * Deprecate an entry with optional replacement
   */
  async deprecate(
    id: string,
    replacementEntryId: string | null,
    context: AuditContext,
  ): Promise<DirectoryEntry> {
    const entry = await this.findOne(id);

    // Verify replacement entry exists if provided
    if (replacementEntryId) {
      const replacement = await this.entryRepository.findOne({
        where: { id: replacementEntryId },
      });
      if (!replacement) {
        throw new NotFoundException(`Replacement entry "${replacementEntryId}" not found`);
      }
      if (replacement.directory_id !== entry.directory_id) {
        throw new BadRequestException('Replacement entry must be in the same directory');
      }
    }

    entry.status = EntryStatus.ARCHIVED;
    entry.deprecated_at = new Date();
    entry.replacement_entry_id = replacementEntryId;
    entry.updated_by_id = context.userId;

    const saved = await this.entryRepository.save(entry);

    // Audit log
    await this.auditService.log(entry.id, AuditActionType.ARCHIVE, context, {
      status: entry.status,
      deprecated_at: null,
      replacement_entry_id: null,
    }, {
      status: EntryStatus.ARCHIVED,
      deprecated_at: saved.deprecated_at,
      replacement_entry_id: replacementEntryId,
    });

    return saved;
  }

  /**
   * Validate that parent entry exists and is in the same directory
   */
  private async validateParent(directoryId: string, parentId: string): Promise<void> {
    const parent = await this.entryRepository.findOne({
      where: { id: parentId, directory_id: directoryId },
    });

    if (!parent) {
      throw new NotFoundException(`Parent entry "${parentId}" not found in this directory`);
    }
  }

  /**
   * Check for hierarchy cycles using database function
   */
  private async checkHierarchyCycle(entryId: string, newParentId: string): Promise<void> {
    const result = await this.dataSource.query(
      'SELECT check_hierarchy_cycle($1, $2) as has_cycle',
      [entryId, newParentId],
    );

    if (result[0]?.has_cycle) {
      throw new BadRequestException('Cycle detected in hierarchy');
    }
  }

  /**
   * Bulk import entries
   */
  async bulkImport(
    directoryId: string,
    entries: CreateEntryDto[],
    context: AuditContext,
    options: {
      mode: 'insert' | 'upsert' | 'sync';
      uniqueKeyField?: string;
      isAtomic?: boolean;
    },
  ): Promise<{ inserted: number; updated: number; errors: any[] }> {
    const directory = await this.directoryService.findOne(directoryId);
    const results = { inserted: 0, updated: 0, errors: [] as any[] };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < entries.length; i++) {
        const dto = entries[i];
        try {
          // Validate
          if (dto.data) {
            const validation = await this.validationService.validateEntryData(
              directory,
              dto.data,
            );
            if (!validation.valid) {
              results.errors.push({
                row: i + 1,
                code: dto.code,
                errors: validation.errors,
              });
              continue;
            }
          }

          // Check if exists
          const existing = await this.findByCode(directoryId, dto.code);

          if (existing && options.mode === 'insert') {
            results.errors.push({
              row: i + 1,
              code: dto.code,
              errors: [{ message: 'Entry already exists' }],
            });
            continue;
          }

          if (existing && (options.mode === 'upsert' || options.mode === 'sync')) {
            // Update existing
            await this.update(existing.id, dto, context);
            results.updated++;
          } else {
            // Insert new
            await this.create(directoryId, dto, context);
            results.inserted++;
          }
        } catch (error: any) {
          results.errors.push({
            row: i + 1,
            code: dto.code,
            errors: [{ message: error.message }],
          });

          if (options.isAtomic) {
            throw error;
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (options.isAtomic) {
        throw error;
      }
    } finally {
      await queryRunner.release();
    }

    return results;
  }
}
