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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { InventoryAdjustmentService } from './services/inventory-adjustment.service';
import {
  CreateAdjustmentDto,
  ApproveAdjustmentDto,
  FilterAdjustmentsDto,
} from './dto/inventory-adjustment.dto';

/**
 * Inventory Adjustments Controller
 *
 * REQ-STK-ADJ-01: API для создания корректировок
 * REQ-STK-ADJ-02: API для согласования корректировок
 * REQ-STK-ADJ-03: API для применения корректировок
 */
@ApiTags('inventory-adjustments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory-adjustments')
export class InventoryAdjustmentsController {
  constructor(private readonly adjustmentService: InventoryAdjustmentService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Создать корректировку остатков' })
  @ApiResponse({ status: 201, description: 'Корректировка создана' })
  async createAdjustment(@Body() dto: CreateAdjustmentDto, @Request() req: any) {
    return await this.adjustmentService.createAdjustment(dto, req.user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Получить список корректировок с фильтрацией' })
  @ApiResponse({ status: 200, description: 'Список корректировок' })
  async getAdjustments(@Query() filters: FilterAdjustmentsDto) {
    return await this.adjustmentService.findAll(filters);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Получить корректировку по ID' })
  @ApiResponse({ status: 200, description: 'Детали корректировки' })
  async getAdjustment(@Param('id') id: string) {
    return await this.adjustmentService.findOne(id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Одобрить или отклонить корректировку' })
  @ApiResponse({ status: 200, description: 'Статус корректировки обновлён' })
  async approveOrReject(
    @Param('id') id: string,
    @Body() dto: ApproveAdjustmentDto,
    @Request() req: any,
  ) {
    return await this.adjustmentService.approveOrReject(id, dto, req.user.id);
  }

  @Post(':id/apply')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Применить корректировку к остаткам',
    description: 'Обновляет фактические остатки в соответствии с корректировкой',
  })
  @ApiResponse({ status: 200, description: 'Корректировка применена' })
  async applyAdjustment(@Param('id') id: string, @Request() req: any) {
    return await this.adjustmentService.applyAdjustment(id, req.user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Отменить корректировку' })
  @ApiResponse({ status: 200, description: 'Корректировка отменена' })
  async cancelAdjustment(@Param('id') id: string, @Request() req: any) {
    return await this.adjustmentService.cancelAdjustment(id, req.user.id);
  }

  @Get('pending/count')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Получить количество ожидающих согласования корректировок' })
  @ApiResponse({
    status: 200,
    description: 'Количество pending корректировок',
    schema: { type: 'object', properties: { count: { type: 'number' } } },
  })
  async getPendingCount() {
    const result = await this.adjustmentService.findAll({
      status: 'pending' as any,
      limit: 1,
      offset: 0,
    });
    return { count: result.total };
  }
}
