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
import {
  IngredientBatchesService,
  StockInfo,
} from './ingredient-batches.service';
import { CreateIngredientBatchDto } from './dto/create-batch.dto';
import { UpdateIngredientBatchDto } from './dto/update-batch.dto';
import { DeductBatchDto, DeductBatchResponseDto } from './dto/deduct-batch.dto';
import { IngredientBatch, IngredientBatchStatus } from './entities/ingredient-batch.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

/**
 * Ingredient Batches Controller
 *
 * REST API endpoints for managing ingredient batches with FIFO tracking.
 *
 * Part of VH24 Integration - Phase 4.1.3
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.3
 */
@ApiTags('Ingredient Batches')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ingredient-batches')
export class IngredientBatchesController {
  constructor(private readonly batchesService: IngredientBatchesService) {}

  // ========== CRUD Endpoints ==========

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Create a new ingredient batch',
    description: 'Creates a new ingredient batch for tracking inventory',
  })
  @ApiResponse({
    status: 201,
    description: 'Batch successfully created',
    type: IngredientBatch,
  })
  @ApiResponse({
    status: 409,
    description: 'Batch with this batch_number already exists for the nomenclature',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  create(@Body() dto: CreateIngredientBatchDto): Promise<IngredientBatch> {
    return this.batchesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all ingredient batches with pagination',
    description: 'Returns a paginated list of all batches with optional filters',
  })
  @ApiQuery({
    name: 'nomenclature_id',
    required: false,
    type: String,
    description: 'Filter by nomenclature UUID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: IngredientBatchStatus,
    description: 'Filter by batch status',
  })
  @ApiQuery({
    name: 'supplier_id',
    required: false,
    type: String,
    description: 'Filter by supplier (counterparty) UUID',
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
    description: 'Paginated list of batches',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/IngredientBatch' } },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 50 },
        totalPages: { type: 'number', example: 2 },
      },
    },
  })
  findAll(
    @Query('nomenclature_id') nomenclatureId?: string,
    @Query('status') status?: IngredientBatchStatus,
    @Query('supplier_id') supplierId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: IngredientBatch[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.batchesService.findAll(
      {
        nomenclature_id: nomenclatureId,
        status,
        supplier_id: supplierId,
      },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('expiring')
  @ApiOperation({
    summary: 'Get batches expiring soon',
    description: 'Returns all in-stock batches with expiry date within specified days',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look ahead (default: 7)',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: 'List of expiring batches',
    type: [IngredientBatch],
  })
  getExpiringBatches(@Query('days') days?: string): Promise<IngredientBatch[]> {
    return this.batchesService.getExpiringBatches(days ? parseInt(days, 10) : 7);
  }

  @Get('stock-summary')
  @ApiOperation({
    summary: 'Get stock summary for all nomenclatures',
    description: 'Returns aggregated stock information for each nomenclature with active batches',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock summary by nomenclature',
    schema: {
      type: 'array',
      items: {
        properties: {
          nomenclature_id: { type: 'string', format: 'uuid' },
          total_stock: { type: 'number', example: 5000 },
          active_batches_count: { type: 'number', example: 3 },
          oldest_expiry_date: { type: 'string', format: 'date', nullable: true },
          unit: { type: 'string', example: 'kg' },
        },
      },
    },
  })
  getStockSummary(): Promise<StockInfo[]> {
    return this.batchesService.getStockSummary();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get batch by ID',
    description: 'Returns a single batch by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Batch UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Batch details',
    type: IngredientBatch,
  })
  @ApiResponse({
    status: 404,
    description: 'Batch not found',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<IngredientBatch> {
    return this.batchesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update a batch',
    description: 'Updates an existing ingredient batch',
  })
  @ApiParam({
    name: 'id',
    description: 'Batch UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Batch successfully updated',
    type: IngredientBatch,
  })
  @ApiResponse({
    status: 404,
    description: 'Batch not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Batch with this batch_number already exists',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIngredientBatchDto,
  ): Promise<IngredientBatch> {
    return this.batchesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Delete a batch (soft delete)',
    description: 'Soft deletes an ingredient batch',
  })
  @ApiParam({
    name: 'id',
    description: 'Batch UUID',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Batch successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Batch not found',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.batchesService.remove(id);
  }

  // ========== Nomenclature-specific Endpoints ==========

  @Get('nomenclature/:id')
  @ApiOperation({
    summary: 'Get all batches for a nomenclature',
    description: 'Returns all batches belonging to a specific nomenclature (FIFO order)',
  })
  @ApiParam({
    name: 'id',
    description: 'Nomenclature UUID',
    type: String,
  })
  @ApiQuery({
    name: 'include_all',
    required: false,
    type: Boolean,
    description: 'Include depleted/expired/returned batches (default: false)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of batches for the nomenclature',
    type: [IngredientBatch],
  })
  findByNomenclature(
    @Param('id', ParseUUIDPipe) nomenclatureId: string,
    @Query('include_all') includeAll?: string,
  ): Promise<IngredientBatch[]> {
    return this.batchesService.findByNomenclature(
      nomenclatureId,
      includeAll === 'true',
    );
  }

  @Get('nomenclature/:id/stock')
  @ApiOperation({
    summary: 'Get stock for a nomenclature',
    description: 'Returns the total stock information for a specific nomenclature',
  })
  @ApiParam({
    name: 'id',
    description: 'Nomenclature UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Stock information',
    schema: {
      properties: {
        nomenclature_id: { type: 'string', format: 'uuid' },
        total_stock: { type: 'number', example: 5000 },
        active_batches_count: { type: 'number', example: 3 },
        oldest_expiry_date: { type: 'string', format: 'date', nullable: true },
        unit: { type: 'string', example: 'kg' },
      },
    },
  })
  getStock(@Param('id', ParseUUIDPipe) nomenclatureId: string): Promise<StockInfo> {
    return this.batchesService.getStock(nomenclatureId);
  }

  // ========== FIFO Deduction Endpoint ==========

  @Post('deduct')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Deduct from batches using FIFO',
    description:
      'Deducts quantity from batches in First-In-First-Out order. ' +
      'The oldest batches (by received_date) are depleted first.',
  })
  @ApiResponse({
    status: 200,
    description: 'Deduction successful',
    type: DeductBatchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient stock for the requested quantity',
  })
  deductWithFIFO(@Body() dto: DeductBatchDto): Promise<DeductBatchResponseDto> {
    return this.batchesService.deductWithFIFO(dto);
  }

  // ========== Expiry Management Endpoint ==========

  @Post('check-expired')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Check and mark expired batches',
    description:
      'Scans all in-stock batches and marks those with expiry_date before today as EXPIRED',
  })
  @ApiResponse({
    status: 200,
    description: 'List of batch IDs that were marked as expired',
    schema: {
      type: 'array',
      items: { type: 'string', format: 'uuid' },
    },
  })
  checkExpired(): Promise<string[]> {
    return this.batchesService.checkExpired();
  }
}
