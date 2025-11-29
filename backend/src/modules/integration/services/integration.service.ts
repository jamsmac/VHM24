import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration, IntegrationStatus, IntegrationType } from '../entities/integration.entity';
import { addMinutes } from 'date-fns';

@Injectable()
export class IntegrationService {
  constructor(
    @InjectRepository(Integration)
    private integrationRepository: Repository<Integration>,
  ) {}

  async findAll(type?: IntegrationType): Promise<Integration[]> {
    const where: any = {};

    if (type) {
      where.type = type;
    }

    return this.integrationRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Integration> {
    const integration = await this.integrationRepository.findOne({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }

    return integration;
  }

  async findByCode(code: string): Promise<Integration> {
    const integration = await this.integrationRepository.findOne({
      where: { code },
    });

    if (!integration) {
      throw new NotFoundException(`Integration with code ${code} not found`);
    }

    return integration;
  }

  async getActive(): Promise<Integration[]> {
    return this.integrationRepository.find({
      where: { status: IntegrationStatus.ACTIVE },
      order: { name: 'ASC' },
    });
  }

  async activate(id: string): Promise<Integration> {
    const integration = await this.findOne(id);

    integration.status = IntegrationStatus.ACTIVE;

    // Schedule next sync if auto-sync is enabled
    if (integration.auto_sync_enabled && integration.sync_interval_minutes > 0) {
      integration.next_sync_at = addMinutes(new Date(), integration.sync_interval_minutes);
    }

    return this.integrationRepository.save(integration);
  }

  async deactivate(id: string): Promise<Integration> {
    const integration = await this.findOne(id);

    integration.status = IntegrationStatus.INACTIVE;
    integration.next_sync_at = null;

    return this.integrationRepository.save(integration);
  }

  async updateLastSync(id: string): Promise<Integration> {
    const integration = await this.findOne(id);

    integration.last_sync_at = new Date();

    // Schedule next sync if enabled
    if (integration.auto_sync_enabled && integration.sync_interval_minutes > 0) {
      integration.next_sync_at = addMinutes(new Date(), integration.sync_interval_minutes);
    }

    return this.integrationRepository.save(integration);
  }

  async getDueForSync(): Promise<Integration[]> {
    const now = new Date();

    return this.integrationRepository
      .createQueryBuilder('integration')
      .where('integration.status = :status', {
        status: IntegrationStatus.ACTIVE,
      })
      .andWhere('integration.auto_sync_enabled = true')
      .andWhere('integration.next_sync_at IS NOT NULL')
      .andWhere('integration.next_sync_at <= :now', { now })
      .getMany();
  }

  async updateStats(id: string, success: boolean, errorMessage?: string): Promise<void> {
    const integration = await this.findOne(id);

    const stats = integration.metadata?.stats || {
      total_calls: 0,
      successful_calls: 0,
      failed_calls: 0,
    };

    stats.total_calls = (stats.total_calls ?? 0) + 1;
    if (success) {
      stats.successful_calls = (stats.successful_calls ?? 0) + 1;
    } else {
      stats.failed_calls = (stats.failed_calls ?? 0) + 1;
    }

    integration.metadata = {
      ...integration.metadata,
      stats,
      last_error: errorMessage || undefined,
    };

    if (!success) {
      integration.status = IntegrationStatus.ERROR;
    }

    await this.integrationRepository.save(integration);
  }
}
