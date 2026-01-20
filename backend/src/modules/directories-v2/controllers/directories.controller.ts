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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { DirectoryService, DirectoryFilters } from '../services/directory.service';
import { CreateDirectoryDto, CreateFieldDto } from '../dto/create-directory.dto';
import { UpdateDirectoryDto } from '../dto/update-directory.dto';
import { DirectoryType, DirectoryScope } from '../entities/directory.entity';

@ApiTags('Directories V2')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v2/directories')
export class DirectoriesController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all directories' })
  @ApiQuery({ name: 'type', enum: DirectoryType, required: false })
  @ApiQuery({ name: 'scope', enum: DirectoryScope, required: false })
  @ApiQuery({ name: 'organization_id', type: 'string', required: false })
  @ApiQuery({ name: 'is_active', type: 'boolean', required: false })
  @ApiResponse({ status: 200, description: 'List of directories' })
  async findAll(
    @Query('type') type?: DirectoryType,
    @Query('scope') scope?: DirectoryScope,
    @Query('organization_id') organization_id?: string,
    @Query('is_active') is_active?: string,
  ) {
    const filters: DirectoryFilters = {
      type,
      scope,
      organization_id,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
    };
    const directories = await this.directoryService.findAll(filters);
    return { data: directories };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get directory by ID' })
  @ApiResponse({ status: 200, description: 'Directory found' })
  @ApiResponse({ status: 404, description: 'Directory not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const directory = await this.directoryService.findOne(id);
    return { data: directory };
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get directory by slug' })
  @ApiResponse({ status: 200, description: 'Directory found' })
  @ApiResponse({ status: 404, description: 'Directory not found' })
  async findBySlug(@Param('slug') slug: string) {
    const directory = await this.directoryService.findBySlug(slug);
    return { data: directory };
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get directory statistics' })
  @ApiResponse({ status: 200, description: 'Directory stats' })
  async getStats(@Param('id', ParseUUIDPipe) id: string) {
    const stats = await this.directoryService.getStats(id);
    return { data: stats };
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create a new directory' })
  @ApiResponse({ status: 201, description: 'Directory created' })
  @ApiResponse({ status: 409, description: 'Directory with slug already exists' })
  async create(
    @Body() dto: CreateDirectoryDto,
    @CurrentUser() user: User,
  ) {
    const directory = await this.directoryService.create(dto, user.id);
    return { data: directory };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update a directory' })
  @ApiResponse({ status: 200, description: 'Directory updated' })
  @ApiResponse({ status: 404, description: 'Directory not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDirectoryDto,
    @CurrentUser() user: User,
  ) {
    const directory = await this.directoryService.update(id, dto, user.id);
    return { data: directory };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a directory' })
  @ApiResponse({ status: 204, description: 'Directory archived' })
  @ApiResponse({ status: 400, description: 'Cannot delete system directory' })
  @ApiResponse({ status: 404, description: 'Directory not found' })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.directoryService.archive(id, user.id);
  }

  @Post(':id/restore')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Restore an archived directory' })
  @ApiResponse({ status: 200, description: 'Directory restored' })
  @ApiResponse({ status: 400, description: 'Directory is not archived' })
  @ApiResponse({ status: 404, description: 'Directory not found' })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const directory = await this.directoryService.restore(id, user.id);
    return { data: directory };
  }

  // Field management endpoints

  @Post(':id/fields')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Add fields to a directory' })
  @ApiResponse({ status: 201, description: 'Fields created' })
  async createFields(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() fields: CreateFieldDto[],
    @CurrentUser() user: User,
  ) {
    // Verify directory exists
    await this.directoryService.findOne(id);
    const createdFields = await this.directoryService.createFields(id, fields, user.id);
    return { data: createdFields };
  }

  @Patch(':id/fields/:fieldId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update a field' })
  @ApiResponse({ status: 200, description: 'Field updated' })
  @ApiResponse({ status: 400, description: 'Cannot modify system field' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async updateField(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Body() updates: Partial<CreateFieldDto>,
    @CurrentUser() user: User,
  ) {
    const field = await this.directoryService.updateField(fieldId, updates, user.id);
    return { data: field };
  }

  @Delete(':id/fields/:fieldId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a field' })
  @ApiResponse({ status: 204, description: 'Field deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete system field' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async deleteField(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
  ) {
    await this.directoryService.deleteField(fieldId);
  }
}
