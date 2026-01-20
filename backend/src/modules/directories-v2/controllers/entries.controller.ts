import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { EntryService } from '../services/entry.service';
import { SearchService } from '../services/search.service';
import { AuditService, AuditContext } from '../services/audit.service';
import { CreateEntryDto } from '../dto/create-entry.dto';
import { UpdateEntryDto } from '../dto/update-entry.dto';
import { SearchQueryDto } from '../dto/search-query.dto';
import { EntryStatus, EntryOrigin } from '../entities/directory-entry.entity';

@ApiTags('Directory Entries V2')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v2/directories/:directoryId/entries')
export class EntriesController {
  constructor(
    private readonly entryService: EntryService,
    private readonly searchService: SearchService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper to build audit context from request
   */
  private getAuditContext(user: User, req: Request): AuditContext {
    return {
      userId: user.id,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.get('user-agent'),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get entries list with filters' })
  @ApiParam({ name: 'directoryId', description: 'Directory ID' })
  @ApiResponse({ status: 200, description: 'List of entries' })
  async findAll(
    @Param('directoryId', ParseUUIDPipe) directoryId: string,
    @Query() query: SearchQueryDto,
  ) {
    const filters = {
      status: query.status,
      origin: query.origin,
      parent_id: query.roots_only ? null : query.parent_id,
      tags: query.tags,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
    };

    const result = await this.entryService.findAll(directoryId, filters);
    return {
      data: result.data,
      meta: {
        total: result.total,
        page: query.page || 1,
        limit: query.limit || 50,
        total_pages: Math.ceil(result.total / (query.limit || 50)),
      },
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search entries with full-text and fuzzy search' })
  @ApiParam({ name: 'directoryId', description: 'Directory ID' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Param('directoryId', ParseUUIDPipe) directoryId: string,
    @Query() query: SearchQueryDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.searchService.search(directoryId, query, user.id);
    return {
      data: result.results,
      recent: result.recent,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: result.total_pages,
      },
    };
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get hierarchical tree of entries' })
  @ApiParam({ name: 'directoryId', description: 'Directory ID' })
  @ApiResponse({ status: 200, description: 'Hierarchical tree' })
  async getTree(
    @Param('directoryId', ParseUUIDPipe) directoryId: string,
    @Query('parent_id') parentId?: string,
    @Query('max_depth') maxDepth?: string,
  ) {
    const tree = await this.searchService.getTree(
      directoryId,
      parentId,
      maxDepth ? parseInt(maxDepth, 10) : 10,
    );
    return { data: tree };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get entry by ID' })
  @ApiResponse({ status: 200, description: 'Entry found' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const entry = await this.entryService.findOne(id);
    return { data: entry };
  }

  @Get(':id/ancestors')
  @ApiOperation({ summary: 'Get entry ancestors (breadcrumb)' })
  @ApiResponse({ status: 200, description: 'List of ancestor entries' })
  async getAncestors(@Param('id', ParseUUIDPipe) id: string) {
    const ancestors = await this.searchService.getAncestors(id);
    return { data: ancestors };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get entry audit history' })
  @ApiResponse({ status: 200, description: 'Audit log entries' })
  async getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.auditService.getEntryHistory(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
    return {
      data: result.data,
      meta: {
        total: result.total,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50,
      },
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new entry' })
  @ApiResponse({ status: 201, description: 'Entry created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Entry with code already exists' })
  async create(
    @Param('directoryId', ParseUUIDPipe) directoryId: string,
    @Body() dto: CreateEntryDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    const entry = await this.entryService.create(directoryId, dto, context);

    // Record selection for recent
    await this.searchService.recordSelection(directoryId, entry.id, user.id);

    return { data: entry };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an entry' })
  @ApiResponse({ status: 200, description: 'Entry updated' })
  @ApiResponse({ status: 400, description: 'Cannot edit OFFICIAL entry' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEntryDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    const entry = await this.entryService.update(id, dto, context);
    return { data: entry };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive an entry' })
  @ApiResponse({ status: 204, description: 'Entry archived' })
  @ApiResponse({ status: 400, description: 'Cannot archive OFFICIAL entry' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    await this.entryService.archive(id, context);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore an archived entry' })
  @ApiResponse({ status: 200, description: 'Entry restored' })
  @ApiResponse({ status: 400, description: 'Entry is not archived' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    const entry = await this.entryService.restore(id, context);
    return { data: entry };
  }

  @Post(':id/approve')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Approve a pending entry' })
  @ApiResponse({ status: 200, description: 'Entry approved' })
  @ApiResponse({ status: 400, description: 'Entry is not pending approval' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    const entry = await this.entryService.approve(id, context);
    return { data: entry };
  }

  @Post(':id/reject')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reject a pending entry' })
  @ApiResponse({ status: 200, description: 'Entry rejected' })
  @ApiResponse({ status: 400, description: 'Entry is not pending approval' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    const entry = await this.entryService.reject(id, reason, context);
    return { data: entry };
  }

  @Post(':id/deprecate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Deprecate an entry with optional replacement' })
  @ApiResponse({ status: 200, description: 'Entry deprecated' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async deprecate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('replacement_entry_id') replacementEntryId: string | null,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    const entry = await this.entryService.deprecate(id, replacementEntryId, context);
    return { data: entry };
  }

  // Bulk operations

  @Post('bulk-import')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Bulk import entries' })
  @ApiResponse({ status: 200, description: 'Import results' })
  async bulkImport(
    @Param('directoryId', ParseUUIDPipe) directoryId: string,
    @Body()
    body: {
      entries: CreateEntryDto[];
      mode: 'insert' | 'upsert' | 'sync';
      unique_key_field?: string;
      is_atomic?: boolean;
    },
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    const result = await this.entryService.bulkImport(
      directoryId,
      body.entries,
      context,
      {
        mode: body.mode,
        uniqueKeyField: body.unique_key_field,
        isAtomic: body.is_atomic,
      },
    );
    return { data: result };
  }
}
