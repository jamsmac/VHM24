import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import * as csv from 'csv-parser';
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

interface ProcessFileJob {
  importId: string;
  buffer: Buffer;
  fileType: ImportFileType;
  userId: string;
}

/**
 * Background processor for sales import files
 *
 * Processes uploaded CSV/Excel files in the background to avoid blocking API requests.
 * Supports retry on failure with exponential backoff.
 */
@Processor('sales-import')
export class SalesImportProcessor {
  private readonly logger = new Logger(SalesImportProcessor.name);

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
  ) {}

  /**
   * Process sales import file
   */
  @Process('process-file')
  async handleProcessFile(
    job: Job<ProcessFileJob>,
  ): Promise<{ success: boolean; processedRows: number }> {
    const { importId, buffer, fileType } = job.data;

    this.logger.log(`🔄 Начало обработки файла импорта ${importId}, тип: ${fileType}`);

    const importRecord = await this.importRepository.findOne({
      where: { id: importId },
    });

    if (!importRecord) {
      throw new Error(`Import record ${importId} not found`);
    }

    try {
      // Update status to processing
      importRecord.status = ImportStatus.PROCESSING;
      importRecord.started_at = new Date();
      await this.importRepository.save(importRecord);

      // Update job progress
      await job.progress(10);

      // Parse file based on type
      const rows = await this.parseFile(buffer, fileType);
      this.logger.log(`📄 Файл распарсен: ${rows.length} строк`);

      await job.progress(30);

      // Process rows in transaction
      let processedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      await this.dataSource.transaction(async (manager) => {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];

          try {
            // Find or create machine (with contract_id for Phase 3 commission tracking)
            const machine = await manager.findOne(Machine, {
              where: { machine_number: row.machine_number },
              select: ['id', 'machine_number', 'contract_id'], // Phase 3: Load contract_id
            });

            if (!machine) {
              errors.push(`Строка ${i + 1}: Аппарат ${row.machine_number} не найден`);
              errorCount++;
              continue;
            }

            // Find nomenclature if product name provided
            let nomenclature: Nomenclature | null = null;
            if (row.product_name) {
              nomenclature = await manager.findOne(Nomenclature, {
                where: { name: row.product_name },
              });

              if (!nomenclature) {
                errors.push(`Строка ${i + 1}: Товар "${row.product_name}" не найден`);
              }
            }

            // Determine payment method
            let paymentMethod = PaymentMethod.CASH;
            if (row.payment_method) {
              const method = row.payment_method.toLowerCase();
              if (method.includes('card') || method.includes('карт')) {
                paymentMethod = PaymentMethod.CARD;
              } else if (method.includes('mobile') || method.includes('моб')) {
                paymentMethod = PaymentMethod.MOBILE;
              } else if (method.includes('qr')) {
                paymentMethod = PaymentMethod.QR;
              }
            }

            // VALIDATION 1: Amount must be positive
            if (!row.amount || row.amount <= 0) {
              errors.push(`Строка ${i + 1}: Сумма должна быть больше 0 (указано: ${row.amount})`);
              errorCount++;
              continue;
            }

            // VALIDATION 2: Amount must be reasonable (max 1,000,000)
            if (row.amount > 1_000_000) {
              errors.push(
                `Строка ${i + 1}: Сумма слишком большая (максимум 1,000,000, указано: ${row.amount})`,
              );
              errorCount++;
              continue;
            }

            // VALIDATION 3: Date validation
            if (!row.date) {
              errors.push(`Строка ${i + 1}: Дата обязательна`);
              errorCount++;
              continue;
            }

            const saleDate = new Date(row.date);
            const today = new Date();
            today.setHours(23, 59, 59, 999); // End of today

            // Date cannot be in the future
            if (saleDate > today) {
              errors.push(
                `Строка ${i + 1}: Дата продажи не может быть в будущем ` +
                  `(указано: ${saleDate.toISOString().split('T')[0]}, ` +
                  `сегодня: ${today.toISOString().split('T')[0]})`,
              );
              errorCount++;
              continue;
            }

            // Date cannot be too old (more than 1 year)
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            if (saleDate < oneYearAgo) {
              errors.push(
                `Строка ${i + 1}: Дата слишком старая (более 1 года назад). ` +
                  `Указано: ${saleDate.toISOString().split('T')[0]}`,
              );
              errorCount++;
              continue;
            }

            // VALIDATION 4: Quantity validation (if provided)
            if (row.quantity !== undefined && row.quantity <= 0) {
              errors.push(
                `Строка ${i + 1}: Количество должно быть больше 0 (указано: ${row.quantity})`,
              );
              errorCount++;
              continue;
            }

            // DUPLICATE DETECTION: Check for identical transaction
            // Improved: Also check payment_method and exclude soft-deleted transactions
            const duplicate = await manager
              .createQueryBuilder(Transaction, 't')
              .where('t.transaction_type = :type', { type: TransactionType.SALE })
              .andWhere('t.machine_id = :machineId', { machineId: machine.id })
              .andWhere('t.amount = :amount', { amount: row.amount })
              .andWhere('t.sale_date = :saleDate', {
                saleDate: saleDate.toISOString().split('T')[0],
              })
              .andWhere('t.payment_method = :paymentMethod', { paymentMethod: paymentMethod })
              .andWhere('t.deleted_at IS NULL') // Exclude soft-deleted
              .getOne();

            if (duplicate) {
              errors.push(
                `Строка ${i + 1}: Возможный дубликат транзакции ` +
                  `(аппарат: ${row.machine_number}, дата: ${saleDate.toISOString().split('T')[0]}, ` +
                  `сумма: ${row.amount}, способ оплаты: ${paymentMethod}). ` +
                  `Пропущено для избежания двойного учета.`,
              );
              errorCount++;
              continue;
            }

            // Create transaction
            const transaction = manager.create(Transaction, {
              transaction_type: TransactionType.SALE,
              machine_id: machine.id,
              contract_id: machine.contract_id || null, // Phase 3: Auto-link to contract
              nomenclature_id: nomenclature?.id,
              amount: row.amount,
              currency: 'UZS', // Uzbekistan market
              payment_method: paymentMethod,
              quantity: row.quantity || 1,
              sale_date: saleDate,
              transaction_date: saleDate,
              description: `Импорт продаж из файла ${importRecord.filename}`,
              metadata: {
                import_id: importId,
                row_number: i + 1,
                original_product_name: row.product_name,
              },
            });

            await manager.save(Transaction, transaction);

            // Deduct inventory if nomenclature found
            if (nomenclature && row.quantity) {
              try {
                await this.inventoryService.deductFromMachine(
                  machine.id,
                  nomenclature.id,
                  row.quantity,
                  `Продажа из импорта ${importId}`,
                );
              } catch (error) {
                this.logger.warn(
                  `Не удалось списать инвентарь для строки ${i + 1}: ${error.message}`,
                );
                // Continue processing, just log the warning
              }
            }

            processedCount++;

            // Update progress every 10%
            if (i % Math.ceil(rows.length / 10) === 0) {
              const progress = 30 + Math.floor((i / rows.length) * 60);
              await job.progress(progress);
            }
          } catch (error) {
            this.logger.error(`Ошибка обработки строки ${i + 1}:`, error);
            errors.push(`Строка ${i + 1}: ${error.message}`);
            errorCount++;
          }
        }
      });

      await job.progress(95);

      // Update import record with results
      importRecord.status =
        errorCount === rows.length ? ImportStatus.FAILED : ImportStatus.COMPLETED;
      importRecord.completed_at = new Date();
      importRecord.total_rows = rows.length;
      importRecord.success_rows = processedCount;
      importRecord.failed_rows = errorCount;
      importRecord.errors = errors.length > 0 ? { errors } : null;

      await this.importRepository.save(importRecord);

      await job.progress(100);

      this.logger.log(
        `✅ Импорт ${importId} завершен: ${processedCount}/${rows.length} строк обработано, ${errorCount} ошибок`,
      );

      return {
        success: errorCount < rows.length,
        processedRows: processedCount,
      };
    } catch (error) {
      this.logger.error(`❌ Критическая ошибка обработки импорта ${importId}:`, error);

      // Update import record as failed
      importRecord.status = ImportStatus.FAILED;
      importRecord.completed_at = new Date();
      importRecord.message = error.message;
      await this.importRepository.save(importRecord);

      throw error; // Re-throw for Bull to handle retry
    }
  }

  /**
   * Parse file based on type
   */
  private async parseFile(buffer: Buffer, fileType: ImportFileType): Promise<ParsedRow[]> {
    if (fileType === ImportFileType.CSV) {
      return this.parseCSV(buffer);
    } else if (fileType === ImportFileType.EXCEL) {
      return this.parseExcel(buffer);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Parse CSV file
   */
  private async parseCSV(buffer: Buffer): Promise<ParsedRow[]> {
    return new Promise((resolve, reject) => {
      const rows: ParsedRow[] = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(csv())
        .on('data', (row: Record<string, unknown>) => {
          rows.push({
            date: String(row.date || row['Дата'] || row['Date'] || ''),
            machine_number: String(row.machine_number || row['Номер аппарата'] || row['Machine Number'] || ''),
            amount: parseFloat(String(row.amount || row['Сумма'] || row['Amount'] || '0')),
            payment_method: String(row.payment_method || row['Способ оплаты'] || row['Payment Method'] || ''),
            product_name: String(row.product_name || row['Товар'] || row['Product'] || ''),
            quantity: parseInt(String(row.quantity || row['Количество'] || row['Quantity'] || '1')),
          });
        })
        .on('end', () => resolve(rows))
        .on('error', reject);
    });
  }

  /**
   * Parse Excel file
   */
  private async parseExcel(buffer: Buffer): Promise<ParsedRow[]> {
    const workbook = new ExcelJS.Workbook();
    // ExcelJS accepts ArrayBuffer, Node Buffer is compatible but requires type assertion
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Excel file is empty or invalid');
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

    return jsonData.map((row) => ({
      date: String(row.date || row['Дата'] || row['Date'] || ''),
      machine_number: String(row.machine_number || row['Номер аппарата'] || row['Machine Number'] || ''),
      amount: parseFloat(String(row.amount || row['Сумма'] || row['Amount'] || '0')),
      payment_method: String(row.payment_method || row['Способ оплаты'] || row['Payment Method'] || ''),
      product_name: String(row.product_name || row['Товар'] || row['Product'] || ''),
      quantity: parseInt(String(row.quantity || row['Количество'] || row['Quantity'] || '1')),
    }));
  }
}
