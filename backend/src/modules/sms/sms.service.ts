import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { SendSmsDto, BulkSmsDto, SmsResponseDto } from './dto/send-sms.dto';

/**
 * SMS Service
 *
 * Provides SMS messaging functionality using Twilio as the provider.
 * Supports single and bulk message sending with automatic configuration.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: Twilio | null = null;
  private defaultFrom: string;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeTwilio();
  }

  /**
   * Initialize Twilio client with credentials from environment
   */
  private initializeTwilio(): void {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.defaultFrom = this.configService.get<string>('TWILIO_PHONE_NUMBER', '');

    if (!accountSid || !authToken) {
      this.logger.warn(
        'SMS service not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env',
      );
      return;
    }

    if (!this.defaultFrom) {
      this.logger.warn('TWILIO_PHONE_NUMBER not set. SMS sending may fail without a sender number.');
    }

    try {
      this.client = new Twilio(accountSid, authToken);
      this.isConfigured = true;
      this.logger.log('SMS service (Twilio) configured successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Twilio client: ${error.message}`);
    }
  }

  /**
   * Check if SMS service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Send a single SMS message
   *
   * @param dto - SMS details (recipient, message, optional sender)
   * @returns SMS response with message ID and status
   */
  async send(dto: SendSmsDto): Promise<SmsResponseDto> {
    if (!this.isReady()) {
      this.logger.warn('SMS service not configured, message not sent');
      throw new Error('SMS service not configured');
    }

    const from = dto.from || this.defaultFrom;

    if (!from) {
      throw new Error('No sender phone number configured');
    }

    try {
      const message = await this.client!.messages.create({
        to: dto.to,
        from: from,
        body: dto.message,
      });

      this.logger.log(`SMS sent to ${dto.to}, SID: ${message.sid}, Status: ${message.status}`);

      return {
        messageId: message.sid,
        to: dto.to,
        status: message.status,
        segmentCount: message.numSegments ? parseInt(message.numSegments, 10) : 1,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${dto.to}: ${error.message}`);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Send SMS to a phone number with simple parameters
   *
   * @param to - Recipient phone number in E.164 format
   * @param message - Message content
   * @returns true if sent successfully, false otherwise
   */
  async sendSimple(to: string, message: string): Promise<boolean> {
    try {
      await this.send({ to, message });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}: ${error.message}`);
      return false;
    }
  }

  /**
   * Send SMS to multiple recipients
   *
   * @param dto - Bulk SMS details (recipients array, message)
   * @returns Object with sent count and failed count
   */
  async sendBulk(dto: BulkSmsDto): Promise<{ sent: number; failed: number; results: SmsResponseDto[] }> {
    const results: SmsResponseDto[] = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of dto.to) {
      try {
        const result = await this.send({
          to: recipient,
          message: dto.message,
        });
        results.push(result);
        sent++;
      } catch (error) {
        this.logger.error(`Failed to send bulk SMS to ${recipient}: ${error.message}`);
        failed++;
      }
    }

    this.logger.log(`Bulk SMS complete: ${sent} sent, ${failed} failed`);

    return { sent, failed, results };
  }

  /**
   * Send verification code via SMS
   *
   * @param to - Recipient phone number
   * @param code - Verification code
   * @returns true if sent successfully
   */
  async sendVerificationCode(to: string, code: string): Promise<boolean> {
    const message = `Your VendHub verification code is: ${code}. Valid for 10 minutes.`;
    return this.sendSimple(to, message);
  }

  /**
   * Send task notification via SMS
   *
   * @param to - Recipient phone number
   * @param taskType - Type of task
   * @param machineNumber - Machine identifier
   * @param dueDate - Task due date
   * @returns true if sent successfully
   */
  async sendTaskNotification(
    to: string,
    taskType: string,
    machineNumber: string,
    dueDate: Date,
  ): Promise<boolean> {
    const formattedDate = dueDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const message = `VendHub: New ${taskType} task for machine ${machineNumber}. Due: ${formattedDate}`;
    return this.sendSimple(to, message);
  }

  /**
   * Send urgent alert via SMS
   *
   * @param to - Recipient phone number
   * @param alertMessage - Alert message content
   * @returns true if sent successfully
   */
  async sendUrgentAlert(to: string, alertMessage: string): Promise<boolean> {
    const message = `[URGENT] VendHub Alert: ${alertMessage}`;
    return this.sendSimple(to, message);
  }

  /**
   * Get account balance/usage info (for monitoring)
   */
  async getAccountInfo(): Promise<{
    accountSid: string;
    friendlyName: string;
    status: string;
  } | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const account = await this.client!.api.accounts(
        this.configService.get<string>('TWILIO_ACCOUNT_SID')!,
      ).fetch();

      return {
        accountSid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch account info: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate phone number format (E.164)
   *
   * @param phone - Phone number to validate
   * @returns true if valid E.164 format
   */
  static isValidPhoneNumber(phone: string): boolean {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  /**
   * Format phone number to E.164 (basic formatting for Russian numbers)
   *
   * @param phone - Phone number in various formats
   * @returns E.164 formatted number or null if invalid
   */
  static formatPhoneNumber(phone: string): string | null {
    // Remove all non-digit characters except leading +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Handle Russian numbers
    if (cleaned.startsWith('8') && cleaned.length === 11) {
      cleaned = '+7' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 11) {
      cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+')) {
      // Assume Russian number if 10 digits
      if (cleaned.length === 10) {
        cleaned = '+7' + cleaned;
      }
    }

    return SmsService.isValidPhoneNumber(cleaned) ? cleaned : null;
  }
}
