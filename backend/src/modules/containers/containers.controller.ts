import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ContainersService, LowLevelContainer } from './containers.service';
import { CreateContainerDto } from './dto/create-container.dto';
import { UpdateContainerDto } from './dto/update-container.dto';
import { RefillContainerDto } from './dto/refill-container.dto';
import { Container, ContainerStatus } from './entities/container.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

/**
 * Containers Controller
 *
 * REST API endpoints for managing container (hopper/bunker) operations.
 * Containers store ingredients in vending machines.
 *
 * Part of VH24 Integration - Phase 4.1.1
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.1
 */
@ApiTags('Containers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('containers')
export class ContainersController {
  constructor(private readonly containersService: ContainersService) {}

  // ========== CRUD Endpoints ==========

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'Create a new container',
    description: 'Creates a new container (hopper/bunker) for a vending machine',
  })
  @ApiResponse({
    status: 201,
    description: 'Container successfully created',
    type: Container,
  })
  @ApiResponse({
    status: 409,
    description: 'Container with this slot_number already exists for the machine',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  create(@Body() createContainerDto: CreateContainerDto): Promise<Container> {
    return this.containersService.create(createContainerDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all containers with pagination',
    description: 'Returns a paginated list of all containers with optional filters',
  })
  @ApiQuery({
    name: 'machine_id',
    required: false,
    type: String,
    description: 'Filter by machine UUID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ContainerStatus,
    description: 'Filter by container status',
  })
  @ApiQuery({
    name: 'nomenclature_id',
    required: false,
    type: String,
    description: 'Filter by nomenclature (ingredient) UUID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 50, max: 200)',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of containers',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/Container' } },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 50 },
        totalPages: { type: 'number', example: 2 },
      },
    },
  })
  findAll(
    @Query('machine_id') machineId?: string,
    @Query('status') status?: ContainerStatus,
    @Query('nomenclature_id') nomenclatureId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: Container[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.containersService.findAll(
      {
        machine_id: machineId,
        status,
        nomenclature_id: nomenclatureId,
      },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('low-levels')
  @ApiOperation({
    summary: 'Get all containers with low levels',
    description: 'Returns all containers below their minimum level grouped by machine',
  })
  @ApiResponse({
    status: 200,
    description: 'List of low level containers grouped by machine',
    schema: {
      type: 'array',
      items: {
        properties: {
          machine_id: { type: 'string', format: 'uuid' },
          machine_name: { type: 'string' },
          machine_number: { type: 'string' },
          low_containers: {
            type: 'array',
            items: {
              properties: {
                container: { $ref: '#/components/schemas/Container' },
                percentage: { type: 'number', example: 15.5 },
                deficit: { type: 'number', example: 100 },
              },
            },
          },
        },
      },
    },
  })
  checkAllLowLevels(): Promise<{
    machine_id: string;
    machine_name: string;
    machine_number: string;
    low_containers: LowLevelContainer[];
  }[]> {
    return this.containersService.checkAllLowLevels();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get container by ID',
    description: 'Returns a single container by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Container UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Container details',
    type: Container,
  })
  @ApiResponse({
    status: 404,
    description: 'Container not found',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Container> {
    return this.containersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'Update a container',
    description: 'Updates an existing container',
  })
  @ApiParam({
    name: 'id',
    description: 'Container UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Container successfully updated',
    type: Container,
  })
  @ApiResponse({
    status: 404,
    description: 'Container not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Container with this slot_number already exists',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContainerDto: UpdateContainerDto,
  ): Promise<Container> {
    return this.containersService.update(id, updateContainerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Delete a container (soft delete)',
    description: 'Soft deletes a container',
  })
  @ApiParam({
    name: 'id',
    description: 'Container UUID',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Container successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Container not found',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.containersService.remove(id);
  }

  // ========== Machine-specific Endpoints ==========

  @Get('machine/:machineId')
  @ApiOperation({
    summary: 'Get all containers for a machine',
    description: 'Returns all containers belonging to a specific machine',
  })
  @ApiParam({
    name: 'machineId',
    description: 'Machine UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of containers for the machine',
    type: [Container],
  })
  findByMachine(@Param('machineId', ParseUUIDPipe) machineId: string): Promise<Container[]> {
    return this.containersService.findByMachine(machineId);
  }

  @Get('machine/:machineId/low-levels')
  @ApiOperation({
    summary: 'Check for low level containers in a machine',
    description: 'Returns containers below minimum level for a specific machine',
  })
  @ApiParam({
    name: 'machineId',
    description: 'Machine UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of low level containers',
    schema: {
      type: 'array',
      items: {
        properties: {
          container: { $ref: '#/components/schemas/Container' },
          percentage: { type: 'number', example: 15.5 },
          deficit: { type: 'number', example: 100 },
        },
      },
    },
  })
  checkLowLevels(
    @Param('machineId', ParseUUIDPipe) machineId: string,
  ): Promise<LowLevelContainer[]> {
    return this.containersService.checkLowLevels(machineId);
  }

  @Get('machine/:machineId/stats')
  @ApiOperation({
    summary: 'Get container statistics for a machine',
    description: 'Returns aggregated statistics for all containers in a machine',
  })
  @ApiParam({
    name: 'machineId',
    description: 'Machine UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Container statistics',
    schema: {
      properties: {
        total_containers: { type: 'number', example: 10 },
        active_containers: { type: 'number', example: 8 },
        empty_containers: { type: 'number', example: 1 },
        maintenance_containers: { type: 'number', example: 1 },
        low_level_count: { type: 'number', example: 3 },
        average_fill_percentage: { type: 'number', example: 65.5 },
      },
    },
  })
  getStatsByMachine(@Param('machineId', ParseUUIDPipe) machineId: string): Promise<{
    total_containers: number;
    active_containers: number;
    empty_containers: number;
    maintenance_containers: number;
    low_level_count: number;
    average_fill_percentage: number;
  }> {
    return this.containersService.getStatsByMachine(machineId);
  }

  // ========== Refill Endpoint ==========

  @Post(':id/refill')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'Refill a container',
    description: 'Adds quantity to a container and updates the last refill date',
  })
  @ApiParam({
    name: 'id',
    description: 'Container UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Container successfully refilled',
    type: Container,
  })
  @ApiResponse({
    status: 400,
    description: 'Refill would exceed container capacity',
  })
  @ApiResponse({
    status: 404,
    description: 'Container not found',
  })
  refill(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() refillContainerDto: RefillContainerDto,
  ): Promise<Container> {
    return this.containersService.refill(id, refillContainerDto);
  }

  // ========== Nomenclature-specific Endpoint ==========

  @Get('nomenclature/:nomenclatureId')
  @ApiOperation({
    summary: 'Get containers by nomenclature',
    description: 'Returns all containers containing a specific ingredient across all machines',
  })
  @ApiParam({
    name: 'nomenclatureId',
    description: 'Nomenclature (ingredient) UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of containers with this ingredient',
    type: [Container],
  })
  findByNomenclature(
    @Param('nomenclatureId', ParseUUIDPipe) nomenclatureId: string,
  ): Promise<Container[]> {
    return this.containersService.findByNomenclature(nomenclatureId);
  }
}
