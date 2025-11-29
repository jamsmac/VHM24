import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook, WebhookStatus } from '../entities/webhook.entity';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
  ) {}

  async createWebhook(data: {
    integration_id?: string;
    event_type: string;
    source?: string;
    external_id?: string;
    payload: Record<string, any>;
    headers?: Record<string, string>;
    signature?: string;
    metadata?: Record<string, any>;
  }): Promise<Webhook> {
    const webhook = this.webhookRepository.create({
      ...data,
      status: WebhookStatus.PENDING,
    });

    return this.webhookRepository.save(webhook);
  }

  async processWebhook(id: string): Promise<Webhook> {
    const webhook = await this.webhookRepository.findOne({ where: { id } });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    webhook.status = WebhookStatus.PROCESSING;

    return this.webhookRepository.save(webhook);
  }

  async completeWebhook(id: string): Promise<Webhook> {
    const webhook = await this.webhookRepository.findOne({ where: { id } });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    webhook.status = WebhookStatus.COMPLETED;
    webhook.processed_at = new Date();

    return this.webhookRepository.save(webhook);
  }

  async failWebhook(id: string, errorMessage: string): Promise<Webhook> {
    const webhook = await this.webhookRepository.findOne({ where: { id } });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    webhook.retry_count++;

    if (webhook.retry_count >= webhook.max_retries) {
      webhook.status = WebhookStatus.FAILED;
    } else {
      webhook.status = WebhookStatus.PENDING; // Retry
    }

    webhook.error_message = errorMessage;

    return this.webhookRepository.save(webhook);
  }

  async getPendingWebhooks(limit: number = 10): Promise<Webhook[]> {
    return this.webhookRepository.find({
      where: { status: WebhookStatus.PENDING },
      order: { created_at: 'ASC' },
      take: limit,
    });
  }

  async verifySignature(
    payload: Record<string, any>,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  async getWebhooksByIntegration(integrationId: string, limit: number = 100): Promise<Webhook[]> {
    return this.webhookRepository.find({
      where: { integration_id: integrationId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async getWebhooksByEventType(eventType: string, limit: number = 100): Promise<Webhook[]> {
    return this.webhookRepository.find({
      where: { event_type: eventType },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
