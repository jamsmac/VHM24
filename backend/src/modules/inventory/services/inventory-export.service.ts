import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { InventoryDifferenceService, DifferenceReportItem } from './inventory-difference.service';
import { InventoryLevelType } from '../entities/inventory-actual-count.entity';
import { SeverityLevel } from '../entities/inventory-difference-threshold.entity';

/** Export data row structure */
interface ExportRow {
  Товар: string;
  'Уровень учёта': string;
  Объект: string;
  'Дата замера': string;
  'Расчётный остаток': number;
  'Фактический остаток': number;
  'Разница (абс.)': number;
  'Разница (%)': string;
  Серьёзность: string;
  'Порог превышен': string;
  Проверил: string;
}

/** Summary data row structure */
interface SummaryRow {
  Показатель: string;
  Значение: string | number;
}

/** Filter parameters for difference report */
interface DifferenceReportFilters {
  level_type?: InventoryLevelType;
  level_ref_id?: string;
  nomenclature_id?: string;
  session_id?: string;
  date_from?: string;
  date_to?: string;
  severity?: SeverityLevel;
  threshold_exceeded_only?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * InventoryExportService
 *
 * Экспорт отчётов по расхождениям в Excel и CSV форматы
 */
@Injectable()
export class InventoryExportService {
  private readonly logger = new Logger(InventoryExportService.name);

  constructor(private readonly differenceService: InventoryDifferenceService) {}

  /**
   * Экспорт отчёта по расхождениям в Excel
   */
  async exportDifferencesToExcel(filters: DifferenceReportFilters, res: Response): Promise<void> {
    this.logger.log('Exporting inventory differences to Excel...');

    try {
      // Получить данные отчёта (без лимита)
      const report = await this.differenceService.getDifferencesReport({
        ...filters,
        limit: undefined,
        offset: undefined,
      });

      // Подготовить данные для экспорта
      const exportData = this.prepareExportData(report.data);

      // Создать workbook
      const workbook = new ExcelJS.Workbook();

      // Создать worksheet
      const worksheet = workbook.addWorksheet('Расхождения');

      // Add headers and data
      if (exportData.length > 0) {
        const headers = Object.keys(exportData[0]);
        worksheet.addRow(headers);
        exportData.forEach((row) => {
          worksheet.addRow(Object.values(row));
        });
      }

      // Настроить ширину колонок
      worksheet.columns = [
        { width: 30 }, // Товар
        { width: 15 }, // Уровень
        { width: 25 }, // Объект
        { width: 20 }, // Дата замера
        { width: 15 }, // Расчётный
        { width: 15 }, // Фактический
        { width: 15 }, // Δ абс.
        { width: 15 }, // Δ %
        { width: 15 }, // Серьёзность
        { width: 15 }, // Порог превышен
        { width: 25 }, // Проверил
      ];

      // Добавить сводный лист
      const summaryData = this.prepareSummaryData(report.data);
      const summaryWorksheet = workbook.addWorksheet('Сводка');
      if (summaryData.length > 0) {
        const summaryHeaders = Object.keys(summaryData[0]);
        summaryWorksheet.addRow(summaryHeaders);
        summaryData.forEach((row) => {
          summaryWorksheet.addRow(Object.values(row));
        });
      }

      // Сгенерировать Excel файл
      const excelBuffer = Buffer.from(await workbook.xlsx.writeBuffer());

      // Установить заголовки ответа
      const filename = `inventory-differences-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Отправить файл
      res.send(excelBuffer);

      this.logger.log(`Exported ${report.data.length} differences to Excel`);
    } catch (error) {
      this.logger.error('Failed to export to Excel:', error.message);
      throw error;
    }
  }

  /**
   * Экспорт отчёта по расхождениям в CSV
   */
  async exportDifferencesToCSV(filters: DifferenceReportFilters, res: Response): Promise<void> {
    this.logger.log('Exporting inventory differences to CSV...');

    try {
      // Получить данные отчёта (без лимита)
      const report = await this.differenceService.getDifferencesReport({
        ...filters,
        limit: undefined,
        offset: undefined,
      });

      // Подготовить данные для экспорта
      const exportData = this.prepareExportData(report.data);

      // Создать workbook и worksheet для CSV
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');

      // Add headers and data
      if (exportData.length > 0) {
        const headers = Object.keys(exportData[0]);
        worksheet.addRow(headers);
        exportData.forEach((row) => {
          worksheet.addRow(Object.values(row));
        });
      }

      // Generate CSV content
      const csvBuffer = await workbook.csv.writeBuffer();
      const csvContent = csvBuffer.toString();

      // Установить заголовки ответа
      const filename = `inventory-differences-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Добавить BOM для корректного отображения в Excel
      const bom = '\uFEFF';
      res.send(bom + csvContent);

      this.logger.log(`Exported ${report.data.length} differences to CSV`);
    } catch (error) {
      this.logger.error('Failed to export to CSV:', error.message);
      throw error;
    }
  }

  /**
   * Подготовить данные для экспорта
   */
  private prepareExportData(differences: DifferenceReportItem[]): ExportRow[] {
    return differences.map((item) => ({
      Товар: item.nomenclature_name,
      'Уровень учёта': this.translateLevelType(item.level_type),
      Объект: item.level_ref_id,
      'Дата замера': new Date(item.counted_at).toLocaleString('ru-RU'),
      'Расчётный остаток': item.calculated_quantity,
      'Фактический остаток': item.actual_quantity,
      'Разница (абс.)': item.difference_abs,
      'Разница (%)': `${item.difference_rel.toFixed(2)}%`,
      Серьёзность: this.translateSeverity(item.severity),
      'Порог превышен': item.threshold_exceeded ? 'Да' : 'Нет',
      Проверил: item.counted_by?.full_name || '',
    }));
  }

  /**
   * Подготовить сводные данные
   */
  private prepareSummaryData(differences: DifferenceReportItem[]): SummaryRow[] {
    const totalCount = differences.length;
    const criticalCount = differences.filter((d) => d.severity === 'CRITICAL').length;
    const warningCount = differences.filter((d) => d.severity === 'WARNING').length;
    const infoCount = differences.filter((d) => d.severity === 'INFO').length;
    const thresholdExceededCount = differences.filter((d) => d.threshold_exceeded).length;

    const avgDifferenceAbs =
      differences.length > 0
        ? differences.reduce((sum, d) => sum + Math.abs(d.difference_abs), 0) / differences.length
        : 0;

    const avgDifferenceRel =
      differences.length > 0
        ? differences.reduce((sum, d) => sum + Math.abs(d.difference_rel), 0) / differences.length
        : 0;

    return [
      { Показатель: 'Всего проверено', Значение: totalCount },
      {
        Показатель: 'С расхождениями',
        Значение: differences.filter((d) => d.difference_abs !== 0).length,
      },
      { Показатель: 'Критических', Значение: criticalCount },
      { Показатель: 'Предупреждений', Значение: warningCount },
      { Показатель: 'Информационных', Значение: infoCount },
      { Показатель: 'Порог превышен', Значение: thresholdExceededCount },
      { Показатель: 'Средняя разница (абс.)', Значение: avgDifferenceAbs.toFixed(2) },
      { Показатель: 'Средняя разница (%)', Значение: `${avgDifferenceRel.toFixed(2)}%` },
      { Показатель: 'Дата генерации', Значение: new Date().toLocaleString('ru-RU') },
    ];
  }

  /**
   * Перевести тип уровня на русский
   */
  private translateLevelType(levelType: string): string {
    switch (levelType) {
      case 'WAREHOUSE':
        return 'Склад';
      case 'OPERATOR':
        return 'Оператор';
      case 'MACHINE':
        return 'Аппарат';
      default:
        return levelType;
    }
  }

  /**
   * Перевести серьёзность на русский
   */
  private translateSeverity(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return 'Критическое';
      case 'WARNING':
        return 'Предупреждение';
      case 'INFO':
        return 'Информация';
      default:
        return severity;
    }
  }
}
