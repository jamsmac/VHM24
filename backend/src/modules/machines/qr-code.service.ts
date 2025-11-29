import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { Machine } from './entities/machine.entity';
import { randomBytes } from 'crypto';

/**
 * QR Code Service
 * Generates QR codes for machines to enable public complaint submissions
 */
@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
  }

  /**
   * Generate QR code for a machine
   * Returns base64-encoded PNG image
   */
  async generateQrCodeImage(machineId: string): Promise<string> {
    const machine = await this.machineRepository.findOne({
      where: { id: machineId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${machineId} not found`);
    }

    // Generate QR code URL
    const complaintUrl = this.getComplaintUrl(machine.qr_code);

    try {
      // Generate QR code as base64 PNG
      const qrCodeDataUrl = await QRCode.toDataURL(complaintUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      this.logger.log(`QR code generated for machine ${machine.machine_number}`);

      return qrCodeDataUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate QR code for machine ${machine.machine_number}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate QR code as Buffer (for saving to file)
   */
  async generateQrCodeBuffer(machineId: string): Promise<Buffer> {
    const machine = await this.machineRepository.findOne({
      where: { id: machineId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${machineId} not found`);
    }

    const complaintUrl = this.getComplaintUrl(machine.qr_code);

    try {
      const buffer = await QRCode.toBuffer(complaintUrl, {
        errorCorrectionLevel: 'M',
        type: 'png',
        width: 400,
        margin: 2,
      });

      return buffer;
    } catch (error) {
      this.logger.error(
        `Failed to generate QR code buffer for machine ${machine.machine_number}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get public complaint URL for QR code
   */
  getComplaintUrl(qrCode: string): string {
    return `${this.frontendUrl}/public/complaint/${qrCode}`;
  }

  /**
   * Generate unique QR code string
   */
  generateUniqueQrCode(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    return `QR-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Regenerate QR code for a machine
   */
  async regenerateQrCode(machineId: string): Promise<Machine> {
    const machine = await this.machineRepository.findOne({
      where: { id: machineId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${machineId} not found`);
    }

    // Generate new unique QR code
    let newQrCode = this.generateUniqueQrCode();

    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const existing = await this.machineRepository.findOne({
        where: { qr_code: newQrCode },
      });

      if (!existing) break;

      newQrCode = this.generateUniqueQrCode();
      attempts++;
    }

    if (attempts >= 10) {
      throw new Error('Failed to generate unique QR code after 10 attempts');
    }

    // Update machine
    machine.qr_code = newQrCode;
    machine.qr_code_url = this.getComplaintUrl(newQrCode);

    await this.machineRepository.save(machine);

    this.logger.log(`QR code regenerated for machine ${machine.machine_number}: ${newQrCode}`);

    return machine;
  }

  /**
   * Assign QR code to new machine
   */
  async assignQrCodeToMachine(machine: Machine): Promise<Machine> {
    if (!machine.qr_code) {
      machine.qr_code = this.generateUniqueQrCode();
      machine.qr_code_url = this.getComplaintUrl(machine.qr_code);

      this.logger.log(
        `QR code assigned to new machine ${machine.machine_number}: ${machine.qr_code}`,
      );
    }

    return machine;
  }

  /**
   * Verify QR code exists and return machine
   */
  async getMachineByQrCode(qrCode: string): Promise<Machine> {
    const machine = await this.machineRepository.findOne({
      where: { qr_code: qrCode },
      relations: ['location'],
    });

    if (!machine) {
      throw new NotFoundException(`Machine with QR code ${qrCode} not found`);
    }

    return machine;
  }

  /**
   * Generate QR codes for all machines without one
   */
  async generateMissingQrCodes(): Promise<number> {
    const machinesWithoutQr = await this.machineRepository
      .createQueryBuilder('machine')
      .where('machine.qr_code IS NULL OR machine.qr_code = :empty', {
        empty: '',
      })
      .getMany();

    let count = 0;

    for (const machine of machinesWithoutQr) {
      machine.qr_code = this.generateUniqueQrCode();
      machine.qr_code_url = this.getComplaintUrl(machine.qr_code);
      await this.machineRepository.save(machine);
      count++;
    }

    this.logger.log(`Generated ${count} missing QR codes`);

    return count;
  }
}
