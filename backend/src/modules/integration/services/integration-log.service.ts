import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { IntegrationLog, LogLevel, RequestMethod } from '../entities/integration-log.entity';

@Injectable()
export class IntegrationLogService {
  constructor(
    @InjectRepository(IntegrationLog)
    private logRepository: Repository<IntegrationLog>,
  ) {}

  async createLog(data: {
    integration_id: string;
    method: RequestMethod;
    endpoint: string;
    level?: LogLevel;
    status_code?: number;
    request_body?: string;
    response_body?: string;
    request_headers?: Record<string, string>;
    response_headers?: Record<string, string>;
    duration_ms?: number;
    success: boolean;
    error_message?: string;
    stack_trace?: string;
    user_id?: string;
    metadata?: Record<string, any>;
  }): Promise<IntegrationLog> {
    const log = this.logRepository.create({
      ...data,
      level: data.level || (data.success ? LogLevel.INFO : LogLevel.ERROR),
    });

    return this.logRepository.save(log);
  }

  async findByIntegration(integrationId: string, limit: number = 100): Promise<IntegrationLog[]> {
    return this.logRepository.find({
      where: { integration_id: integrationId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    integrationId?: string,
  ): Promise<IntegrationLog[]> {
    const query = this.logRepository
      .createQueryBuilder('log')
      .where('log.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      });

    if (integrationId) {
      query.andWhere('log.integration_id = :integrationId', { integrationId });
    }

    return query.orderBy('log.created_at', 'DESC').getMany();
  }

  async getErrors(integrationId: string, limit: number = 50): Promise<IntegrationLog[]> {
    return this.logRepository.find({
      where: {
        integration_id: integrationId,
        success: false,
      },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async getStats(
    integrationId: string,
    days: number = 7,
  ): Promise<{
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    average_duration_ms: number;
    error_rate: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.findByDateRange(startDate, new Date(), integrationId);

    const stats = {
      total_requests: logs.length,
      successful_requests: 0,
      failed_requests: 0,
      average_duration_ms: 0,
      error_rate: 0,
    };

    let totalDuration = 0;

    logs.forEach((log) => {
      if (log.success) {
        stats.successful_requests++;
      } else {
        stats.failed_requests++;
      }
      if (log.duration_ms) {
        totalDuration += log.duration_ms;
      }
    });

    if (logs.length > 0) {
      stats.average_duration_ms = Math.round(totalDuration / logs.length);
      stats.error_rate = (stats.failed_requests / stats.total_requests) * 100;
    }

    return stats;
  }

  async cleanOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.logRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
