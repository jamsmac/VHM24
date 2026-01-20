import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Directory, DirectoryType, DirectoryScope } from '../entities/directory.entity';
import { DirectoryField } from '../entities/directory-field.entity';
import { DirectoryStats } from '../entities/directory-stats.entity';
import { CreateDirectoryDto, CreateFieldDto } from '../dto/create-directory.dto';
import { UpdateDirectoryDto } from '../dto/update-directory.dto';

export interface DirectoryFilters {
  type?: DirectoryType;
  scope?: DirectoryScope;
  organization_id?: string;
  is_active?: boolean;
}

@Injectable()
export class DirectoryService {
  constructor(
    @InjectRepository(Directory)
    private readonly directoryRepository: Repository<Directory>,
    @InjectRepository(DirectoryField)
    private readonly fieldRepository: Repository<DirectoryField>,
    @InjectRepository(DirectoryStats)
    private readonly statsRepository: Repository<DirectoryStats>,
  ) {}

  /**
   * Find all directories with optional filters
   */
  async findAll(filters?: DirectoryFilters): Promise<Directory[]> {
    const qb = this.directoryRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.fields', 'f', 'f.is_active = true')
      .where('d.deleted_at IS NULL')
      .orderBy('d.name_ru', 'ASC')
      .addOrderBy('f.sort_order', 'ASC');

    if (filters?.type) {
      qb.andWhere('d.type = :type', { type: filters.type });
    }

    if (filters?.scope) {
      qb.andWhere('d.scope = :scope', { scope: filters.scope });
    }

    if (filters?.organization_id) {
      qb.andWhere('(d.organization_id = :org OR d.scope = :globalScope)', {
        org: filters.organization_id,
        globalScope: DirectoryScope.GLOBAL,
      });
    }

    if (filters?.is_active !== undefined) {
      qb.andWhere('d.is_active = :isActive', { isActive: filters.is_active });
    }

    return qb.getMany();
  }

  /**
   * Find a single directory by ID
   */
  async findOne(id: string): Promise<Directory> {
    const directory = await this.directoryRepository.findOne({
      where: { id },
      relations: ['fields', 'sources'],
    });

    if (!directory) {
      throw new NotFoundException(`Directory with ID "${id}" not found`);
    }

    return directory;
  }

  /**
   * Find a directory by slug
   */
  async findBySlug(slug: string): Promise<Directory> {
    const directory = await this.directoryRepository.findOne({
      where: { slug },
      relations: ['fields'],
    });

    if (!directory) {
      throw new NotFoundException(`Directory with slug "${slug}" not found`);
    }

    return directory;
  }

  /**
   * Create a new directory with optional fields
   */
  async create(dto: CreateDirectoryDto, userId: string): Promise<Directory> {
    // Check slug uniqueness
    const existing = await this.directoryRepository.findOne({
      where: { slug: dto.slug },
      withDeleted: true,
    });

    if (existing) {
      throw new ConflictException(`Directory with slug "${dto.slug}" already exists`);
    }

    // Create directory
    const directory = this.directoryRepository.create({
      slug: dto.slug,
      name_ru: dto.name_ru,
      name_en: dto.name_en,
      description: dto.description,
      type: dto.type,
      scope: dto.scope || DirectoryScope.GLOBAL,
      organization_id: dto.organization_id,
      is_hierarchical: dto.is_hierarchical || false,
      icon: dto.icon,
      settings: {
        allow_inline_create: true,
        allow_local_overlay: true,
        requires_approval: false,
        prefetch: false,
        offline_enabled: false,
        offline_max_entries: 1000,
        ...dto.settings,
      },
      created_by_id: userId,
      updated_by_id: userId,
    });

    const saved = await this.directoryRepository.save(directory);

    // Create fields if provided
    if (dto.fields?.length) {
      await this.createFields(saved.id, dto.fields, userId);
    }

    // Initialize stats record
    await this.statsRepository.save({
      directory_id: saved.id,
      total_entries: 0,
      active_entries: 0,
      official_entries: 0,
      local_entries: 0,
    });

    return this.findOne(saved.id);
  }

  /**
   * Update an existing directory
   */
  async update(id: string, dto: UpdateDirectoryDto, userId: string): Promise<Directory> {
    const directory = await this.findOne(id);

    // Cannot modify system directory's critical properties
    if (directory.is_system && (dto.scope || dto.organization_id)) {
      throw new BadRequestException('Cannot change scope of system directory');
    }

    // Update fields
    Object.assign(directory, {
      ...dto,
      settings: dto.settings ? { ...directory.settings, ...dto.settings } : directory.settings,
      updated_by_id: userId,
    });

    return this.directoryRepository.save(directory);
  }

  /**
   * Soft delete a directory
   */
  async archive(id: string, userId: string): Promise<void> {
    const directory = await this.findOne(id);

    if (directory.is_system) {
      throw new BadRequestException('Cannot delete system directory');
    }

    directory.is_active = false;
    directory.updated_by_id = userId;
    await this.directoryRepository.save(directory);
    await this.directoryRepository.softDelete(id);
  }

  /**
   * Restore a soft-deleted directory
   */
  async restore(id: string, userId: string): Promise<Directory> {
    const directory = await this.directoryRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!directory) {
      throw new NotFoundException(`Directory with ID "${id}" not found`);
    }

    if (!directory.deleted_at) {
      throw new BadRequestException('Directory is not archived');
    }

    await this.directoryRepository.restore(id);

    directory.is_active = true;
    directory.updated_by_id = userId;
    directory.deleted_at = null;
    return this.directoryRepository.save(directory);
  }

  /**
   * Create fields for a directory
   */
  async createFields(
    directoryId: string,
    fields: CreateFieldDto[],
    userId: string,
  ): Promise<DirectoryField[]> {
    const fieldEntities = fields.map((f, index) =>
      this.fieldRepository.create({
        directory_id: directoryId,
        code: f.code,
        name_ru: f.name_ru,
        name_en: f.name_en,
        description: f.description,
        field_type: f.field_type,
        reference_directory_id: f.reference_directory_id,
        options: f.options,
        validation: f.validation,
        default_value: f.default_value,
        is_required: f.is_required || false,
        is_unique: f.is_unique || false,
        allow_free_text: f.allow_free_text || false,
        is_searchable: f.is_searchable || false,
        show_in_table: f.show_in_table ?? true,
        show_in_card: f.show_in_card ?? true,
        sort_order: f.sort_order ?? index,
        created_by_id: userId,
        updated_by_id: userId,
      }),
    );

    return this.fieldRepository.save(fieldEntities);
  }

  /**
   * Update a field
   */
  async updateField(
    fieldId: string,
    updates: Partial<CreateFieldDto>,
    userId: string,
  ): Promise<DirectoryField> {
    const field = await this.fieldRepository.findOne({ where: { id: fieldId } });

    if (!field) {
      throw new NotFoundException(`Field with ID "${fieldId}" not found`);
    }

    if (field.is_system) {
      throw new BadRequestException('Cannot modify system field');
    }

    Object.assign(field, {
      ...updates,
      updated_by_id: userId,
    });

    return this.fieldRepository.save(field);
  }

  /**
   * Delete a field
   */
  async deleteField(fieldId: string): Promise<void> {
    const field = await this.fieldRepository.findOne({ where: { id: fieldId } });

    if (!field) {
      throw new NotFoundException(`Field with ID "${fieldId}" not found`);
    }

    if (field.is_system) {
      throw new BadRequestException('Cannot delete system field');
    }

    await this.fieldRepository.softDelete(fieldId);
  }

  /**
   * Get directory statistics
   */
  async getStats(directoryId: string): Promise<DirectoryStats> {
    const stats = await this.statsRepository.findOne({
      where: { directory_id: directoryId },
    });

    if (!stats) {
      throw new NotFoundException(`Stats for directory "${directoryId}" not found`);
    }

    return stats;
  }
}
