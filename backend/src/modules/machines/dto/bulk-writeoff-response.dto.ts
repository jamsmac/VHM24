import { ApiProperty } from '@nestjs/swagger';

export class BulkWriteoffResponseDto {
  @ApiProperty({
    example: 5,
    description: 'Total number of machines to writeoff',
  })
  total: number;

  @ApiProperty({
    example: 4,
    description: 'Number of successfully queued writeoffs',
  })
  queued: number;

  @ApiProperty({
    example: 1,
    description: 'Number of failed writeoff attempts',
  })
  failed: number;

  @ApiProperty({
    example: ['writeoff-1', 'writeoff-2', 'writeoff-3', 'writeoff-4'],
    description: 'List of job IDs for successful writeoffs',
    type: [String],
  })
  jobIds: string[];

  @ApiProperty({
    example: [{ machineId: 'uuid-5', error: 'Machine already disposed' }],
    description: 'Details of failed writeoff attempts',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        machineId: { type: 'string' },
        error: { type: 'string' },
      },
    },
  })
  failures: { machineId: string; error: string }[];

  @ApiProperty({
    example: 'Bulk writeoff operation initiated. 4 machines queued for processing.',
    description: 'Summary message',
  })
  message: string;
}
