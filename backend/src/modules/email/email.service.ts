import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
}

/**
 * Email Service using NodeMailer
 * Supports SMTP configuration via environment variables
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.isEmailConfigured();
    if (this.enabled) {
      this.initializeTransporter();
    } else {
      this.logger.warn('Email service is disabled. Set SMTP configuration in .env to enable.');
    }
  }

  /**
   * Check if email is configured
   */
  private isEmailConfigured(): boolean {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    return !!(host && user);
  }

  /**
   * Initialize NodeMailer transporter
   */
  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST'),
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<number>('SMTP_PORT', 587) === 465, // true for 465, false for other ports
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASSWORD'),
        },
      });

      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email transporter:', error.message);
      this.transporter = null;
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      this.logger.warn('Email not sent - service is disabled or not configured');
      return false;
    }

    try {
      const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL', 'noreply@vendhub.com');
      const fromName = this.configService.get<string>('SMTP_FROM_NAME', 'VendHub Manager');

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Send task notification email
   */
  async sendTaskNotification(
    to: string,
    taskType: string,
    machineNumber: string,
    dueDate: Date,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Новая задача назначена</h1>
            </div>
            <div class="content">
              <p>Вам назначена новая задача:</p>
              <ul>
                <li><strong>Тип задачи:</strong> ${taskType}</li>
                <li><strong>Аппарат:</strong> ${machineNumber}</li>
                <li><strong>Срок выполнения:</strong> ${dueDate.toLocaleString('ru-RU')}</li>
              </ul>
              <p>Пожалуйста, войдите в систему для просмотра деталей задачи.</p>
            </div>
            <div class="footer">
              <p>VendHub Manager - Система управления торговыми автоматами</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `Новая задача: ${taskType}`,
      html,
      text: `Вам назначена новая задача: ${taskType} для аппарата ${machineNumber}. Срок: ${dueDate.toLocaleString('ru-RU')}`,
    });
  }

  /**
   * Send overdue task notification
   */
  async sendOverdueNotification(
    to: string,
    taskType: string,
    machineNumber: string,
    hoursOverdue: number,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
            .warning { background-color: #fff3cd; border-left: 4px solid #f44336; padding: 10px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Задача просрочена</h1>
            </div>
            <div class="content">
              <div class="warning">
                <p><strong>Внимание!</strong> Задача просрочена на ${hoursOverdue} часов.</p>
              </div>
              <ul>
                <li><strong>Тип задачи:</strong> ${taskType}</li>
                <li><strong>Аппарат:</strong> ${machineNumber}</li>
                <li><strong>Просрочено на:</strong> ${hoursOverdue} часов</li>
              </ul>
              <p>Пожалуйста, завершите задачу как можно скорее.</p>
            </div>
            <div class="footer">
              <p>VendHub Manager - Система управления торговыми автоматами</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `⚠️ Задача просрочена: ${taskType}`,
      html,
      text: `Задача ${taskType} для аппарата ${machineNumber} просрочена на ${hoursOverdue} часов.`,
    });
  }

  /**
   * Send low stock alert
   */
  async sendLowStockAlert(
    to: string,
    machineNumber: string,
    items: Array<{ name: string; current: number; minimum: number }>,
  ): Promise<boolean> {
    const itemsList = items
      .map((item) => `<li>${item.name}: ${item.current} из ${item.minimum}</li>`)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📦 Низкий запас товара</h1>
            </div>
            <div class="content">
              <p>В аппарате <strong>${machineNumber}</strong> заканчиваются следующие товары:</p>
              <ul>${itemsList}</ul>
              <p>Требуется пополнение.</p>
            </div>
            <div class="footer">
              <p>VendHub Manager - Система управления торговыми автоматами</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `📦 Низкий запас: ${machineNumber}`,
      html,
      text: `В аппарате ${machineNumber} заканчиваются товары. Требуется пополнение.`,
    });
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(to: string, name: string, role: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👋 Добро пожаловать в VendHub Manager!</h1>
            </div>
            <div class="content">
              <p>Здравствуйте, ${name}!</p>
              <p>Ваш аккаунт успешно создан с ролью: <strong>${role}</strong>.</p>
              <p>Вы можете войти в систему используя свои учетные данные.</p>
              <p>Если у вас есть вопросы, обратитесь к администратору системы.</p>
            </div>
            <div class="footer">
              <p>VendHub Manager - Система управления торговыми автоматами</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Добро пожаловать в VendHub Manager',
      html,
      text: `Здравствуйте, ${name}! Ваш аккаунт успешно создан с ролью: ${role}.`,
    });
  }

  /**
   * Send password reset email
   *
   * REQ-AUTH-45: Password Recovery
   */
  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<boolean> {
    const resetUrl =
      this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001') +
      `/auth/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 10px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Сброс пароля</h1>
            </div>
            <div class="content">
              <p>Здравствуйте, ${name}!</p>
              <p>Вы запросили сброс пароля для своего аккаунта в VendHub Manager.</p>
              <p>Нажмите на кнопку ниже, чтобы создать новый пароль:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Сбросить пароль</a>
              </p>
              <p>Или скопируйте и вставьте эту ссылку в браузер:</p>
              <p style="font-size: 12px; word-break: break-all;">${resetUrl}</p>
              <div class="warning">
                <p><strong>Важно:</strong></p>
                <ul>
                  <li>Ссылка действительна в течение 1 часа</li>
                  <li>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо</li>
                  <li>Ваш текущий пароль остается активным до момента создания нового</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>VendHub Manager - Система управления торговыми автоматами</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Здравствуйте, ${name}!

Вы запросили сброс пароля для своего аккаунта в VendHub Manager.

Перейдите по этой ссылке, чтобы создать новый пароль:
${resetUrl}

Ссылка действительна в течение 1 часа.

Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.

---
VendHub Manager - Система управления торговыми автоматами
    `;

    return this.sendEmail({
      to,
      subject: 'Сброс пароля - VendHub Manager',
      html,
      text,
    });
  }

  /**
   * Verify email configuration by sending a test email
   */
  async verifyConfiguration(): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('Email configuration verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email configuration verification failed:', error.message);
      return false;
    }
  }
}
