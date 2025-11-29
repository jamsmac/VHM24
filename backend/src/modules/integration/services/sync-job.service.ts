import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncJob, SyncJobStatus, SyncDirection } from '../entities/sync-job.entity';

@Injectable()
export class SyncJobService {
  constructor(
    @InjectRepository(SyncJob)
    private syncJobRepository: Repository<SyncJob>,
  ) {}

  async createJob(data: {
    integration_id: string;
    job_name: string;
    direction: SyncDirection;
    entity_type: string;
    scheduled_at: Date;
    config?: Record<string, any>;
    triggered_by_id?: string;
  }): Promise<SyncJob> {
    const job = this.syncJobRepository.create({
      ...data,
      status: SyncJobStatus.SCHEDULED,
    });

    return this.syncJobRepository.save(job);
  }

  async startJob(id: string): Promise<SyncJob> {
    const job = await this.syncJobRepository.findOne({ where: { id } });

    if (!job) {
      throw new NotFoundException(`Sync job with ID ${id} not found`);
    }

    job.status = SyncJobStatus.RUNNING;
    job.started_at = new Date();

    return this.syncJobRepository.save(job);
  }

  async updateProgress(
    id: string,
    processed: number,
    successful: number,
    failed: number,
  ): Promise<SyncJob> {
    const job = await this.syncJobRepository.findOne({ where: { id } });

    if (!job) {
      throw new NotFoundException(`Sync job with ID ${id} not found`);
    }

    job.processed_records = processed;
    job.successful_records = successful;
    job.failed_records = failed;

    return this.syncJobRepository.save(job);
  }

  async completeJob(id: string, results?: Record<string, any>): Promise<SyncJob> {
    const job = await this.syncJobRepository.findOne({ where: { id } });

    if (!job) {
      throw new NotFoundException(`Sync job with ID ${id} not found`);
    }

    job.status = SyncJobStatus.COMPLETED;
    job.completed_at = new Date();

    if (job.started_at) {
      job.duration_ms = new Date().getTime() - new Date(job.started_at).getTime();
    }

    if (results) {
      job.results = results;
    }

    return this.syncJobRepository.save(job);
  }

  async failJob(id: string, errorMessage: string): Promise<SyncJob> {
    const job = await this.syncJobRepository.findOne({ where: { id } });

    if (!job) {
      throw new NotFoundException(`Sync job with ID ${id} not found`);
    }

    job.status = SyncJobStatus.FAILED;
    job.completed_at = new Date();
    job.error_message = errorMessage;

    if (job.started_at) {
      job.duration_ms = new Date().getTime() - new Date(job.started_at).getTime();
    }

    return this.syncJobRepository.save(job);
  }

  async getScheduledJobs(): Promise<SyncJob[]> {
    const now = new Date();

    return this.syncJobRepository
      .createQueryBuilder('job')
      .where('job.status = :status', { status: SyncJobStatus.SCHEDULED })
      .andWhere('job.scheduled_at <= :now', { now })
      .orderBy('job.scheduled_at', 'ASC')
      .getMany();
  }

  async getJobsByIntegration(integrationId: string, limit: number = 50): Promise<SyncJob[]> {
    return this.syncJobRepository.find({
      where: { integration_id: integrationId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async getJobHistory(integrationId: string, entityType?: string): Promise<SyncJob[]> {
    const query = this.syncJobRepository
      .createQueryBuilder('job')
      .where('job.integration_id = :integrationId', { integrationId })
      .andWhere('job.status IN (:...statuses)', {
        statuses: [SyncJobStatus.COMPLETED, SyncJobStatus.FAILED],
      });

    if (entityType) {
      query.andWhere('job.entity_type = :entityType', { entityType });
    }

    return query.orderBy('job.completed_at', 'DESC').take(100).getMany();
  }
}
