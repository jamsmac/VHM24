import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';

/** Dashboard report data structure */
interface DashboardReportData {
  period: { from: string | Date; to: string | Date };
  financial: {
    revenue: number;
    expenses: number;
    collections: number;
    net_profit: number;
  };
  tasks: {
    total: number;
    completed: number;
    overdue: number;
    completion_rate?: number;
  };
  incidents: { open: number; critical: number };
  complaints: { new: number };
  machines: { active: number; total: number };
}

/** Machine data for PDF report */
interface MachineReportData {
  machine_number: string;
  model?: string;
  serial_number?: string;
  status: string;
  location?: { name: string };
}

/** Machine statistics for PDF report */
interface MachineStatsData {
  total_revenue: number;
  total_collections: number;
  total_expenses: number;
  net_profit: number;
  tasks: { total: number; completed: number; pending: number; overdue: number };
  incidents: { total: number; open: number; resolved: number };
}

/** Sales item for PDF report */
interface SalesItem {
  sale_date: string | Date;
  machine_number?: string;
  amount: number;
  payment_method?: string;
}

/** Sales summary for PDF report */
interface SalesSummary {
  total_amount: number;
  average_sale: number;
}

/**
 * PDF Generator Service
 * Generates PDF reports using PDFKit
 */
@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  /**
   * Generate PDF dashboard report
   */
  async generateDashboardReport(data: DashboardReportData, res: Response): Promise<void> {
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`,
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Header
    this.addHeader(doc, 'VendHub Manager - Dashboard Report');

    // Period info
    doc
      .fontSize(12)
      .text(
        `Period: ${new Date(data.period.from).toLocaleDateString('ru-RU')} - ${new Date(data.period.to).toLocaleDateString('ru-RU')}`,
        {
          align: 'center',
        },
      )
      .moveDown();

    // Financial Summary
    this.addSection(doc, 'Financial Summary');
    doc
      .fontSize(10)
      .text(`Revenue: ${this.formatCurrency(data.financial.revenue)}`)
      .text(`Expenses: ${this.formatCurrency(data.financial.expenses)}`)
      .text(`Collections: ${this.formatCurrency(data.financial.collections)}`)
      .text(`Net Profit: ${this.formatCurrency(data.financial.net_profit)}`, { underline: true })
      .moveDown();

    // Tasks Overview
    this.addSection(doc, 'Tasks Overview');
    doc
      .fontSize(10)
      .text(`Total Tasks: ${data.tasks.total}`)
      .text(`Completed: ${data.tasks.completed}`)
      .text(`Overdue: ${data.tasks.overdue}`)
      .text(`Completion Rate: ${data.tasks.completion_rate?.toFixed(1)}%`)
      .moveDown();

    // Incidents & Complaints
    this.addSection(doc, 'Incidents & Complaints');
    doc
      .fontSize(10)
      .text(`Open Incidents: ${data.incidents.open}`)
      .text(`Critical Incidents: ${data.incidents.critical}`)
      .text(`New Complaints: ${data.complaints.new}`)
      .moveDown();

    // Machines Status
    this.addSection(doc, 'Machines Status');
    doc
      .fontSize(10)
      .text(`Active Machines: ${data.machines.active}`)
      .text(`Total Machines: ${data.machines.total}`)
      .moveDown();

    // Footer
    this.addFooter(doc);

    // Finalize PDF
    doc.end();

    this.logger.log('Dashboard PDF report generated');
  }

  /**
   * Generate machine report PDF
   */
  async generateMachineReport(
    machine: MachineReportData,
    stats: MachineStatsData,
    res: Response,
  ): Promise<void> {
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=machine-${machine.machine_number}-report.pdf`,
    );

    doc.pipe(res);

    // Header
    this.addHeader(doc, `Machine Report - ${machine.machine_number}`);

    // Machine Details
    this.addSection(doc, 'Machine Information');
    doc
      .fontSize(10)
      .text(`Machine Number: ${machine.machine_number}`)
      .text(`Model: ${machine.model || 'N/A'}`)
      .text(`Serial Number: ${machine.serial_number || 'N/A'}`)
      .text(`Status: ${machine.status}`)
      .text(`Location: ${machine.location?.name || 'N/A'}`)
      .moveDown();

    // Financial Statistics
    this.addSection(doc, 'Financial Performance');
    doc
      .fontSize(10)
      .text(`Total Revenue: ${this.formatCurrency(stats.total_revenue)}`)
      .text(`Total Collections: ${this.formatCurrency(stats.total_collections)}`)
      .text(`Total Expenses: ${this.formatCurrency(stats.total_expenses)}`)
      .text(`Net Profit: ${this.formatCurrency(stats.net_profit)}`, { underline: true })
      .moveDown();

    // Tasks Statistics
    this.addSection(doc, 'Tasks Statistics');
    doc
      .fontSize(10)
      .text(`Total Tasks: ${stats.tasks.total}`)
      .text(`Completed Tasks: ${stats.tasks.completed}`)
      .text(`Pending Tasks: ${stats.tasks.pending}`)
      .text(`Overdue Tasks: ${stats.tasks.overdue}`)
      .moveDown();

    // Incidents
    this.addSection(doc, 'Incidents & Issues');
    doc
      .fontSize(10)
      .text(`Total Incidents: ${stats.incidents.total}`)
      .text(`Open Incidents: ${stats.incidents.open}`)
      .text(`Resolved Incidents: ${stats.incidents.resolved}`)
      .moveDown();

    // Footer
    this.addFooter(doc);

    doc.end();

    this.logger.log(`Machine report PDF generated for ${machine.machine_number}`);
  }

  /**
   * Generate sales report PDF with table
   */
  async generateSalesReport(
    sales: SalesItem[],
    summary: SalesSummary,
    res: Response,
  ): Promise<void> {
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=sales-report-${new Date().toISOString().split('T')[0]}.pdf`,
    );

    doc.pipe(res);

    // Header
    this.addHeader(doc, 'Sales Report');

    // Summary
    this.addSection(doc, 'Summary');
    doc
      .fontSize(10)
      .text(`Total Sales: ${sales.length}`)
      .text(`Total Amount: ${this.formatCurrency(summary.total_amount)}`)
      .text(`Average Sale: ${this.formatCurrency(summary.average_sale)}`)
      .moveDown();

    // Table header
    this.addSection(doc, 'Sales Details');
    const tableTop = doc.y;
    const colWidth = 120;

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Date', 50, tableTop, { width: colWidth })
      .text('Machine', 50 + colWidth, tableTop, { width: colWidth })
      .text('Amount', 50 + colWidth * 2, tableTop, { width: colWidth })
      .text('Method', 50 + colWidth * 3, tableTop, { width: colWidth });

    doc.moveDown();
    doc.font('Helvetica');

    // Table rows (first 20 items)
    let yPos = doc.y;
    const maxRows = 20;

    sales.slice(0, maxRows).forEach((sale, index) => {
      doc
        .fontSize(8)
        .text(new Date(sale.sale_date).toLocaleDateString('ru-RU'), 50, yPos, { width: colWidth })
        .text(sale.machine_number || 'N/A', 50 + colWidth, yPos, {
          width: colWidth,
        })
        .text(this.formatCurrency(sale.amount), 50 + colWidth * 2, yPos, { width: colWidth })
        .text(sale.payment_method || 'Cash', 50 + colWidth * 3, yPos, {
          width: colWidth,
        });

      yPos += 20;

      // Add new page if needed
      if (yPos > 700 && index < sales.length - 1) {
        doc.addPage();
        yPos = 50;
      }
    });

    if (sales.length > maxRows) {
      doc
        .moveDown()
        .fontSize(8)
        .text(`... and ${sales.length - maxRows} more sales`, { align: 'center' });
    }

    // Footer
    this.addFooter(doc);

    doc.end();

    this.logger.log('Sales report PDF generated');
  }

  /**
   * Add header to PDF
   */
  private addHeader(doc: typeof PDFDocument, title: string) {
    doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' }).moveDown();

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Generated: ${new Date().toLocaleString('ru-RU')}`, {
        align: 'center',
      })
      .moveDown(2);
  }

  /**
   * Add section title
   */
  private addSection(doc: typeof PDFDocument, title: string) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2196F3')
      .text(title)
      .fillColor('black')
      .font('Helvetica')
      .moveDown(0.5);
  }

  /**
   * Add footer to PDF
   */
  private addFooter(doc: typeof PDFDocument) {
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      doc
        .fontSize(8)
        .text(`VendHub Manager | Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 50, {
          align: 'center',
        });
    }
  }

  /**
   * Format currency for Uzbekistan market
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    // Example: 1500000 → "1 500 000 сум"
  }
}
