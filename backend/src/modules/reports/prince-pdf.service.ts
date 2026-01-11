import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

/**
 * Prince XML PDF Service
 * Converts HTML/CSS to PDF using Prince XML
 * Better for complex layouts and styling than PDFKit
 */
@Injectable()
export class PrincePdfService {
  private readonly logger = new Logger(PrincePdfService.name);
  private readonly princePath: string;
  private readonly tempDir: string;

  constructor() {
    // Prince installation path (adjust if installed elsewhere)
    this.princePath = process.env.PRINCE_PATH || '/usr/local/bin/prince';
    
    // Fallback to user installation
    if (!existsSync(this.princePath)) {
      this.princePath = process.env.HOME 
        ? `${process.env.HOME}/.local/prince/bin/prince`
        : '/usr/local/bin/prince';
    }

    // Temporary directory for HTML files
    this.tempDir = join(process.cwd(), 'temp', 'prince');
  }

  /**
   * Generate PDF from HTML string
   */
  async generateFromHtml(
    html: string,
    res: Response,
    filename: string = 'report.pdf',
    options?: PrinceOptions,
  ): Promise<void> {
    try {
      // Ensure temp directory exists
      await mkdir(this.tempDir, { recursive: true });

      // Create temporary HTML file
      const htmlFile = join(this.tempDir, `temp-${Date.now()}.html`);
      await writeFile(htmlFile, html, 'utf-8');

      // Generate PDF
      const pdfBuffer = await this.convertHtmlToPdf(htmlFile, options);

      // Clean up HTML file
      await unlink(htmlFile);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      // Send PDF
      res.send(pdfBuffer);

      this.logger.log(`PDF generated: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to generate PDF: ${error.message}`, error.stack);
      throw new BadRequestException(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate PDF from HTML file path
   */
  async generateFromFile(
    htmlFilePath: string,
    res: Response,
    filename: string = 'report.pdf',
    options?: PrinceOptions,
  ): Promise<void> {
    try {
      if (!existsSync(htmlFilePath)) {
        throw new BadRequestException(`HTML file not found: ${htmlFilePath}`);
      }

      // Generate PDF
      const pdfBuffer = await this.convertHtmlToPdf(htmlFilePath, options);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      // Send PDF
      res.send(pdfBuffer);

      this.logger.log(`PDF generated from file: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to generate PDF: ${error.message}`, error.stack);
      throw new BadRequestException(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Convert HTML to PDF using Prince
   */
  private async convertHtmlToPdf(
    htmlFile: string,
    options?: PrinceOptions,
  ): Promise<Buffer> {
    // Create temporary PDF file
    const pdfFile = join(this.tempDir, `output-${Date.now()}.pdf`);

    try {
      // Build Prince command
      const command = this.buildPrinceCommand(htmlFile, pdfFile, options);

      // Execute Prince
      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('prince: warning')) {
        this.logger.warn(`Prince warnings: ${stderr}`);
      }

      // Check if PDF was created
      if (!existsSync(pdfFile)) {
        throw new Error('PDF file was not created');
      }

      // Read PDF file
      const { readFile } = await import('fs/promises');
      const pdfBuffer = await readFile(pdfFile);

      // Clean up PDF file
      await unlink(pdfFile);

      return pdfBuffer;
    } catch (error) {
      // Clean up on error
      if (existsSync(pdfFile)) {
        await unlink(pdfFile).catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Build Prince command with options
   */
  private buildPrinceCommand(
    inputFile: string,
    outputFile: string,
    options?: PrinceOptions,
  ): string {
    let command = `"${this.princePath}" "${inputFile}" -o "${outputFile}"`;

    // Add options
    if (options) {
      if (options.baseUrl) {
        command += ` --baseurl="${options.baseUrl}"`;
      }

      if (options.css) {
        command += ` --style="${options.css}"`;
      }

      if (options.media) {
        command += ` --media="${options.media}"`;
      }

      if (options.pageSize) {
        command += ` --page-size="${options.pageSize}"`;
      }

      if (options.pageMargin) {
        command += ` --page-margin="${options.pageMargin}"`;
      }

      if (options.encoding) {
        command += ` --input-encoding="${options.encoding}"`;
      }

      if (options.log) {
        command += ` --log="${options.log}"`;
      }

      if (options.verbose) {
        command += ' --verbose';
      }

      if (options.noEmbedFonts) {
        command += ' --no-embed-fonts';
      }

      if (options.noCompress) {
        command += ' --no-compress';
      }

      if (options.title) {
        command += ` --pdf-title="${options.title}"`;
      }

      if (options.subject) {
        command += ` --pdf-subject="${options.subject}"`;
      }

      if (options.author) {
        command += ` --pdf-author="${options.author}"`;
      }

      if (options.keywords) {
        command += ` --pdf-keywords="${options.keywords}"`;
      }
    }

    return command;
  }

  /**
   * Check if Prince is available
   */
  async checkPrinceAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`"${this.princePath}" --version`);
      this.logger.log(`Prince version: ${stdout.trim()}`);
      return true;
    } catch (error) {
      this.logger.warn(`Prince not available: ${error.message}`);
      return false;
    }
  }
}

/**
 * Prince XML options
 */
export interface PrinceOptions {
  /** Base URL for resolving relative URLs */
  baseUrl?: string;
  /** CSS file path or CSS string */
  css?: string;
  /** Media type (screen, print, etc.) */
  media?: string;
  /** Page size (A4, Letter, etc.) */
  pageSize?: string;
  /** Page margins (e.g., "1in") */
  pageMargin?: string;
  /** Input encoding */
  encoding?: string;
  /** Log file path */
  log?: string;
  /** Verbose output */
  verbose?: boolean;
  /** Don't embed fonts */
  noEmbedFonts?: boolean;
  /** Don't compress PDF */
  noCompress?: boolean;
  /** PDF title metadata */
  title?: string;
  /** PDF subject metadata */
  subject?: string;
  /** PDF author metadata */
  author?: string;
  /** PDF keywords metadata */
  keywords?: string;
}

