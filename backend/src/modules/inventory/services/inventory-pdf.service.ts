import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import {
  InventoryDifferenceService,
  DifferenceReportItem,
  DifferenceDashboard,
} from './inventory-difference.service';
import { InventoryLevelType } from '../entities/inventory-actual-count.entity';
import { SeverityLevel } from '../entities/inventory-difference-threshold.entity';

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
 * InventoryPdfService
 *
 * Генерация PDF отчётов по расхождениям инвентаря
 */
@Injectable()
export class InventoryPdfService {
  private readonly logger = new Logger(InventoryPdfService.name);

  constructor(private readonly differenceService: InventoryDifferenceService) {}

  /**
   * Генерировать PDF отчёт по расхождениям
   */
  async generateDifferencesPDF(filters: DifferenceReportFilters, res: Response): Promise<void> {
    this.logger.log('Generating inventory differences PDF report...');

    try {
      // Получить данные отчёта
      const report = await this.differenceService.getDifferencesReport({
        ...filters,
        limit: 100, // Limit to avoid huge PDFs
        offset: 0,
      });

      // Получить данные дашборда для сводки
      const dashboard = await this.differenceService.getDifferenceDashboard({
        date_from: filters.date_from,
        date_to: filters.date_to,
      });

      // Создать PDF документ
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: 'Отчёт по расхождениям остатков',
          Author: 'VendHub Manager',
          Subject: 'Инвентаризация',
          CreationDate: new Date(),
        },
      });

      // Установить заголовки ответа
      const filename = `inventory-differences-report-${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Pipe PDF в response
      doc.pipe(res);

      // Генерировать содержимое PDF
      this.addHeader(doc);
      this.addSummary(doc, dashboard);
      this.addSeverityBreakdown(doc, dashboard);
      this.addDifferencesTable(doc, report.data);
      this.addFooter(doc);

      // Финализировать PDF
      doc.end();

      this.logger.log(`Generated PDF report with ${report.data.length} differences`);
    } catch (error) {
      this.logger.error('Failed to generate PDF report:', error.message);
      throw error;
    }
  }

  /**
   * Добавить заголовок отчёта
   */
  private addHeader(doc: PDFKit.PDFDocument): void {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Отчёт по расхождениям остатков', 50, 50, { align: 'center' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Дата генерации: ${new Date().toLocaleString('ru-RU')}`, 50, 80, { align: 'center' });

    doc.moveDown(2);
  }

  /**
   * Добавить сводную информацию
   */
  private addSummary(doc: PDFKit.PDFDocument, dashboard: DifferenceDashboard): void {
    doc.fontSize(14).font('Helvetica-Bold').text('Сводная информация', 50, doc.y);

    doc.moveDown(0.5);

    const summaryData = [
      ['Всего расхождений:', dashboard.summary.total_discrepancies.toString()],
      ['Критических:', dashboard.summary.critical_count.toString()],
      ['Предупреждений:', dashboard.summary.warning_count.toString()],
      ['Информационных:', dashboard.summary.info_count.toString()],
      ['Средний % расхождения:', `${dashboard.summary.avg_rel_difference.toFixed(2)}%`],
    ];

    // Рисуем таблицу сводки
    const tableTop = doc.y;
    const leftColumn = 50;
    const rightColumn = 250;
    let currentY = tableTop;

    doc.fontSize(10).font('Helvetica');

    summaryData.forEach(([label, value]) => {
      doc.text(label, leftColumn, currentY, { width: 180, align: 'left' });
      doc.font('Helvetica-Bold').text(value, rightColumn, currentY, {
        width: 100,
        align: 'right',
      });
      currentY += 20;
      doc.font('Helvetica');
    });

    doc.moveDown(2);
  }

  /**
   * Добавить распределение по уровням серьёзности
   */
  private addSeverityBreakdown(doc: PDFKit.PDFDocument, dashboard: DifferenceDashboard): void {
    doc.fontSize(14).font('Helvetica-Bold').text('Распределение по уровням серьёзности', 50, doc.y);

    doc.moveDown(0.5);

    const total = dashboard.summary.total_discrepancies || 1; // Prevent division by zero
    const criticalPercent = ((dashboard.summary.critical_count / total) * 100).toFixed(1);
    const warningPercent = ((dashboard.summary.warning_count / total) * 100).toFixed(1);
    const infoPercent = ((dashboard.summary.info_count / total) * 100).toFixed(1);

    const severityData = [
      ['Критические:', dashboard.summary.critical_count.toString(), `${criticalPercent}%`],
      ['Предупреждения:', dashboard.summary.warning_count.toString(), `${warningPercent}%`],
      ['Информационные:', dashboard.summary.info_count.toString(), `${infoPercent}%`],
    ];

    const tableTop = doc.y;
    const leftColumn = 50;
    const middleColumn = 200;
    const rightColumn = 300;
    let currentY = tableTop;

    doc.fontSize(10).font('Helvetica');

    severityData.forEach(([label, count, percent]) => {
      doc.text(label, leftColumn, currentY, { width: 130, align: 'left' });
      doc.text(count, middleColumn, currentY, { width: 80, align: 'center' });
      doc.text(percent, rightColumn, currentY, { width: 80, align: 'right' });
      currentY += 20;
    });

    doc.moveDown(2);
  }

  /**
   * Добавить таблицу расхождений
   */
  private addDifferencesTable(doc: PDFKit.PDFDocument, differences: DifferenceReportItem[]): void {
    doc.fontSize(14).font('Helvetica-Bold').text('Детали расхождений', 50, doc.y);

    doc.moveDown(0.5);

    if (differences.length === 0) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Расхождения не обнаружены', 50, doc.y, { align: 'center' });
      return;
    }

    // Заголовки таблицы
    const headers = ['Товар', 'Расчёт', 'Факт', 'Δ %', 'Серьёзность'];
    const columnWidths = [200, 60, 60, 60, 100];
    let startX = 50;
    let currentY = doc.y;

    // Рисуем заголовки
    doc.fontSize(9).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, startX, currentY, {
        width: columnWidths[i],
        align: 'center',
      });
      startX += columnWidths[i];
    });

    currentY += 20;
    doc.moveTo(50, currentY).lineTo(520, currentY).stroke();
    currentY += 5;

    // Рисуем строки данных
    doc.fontSize(8).font('Helvetica');

    differences.slice(0, 50).forEach((item, index) => {
      // Проверяем, нужно ли начать новую страницу
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;

        // Повторяем заголовки на новой странице
        startX = 50;
        doc.fontSize(9).font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(header, startX, currentY, {
            width: columnWidths[i],
            align: 'center',
          });
          startX += columnWidths[i];
        });
        currentY += 20;
        doc.moveTo(50, currentY).lineTo(520, currentY).stroke();
        currentY += 5;
        doc.fontSize(8).font('Helvetica');
      }

      startX = 50;

      // Товар (обрезаем длинные названия)
      const nomenclatureName =
        item.nomenclature_name.length > 30
          ? item.nomenclature_name.substring(0, 27) + '...'
          : item.nomenclature_name;
      doc.text(nomenclatureName, startX, currentY, {
        width: columnWidths[0],
        align: 'left',
      });

      // Расчётный
      doc.text(item.calculated_quantity.toString(), startX + columnWidths[0], currentY, {
        width: columnWidths[1],
        align: 'center',
      });

      // Фактический
      doc.text(
        item.actual_quantity.toString(),
        startX + columnWidths[0] + columnWidths[1],
        currentY,
        { width: columnWidths[2], align: 'center' },
      );

      // Разница %
      const diffText = `${item.difference_rel > 0 ? '+' : ''}${item.difference_rel.toFixed(1)}%`;
      doc.text(diffText, startX + columnWidths[0] + columnWidths[1] + columnWidths[2], currentY, {
        width: columnWidths[3],
        align: 'center',
      });

      // Серьёзность
      const severityText = this.translateSeverity(item.severity);
      doc.text(
        severityText,
        startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3],
        currentY,
        { width: columnWidths[4], align: 'center' },
      );

      currentY += 18;

      // Разделительная линия
      if ((index + 1) % 5 === 0) {
        doc
          .strokeColor('#cccccc')
          .moveTo(50, currentY)
          .lineTo(520, currentY)
          .stroke()
          .strokeColor('#000000');
        currentY += 3;
      }
    });

    if (differences.length > 50) {
      doc.moveDown(1);
      doc
        .fontSize(8)
        .font('Helvetica-Oblique')
        .text(
          `Показаны первые 50 из ${differences.length} расхождений. Для полного отчёта экспортируйте в Excel.`,
          50,
          doc.y,
          { align: 'center' },
        );
    }
  }

  /**
   * Добавить футер
   */
  private addFooter(doc: PDFKit.PDFDocument): void {
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      doc
        .fontSize(8)
        .font('Helvetica')
        .text(`Страница ${i + 1} из ${pageCount}`, 50, doc.page.height - 50, { align: 'center' });

      doc.text(
        'VendHub Manager - Система управления вендинговым бизнесом',
        50,
        doc.page.height - 35,
        { align: 'center' },
      );
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
