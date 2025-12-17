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
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    sub: string;
  };
}
import { PurchaseHistoryService } from './purchase-history.service';
import { CreatePurchaseDto, PurchaseStatus } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/modules/users/entities/user.entity';

@ApiTags('Purchase History')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchase-history')
export class PurchaseHistoryController {
  constructor(private readonly purchaseService: PurchaseHistoryService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Создать запись о закупке' })
  @ApiResponse({ status: 201, description: 'Закупка успешно создана' })
  create(@Body() dto: CreatePurchaseDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.purchaseService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить историю закупок' })
  @ApiQuery({ name: 'supplier_id', required: false, description: 'ID поставщика' })
  @ApiQuery({ name: 'nomenclature_id', required: false, description: 'ID номенклатуры' })
  @ApiQuery({ name: 'warehouse_id', required: false, description: 'ID склада' })
  @ApiQuery({ name: 'status', required: false, enum: PurchaseStatus })
  @ApiQuery({ name: 'date_from', required: false, description: 'Дата от (YYYY-MM-DD)' })
  @ApiQuery({ name: 'date_to', required: false, description: 'Дата до (YYYY-MM-DD)' })
  @ApiQuery({ name: 'invoice_number', required: false, description: 'Номер счета' })
  findAll(
    @Query('supplier_id') supplier_id?: string,
    @Query('nomenclature_id') nomenclature_id?: string,
    @Query('warehouse_id') warehouse_id?: string,
    @Query('status') status?: PurchaseStatus,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @Query('invoice_number') invoice_number?: string,
  ) {
    return this.purchaseService.findAll({
      supplier_id,
      nomenclature_id,
      warehouse_id,
      status,
      date_from,
      date_to,
      invoice_number,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику закупок' })
  @ApiQuery({ name: 'supplier_id', required: false })
  @ApiQuery({ name: 'warehouse_id', required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  getStats(
    @Query('supplier_id') supplier_id?: string,
    @Query('warehouse_id') warehouse_id?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
  ) {
    return this.purchaseService.getStats({
      supplier_id,
      warehouse_id,
      date_from,
      date_to,
    });
  }

  @Get('price-history/:nomenclature_id')
  @ApiOperation({ summary: 'Получить историю цен для номенклатуры' })
  @ApiQuery({ name: 'supplier_id', required: false })
  getPriceHistory(
    @Param('nomenclature_id', ParseUUIDPipe) nomenclature_id: string,
    @Query('supplier_id') supplier_id?: string,
  ) {
    return this.purchaseService.getPriceHistory(nomenclature_id, supplier_id);
  }

  @Get('average-price/:nomenclature_id')
  @ApiOperation({ summary: 'Получить среднюю цену для номенклатуры' })
  @ApiQuery({
    name: 'period_days',
    required: false,
    description: 'Период в днях (по умолчанию 90)',
  })
  getAveragePrice(
    @Param('nomenclature_id', ParseUUIDPipe) nomenclature_id: string,
    @Query('period_days') period_days?: string,
  ) {
    const days = period_days ? parseInt(period_days) : 90;
    return this.purchaseService.getAveragePrice(nomenclature_id, days);
  }

  @Get('weighted-average-cost/:nomenclature_id')
  @ApiOperation({
    summary: 'Рассчитать средневзвешенную стоимость для номенклатуры',
    description:
      'REQ-PROC-02: Расчёт средневзвешенной стоимости запасов. ' +
      'Формула: WAC = SUM(Quantity × Unit Price) / SUM(Quantity)',
  })
  @ApiQuery({
    name: 'up_to_date',
    required: false,
    description: 'Дата до которой считать (ISO 8601)',
  })
  @ApiQuery({
    name: 'warehouse_id',
    required: false,
    description: 'ID склада (опционально)',
  })
  @ApiResponse({
    status: 200,
    description: 'Средневзвешенная стоимость рассчитана',
    schema: {
      type: 'object',
      properties: {
        weighted_average_cost: { type: 'number', example: 12500.75 },
        total_quantity: { type: 'number', example: 150 },
        total_cost: { type: 'number', example: 1875112.5 },
        purchase_count: { type: 'number', example: 5 },
        oldest_purchase_date: { type: 'string', format: 'date-time' },
        latest_purchase_date: { type: 'string', format: 'date-time' },
      },
    },
  })
  getWeightedAverageCost(
    @Param('nomenclature_id', ParseUUIDPipe) nomenclature_id: string,
    @Query('up_to_date') up_to_date?: string,
    @Query('warehouse_id') warehouse_id?: string,
  ) {
    const upToDate = up_to_date ? new Date(up_to_date) : undefined;
    return this.purchaseService.getWeightedAverageCost(nomenclature_id, upToDate, warehouse_id);
  }

  @Get('moving-average-cost/:nomenclature_id')
  @ApiOperation({
    summary: 'Рассчитать скользящую среднюю стоимость для номенклатуры',
    description:
      'REQ-PROC-02: Расчёт средневзвешенной стоимости запасов за период. ' +
      'Использует только закупки за указанный период (по умолчанию 90 дней).',
  })
  @ApiQuery({
    name: 'period_days',
    required: false,
    description: 'Период в днях (по умолчанию 90)',
  })
  @ApiResponse({
    status: 200,
    description: 'Скользящая средняя стоимость рассчитана',
    schema: {
      type: 'object',
      properties: {
        moving_average_cost: { type: 'number', example: 12750.5 },
        total_quantity: { type: 'number', example: 100 },
        total_cost: { type: 'number', example: 1275050 },
        purchase_count: { type: 'number', example: 3 },
        period_start_date: { type: 'string', format: 'date-time' },
        period_end_date: { type: 'string', format: 'date-time' },
      },
    },
  })
  getMovingAverageCost(
    @Param('nomenclature_id', ParseUUIDPipe) nomenclature_id: string,
    @Query('period_days') period_days?: string,
  ) {
    const days = period_days ? parseInt(period_days) : 90;
    return this.purchaseService.getMovingAverageCost(nomenclature_id, days);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Импортировать историю закупок' })
  @ApiResponse({ status: 201, description: 'История успешно импортирована' })
  async importPurchases(
    @Body() body: { data: CreatePurchaseDto[]; session_id: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.purchaseService.importPurchases(body.data, body.session_id, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить закупку по ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить закупку' })
  @ApiResponse({ status: 200, description: 'Закупка успешно обновлена' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePurchaseDto) {
    return this.purchaseService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить закупку' })
  @ApiResponse({ status: 204, description: 'Закупка успешно удалена' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseService.remove(id);
  }
}
