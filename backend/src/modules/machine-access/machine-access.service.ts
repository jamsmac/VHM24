import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { MachineAccess, MachineAccessRole } from './entities/machine-access.entity';
import { AccessTemplate } from './entities/access-template.entity';
import { AccessTemplateRow } from './entities/access-template-row.entity';
import { Machine } from '../machines/entities/machine.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateMachineAccessDto,
  UpdateMachineAccessDto,
  CreateAccessTemplateDto,
  UpdateAccessTemplateDto,
  CreateTemplateRowDto,
  ApplyTemplateDto,
  ApplyTemplateResponseDto,
  BulkAssignDto,
} from './dto';

@Injectable()
export class MachineAccessService {
  constructor(
    @InjectRepository(MachineAccess)
    private readonly machineAccessRepository: Repository<MachineAccess>,
    @InjectRepository(AccessTemplate)
    private readonly templateRepository: Repository<AccessTemplate>,
    @InjectRepository(AccessTemplateRow)
    private readonly templateRowRepository: Repository<AccessTemplateRow>,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== MACHINE ACCESS CRUD ====================

  /**
   * Get all access entries for a machine
   */
  async findByMachine(machineId: string): Promise<MachineAccess[]> {
    return this.machineAccessRepository.find({
      where: { machine_id: machineId },
      relations: ['user', 'created_by'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get all access entries for a user
   */
  async findByUser(userId: string): Promise<MachineAccess[]> {
    return this.machineAccessRepository.find({
      where: { user_id: userId },
      relations: ['machine', 'machine.location'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get single access entry
   */
  async findOne(id: string): Promise<MachineAccess> {
    const access = await this.machineAccessRepository.findOne({
      where: { id },
      relations: ['machine', 'user', 'created_by'],
    });
    if (!access) {
      throw new NotFoundException(`Machine access with ID ${id} not found`);
    }
    return access;
  }

  /**
   * Create new access entry (upsert by machine_id + user_id)
   */
  async create(dto: CreateMachineAccessDto, createdById: string): Promise<MachineAccess> {
    // Check if entry already exists
    const existing = await this.machineAccessRepository.findOne({
      where: { machine_id: dto.machine_id, user_id: dto.user_id },
    });

    if (existing) {
      // Update existing entry
      existing.role = dto.role;
      return this.machineAccessRepository.save(existing);
    }

    // Create new entry
    const access = this.machineAccessRepository.create({
      ...dto,
      created_by_id: createdById,
    });
    return this.machineAccessRepository.save(access);
  }

  /**
   * Update access entry role
   */
  async update(id: string, dto: UpdateMachineAccessDto): Promise<MachineAccess> {
    const access = await this.findOne(id);
    access.role = dto.role;
    return this.machineAccessRepository.save(access);
  }

  /**
   * Delete access entry
   */
  async remove(id: string): Promise<void> {
    const access = await this.findOne(id);
    await this.machineAccessRepository.remove(access);
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Assign user to all machines as owner (admin only)
   */
  async assignOwnerToAllMachines(userId: string, createdById: string): Promise<{ applied: number; updated: number }> {
    const machines = await this.machineRepository.find({ select: ['id'] });
    let applied = 0;
    let updated = 0;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const machine of machines) {
        const existing = await queryRunner.manager.findOne(MachineAccess, {
          where: { machine_id: machine.id, user_id: userId },
        });

        if (existing) {
          if (existing.role !== MachineAccessRole.OWNER) {
            existing.role = MachineAccessRole.OWNER;
            await queryRunner.manager.save(existing);
            updated++;
          }
        } else {
          const access = queryRunner.manager.create(MachineAccess, {
            machine_id: machine.id,
            user_id: userId,
            role: MachineAccessRole.OWNER,
            created_by_id: createdById,
          });
          await queryRunner.manager.save(access);
          applied++;
        }
      }

      await queryRunner.commitTransaction();
      return { applied, updated };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Bulk assign user to multiple machines
   */
  async bulkAssign(dto: BulkAssignDto, createdById: string): Promise<{ applied: number; updated: number }> {
    const machineIds = await this.resolveMachineIds(dto.machineNumbers, dto.machineIds);

    if (machineIds.length === 0) {
      throw new BadRequestException('No valid machines found');
    }

    let applied = 0;
    let updated = 0;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const machineId of machineIds) {
        const existing = await queryRunner.manager.findOne(MachineAccess, {
          where: { machine_id: machineId, user_id: dto.user_id },
        });

        if (existing) {
          if (existing.role !== dto.role) {
            existing.role = dto.role;
            await queryRunner.manager.save(existing);
            updated++;
          }
        } else {
          const access = queryRunner.manager.create(MachineAccess, {
            machine_id: machineId,
            user_id: dto.user_id,
            role: dto.role,
            created_by_id: createdById,
          });
          await queryRunner.manager.save(access);
          applied++;
        }
      }

      await queryRunner.commitTransaction();
      return { applied, updated };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== TEMPLATES ====================

  /**
   * Get all templates
   */
  async findAllTemplates(): Promise<AccessTemplate[]> {
    return this.templateRepository.find({
      relations: ['created_by', 'rows', 'rows.user'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get template by ID
   */
  async findTemplateById(id: string): Promise<AccessTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['created_by', 'rows', 'rows.user'],
    });
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  /**
   * Create new template
   */
  async createTemplate(dto: CreateAccessTemplateDto, createdById: string): Promise<AccessTemplate> {
    const template = this.templateRepository.create({
      ...dto,
      created_by_id: createdById,
    });
    return this.templateRepository.save(template);
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, dto: UpdateAccessTemplateDto): Promise<AccessTemplate> {
    const template = await this.findTemplateById(id);
    Object.assign(template, dto);
    return this.templateRepository.save(template);
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    const template = await this.findTemplateById(id);
    await this.templateRepository.remove(template);
  }

  /**
   * Add row to template
   */
  async addTemplateRow(templateId: string, dto: CreateTemplateRowDto): Promise<AccessTemplateRow> {
    await this.findTemplateById(templateId); // Verify template exists

    // Check if row already exists
    const existing = await this.templateRowRepository.findOne({
      where: { template_id: templateId, user_id: dto.user_id },
    });

    if (existing) {
      existing.role = dto.role;
      return this.templateRowRepository.save(existing);
    }

    const row = this.templateRowRepository.create({
      template_id: templateId,
      ...dto,
    });
    return this.templateRowRepository.save(row);
  }

  /**
   * Remove row from template
   */
  async removeTemplateRow(templateId: string, rowId: string): Promise<void> {
    const row = await this.templateRowRepository.findOne({
      where: { id: rowId, template_id: templateId },
    });
    if (!row) {
      throw new NotFoundException(`Template row not found`);
    }
    await this.templateRowRepository.remove(row);
  }

  /**
   * Apply template to machines
   */
  async applyTemplate(templateId: string, dto: ApplyTemplateDto, createdById: string): Promise<ApplyTemplateResponseDto> {
    const template = await this.findTemplateById(templateId);

    if (!template.rows || template.rows.length === 0) {
      throw new BadRequestException('Template has no rows to apply');
    }

    const machineIds = await this.resolveMachineIds(dto.machineNumbers, dto.machineIds);

    if (machineIds.length === 0) {
      throw new BadRequestException('No valid machines found');
    }

    let applied = 0;
    let updated = 0;
    const errors: string[] = [];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const machineId of machineIds) {
        for (const row of template.rows) {
          try {
            const existing = await queryRunner.manager.findOne(MachineAccess, {
              where: { machine_id: machineId, user_id: row.user_id },
            });

            if (existing) {
              if (existing.role !== row.role) {
                existing.role = row.role;
                await queryRunner.manager.save(existing);
                updated++;
              }
            } else {
              const access = queryRunner.manager.create(MachineAccess, {
                machine_id: machineId,
                user_id: row.user_id,
                role: row.role,
                created_by_id: createdById,
              });
              await queryRunner.manager.save(access);
              applied++;
            }
          } catch (error) {
            errors.push(`Machine ${machineId}, User ${row.user_id}: ${error.message}`);
          }
        }
      }

      await queryRunner.commitTransaction();
      return {
        applied_count: applied,
        updated_count: updated,
        machines_processed: machineIds.length,
        errors,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== HELPERS ====================

  /**
   * Resolve machine IDs from machine_numbers and/or machineIds
   */
  async resolveMachineIds(machineNumbers?: string[], machineIds?: string[]): Promise<string[]> {
    const ids: string[] = [];

    if (machineIds && machineIds.length > 0) {
      ids.push(...machineIds);
    }

    if (machineNumbers && machineNumbers.length > 0) {
      const machines = await this.machineRepository.find({
        where: { machine_number: In(machineNumbers) },
        select: ['id'],
      });
      ids.push(...machines.map((m) => m.id));
    }

    return [...new Set(ids)]; // Deduplicate
  }

  /**
   * Resolve user by various identifiers
   */
  async resolveUser(identifier: string): Promise<User | null> {
    // Try UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(identifier)) {
      const user = await this.userRepository.findOne({ where: { id: identifier } });
      if (user) return user;
    }

    // Try email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(identifier)) {
      const user = await this.userRepository.findOne({ where: { email: identifier } });
      if (user) return user;
    }

    // Try username
    const user = await this.userRepository.findOne({ where: { username: identifier } });
    if (user) return user;

    // Try telegram_username
    const telegramUser = await this.userRepository.findOne({ where: { telegram_username: identifier } });
    if (telegramUser) return telegramUser;

    return null;
  }

  /**
   * Resolve machine by machine_number or serial_number
   */
  async resolveMachine(machineNumber?: string, serialNumber?: string): Promise<Machine | null> {
    if (machineNumber) {
      const machine = await this.machineRepository.findOne({ where: { machine_number: machineNumber } });
      if (machine) return machine;
    }

    if (serialNumber) {
      const machine = await this.machineRepository.findOne({ where: { serial_number: serialNumber } });
      if (machine) return machine;
    }

    return null;
  }

  /**
   * Check if user has access to machine with specific role(s)
   */
  async hasAccess(userId: string, machineId: string, roles?: MachineAccessRole[]): Promise<boolean> {
    const access = await this.machineAccessRepository.findOne({
      where: { machine_id: machineId, user_id: userId },
    });

    if (!access) return false;
    if (!roles || roles.length === 0) return true;
    return roles.includes(access.role);
  }
}
