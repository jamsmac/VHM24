import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In, TreeRepository } from 'typeorm';
import { Organization, OrganizationType } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  /**
   * Create a new organization
   */
  async create(
    dto: CreateOrganizationDto,
    createdById?: string,
  ): Promise<Organization> {
    // Check if slug is unique
    const existingBySlug = await this.organizationRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existingBySlug) {
      throw new ConflictException(`Organization with slug "${dto.slug}" already exists`);
    }

    // Validate parent exists if specified
    if (dto.parent_id) {
      const parent = await this.organizationRepository.findOne({
        where: { id: dto.parent_id },
      });

      if (!parent) {
        throw new NotFoundException(`Parent organization with ID "${dto.parent_id}" not found`);
      }
    }

    const organization = this.organizationRepository.create({
      ...dto,
      created_by_id: createdById,
    });

    return this.organizationRepository.save(organization);
  }

  /**
   * Get all organizations with optional filters
   */
  async findAll(options?: {
    type?: OrganizationType;
    parentId?: string | null;
    isActive?: boolean;
    includeChildren?: boolean;
  }): Promise<Organization[]> {
    const query = this.organizationRepository.createQueryBuilder('org');

    if (options?.type) {
      query.andWhere('org.type = :type', { type: options.type });
    }

    if (options?.parentId !== undefined) {
      if (options.parentId === null) {
        query.andWhere('org.parent_id IS NULL');
      } else {
        query.andWhere('org.parent_id = :parentId', { parentId: options.parentId });
      }
    }

    if (options?.isActive !== undefined) {
      query.andWhere('org.is_active = :isActive', { isActive: options.isActive });
    }

    if (options?.includeChildren) {
      query.leftJoinAndSelect('org.children', 'children');
    }

    query.leftJoinAndSelect('org.parent', 'parent');
    query.orderBy('org.name', 'ASC');

    return query.getMany();
  }

  /**
   * Get organization by ID
   */
  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID "${id}" not found`);
    }

    return organization;
  }

  /**
   * Get organization by slug
   */
  async findBySlug(slug: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { slug },
      relations: ['parent', 'children'],
    });

    if (!organization) {
      throw new NotFoundException(`Organization with slug "${slug}" not found`);
    }

    return organization;
  }

  /**
   * Update organization
   */
  async update(
    id: string,
    dto: UpdateOrganizationDto,
    updatedById?: string,
  ): Promise<Organization> {
    const organization = await this.findOne(id);

    // Check slug uniqueness if being changed
    if (dto.slug && dto.slug !== organization.slug) {
      const existingBySlug = await this.organizationRepository.findOne({
        where: { slug: dto.slug },
      });

      if (existingBySlug) {
        throw new ConflictException(`Organization with slug "${dto.slug}" already exists`);
      }
    }

    // Validate parent if being changed
    if (dto.parent_id !== undefined && dto.parent_id !== organization.parent_id) {
      // Cannot set self as parent
      if (dto.parent_id === id) {
        throw new BadRequestException('Organization cannot be its own parent');
      }

      if (dto.parent_id) {
        const parent = await this.organizationRepository.findOne({
          where: { id: dto.parent_id },
        });

        if (!parent) {
          throw new NotFoundException(`Parent organization with ID "${dto.parent_id}" not found`);
        }

        // Check for circular reference
        const isDescendant = await this.isDescendant(dto.parent_id, id);
        if (isDescendant) {
          throw new BadRequestException('Cannot create circular parent-child relationship');
        }
      }
    }

    Object.assign(organization, dto, { updated_by_id: updatedById });
    return this.organizationRepository.save(organization);
  }

  /**
   * Delete organization (soft delete)
   */
  async remove(id: string): Promise<void> {
    const organization = await this.findOne(id);

    // Check if has children
    const childrenCount = await this.organizationRepository.count({
      where: { parent_id: id },
    });

    if (childrenCount > 0) {
      throw new BadRequestException(
        `Cannot delete organization with ${childrenCount} child organization(s). Remove children first.`,
      );
    }

    await this.organizationRepository.softRemove(organization);
  }

  /**
   * Get organization hierarchy (tree structure)
   */
  async getHierarchy(rootId?: string): Promise<Organization[]> {
    if (rootId) {
      const root = await this.findOne(rootId);
      return this.getDescendants(root);
    }

    // Get all root organizations (no parent)
    const roots = await this.organizationRepository.find({
      where: { parent_id: IsNull() },
      relations: ['children'],
      order: { name: 'ASC' },
    });

    // Recursively load children
    for (const root of roots) {
      await this.loadChildrenRecursive(root);
    }

    return roots;
  }

  /**
   * Get all descendants of an organization
   */
  async getDescendants(organization: Organization): Promise<Organization[]> {
    const descendants: Organization[] = [];
    const children = await this.organizationRepository.find({
      where: { parent_id: organization.id },
    });

    for (const child of children) {
      descendants.push(child);
      const childDescendants = await this.getDescendants(child);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  /**
   * Get all ancestor IDs of an organization
   */
  async getAncestorIds(organizationId: string): Promise<string[]> {
    const ancestors: string[] = [];
    let currentOrg = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    while (currentOrg?.parent_id) {
      ancestors.push(currentOrg.parent_id);
      currentOrg = await this.organizationRepository.findOne({
        where: { id: currentOrg.parent_id },
      });
    }

    return ancestors;
  }

  /**
   * Get all organizations a user can access (their org + descendants)
   */
  async getAccessibleOrganizationIds(userOrganizationId: string): Promise<string[]> {
    const organization = await this.findOne(userOrganizationId);
    const descendants = await this.getDescendants(organization);
    return [userOrganizationId, ...descendants.map((d) => d.id)];
  }

  /**
   * Check if an organization is a descendant of another
   */
  private async isDescendant(
    potentialDescendantId: string,
    ancestorId: string,
  ): Promise<boolean> {
    const ancestors = await this.getAncestorIds(potentialDescendantId);
    return ancestors.includes(ancestorId);
  }

  /**
   * Recursively load children for tree building
   */
  private async loadChildrenRecursive(organization: Organization): Promise<void> {
    const children = await this.organizationRepository.find({
      where: { parent_id: organization.id },
      order: { name: 'ASC' },
    });

    organization.children = children;

    for (const child of children) {
      await this.loadChildrenRecursive(child);
    }
  }

  /**
   * Generate unique slug from name
   */
  async generateSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (
      await this.organizationRepository.findOne({ where: { slug } })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Get statistics for an organization
   */
  async getStatistics(organizationId: string): Promise<{
    childrenCount: number;
    activeChildrenCount: number;
    totalDescendantsCount: number;
  }> {
    const organization = await this.findOne(organizationId);

    const childrenCount = await this.organizationRepository.count({
      where: { parent_id: organizationId },
    });

    const activeChildrenCount = await this.organizationRepository.count({
      where: { parent_id: organizationId, is_active: true },
    });

    const descendants = await this.getDescendants(organization);

    return {
      childrenCount,
      activeChildrenCount,
      totalDescendantsCount: descendants.length,
    };
  }
}
