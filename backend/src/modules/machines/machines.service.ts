import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository, In, Not, IsNull, LessThan, MoreThan } from 'typeorm';
import { Queue, Job } from 'bull';
import { Machine, MachineStatus } from './entities/machine.entity';
import { MachineLocationHistory } from './entities/machine-location-history.entity';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { WriteoffMachineDto } from './dto/writeoff-machine.dto';
import {
  WriteoffJobResponseDto,
  WriteoffJobStatus,
  WriteoffJobStatusDto,
} from './dto/writeoff-job-status.dto';
import { WriteoffJobData } from './interfaces/writeoff-job.interface';
import { BulkWriteoffResponseDto } from './dto/bulk-writeoff-response.dto';
import { QrCodeService } from './qr-code.service';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class MachinesService {
  private readonly logger = new Logger(MachinesService.name);

  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @InjectRepository(MachineLocationHistory)
    private readonly locationHistoryRepository: Repository<MachineLocationHistory>,
    @InjectQueue('machine-writeoff')
    private readonly writeoffQueue: Queue<WriteoffJobData>,
    private readonly qrCodeService: QrCodeService,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Create a new machine with QR code
   *
   * @param createMachineDto - Machine creation data
   * @param userId - ID of user creating the machine
   */
  async create(createMachineDto: CreateMachineDto, userId: string): Promise<Machine> {
    // Check if machine number already exists
    const existingMachine = await this.machineRepository.findOne({
      where: { machine_number: createMachineDto.machine_number },
    });

    if (existingMachine) {
      throw new ConflictException(
        `Machine with number ${createMachineDto.machine_number} already exists`,
      );
    }

    // Generate a unique identifier for QR code
    const qrCodeIdentifier = this.qrCodeService.generateUniqueQrCode();

    // Create machine
    const machine = this.machineRepository.create({
      ...createMachineDto,
      qr_code: qrCodeIdentifier,
      is_online: false,
      // Set default financial values to 0 if not provided
      accumulated_depreciation: 0,
      // Generate QR code URL
      qr_code_url: this.qrCodeService.getComplaintUrl(qrCodeIdentifier),
    });

    const savedMachine = await this.machineRepository.save(machine);

    // Record initial location in history
    if (createMachineDto.location_id) {
      await this.recordLocationChange(savedMachine.id, null, createMachineDto.location_id, userId);
    }

    this.logger.log(
      `Created machine ${savedMachine.machine_number} with QR code ${qrCodeIdentifier}`,
    );

    return savedMachine;
  }

  /**
   * Find all machines with optional filters and pagination
   * @param filters - Optional filters for location, status, online state
   * @param page - Page number (1-based), defaults to 1
   * @param limit - Items per page, defaults to 50, max 200
   * @returns Paginated result with machines and total count
   */
  async findAll(
    filters?: {
      location_id?: string;
      status?: MachineStatus;
      is_online?: boolean;
    },
    page = 1,
    limit = 50,
  ): Promise<{ data: Machine[]; total: number; page: number; limit: number; totalPages: number }> {
    // Ensure reasonable limits
    const sanitizedLimit = Math.min(Math.max(1, limit), 200);
    const sanitizedPage = Math.max(1, page);
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const query = this.machineRepository.createQueryBuilder('machine');
    query.leftJoinAndSelect('machine.location', 'location');

    if (filters?.location_id) {
      query.andWhere('machine.location_id = :location_id', {
        location_id: filters.location_id,
      });
    }

    if (filters?.status) {
      query.andWhere('machine.status = :status', { status: filters.status });
    }

    if (filters?.is_online !== undefined) {
      query.andWhere('machine.is_online = :is_online', {
        is_online: filters.is_online,
      });
    }

    // Apply pagination
    query.skip(skip).take(sanitizedLimit);
    query.orderBy('machine.created_at', 'DESC');

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page: sanitizedPage,
      limit: sanitizedLimit,
      totalPages: Math.ceil(total / sanitizedLimit),
    };
  }

  /**
   * Find all machines without pagination (for internal services)
   * Warning: Use with caution for large datasets
   */
  async findAllSimple(filters?: {
    location_id?: string;
    status?: MachineStatus;
    is_online?: boolean;
  }): Promise<Machine[]> {
    const query = this.machineRepository.createQueryBuilder('machine');
    query.leftJoinAndSelect('machine.location', 'location');

    if (filters?.location_id) {
      query.andWhere('machine.location_id = :location_id', {
        location_id: filters.location_id,
      });
    }

    if (filters?.status) {
      query.andWhere('machine.status = :status', { status: filters.status });
    }

    if (filters?.is_online !== undefined) {
      query.andWhere('machine.is_online = :is_online', {
        is_online: filters.is_online,
      });
    }

    query.orderBy('machine.created_at', 'DESC');
    return query.getMany();
  }

  /**
   * Find machine by ID
   */
  async findOne(id: string): Promise<Machine> {
    const machine = await this.machineRepository.findOne({
      where: { id },
      relations: ['location'],
    });

    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }

    return machine;
  }

  /**
   * Find multiple machines by IDs
   * @param ids - Array of machine UUIDs
   * @returns Array of machines (may be less than input if some IDs not found)
   */
  async findByIds(ids: string[]): Promise<Machine[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.machineRepository.find({
      where: { id: In(ids) },
      relations: ['location'],
    });
  }

  /**
   * Find machine by machine number
   */
  async findByMachineNumber(machineNumber: string): Promise<Machine> {
    const machine = await this.machineRepository.findOne({
      where: { machine_number: machineNumber },
      relations: ['location'],
    });

    if (!machine) {
      throw new NotFoundException(`Machine with number ${machineNumber} not found`);
    }

    return machine;
  }

  /**
   * Find machine by QR code
   */
  async findByQrCode(qrCode: string): Promise<Machine> {
    const machine = await this.machineRepository.findOne({
      where: { qr_code: qrCode },
      relations: ['location'],
    });

    if (!machine) {
      throw new NotFoundException(`Machine with QR code ${qrCode} not found`);
    }

    return machine;
  }

  /**
   * Update machine
   *
   * @param id - Machine ID
   * @param updateMachineDto - Machine update data
   * @param userId - ID of user performing the update (required for location changes)
   */
  async update(id: string, updateMachineDto: UpdateMachineDto, userId?: string): Promise<Machine> {
    const machine = await this.findOne(id);

    // If location is changing, record in history
    if (updateMachineDto.location_id && updateMachineDto.location_id !== machine.location_id) {
      if (!userId) {
        throw new BadRequestException('User ID is required for location changes');
      }
      await this.recordLocationChange(id, machine.location_id, updateMachineDto.location_id, userId);
    }

    // Update machine
    await this.machineRepository.update(id, updateMachineDto);

    return await this.findOne(id);
  }

  /**
   * Soft delete machine
   */
  async remove(id: string): Promise<void> {
    const machine = await this.findOne(id);

    if (machine.status === MachineStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active machine. Please deactivate it first.');
    }

    await this.machineRepository.softDelete(id);
  }

  /**
   * Get overall machine statistics
   *
   * OPTIMIZED: Uses COUNT with GROUP BY instead of loading all machines
   * Performance: O(1) database query instead of O(n) memory operation
   */
  async getStats(): Promise<{
    total_machines: number;
    active_machines: number;
    by_status: {
      active: number;
      offline: number;
      error: number;
      maintenance: number;
      low_stock: number;
    };
  }> {
    // Use a single query with GROUP BY to count by status
    const statusCounts = await this.machineRepository
      .createQueryBuilder('machine')
      .select('machine.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('machine.deleted_at IS NULL')
      .groupBy('machine.status')
      .getRawMany<{ status: MachineStatus; count: string }>();

    // Initialize counts with 0
    const byStatus = {
      active: 0,
      offline: 0,
      error: 0,
      maintenance: 0,
      low_stock: 0,
    };

    // Map database results to status counts
    let totalMachines = 0;
    for (const row of statusCounts) {
      const count = parseInt(row.count, 10);
      totalMachines += count;

      switch (row.status) {
        case MachineStatus.ACTIVE:
          byStatus.active = count;
          break;
        case MachineStatus.OFFLINE:
          byStatus.offline = count;
          break;
        case MachineStatus.ERROR:
          byStatus.error = count;
          break;
        case MachineStatus.MAINTENANCE:
          byStatus.maintenance = count;
          break;
        case MachineStatus.LOW_STOCK:
          byStatus.low_stock = count;
          break;
      }
    }

    return {
      total_machines: totalMachines,
      active_machines: byStatus.active,
      by_status: byStatus,
    };
  }

  /**
   * Get machine stats by location
   *
   * OPTIMIZED: Uses COUNT with GROUP BY instead of loading all machines
   */
  async getMachineStatsByLocation(locationId: string): Promise<{
    total: number;
    active: number;
    offline: number;
    error: number;
    maintenance: number;
  }> {
    // Use a single query with GROUP BY to count by status
    const statusCounts = await this.machineRepository
      .createQueryBuilder('machine')
      .select('machine.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('machine.location_id = :locationId', { locationId })
      .andWhere('machine.deleted_at IS NULL')
      .groupBy('machine.status')
      .getRawMany<{ status: MachineStatus; count: string }>();

    // Initialize counts with 0
    const result = {
      total: 0,
      active: 0,
      offline: 0,
      error: 0,
      maintenance: 0,
    };

    // Map database results to status counts
    for (const row of statusCounts) {
      const count = parseInt(row.count, 10);
      result.total += count;

      switch (row.status) {
        case MachineStatus.ACTIVE:
          result.active = count;
          break;
        case MachineStatus.OFFLINE:
          result.offline = count;
          break;
        case MachineStatus.ERROR:
          result.error = count;
          break;
        case MachineStatus.MAINTENANCE:
          result.maintenance = count;
          break;
      }
    }

    return result;
  }

  /**
   * Generate new QR code for machine
   */
  async regenerateQrCode(id: string): Promise<{ qrCode: string; url: string }> {
    const machine = await this.findOne(id);

    const newQrCode = this.qrCodeService.generateUniqueQrCode();
    const publicUrl = this.qrCodeService.getComplaintUrl(newQrCode);

    await this.machineRepository.update(id, {
      qr_code: newQrCode,
      qr_code_url: publicUrl,
    });

    this.logger.log(`Regenerated QR code for machine ${machine.machine_number}: ${newQrCode}`);

    return {
      qrCode: newQrCode,
      url: publicUrl,
    };
  }

  /**
   * Get QR code image for machine
   */
  async getQrCodeImage(id: string): Promise<Buffer> {
    const machine = await this.findOne(id);
    return await this.qrCodeService.generateQrCodeBuffer(machine.id);
  }

  /**
   * Record location change in history
   *
   * @param machineId - Machine ID
   * @param oldLocationId - Previous location ID (null for initial placement)
   * @param newLocationId - New location ID
   * @param movedByUserId - User ID who performed the move
   */
  private async recordLocationChange(
    machineId: string,
    oldLocationId: string | null,
    newLocationId: string,
    movedByUserId: string,
  ): Promise<void> {
    const history = this.locationHistoryRepository.create({
      machine: { id: machineId },
      from_location_id: oldLocationId,
      to_location_id: newLocationId,
      moved_by_user_id: movedByUserId,
      moved_at: new Date(),
    });

    await this.locationHistoryRepository.save(history);
  }

  /**
   * Get location history for machine
   */
  async getLocationHistory(machineId: string): Promise<MachineLocationHistory[]> {
    return await this.locationHistoryRepository.find({
      where: { machine: { id: machineId } },
      order: { created_at: 'DESC' },
      relations: ['from_location', 'to_location'],
    });
  }

  /**
   * Update online status based on last ping
   */
  async updateOnlineStatus(
    offlineThresholdMinutes: number = 30,
  ): Promise<{ total: number; online: number; offline: number; updated: number }> {
    const offlineThreshold = new Date(Date.now() - offlineThresholdMinutes * 60 * 1000);

    // Find machines that should be marked offline
    const machinesToUpdate = await this.machineRepository.find({
      where: {
        is_online: true,
        last_ping_at: LessThan(offlineThreshold),
      },
    });

    // Bulk update instead of N+1 loop
    const machineIds = machinesToUpdate.map((m) => m.id);
    let updated = 0;

    if (machineIds.length > 0) {
      await this.machineRepository.update(
        { id: In(machineIds) },
        { is_online: false, status: MachineStatus.OFFLINE },
      );
      updated = machineIds.length;

      // Log each machine marked offline
      for (const machine of machinesToUpdate) {
        this.logger.warn(
          `Machine ${machine.machine_number} marked offline. Last ping: ${machine.last_ping_at}`,
        );
      }
    }

    // Get stats
    const total = await this.machineRepository.count();
    const online = await this.machineRepository.count({
      where: { is_online: true },
    });
    const offline = await this.machineRepository.count({
      where: { is_online: false },
    });

    return { total, online, offline, updated };
  }

  /**
   * Get offline machines for incident creation
   */
  async getOfflineMachines(minOfflineDurationMinutes: number = 30): Promise<Machine[]> {
    const offlineThreshold = new Date(Date.now() - minOfflineDurationMinutes * 60 * 1000);

    return this.machineRepository.find({
      where: {
        last_ping_at: LessThan(offlineThreshold),
        is_online: false,
      },
      relations: ['location'],
    });
  }

  /**
   * Get machines by QR code (for public complaints)
   */
  async findByQrCodePublic(qrCode: string): Promise<Machine> {
    return this.qrCodeService.getMachineByQrCode(qrCode);
  }

  /**
   * Write off (dispose) a machine - ASYNC VERSION
   *
   * Queues the writeoff operation for background processing
   * to avoid request timeouts on heavy calculations.
   *
   * @param id - Machine ID
   * @param writeoffDto - Writeoff details (reason, date)
   * @param userId - User ID who initiated the writeoff
   * @returns Job information for tracking
   */
  async writeOffMachine(
    id: string,
    writeoffDto: WriteoffMachineDto,
    userId?: string,
  ): Promise<WriteoffJobResponseDto> {
    // Basic validation - ensure machine exists
    const machine = await this.findOne(id);

    // Quick validation before queueing
    if (machine.is_disposed) {
      throw new BadRequestException(
        `Machine ${machine.machine_number} is already disposed on ${machine.disposal_date?.toLocaleDateString('ru-RU')}`,
      );
    }

    if (!machine.purchase_price) {
      throw new BadRequestException(
        `Cannot writeoff machine ${machine.machine_number}: missing purchase price information`,
      );
    }

    // Create job data
    const jobData: WriteoffJobData = {
      machineId: id,
      writeoffDto,
      userId,
      requestId: `writeoff-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    // Queue the job with retry configuration
    const job = await this.writeoffQueue.add('process-writeoff', jobData, {
      attempts: 3, // Retry up to 3 times
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 second delay
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 500, // Keep last 500 failed jobs for debugging
    });

    this.logger.log(
      `Queued writeoff job ${job.id} for machine ${machine.machine_number} (${machine.id})`,
    );

    // Return job information
    return {
      jobId: `writeoff-${job.id}`,
      message: `Writeoff operation for machine ${machine.machine_number} has been queued for processing`,
      statusUrl: `/api/machines/writeoff/job/writeoff-${job.id}`,
    };
  }

  /**
   * Write off multiple machines in bulk
   *
   * @param machineIds - Array of machine IDs to write off
   * @param writeoffDto - Common writeoff details for all machines
   * @param userId - User ID who initiated the bulk writeoff
   * @returns Summary of queued jobs
   */
  async bulkWriteOffMachines(
    machineIds: string[],
    writeoffDto: WriteoffMachineDto,
    userId?: string,
  ): Promise<BulkWriteoffResponseDto> {
    const results = {
      total: machineIds.length,
      queued: [] as string[],
      failed: [] as { machineId: string; error: string }[],
    };

    for (const machineId of machineIds) {
      try {
        const response = await this.writeOffMachine(machineId, writeoffDto, userId);
        results.queued.push(response.jobId);
      } catch (error) {
        results.failed.push({
          machineId,
          error: error.message || 'Unknown error',
        });
        this.logger.error(`Failed to queue writeoff for machine ${machineId}: ${error.message}`);
      }
    }

    this.logger.log(
      `Bulk writeoff: ${results.queued.length} queued, ${results.failed.length} failed out of ${results.total}`,
    );

    return {
      total: results.total,
      queued: results.queued.length,
      failed: results.failed.length,
      jobIds: results.queued,
      failures: results.failed,
      message: `Bulk writeoff operation initiated. ${results.queued.length} machines queued for processing.`,
    };
  }

  /**
   * Get writeoff job status
   *
   * @param jobId - Job ID (with or without 'writeoff-' prefix)
   * @returns Current job status and details
   */
  async getWriteoffJobStatus(jobId: string): Promise<WriteoffJobStatusDto> {
    // Remove prefix if present
    const actualJobId = jobId.replace('writeoff-', '');

    const job = await this.writeoffQueue.getJob(actualJobId);

    if (!job) {
      throw new NotFoundException(`Writeoff job ${jobId} not found`);
    }

    // Determine status
    let status: WriteoffJobStatus;
    const isCompleted = await job.isCompleted();
    const isFailed = await job.isFailed();
    const isActive = await job.isActive();

    if (isCompleted) {
      status = WriteoffJobStatus.COMPLETED;
    } else if (isFailed) {
      status = WriteoffJobStatus.FAILED;
    } else if (isActive) {
      status = WriteoffJobStatus.PROCESSING;
    } else {
      status = WriteoffJobStatus.PENDING;
    }

    const jobStatus: WriteoffJobStatusDto = {
      jobId: `writeoff-${actualJobId}`,
      status,
      progress: job.progress() as number,
      createdAt: new Date(job.timestamp),
      updatedAt: new Date(job.processedOn || job.timestamp),
      attempts: job.attemptsMade,
    };

    // Add completion details if available
    if (isCompleted && job.finishedOn) {
      jobStatus.completedAt = new Date(job.finishedOn);
      jobStatus.result = await job.returnvalue;
      jobStatus.message = 'Writeoff completed successfully';
    }

    // Add failure details if available
    if (isFailed) {
      jobStatus.error = job.failedReason;
      jobStatus.message = 'Writeoff failed after all retry attempts';
    }

    // Add active processing message
    if (isActive) {
      jobStatus.message = 'Writeoff is being processed...';
    }

    // Add pending message
    if (status === WriteoffJobStatus.PENDING) {
      const position = await this.writeoffQueue.getJobCounts();
      jobStatus.message = `Writeoff is queued. Position in queue: ${position.waiting}`;
    }

    return jobStatus;
  }

  /**
   * Cancel a pending writeoff job
   *
   * @param jobId - Job ID to cancel
   * @returns Success status
   */
  async cancelWriteoffJob(jobId: string): Promise<{ success: boolean; message: string }> {
    const actualJobId = jobId.replace('writeoff-', '');
    const job = await this.writeoffQueue.getJob(actualJobId);

    if (!job) {
      throw new NotFoundException(`Writeoff job ${jobId} not found`);
    }

    const isActive = await job.isActive();
    if (isActive) {
      throw new BadRequestException('Cannot cancel an active job');
    }

    const isCompleted = await job.isCompleted();
    if (isCompleted) {
      throw new BadRequestException('Cannot cancel a completed job');
    }

    await job.remove();

    this.logger.log(`Cancelled writeoff job ${jobId}`);

    return {
      success: true,
      message: `Writeoff job ${jobId} has been cancelled`,
    };
  }

  /**
   * Get all writeoff jobs for monitoring
   *
   * @param status - Optional filter by status
   * @returns List of writeoff jobs
   */
  async getWriteoffJobs(
    status?: 'completed' | 'failed' | 'active' | 'waiting',
  ): Promise<Job<WriteoffJobData>[]> {
    if (status === 'completed') {
      return await this.writeoffQueue.getCompleted(0, 100);
    } else if (status === 'failed') {
      return await this.writeoffQueue.getFailed(0, 100);
    } else if (status === 'active') {
      return await this.writeoffQueue.getActive(0, 100);
    } else if (status === 'waiting') {
      return await this.writeoffQueue.getWaiting(0, 100);
    } else {
      // Get all jobs
      const [completed, failed, active, waiting] = await Promise.all([
        this.writeoffQueue.getCompleted(0, 20),
        this.writeoffQueue.getFailed(0, 20),
        this.writeoffQueue.getActive(0, 20),
        this.writeoffQueue.getWaiting(0, 20),
      ]);
      return [...completed, ...failed, ...active, ...waiting];
    }
  }

  /**
   * Update machine statistics
   *
   * Used after task completion to update cached stats like cash amount,
   * last refill date, last collection date, etc.
   *
   * @param machineId - Machine ID
   * @param stats - Statistics to update
   */
  async updateStats(
    machineId: string,
    stats: {
      current_cash_amount?: number;
      last_refill_date?: Date;
      last_collection_date?: Date;
      total_sales_count?: number;
      total_revenue?: number;
    },
  ): Promise<void> {
    const machine = await this.findOne(machineId);

    const updates: Pick<
      Machine,
      'current_cash_amount' | 'last_refill_date' | 'last_collection_date' | 'total_sales_count' | 'total_revenue'
    > = {} as Pick<
      Machine,
      'current_cash_amount' | 'last_refill_date' | 'last_collection_date' | 'total_sales_count' | 'total_revenue'
    >;

    if (stats.current_cash_amount !== undefined) {
      updates.current_cash_amount = stats.current_cash_amount;
    }

    if (stats.last_refill_date) {
      updates.last_refill_date = stats.last_refill_date;
    }

    if (stats.last_collection_date) {
      updates.last_collection_date = stats.last_collection_date;
    }

    if (stats.total_sales_count !== undefined) {
      updates.total_sales_count = stats.total_sales_count;
    }

    if (stats.total_revenue !== undefined) {
      updates.total_revenue = stats.total_revenue;
    }

    if (Object.keys(updates).length > 0) {
       
      await this.machineRepository.update(machineId, updates as any);

      this.logger.log(
        `Updated stats for machine ${machine.machine_number}: ${JSON.stringify(updates)}`,
      );
    }
  }

  /**
   * Update connectivity status for all machines
   *
   * Checks last_ping_at timestamps and marks machines as offline
   * if they haven't been checked recently. Used by scheduled tasks.
   *
   * @param offlineThresholdMinutes - Minutes without ping to consider offline
   * @returns Statistics about the update operation
   */
  async updateConnectivityStatus(
    offlineThresholdMinutes: number = 30,
  ): Promise<{ total: number; online: number; offline: number; updated: number }> {
    const offlineThreshold = new Date(Date.now() - offlineThresholdMinutes * 60 * 1000);

    // Find machines that should be marked offline
    const machinesToMarkOffline = await this.machineRepository.find({
      where: [
        // Machines that are marked online but haven't pinged recently
        {
          is_online: true,
          last_ping_at: LessThan(offlineThreshold),
        },
        // Machines that have never pinged (null last_ping_at)
        {
          is_online: true,
          last_ping_at: IsNull(),
        },
      ],
    });

    // Bulk update machines to mark offline (fix N+1)
    const offlineMachineIds = machinesToMarkOffline.map((m) => m.id);
    let updated = 0;

    if (offlineMachineIds.length > 0) {
      // Update machines that were ACTIVE to OFFLINE status
      const activeMachineIds = machinesToMarkOffline
        .filter((m) => m.status === MachineStatus.ACTIVE)
        .map((m) => m.id);

      if (activeMachineIds.length > 0) {
        await this.machineRepository.update(
          { id: In(activeMachineIds) },
          { is_online: false, connectivity_status: 'offline', status: MachineStatus.OFFLINE },
        );
      }

      // Update remaining offline machines (keep their status)
      const otherMachineIds = machinesToMarkOffline
        .filter((m) => m.status !== MachineStatus.ACTIVE)
        .map((m) => m.id);

      if (otherMachineIds.length > 0) {
        await this.machineRepository.update(
          { id: In(otherMachineIds) },
          { is_online: false, connectivity_status: 'offline' },
        );
      }

      updated = offlineMachineIds.length;

      // Log each machine marked offline
      for (const machine of machinesToMarkOffline) {
        this.logger.warn(
          `Machine ${machine.machine_number} marked offline. ` +
            `Last ping: ${machine.last_ping_at?.toISOString() || 'never'}`,
        );
      }
    }

    // Bulk update connectivity_status for online machines (fix N+1)
    const onlineMachines = await this.machineRepository.find({
      where: {
        is_online: true,
        last_ping_at: MoreThan(offlineThreshold),
        connectivity_status: Not('online'),
      },
    });

    if (onlineMachines.length > 0) {
      const onlineMachineIds = onlineMachines.map((m) => m.id);
      await this.machineRepository.update(
        { id: In(onlineMachineIds) },
        { connectivity_status: 'online' },
      );
    }

    // Get updated statistics
    const total = await this.machineRepository.count();
    const online = await this.machineRepository.count({
      where: { is_online: true },
    });
    const offline = await this.machineRepository.count({
      where: { is_online: false },
    });

    return { total, online, offline, updated };
  }

  /**
   * Calculate depreciation for all machines
   *
   * Should be run monthly via cron job
   * NOTE: This is a simplified version. Monthly depreciation amount should be
   * stored in machine metadata or a separate configuration
   */
  async calculateDepreciation(): Promise<{ updated: number; totalDepreciation: number }> {
    const machines = await this.machineRepository.find({
      where: {
        is_disposed: false,
      },
    });

    let updated = 0;
    let totalDepreciation = 0;

    for (const machine of machines) {
      // Get monthly depreciation from metadata if available, otherwise skip
      const monthlyDepreciation = machine.metadata?.monthly_depreciation as number;
      if (!monthlyDepreciation || monthlyDepreciation <= 0) {
        continue;
      }

      const newDepreciation = Number(machine.accumulated_depreciation || 0) + monthlyDepreciation;
      const bookValue = Number(machine.purchase_price) - newDepreciation;

      // Don't depreciate below 0
      if (bookValue >= 0) {
        await this.machineRepository.update(machine.id, {
          accumulated_depreciation: newDepreciation,
        });

        // Update metadata separately to avoid type issues
        machine.metadata = {
          ...machine.metadata,
          last_depreciation_date: new Date().toISOString(),
          book_value: bookValue,
        };
        await this.machineRepository.save(machine);

        updated++;
        totalDepreciation += monthlyDepreciation;

        this.logger.log(
          `Updated depreciation for machine ${machine.machine_number}: ` +
            `${newDepreciation.toFixed(2)} UZS (book value: ${bookValue.toFixed(2)} UZS)`,
        );
      }
    }

    this.logger.log(
      `Depreciation calculation completed: ${updated} machines updated, ` +
        `total depreciation: ${totalDepreciation.toFixed(2)} UZS`,
    );

    return { updated, totalDepreciation };
  }
}
