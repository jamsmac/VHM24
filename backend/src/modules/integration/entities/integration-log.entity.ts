import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Integration } from './integration.entity';

export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  DEBUG = 'debug',
}

export enum RequestMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

@Entity('integration_logs')
export class IntegrationLog extends BaseEntity {
  @Column({ type: 'uuid' })
  integration_id: string;

  @ManyToOne(() => Integration, (integration) => integration.logs)
  @JoinColumn({ name: 'integration_id' })
  integration: Integration;

  @Column({ type: 'enum', enum: LogLevel, default: LogLevel.INFO })
  level: LogLevel;

  @Column({ type: 'enum', enum: RequestMethod })
  method: RequestMethod;

  @Column({ type: 'varchar', length: 500 })
  endpoint: string;

  @Column({ type: 'integer', nullable: true })
  status_code: number | null;

  @Column({ type: 'text', nullable: true })
  request_body: string | null;

  @Column({ type: 'text', nullable: true })
  response_body: string | null;

  @Column({ type: 'jsonb', default: {} })
  request_headers: Record<string, string>;

  @Column({ type: 'jsonb', default: {} })
  response_headers: Record<string, string>;

  @Column({ type: 'integer', nullable: true })
  duration_ms: number | null;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'text', nullable: true })
  stack_trace: string | null;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    ip_address?: string;
    user_agent?: string;
    correlation_id?: string;
    [key: string]: unknown;
  };
}
