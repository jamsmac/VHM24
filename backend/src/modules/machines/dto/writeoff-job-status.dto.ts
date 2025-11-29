import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';

/**
 * Result data structure for completed writeoff jobs
 */
export interface WriteoffJobResult {
  transaction_id?: string;
  items_processed?: number;
  total_amount?: number;
  errors?: string[];
  [key: string]: string | number | boolean | string[] | undefined;
}

export enum WriteoffJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class WriteoffJobStatusDto {
  @ApiProperty({
    example: 'writeoff-123e4567-e89b-12d3-a456-426614174000',
    description: 'Job ID',
  })
  jobId: string;

  @ApiProperty({
    enum: WriteoffJobStatus,
    description: 'Current job status',
    example: WriteoffJobStatus.PROCESSING,
  })
  status: WriteoffJobStatus;

  @ApiProperty({
    example: 50,
    description: 'Progress percentage',
    nullable: true,
  })
  progress?: number;

  @ApiProperty({
    example: 'Creating writeoff transaction...',
    description: 'Current operation',
    nullable: true,
  })
  message?: string;

  @ApiProperty({
    example: '2025-11-16T10:00:00Z',
    description: 'Job created timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-11-16T10:01:00Z',
    description: 'Job updated timestamp',
  })
  updatedAt: Date;

  @ApiProperty({
    example: '2025-11-16T10:02:00Z',
    description: 'Job completion timestamp',
    nullable: true,
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'Result data if job completed',
    nullable: true,
    example: {
      transaction_id: 'uuid',
      items_processed: 10,
      total_amount: 5000,
    },
  })
  @IsOptional()
  @IsObject()
  result?: WriteoffJobResult;

  @ApiProperty({
    example: 'Failed to create transaction',
    description: 'Error message if job failed',
    nullable: true,
  })
  error?: string;

  @ApiProperty({
    example: 2,
    description: 'Number of retry attempts',
  })
  attempts: number;
}

export class WriteoffJobResponseDto {
  @ApiProperty({
    example: 'writeoff-123e4567-e89b-12d3-a456-426614174000',
    description: 'Job ID for tracking',
  })
  jobId: string;

  @ApiProperty({
    example: 'Writeoff operation queued for processing',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: '/api/machines/writeoff/job/writeoff-123e4567-e89b-12d3-a456-426614174000',
    description: 'URL to check job status',
  })
  statusUrl: string;
}
