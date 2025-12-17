import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { InventoryThresholdService } from '../services/inventory-threshold.service';
import {
  CreateThresholdDto,
  UpdateThresholdDto,
  GetThresholdsFilterDto,
} from '../dto/inventory-threshold.dto';
import {
  InventoryDifferenceThreshold,
  ThresholdType,
  SeverityLevel,
} from '../entities/inventory-difference-threshold.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';

/**
 * Inventory Thresholds Controller
 *
 * CRUD API для управления порогами расхождений инвентаря
 * REQ-STK-CALC-04, REQ-ANL-05: Настройка порогов для расхождений
 */
@ApiTags('inventory/thresholds')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory/thresholds')
export class InventoryThresholdsController {
  constructor(private readonly thresholdService: InventoryThresholdService) {}

  /**
   * Создать новый порог расхождений
   */
  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create new inventory difference threshold' })
  @ApiResponse({
    status: 201,
    description: 'Threshold created successfully',
    type: InventoryDifferenceThreshold,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(
    @Req() req: ExpressRequest & { user?: { id: string } },
    @Body() createDto: CreateThresholdDto,
  ): Promise<InventoryDifferenceThreshold> {
    return this.thresholdService.create(createDto, req.user?.id);
  }

  /**
   * Получить все пороги с фильтрацией
   */
  @Get()
  @ApiOperation({ summary: 'Get all thresholds with optional filters' })
  @ApiQuery({ name: 'threshold_type', enum: ThresholdType, required: false })
  @ApiQuery({ name: 'reference_id', type: String, required: false })
  @ApiQuery({ name: 'severity_level', enum: SeverityLevel, required: false })
  @ApiQuery({ name: 'is_active', type: Boolean, required: false })
  @ApiResponse({
    status: 200,
    description: 'List of thresholds',
    type: [InventoryDifferenceThreshold],
  })
  async findAll(@Query() filter: GetThresholdsFilterDto): Promise<InventoryDifferenceThreshold[]> {
    return this.thresholdService.findAll(filter);
  }

  /**
   * Получить статистику по порогам
   */
  @Get('statistics')
  @ApiOperation({ summary: 'Get threshold statistics' })
  @ApiResponse({
    status: 200,
    description: 'Threshold statistics',
  })
  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: Record<ThresholdType, number>;
    bySeverity: Record<SeverityLevel, number>;
  }> {
    return this.thresholdService.getStatistics();
  }

  /**
   * Получить глобальные пороги
   */
  @Get('global')
  @ApiOperation({ summary: 'Get global thresholds' })
  @ApiResponse({
    status: 200,
    description: 'List of global thresholds',
    type: [InventoryDifferenceThreshold],
  })
  async findGlobal(): Promise<InventoryDifferenceThreshold[]> {
    return this.thresholdService.findGlobal();
  }

  /**
   * Получить пороги для товара
   */
  @Get('by-nomenclature/:nomenclatureId')
  @ApiOperation({ summary: 'Get thresholds applicable to a specific nomenclature' })
  @ApiParam({ name: 'nomenclatureId', type: String, description: 'Nomenclature ID' })
  @ApiResponse({
    status: 200,
    description: 'List of applicable thresholds',
    type: [InventoryDifferenceThreshold],
  })
  async findByNomenclature(
    @Param('nomenclatureId') nomenclatureId: string,
  ): Promise<InventoryDifferenceThreshold[]> {
    return this.thresholdService.findByNomenclature(nomenclatureId);
  }

  /**
   * Получить пороги для машины
   */
  @Get('by-machine/:machineId')
  @ApiOperation({ summary: 'Get thresholds applicable to a specific machine' })
  @ApiParam({ name: 'machineId', type: String, description: 'Machine ID' })
  @ApiResponse({
    status: 200,
    description: 'List of applicable thresholds',
    type: [InventoryDifferenceThreshold],
  })
  async findByMachine(
    @Param('machineId') machineId: string,
  ): Promise<InventoryDifferenceThreshold[]> {
    return this.thresholdService.findByMachine(machineId);
  }

  /**
   * Получить пороги для оператора
   */
  @Get('by-operator/:operatorId')
  @ApiOperation({ summary: 'Get thresholds applicable to a specific operator' })
  @ApiParam({ name: 'operatorId', type: String, description: 'Operator ID' })
  @ApiResponse({
    status: 200,
    description: 'List of applicable thresholds',
    type: [InventoryDifferenceThreshold],
  })
  async findByOperator(
    @Param('operatorId') operatorId: string,
  ): Promise<InventoryDifferenceThreshold[]> {
    return this.thresholdService.findByOperator(operatorId);
  }

  /**
   * Получить пороги для локации
   */
  @Get('by-location/:locationId')
  @ApiOperation({ summary: 'Get thresholds applicable to a specific location' })
  @ApiParam({ name: 'locationId', type: String, description: 'Location ID' })
  @ApiResponse({
    status: 200,
    description: 'List of applicable thresholds',
    type: [InventoryDifferenceThreshold],
  })
  async findByLocation(
    @Param('locationId') locationId: string,
  ): Promise<InventoryDifferenceThreshold[]> {
    return this.thresholdService.findByLocation(locationId);
  }

  /**
   * Найти применимый порог для конкретного расхождения
   */
  @Get('applicable')
  @ApiOperation({ summary: 'Find most applicable threshold for a difference' })
  @ApiQuery({ name: 'nomenclatureId', type: String, required: true })
  @ApiQuery({ name: 'machineId', type: String, required: false })
  @ApiQuery({ name: 'operatorId', type: String, required: false })
  @ApiQuery({ name: 'locationId', type: String, required: false })
  @ApiResponse({
    status: 200,
    description: 'Most applicable threshold or null',
    type: InventoryDifferenceThreshold,
  })
  async findApplicable(
    @Query('nomenclatureId') nomenclatureId: string,
    @Query('machineId') machineId?: string,
    @Query('operatorId') operatorId?: string,
    @Query('locationId') locationId?: string,
  ): Promise<InventoryDifferenceThreshold | null> {
    return this.thresholdService.findApplicableThreshold(
      nomenclatureId,
      machineId,
      operatorId,
      locationId,
    );
  }

  /**
   * Получить порог по ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get threshold by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Threshold ID' })
  @ApiResponse({
    status: 200,
    description: 'Threshold details',
    type: InventoryDifferenceThreshold,
  })
  @ApiResponse({ status: 404, description: 'Threshold not found' })
  async findOne(@Param('id') id: string): Promise<InventoryDifferenceThreshold> {
    return this.thresholdService.findOne(id);
  }

  /**
   * Обновить порог
   */
  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update threshold' })
  @ApiParam({ name: 'id', type: String, description: 'Threshold ID' })
  @ApiResponse({
    status: 200,
    description: 'Threshold updated successfully',
    type: InventoryDifferenceThreshold,
  })
  @ApiResponse({ status: 404, description: 'Threshold not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateThresholdDto,
  ): Promise<InventoryDifferenceThreshold> {
    return this.thresholdService.update(id, updateDto);
  }

  /**
   * Активировать порог
   */
  @Patch(':id/activate')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Activate threshold' })
  @ApiParam({ name: 'id', type: String, description: 'Threshold ID' })
  @ApiResponse({
    status: 200,
    description: 'Threshold activated',
    type: InventoryDifferenceThreshold,
  })
  async activate(@Param('id') id: string): Promise<InventoryDifferenceThreshold> {
    return this.thresholdService.activate(id);
  }

  /**
   * Деактивировать порог
   */
  @Patch(':id/deactivate')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Deactivate threshold' })
  @ApiParam({ name: 'id', type: String, description: 'Threshold ID' })
  @ApiResponse({
    status: 200,
    description: 'Threshold deactivated',
    type: InventoryDifferenceThreshold,
  })
  async deactivate(@Param('id') id: string): Promise<InventoryDifferenceThreshold> {
    return this.thresholdService.deactivate(id);
  }

  /**
   * Удалить порог
   */
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete threshold' })
  @ApiParam({ name: 'id', type: String, description: 'Threshold ID' })
  @ApiResponse({ status: 204, description: 'Threshold deleted successfully' })
  @ApiResponse({ status: 404, description: 'Threshold not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.thresholdService.remove(id);
  }

  /**
   * Создать пороги по умолчанию
   */
  @Post('defaults')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create default global thresholds' })
  @ApiResponse({
    status: 201,
    description: 'Default thresholds created',
    type: [InventoryDifferenceThreshold],
  })
  async createDefaults(
    @Req() req: ExpressRequest & { user?: { id: string } },
  ): Promise<InventoryDifferenceThreshold[]> {
    return this.thresholdService.createDefaultThresholds(req.user?.id);
  }
}
