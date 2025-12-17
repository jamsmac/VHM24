import { Controller, Get, Post, Query, Param, UseGuards, Req, Res } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { InventoryDifferenceService } from './services/inventory-difference.service';
import { InventoryExportService } from './services/inventory-export.service';
import { InventoryPdfService } from './services/inventory-pdf.service';
import { SeverityLevel } from './entities/inventory-difference-threshold.entity';
import { InventoryLevelType } from './entities/inventory-actual-count.entity';

/**
 * Inventory Differences Controller
 *
 * REQ-ANL-01: API для отчётов по расхождениям
 * REQ-ANL-02: API для дашборда расхождений
 */
@ApiTags('inventory-differences')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory-differences')
export class InventoryDifferencesController {
  constructor(
    private readonly differenceService: InventoryDifferenceService,
    private readonly exportService: InventoryExportService,
    private readonly pdfService: InventoryPdfService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Получить отчёт по расхождениям с фильтрацией' })
  @ApiResponse({ status: 200, description: 'Отчёт по расхождениям' })
  async getDifferencesReport(
    @Query('level_type') levelType?: InventoryLevelType,
    @Query('level_ref_id') levelRefId?: string,
    @Query('nomenclature_id') nomenclatureId?: string,
    @Query('session_id') sessionId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('severity') severity?: SeverityLevel,
    @Query('threshold_exceeded_only') thresholdExceededOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.differenceService.getDifferencesReport({
      level_type: levelType,
      level_ref_id: levelRefId,
      nomenclature_id: nomenclatureId,
      session_id: sessionId,
      date_from: dateFrom,
      date_to: dateTo,
      severity,
      threshold_exceeded_only: thresholdExceededOnly === 'true',
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Получить данные для дашборда расхождений' })
  @ApiResponse({ status: 200, description: 'Данные дашборда' })
  async getDifferenceDashboard(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return await this.differenceService.getDifferenceDashboard({
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  @Post('execute-actions/:actualCountId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Выполнить действия при превышении порога для расхождения',
    description: 'Создаёт инциденты, задачи и отправляет уведомления согласно настроенным порогам',
  })
  @ApiResponse({
    status: 200,
    description: 'Действия выполнены',
    schema: {
      type: 'object',
      properties: {
        incidentId: { type: 'string', nullable: true },
        taskId: { type: 'string', nullable: true },
        notificationsSent: { type: 'number' },
      },
    },
  })
  async executeThresholdActions(
    @Param('actualCountId') actualCountId: string,
    @Req() req: ExpressRequest & { user: { id: string } },
  ) {
    return await this.differenceService.executeThresholdActionsForCount(actualCountId, req.user.id);
  }

  @Get('export/excel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Экспорт отчёта по расхождениям в Excel' })
  @ApiResponse({
    status: 200,
    description: 'Excel файл',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async exportToExcel(
    @Res() res: Response,
    @Query('level_type') levelType?: InventoryLevelType,
    @Query('level_ref_id') levelRefId?: string,
    @Query('nomenclature_id') nomenclatureId?: string,
    @Query('session_id') sessionId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('severity') severity?: SeverityLevel,
    @Query('threshold_exceeded_only') thresholdExceededOnly?: string,
  ) {
    await this.exportService.exportDifferencesToExcel(
      {
        level_type: levelType,
        level_ref_id: levelRefId,
        nomenclature_id: nomenclatureId,
        session_id: sessionId,
        date_from: dateFrom,
        date_to: dateTo,
        severity,
        threshold_exceeded_only: thresholdExceededOnly === 'true',
      },
      res,
    );
  }

  @Get('export/csv')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Экспорт отчёта по расхождениям в CSV' })
  @ApiResponse({
    status: 200,
    description: 'CSV файл',
    content: {
      'text/csv': {},
    },
  })
  async exportToCSV(
    @Res() res: Response,
    @Query('level_type') levelType?: InventoryLevelType,
    @Query('level_ref_id') levelRefId?: string,
    @Query('nomenclature_id') nomenclatureId?: string,
    @Query('session_id') sessionId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('severity') severity?: SeverityLevel,
    @Query('threshold_exceeded_only') thresholdExceededOnly?: string,
  ) {
    await this.exportService.exportDifferencesToCSV(
      {
        level_type: levelType,
        level_ref_id: levelRefId,
        nomenclature_id: nomenclatureId,
        session_id: sessionId,
        date_from: dateFrom,
        date_to: dateTo,
        severity,
        threshold_exceeded_only: thresholdExceededOnly === 'true',
      },
      res,
    );
  }

  @Get('export/pdf')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Генерация PDF отчёта по расхождениям' })
  @ApiResponse({
    status: 200,
    description: 'PDF файл',
    content: {
      'application/pdf': {},
    },
  })
  async exportToPDF(
    @Res() res: Response,
    @Query('level_type') levelType?: InventoryLevelType,
    @Query('level_ref_id') levelRefId?: string,
    @Query('nomenclature_id') nomenclatureId?: string,
    @Query('session_id') sessionId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('severity') severity?: SeverityLevel,
    @Query('threshold_exceeded_only') thresholdExceededOnly?: string,
  ) {
    await this.pdfService.generateDifferencesPDF(
      {
        level_type: levelType,
        level_ref_id: levelRefId,
        nomenclature_id: nomenclatureId,
        session_id: sessionId,
        date_from: dateFrom,
        date_to: dateTo,
        severity,
        threshold_exceeded_only: thresholdExceededOnly === 'true',
      },
      res,
    );
  }
}
