import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Repository, DataSource, In } from 'typeorm';
import * as ExcelJS from 'exceljs';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import { SalesImport, ImportStatus, ImportFileType } from './entities/sales-import.entity';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
} from '../transactions/entities/transaction.entity';
import { Machine } from '../machines/entities/machine.entity';
import { Nomenclature } from '../nomenclature/entities/nomenclature.entity';
import { InventoryService } from '../inventory/inventory.service';

interface ParsedRow {
  date: string;
  machine_number: string;
  amount: number;
  payment_method?: string;
  product_name?: string;
  quantity?: number;
}

@Injectable()
export class SalesImportService {
  private readonly logger = new Logger(SalesImportService.name);

  constructor(
    @InjectRepository(SalesImport)
    private readonly importRepository: Repository<SalesImport>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @InjectRepository(Nomenclature)
    private readonly nomenclatureRepository: Repository<Nomenclature>,
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
    @InjectQueue('sales-import')
    private readonly salesImportQueue: Queue,
  ) {}

  /**
   * Upload and process sales file
   */
  async uploadSalesFile(
    file: Express.Multer.File,
    userId: string,
    fileType?: ImportFileType,
  ): Promise<{ importRecord: SalesImport; jobId: string }> {
    // Detect file type if not provided
    if (!fileType) {
      fileType = this.detectFileType(file.originalname);
    }

    // Create import record
    const importRecord = this.importRepository.create({
      uploaded_by_user_id: userId,
      filename: file.originalname,
      file_type: fileType,
      status: ImportStatus.PENDING,
    });

    const saved = await this.importRepository.save(importRecord);

    // Add to queue for background processing
    const job = await this.salesImportQueue.add(
      'process-file',
      {
        importId: saved.id,
        buffer: file.buffer,
        fileType,
        userId,
      },
      {
        attempts: 3, // Retry up to 3 times on failure
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay
        },
        removeOnComplete: false, // Keep completed jobs for history
        removeOnFail: false, // Keep failed jobs for debugging
      },
    );

    this.logger.log(`📥 Файл импорта ${saved.id} добавлен в очередь (job: ${job.id})`);

    return {
      importRecord: saved,
      jobId: job.id.toString(),
    };
  }

  /**
   * Process uploaded file
   */
  private async processFile(
    importId: string,
    buffer: Buffer,
    fileType: ImportFileType,
  ): Promise<void> {
    const importRecord = await this.importRepository.findOne({
      where: { id: importId },
    });

    if (!importRecord) {
      throw new NotFoundException('Import record not found');
    }

    try {
      // Update status to processing
      importRecord.status = ImportStatus.PROCESSING;
      importRecord.started_at = new Date();
      await this.importRepository.save(importRecord);

      // Parse file
      const rows = await this.parseFile(buffer, fileType);
      importRecord.total_rows = rows.length;

      // Process rows
      const results = await this.processRows(rows);

      // Update import record
      importRecord.success_rows = results.successCount;
      importRecord.failed_rows = results.failedCount;
      importRecord.errors = results.errors;
      importRecord.summary = results.summary;
      importRecord.status =
        results.failedCount === 0
          ? ImportStatus.COMPLETED
          : results.successCount > 0
            ? ImportStatus.PARTIAL
            : ImportStatus.FAILED;
      importRecord.completed_at = new Date();
      importRecord.message =
        results.failedCount === 0
          ? 'Import completed successfully'
          : `Import completed with ${results.failedCount} errors`;

      await this.importRepository.save(importRecord);

      this.logger.log(
        `Import ${importId} completed: ${results.successCount} success, ${results.failedCount} failed`,
      );
    } catch (error) {
      importRecord.status = ImportStatus.FAILED;
      importRecord.completed_at = new Date();
      importRecord.message = error.message;
      importRecord.errors = { error: error.message };
      await this.importRepository.save(importRecord);

      this.logger.error(`Import ${importId} failed:`, error);
    }
  }

  /**
   * Parse Excel or CSV file
   */
  private async parseFile(buffer: Buffer, fileType: ImportFileType): Promise<ParsedRow[]> {
    if (fileType === ImportFileType.EXCEL) {
      return this.parseExcel(buffer);
    } else {
      return this.parseCSV(buffer);
    }
  }

  /**
   * Parse Excel file
   */
  private async parseExcel(buffer: Buffer): Promise<ParsedRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Excel file is empty or invalid');
    }

    const jsonData: Record<string, unknown>[] = [];
    const headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // First row is headers
        row.eachCell((cell) => {
          headers.push(cell.value?.toString() || '');
        });
      } else {
        // Data rows
        const rowData: Record<string, unknown> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            rowData[header] = cell.value;
          }
        });
        jsonData.push(rowData);
      }
    });

    return jsonData.map((row) => this.normalizeRow(row));
  }

  /**
   * Parse CSV file
   */
  private async parseCSV(buffer: Buffer): Promise<ParsedRow[]> {
    return new Promise((resolve, reject) => {
      const rows: ParsedRow[] = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(csv())
        .on('data', (row) => {
          rows.push(this.normalizeRow(row));
        })
        .on('end', () => {
          resolve(rows);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Normalize row to standard format
   */
  private normalizeRow(row: Record<string, unknown>): ParsedRow {
    // Try to detect column names (supports Russian and English)
    const dateField =
      row['date'] || row['Date'] || row['Дата'] || row['дата'] || row['sale_date'] || '';

    const machineField =
      row['machine'] ||
      row['Machine'] ||
      row['Аппарат'] ||
      row['аппарат'] ||
      row['machine_number'] ||
      '';

    const amountField =
      row['amount'] || row['Amount'] || row['Сумма'] || row['сумма'] || row['total'] || 0;

    const paymentField =
      row['payment'] || row['Payment'] || row['payment_method'] || row['Способ оплаты'] || 'cash';

    const productField =
      row['product'] || row['Product'] || row['Товар'] || row['product_name'] || '';

    const quantityField = row['quantity'] || row['Quantity'] || row['Количество'] || 1;

    return {
      date: this.parseDate(dateField),
      machine_number: String(machineField).trim(),
      amount: parseFloat(String(amountField).replace(/[^\d.-]/g, '')),
      payment_method: String(paymentField).toLowerCase(),
      product_name: productField ? String(productField).trim() : undefined,
      quantity: quantityField ? parseInt(String(quantityField)) : undefined,
    };
  }

  /**
   * Parse date from various formats
   */
  private parseDate(dateStr: unknown): string {
    if (!dateStr) return new Date().toISOString();

    // If it's already a Date object
    if (dateStr instanceof Date) {
      return dateStr.toISOString();
    }

    // If it's an Excel serial number
    if (typeof dateStr === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const msPerDay = 86400000;
      const date = new Date(excelEpoch.getTime() + dateStr * msPerDay);
      return date.toISOString();
    }

    // Try to parse as string
    const date = new Date(String(dateStr));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    // Default to current date
    return new Date().toISOString();
  }

  /**
   * Process parsed rows
   * PERFORMANCE FIX: Pre-fetch all machines and nomenclature to avoid N+1 queries
   */
  private async processRows(rows: ParsedRow[]): Promise<{
    successCount: number;
    failedCount: number;
    errors: Record<string, any>;
    summary: Record<string, any>;
  }> {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    let totalAmount = 0;

    // PERFORMANCE: Pre-fetch all machines into a Map to avoid N+1 queries
    const uniqueMachineNumbers = [...new Set(rows.map((r) => r.machine_number).filter(Boolean))];
    const machines =
      uniqueMachineNumbers.length > 0
        ? await this.machineRepository.find({
            where: { machine_number: In(uniqueMachineNumbers) },
          })
        : [];
    const machineMap = new Map<string, Machine>(machines.map((m) => [m.machine_number, m]));

    // PERFORMANCE: Pre-fetch all nomenclature into a Map to avoid N+1 queries
    const uniqueProductNames = [...new Set(rows.map((r) => r.product_name).filter(Boolean))];
    const nomenclatures =
      uniqueProductNames.length > 0
        ? await this.nomenclatureRepository.find({
            where: { name: In(uniqueProductNames as string[]) },
          })
        : [];
    const nomenclatureMap = new Map<string, Nomenclature>(nomenclatures.map((n) => [n.name, n]));

    this.logger.debug(
      `Pre-fetched ${machineMap.size} machines and ${nomenclatureMap.size} nomenclature items`,
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        // Validate row
        if (!row.machine_number || !row.amount) {
          throw new Error('Missing machine number or amount');
        }

        // Find machine from pre-fetched Map
        const machine = machineMap.get(row.machine_number);

        if (!machine) {
          throw new Error(`Machine ${row.machine_number} not found`);
        }

        // Map payment method
        const paymentMethod = this.mapPaymentMethod(row.payment_method);

        // Find nomenclature from pre-fetched Map
        const nomenclature = row.product_name
          ? nomenclatureMap.get(row.product_name) || null
          : null;

        // Use database transaction for atomicity
        await this.dataSource.transaction(async (transactionManager) => {
          // Create transaction
          const transaction = this.transactionRepository.create({
            transaction_type: TransactionType.SALE,
            transaction_date: new Date(row.date),
            machine_id: machine.id,
            amount: row.amount,
            payment_method: paymentMethod,
            quantity: row.quantity || 1,
            description: row.product_name
              ? `Sale: ${row.product_name} (${row.quantity || 1})`
              : 'Sale from import',
          });

          const savedTransaction = await transactionManager.save(transaction);

          // Deduct from machine inventory if product info available
          if (nomenclature && row.quantity) {
            try {
              await this.inventoryService.recordSale(
                {
                  machine_id: machine.id,
                  nomenclature_id: nomenclature.id,
                  quantity: row.quantity,
                  transaction_id: savedTransaction.id,
                },
                'system', // userId for system-generated imports
              );
              this.logger.debug(
                `Deducted ${row.quantity} of ${nomenclature.name} from machine ${machine.machine_number}`,
              );
            } catch (inventoryError) {
              this.logger.warn(
                `Failed to deduct inventory for row ${i + 1}: ${inventoryError.message}. Transaction created but inventory not updated.`,
              );
              // Note: We don't throw here - transaction is still valid even if inventory update fails
              // This allows for scenarios where inventory might be zero or not tracked
            }
          }
        });

        successCount++;
        totalAmount += row.amount;
      } catch (error) {
        failedCount++;
        errors.push(`Row ${i + 1}: ${error.message}`);
        this.logger.warn(`Failed to process row ${i + 1}:`, error.message);
      }
    }

    return {
      successCount,
      failedCount,
      errors: { errors },
      summary: {
        total_amount: totalAmount,
        transactions_created: successCount,
        average_amount: successCount > 0 ? totalAmount / successCount : 0,
      },
    };
  }

  /**
   * Map payment method string to enum
   */
  private mapPaymentMethod(method?: string): PaymentMethod {
    if (!method) return PaymentMethod.CASH;

    const lower = method.toLowerCase();

    if (lower.includes('card') || lower.includes('карт')) {
      return PaymentMethod.CARD;
    }
    if (lower.includes('qr') || lower.includes('кью') || lower.includes('sbp')) {
      return PaymentMethod.QR;
    }
    if (lower.includes('online') || lower.includes('онлайн') || lower.includes('mobile')) {
      return PaymentMethod.MOBILE;
    }

    return PaymentMethod.CASH;
  }

  /**
   * Detect file type from filename
   */
  private detectFileType(filename: string): ImportFileType {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      return ImportFileType.EXCEL;
    }

    if (ext === 'csv') {
      return ImportFileType.CSV;
    }

    throw new BadRequestException('Unsupported file type. Use .xlsx, .xls, or .csv');
  }

  /**
   * Get import by ID
   */
  async findOne(id: string): Promise<SalesImport> {
    const importRecord = await this.importRepository.findOne({
      where: { id },
      relations: ['uploaded_by'],
    });

    if (!importRecord) {
      throw new NotFoundException('Import not found');
    }

    return importRecord;
  }

  /**
   * Get all imports with filters
   */
  async findAll(status?: ImportStatus, userId?: string): Promise<SalesImport[]> {
    const query = this.importRepository
      .createQueryBuilder('import')
      .leftJoinAndSelect('import.uploaded_by', 'user')
      .orderBy('import.created_at', 'DESC');

    if (status) {
      query.andWhere('import.status = :status', { status });
    }

    if (userId) {
      query.andWhere('import.uploaded_by_user_id = :userId', { userId });
    }

    return query.getMany();
  }

  /**
   * Retry failed import
   */
  async retryImport(id: string): Promise<SalesImport> {
    const importRecord = await this.findOne(id);

    if (importRecord.status !== ImportStatus.FAILED) {
      throw new BadRequestException('Can only retry failed imports');
    }

    // Reset status
    importRecord.status = ImportStatus.PENDING;
    importRecord.started_at = null;
    importRecord.completed_at = null;
    importRecord.errors = null;

    return this.importRepository.save(importRecord);
  }

  /**
   * Get job status from queue
   */
  async getJobStatus(jobId: string): Promise<{
    jobId: string | number;
    state: string;
    progress: number | object;
    data: Record<string, unknown>;
    failedReason: string | null | undefined;
    attemptsMade: number;
    processedOn: number | null | undefined;
    finishedOn: number | null | undefined;
  }> {
    const job = await this.salesImportQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const progress = job.progress();
    const failedReason = job.failedReason;

    return {
      jobId: job.id,
      state,
      progress,
      data: job.data,
      failedReason,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  /**
   * Delete import
   */
  async remove(id: string): Promise<void> {
    const importRecord = await this.findOne(id);
    await this.importRepository.softRemove(importRecord);
  }
}
