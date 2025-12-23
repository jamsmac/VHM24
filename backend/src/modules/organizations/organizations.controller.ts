import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization, OrganizationType } from './entities/organization.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    type: Organization,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Organization with this slug already exists' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: { id: string },
  ): Promise<Organization> {
    return this.organizationsService.create(dto, user.id);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all organizations' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: OrganizationType,
    description: 'Filter by organization type',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    description: 'Filter by parent organization ID (use "null" for root organizations)',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'includeChildren',
    required: false,
    type: Boolean,
    description: 'Include child organizations in response',
  })
  @ApiResponse({
    status: 200,
    description: 'List of organizations',
    type: [Organization],
  })
  async findAll(
    @Query('type') type?: OrganizationType,
    @Query('parentId') parentId?: string,
    @Query('isActive') isActive?: string,
    @Query('includeChildren') includeChildren?: string,
  ): Promise<Organization[]> {
    return this.organizationsService.findAll({
      type,
      parentId: parentId === 'null' ? null : parentId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      includeChildren: includeChildren === 'true',
    });
  }

  @Get('hierarchy')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get organization hierarchy (tree structure)' })
  @ApiQuery({
    name: 'rootId',
    required: false,
    description: 'Root organization ID to start from',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization hierarchy tree',
    type: [Organization],
  })
  async getHierarchy(@Query('rootId') rootId?: string): Promise<Organization[]> {
    return this.organizationsService.getHierarchy(rootId);
  }

  @Get('generate-slug')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Generate a unique slug from a name' })
  @ApiQuery({
    name: 'name',
    required: true,
    description: 'Organization name to generate slug from',
  })
  @ApiResponse({
    status: 200,
    description: 'Generated slug',
    schema: { type: 'object', properties: { slug: { type: 'string' } } },
  })
  async generateSlug(@Query('name') name: string): Promise<{ slug: string }> {
    const slug = await this.organizationsService.generateSlug(name);
    return { slug };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
    type: Organization,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Organization> {
    return this.organizationsService.findOne(id);
  }

  @Get('slug/:slug')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get organization by slug' })
  @ApiParam({ name: 'slug', description: 'Organization slug' })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
    type: Organization,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findBySlug(@Param('slug') slug: string): Promise<Organization> {
    return this.organizationsService.findBySlug(slug);
  }

  @Get(':id/statistics')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get organization statistics' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({
    status: 200,
    description: 'Organization statistics',
    schema: {
      type: 'object',
      properties: {
        childrenCount: { type: 'number' },
        activeChildrenCount: { type: 'number' },
        totalDescendantsCount: { type: 'number' },
      },
    },
  })
  async getStatistics(@Param('id', ParseUUIDPipe) id: string): Promise<{
    childrenCount: number;
    activeChildrenCount: number;
    totalDescendantsCount: number;
  }> {
    return this.organizationsService.getStatistics(id);
  }

  @Get(':id/accessible')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all accessible organization IDs for a user' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of accessible organization IDs',
    schema: { type: 'array', items: { type: 'string' } },
  })
  async getAccessibleOrganizationIds(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<string[]> {
    return this.organizationsService.getAccessibleOrganizationIds(id);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    type: Organization,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'Organization with this slug already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: { id: string },
  ): Promise<Organization> {
    return this.organizationsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization (soft delete)' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 204, description: 'Organization deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete organization with children' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.organizationsService.remove(id);
  }
}
