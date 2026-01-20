import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DirectoryEntry, EntryStatus } from '../entities/directory-entry.entity';
import { SearchQueryDto } from '../dto/search-query.dto';

export interface SearchResult {
  recent?: DirectoryEntry[];
  results: DirectoryEntry[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(DirectoryEntry)
    private readonly entryRepository: Repository<DirectoryEntry>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Search directory entries using full-text and fuzzy search
   */
  async search(
    directoryId: string,
    query: SearchQueryDto,
    userId?: string,
  ): Promise<SearchResult> {
    const limit = query.limit || 50;
    const page = query.page || 1;
    const offset = (page - 1) * limit;
    const status = query.status || EntryStatus.ACTIVE;

    let results: DirectoryEntry[] = [];
    let total = 0;

    if (query.q && query.q.length >= 2) {
      // Use the optimized search function from the database
      const searchResults = await this.dataSource.query(
        `SELECT * FROM search_directory_entries($1, $2, $3, $4)`,
        [directoryId, query.q, status, limit + offset],
      );

      // Get full entries from IDs
      const ids = searchResults.map((r: any) => r.id);
      total = searchResults.length;

      if (ids.length > 0) {
        const entries = await this.entryRepository
          .createQueryBuilder('e')
          .whereInIds(ids)
          .getMany();

        // Preserve order from search results and apply pagination
        const entryMap = new Map(entries.map((e) => [e.id, e]));
        results = ids
          .slice(offset, offset + limit)
          .map((id: string) => entryMap.get(id))
          .filter((e): e is DirectoryEntry => e !== undefined);
      }
    } else {
      // No search query - return paginated list with filters
      const qb = this.buildFilteredQuery(directoryId, query);

      [results, total] = await qb
        .skip(offset)
        .take(limit)
        .getManyAndCount();
    }

    // Include recent selections if requested
    let recent: DirectoryEntry[] | undefined;
    if (query.include_recent && userId && !query.q) {
      recent = await this.getRecentSelections(directoryId, userId, 5);
    }

    return {
      recent,
      results,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  /**
   * Build filtered query without full-text search
   */
  private buildFilteredQuery(directoryId: string, query: SearchQueryDto) {
    const qb = this.entryRepository
      .createQueryBuilder('e')
      .where('e.directory_id = :directoryId', { directoryId })
      .andWhere('e.deleted_at IS NULL');

    // Status filter
    if (query.status) {
      qb.andWhere('e.status = :status', { status: query.status });
    } else {
      qb.andWhere('e.status = :status', { status: EntryStatus.ACTIVE });
    }

    // Origin filter
    if (query.origin) {
      qb.andWhere('e.origin = :origin', { origin: query.origin });
    }

    // Parent filter
    if (query.parent_id) {
      qb.andWhere('e.parent_id = :parentId', { parentId: query.parent_id });
    } else if (query.roots_only) {
      qb.andWhere('e.parent_id IS NULL');
    }

    // Tags filter
    if (query.tags?.length) {
      qb.andWhere('e.tags && :tags', { tags: query.tags });
    }

    // Sorting
    const sort = query.sort || 'name_ru';
    const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
    const sortField = sort.replace(/^-/, '');

    // Validate sort field to prevent SQL injection
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

    return qb;
  }

  /**
   * Get recent selections for a user
   */
  async getRecentSelections(
    directoryId: string,
    userId: string,
    limit: number = 5,
  ): Promise<DirectoryEntry[]> {
    // This would require a user_recent_selections table
    // For now, return an empty array - can be implemented later
    return [];
  }

  /**
   * Record a user's selection for "recent" tracking
   */
  async recordSelection(
    directoryId: string,
    entryId: string,
    userId: string,
  ): Promise<void> {
    // This would insert/update into user_recent_selections table
    // Implementation depends on whether we add this table
  }

  /**
   * Search entries by code (exact or prefix match)
   */
  async findByCode(
    directoryId: string,
    code: string,
    exactMatch: boolean = true,
  ): Promise<DirectoryEntry | DirectoryEntry[] | null> {
    if (exactMatch) {
      return this.entryRepository.findOne({
        where: {
          directory_id: directoryId,
          code,
        },
      });
    }

    return this.entryRepository
      .createQueryBuilder('e')
      .where('e.directory_id = :directoryId', { directoryId })
      .andWhere('e.code ILIKE :code', { code: `${code}%` })
      .andWhere('e.deleted_at IS NULL')
      .andWhere('e.status = :status', { status: EntryStatus.ACTIVE })
      .orderBy('e.code', 'ASC')
      .limit(20)
      .getMany();
  }

  /**
   * Get hierarchical tree for a directory
   */
  async getTree(
    directoryId: string,
    parentId?: string,
    maxDepth: number = 10,
  ): Promise<DirectoryEntry[]> {
    const qb = this.entryRepository
      .createQueryBuilder('e')
      .where('e.directory_id = :directoryId', { directoryId })
      .andWhere('e.deleted_at IS NULL')
      .andWhere('e.status = :status', { status: EntryStatus.ACTIVE });

    if (parentId) {
      qb.andWhere('e.parent_id = :parentId', { parentId });
    } else {
      qb.andWhere('e.parent_id IS NULL');
    }

    qb.orderBy('e.sort_order', 'ASC').addOrderBy('e.name_ru', 'ASC');

    const entries = await qb.getMany();

    // Recursively load children if needed
    if (maxDepth > 1) {
      for (const entry of entries) {
        const children = await this.getTree(directoryId, entry.id, maxDepth - 1);
        (entry as any).children = children;
      }
    }

    return entries;
  }

  /**
   * Get all ancestors of an entry (for breadcrumb)
   */
  async getAncestors(entryId: string): Promise<DirectoryEntry[]> {
    const ancestors: DirectoryEntry[] = [];
    let currentId: string | null = entryId;

    while (currentId) {
      const entry = await this.entryRepository.findOne({
        where: { id: currentId },
        select: ['id', 'parent_id', 'code', 'name_ru', 'name_en'],
      });

      if (!entry || !entry.parent_id) break;

      const parent = await this.entryRepository.findOne({
        where: { id: entry.parent_id },
        select: ['id', 'parent_id', 'code', 'name_ru', 'name_en'],
      });

      if (parent) {
        ancestors.unshift(parent);
        currentId = parent.parent_id;
      } else {
        break;
      }
    }

    return ancestors;
  }
}
