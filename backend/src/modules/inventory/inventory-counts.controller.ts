import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { InventoryCountService } from './services/inventory-count.service';
import { InventoryDifferenceService } from './services/inventory-difference.service';
import {
  CreateActualCountDto,
  CreateBatchCountDto,
  GetActualCountsFilterDto,
} from './dto/inventory-count.dto';

/**
 * Inventory Counts Controller
 *
 * REQ-STK-CALC-02: API для работы с фактическими остатками
 * REQ-ANL-01/02: API для отчётов по расхождениям
 */
@ApiTags('inventory-counts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory-counts')
export class InventoryCountsController {
  constructor(
    private readonly countService: InventoryCountService,
    private readonly differenceService: InventoryDifferenceService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Создать фактический замер' })
  @ApiResponse({ status: 201, description: 'Фактический замер создан' })
  async createActualCount(@Body() dto: CreateActualCountDto, @Request() req: any) {
    return await this.countService.createActualCount(dto, req.user.id);
  }

  @Post('batch')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Массовая инвентаризация (много товаров)' })
  @ApiResponse({ status: 201, description: 'Инвентаризация создана' })
  async createBatchCount(@Body() dto: CreateBatchCountDto, @Request() req: any) {
    return await this.countService.createBatchCount(dto, req.user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Получить фактические замеры с фильтрацией' })
  @ApiResponse({ status: 200, description: 'Список фактических замеров' })
  async getActualCounts(@Query() filters: GetActualCountsFilterDto) {
    return await this.countService.getActualCounts(filters);
  }

  @Get('sessions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Получить список инвентаризаций (сессий)' })
  @ApiResponse({ status: 200, description: 'Список инвентаризаций' })
  async getInventorySessions(
    @Query('level_type') levelType?: string,
    @Query('level_ref_id') levelRefId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return await this.countService.getInventorySessions(
      levelType as any,
      levelRefId,
      dateFrom,
      dateTo,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Получить фактический замер по ID' })
  @ApiResponse({ status: 200, description: 'Фактический замер' })
  async getActualCountById(@Param('id') id: string) {
    return await this.countService.getActualCountById(id);
  }

  @Get(':id/difference')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Получить расхождение для фактического замера' })
  @ApiResponse({ status: 200, description: 'Расхождение' })
  async getDifferenceForCount(@Param('id') id: string) {
    const actualCount = await this.countService.getActualCountById(id);
    return await this.differenceService.calculateDifferenceForCount(actualCount);
  }

  @Get('report/:sessionId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Получить детальный отчёт по инвентаризации',
    description:
      'REQ-ANL-08: Детальный отчёт по инвентаризации с разбивкой по товарам, местоположениям и операторам',
  })
  @ApiResponse({ status: 200, description: 'Детальный отчёт по инвентаризации' })
  async getInventorizationReport(@Param('sessionId') sessionId: string) {
    return await this.countService.getInventorizationReport(sessionId);
  }
}
