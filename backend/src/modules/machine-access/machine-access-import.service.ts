import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import { MachineAccessService } from './machine-access.service';
import { MachineAccess, MachineAccessRole } from './entities/machine-access.entity';
import { ImportMachineAccessResponseDto } from './dto';

interface ImportRow {
  machine_number?: string;
  serial_number?: string;
  user_identifier: string;
  role: string;
}

@Injectable()
export class MachineAccessImportService {
  constructor(
    private readonly machineAccessService: MachineAccessService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Import machine access entries from CSV file.
   * Columns: machine_number (or machine_code), serial_number, user_identifier, role
   */
  async importFromCsv(
    fileBuffer: Buffer,
    createdById: string,
  ): Promise<ImportMachineAccessResponseDto> {
    const rows = await this.parseCsv(fileBuffer);
    return this.processImportRows(rows, createdById);
  }

  /**
   * Import machine access entries from XLSX file.
   */
  async importFromXlsx(
    fileBuffer: Buffer,
    createdById: string,
  ): Promise<ImportMachineAccessResponseDto> {
    const rows = await this.parseXlsx(fileBuffer);
    return this.processImportRows(rows, createdById);
  }

  /**
   * Parse CSV buffer into rows
   */
  private async parseCsv(buffer: Buffer): Promise<ImportRow[]> {
    return new Promise((resolve, reject) => {
      const rows: ImportRow[] = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(
          csv({
            mapHeaders: ({ header }) => this.normalizeHeader(header),
          }),
        )
        .on('data', (row) => {
          rows.push(this.normalizeRow(row));
        })
        .on('end', () => resolve(rows))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Parse XLSX buffer into rows
   */
  private async parseXlsx(buffer: Buffer): Promise<ImportRow[]> {
    try {
      // Dynamic import to avoid issues if exceljs is not installed
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      // Cast buffer to satisfy exceljs type requirements
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('No worksheet found in file');
      }

      const rows: ImportRow[] = [];
      const headers: string[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          // Header row
          row.eachCell((cell) => {
            headers.push(this.normalizeHeader(String(cell.value || '')));
          });
        } else {
          // Data row
          const rowData: Record<string, string> = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) {
              rowData[header] = String(cell.value || '');
            }
          });
          rows.push(this.normalizeRow(rowData));
        }
      });

      return rows;
    } catch (error) {
      throw new Error(`Failed to parse XLSX: ${error.message}`);
    }
  }

  /**
   * Normalize header names to standard format
   */
  private normalizeHeader(header: string): string {
    const normalized = header.toLowerCase().trim().replace(/\s+/g, '_');

    // Map common variations
    const mappings: Record<string, string> = {
      machine_code: 'machine_number',
      machinecode: 'machine_number',
      machinenumber: 'machine_number',
      machine_id: 'machine_number',
      serial: 'serial_number',
      serialnumber: 'serial_number',
      user: 'user_identifier',
      user_id: 'user_identifier',
      userid: 'user_identifier',
      email: 'user_identifier',
      username: 'user_identifier',
      telegram: 'user_identifier',
      telegram_username: 'user_identifier',
    };

    return mappings[normalized] || normalized;
  }

  /**
   * Normalize row data
   */
  private normalizeRow(row: Record<string, string>): ImportRow {
    return {
      machine_number: row.machine_number?.trim() || undefined,
      serial_number: row.serial_number?.trim() || undefined,
      user_identifier: row.user_identifier?.trim() || '',
      role: row.role?.trim().toLowerCase() || '',
    };
  }

  /**
   * Process imported rows and create/update access entries
   */
  private async processImportRows(
    rows: ImportRow[],
    createdById: string,
  ): Promise<ImportMachineAccessResponseDto> {
    const result: ImportMachineAccessResponseDto = {
      applied_count: 0,
      updated_count: 0,
      skipped_count: 0,
      errors: [],
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const batchSize = 500;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        for (let j = 0; j < batch.length; j++) {
          const row = batch[j];
          const rowNumber = i + j + 2; // +2 for 1-based index and header row

          try {
            const processResult = await this.processRow(row, createdById, queryRunner);
            if (processResult === 'applied') {
              result.applied_count++;
            } else if (processResult === 'updated') {
              result.updated_count++;
            }
          } catch (error) {
            result.skipped_count++;
            result.errors.push({
              rowNumber,
              reason: error.message,
              rawRow: row as unknown as Record<string, any>,
            });
          }
        }
      }

      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Process a single row
   */
  private async processRow(
    row: ImportRow,
    createdById: string,
    queryRunner: any,
  ): Promise<'applied' | 'updated' | 'skipped'> {
    // Validate row
    if (!row.machine_number && !row.serial_number) {
      throw new Error('Machine not specified (machine_number or serial_number required)');
    }

    if (!row.user_identifier) {
      throw new Error('User not specified (user_identifier required)');
    }

    if (!row.role) {
      throw new Error('Role not specified');
    }

    // Validate role
    const role = this.parseRole(row.role);
    if (!role) {
      throw new Error(`Invalid role: ${row.role}`);
    }

    // Resolve machine
    const machine = await this.machineAccessService.resolveMachine(
      row.machine_number,
      row.serial_number,
    );
    if (!machine) {
      throw new Error(
        `Machine not found: ${row.machine_number || row.serial_number}`,
      );
    }

    // Resolve user
    const user = await this.machineAccessService.resolveUser(row.user_identifier);
    if (!user) {
      throw new Error(`User not found: ${row.user_identifier}`);
    }

    // Check if entry exists
    const existing = await queryRunner.manager.findOne(MachineAccess, {
      where: { machine_id: machine.id, user_id: user.id },
    });

    if (existing) {
      if (existing.role !== role) {
        existing.role = role;
        await queryRunner.manager.save(existing);
        return 'updated';
      }
      return 'skipped';
    }

    // Create new entry
    const access = queryRunner.manager.create(MachineAccess, {
      machine_id: machine.id,
      user_id: user.id,
      role,
      created_by_id: createdById,
    });
    await queryRunner.manager.save(access);
    return 'applied';
  }

  /**
   * Parse role string to enum
   */
  private parseRole(roleStr: string): MachineAccessRole | null {
    const normalized = roleStr.toLowerCase().trim();
    const roleMap: Record<string, MachineAccessRole> = {
      owner: MachineAccessRole.OWNER,
      admin: MachineAccessRole.ADMIN,
      manager: MachineAccessRole.MANAGER,
      operator: MachineAccessRole.OPERATOR,
      technician: MachineAccessRole.TECHNICIAN,
      viewer: MachineAccessRole.VIEWER,
    };
    return roleMap[normalized] || null;
  }
}
