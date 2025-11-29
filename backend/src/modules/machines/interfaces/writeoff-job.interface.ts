import { WriteoffMachineDto } from '../dto/writeoff-machine.dto';

/**
 * Data structure for writeoff background job
 */
export interface WriteoffJobData {
  machineId: string;
  writeoffDto: WriteoffMachineDto;
  userId?: string; // User who initiated the writeoff
  requestId?: string; // For request tracing
  timestamp: string; // ISO timestamp when job was created
}

/**
 * Result of writeoff job processing
 */
export interface WriteoffJobResult {
  success: boolean;
  machineId: string;
  machineNumber: string;
  transactionId?: string;
  bookValue: number;
  disposalDate: Date;
  message: string;
}
