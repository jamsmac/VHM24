import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InventoryReportPresetsService } from '../services/inventory-report-presets.service';
import {
  CreateInventoryReportPresetDto,
  UpdateInventoryReportPresetDto,
  InventoryReportPresetResponseDto,
} from '../dto/inventory-report-preset.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

/**
 * Inventory Report Presets Controller
 *
 * Управление сохранёнными пресетами фильтров отчётов
 * REQ-ANL-04: Сохранение пресетов фильтров отчётов
 */
@ApiTags('inventory/presets')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('inventory/presets')
export class InventoryReportPresetsController {
  constructor(private readonly inventoryReportPresetsService: InventoryReportPresetsService) {}

  /**
   * Создать новый пресет отчёта
   */
  @Post()
  @ApiOperation({ summary: 'Create new report filter preset' })
  async create(
    @Req() req: ExpressRequest & { user: { id: string } },
    @Body() createDto: CreateInventoryReportPresetDto,
  ): Promise<InventoryReportPresetResponseDto> {
    return await this.inventoryReportPresetsService.create(req.user.id, createDto);
  }

  /**
   * Получить все пресеты пользователя
   */
  @Get()
  @ApiOperation({ summary: 'Get all presets for current user' })
  async findAll(
    @Req() req: ExpressRequest & { user: { id: string } },
  ): Promise<InventoryReportPresetResponseDto[]> {
    return await this.inventoryReportPresetsService.findByUser(req.user.id);
  }

  /**
   * Получить пресет по ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get preset by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Preset ID' })
  async findOne(
    @Req() req: ExpressRequest & { user: { id: string } },
    @Param('id') id: string,
  ): Promise<InventoryReportPresetResponseDto> {
    return await this.inventoryReportPresetsService.findOne(id, req.user.id);
  }

  /**
   * Обновить пресет
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update preset' })
  @ApiParam({ name: 'id', type: String, description: 'Preset ID' })
  async update(
    @Req() req: ExpressRequest & { user: { id: string } },
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryReportPresetDto,
  ): Promise<InventoryReportPresetResponseDto> {
    return await this.inventoryReportPresetsService.update(id, req.user.id, updateDto);
  }

  /**
   * Удалить пресет
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete preset' })
  @ApiParam({ name: 'id', type: String, description: 'Preset ID' })
  async remove(
    @Req() req: ExpressRequest & { user: { id: string } },
    @Param('id') id: string,
  ): Promise<void> {
    await this.inventoryReportPresetsService.remove(id, req.user.id);
  }

  /**
   * Переупорядочить пресеты
   */
  @Post('reorder')
  @ApiOperation({ summary: 'Reorder presets' })
  async reorder(
    @Req() req: ExpressRequest & { user: { id: string } },
    @Body() presetOrder: Array<{ id: string; sort_order: number }>,
  ): Promise<void> {
    await this.inventoryReportPresetsService.reorder(req.user.id, presetOrder);
  }

  /**
   * Получить пресет по умолчанию
   */
  @Get('default')
  @ApiOperation({ summary: 'Get default preset for current user' })
  async getDefault(
    @Req() req: ExpressRequest & { user: { id: string } },
  ): Promise<InventoryReportPresetResponseDto | null> {
    return await this.inventoryReportPresetsService.getDefaultPreset(req.user.id);
  }
}
