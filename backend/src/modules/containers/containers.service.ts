import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Container, ContainerStatus } from './entities/container.entity';
import { CreateContainerDto } from './dto/create-container.dto';
import { UpdateContainerDto } from './dto/update-container.dto';
import { RefillContainerDto } from './dto/refill-container.dto';

/**
 * Low level container information
 */
export interface LowLevelContainer {
  container: Container;
  percentage: number;
  deficit: number;
}

/**
 * Containers Service
 *
 * Manages container (hopper/bunker) operations for vending machines.
 * Containers store ingredients like coffee beans, sugar, milk powder, etc.
 *
 * Part of VH24 Integration - Phase 4.1.1
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.1
 */
@Injectable()
export class ContainersService {
  private readonly logger = new Logger(ContainersService.name);

  constructor(
    @InjectRepository(Container)
    private readonly containerRepository: Repository<Container>,
  ) {}

  /**
   * Find all containers with optional filters and pagination
   *
   * @param filters - Optional filters for machine_id, status, nomenclature_id
   * @param page - Page number (1-based), defaults to 1
   * @param limit - Items per page, defaults to 50, max 200
   * @returns Paginated result with containers
   */
  async findAll(
    filters?: {
      machine_id?: string;
      status?: ContainerStatus;
      nomenclature_id?: string;
    },
    page = 1,
    limit = 50,
  ): Promise<{
    data: Container[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const sanitizedLimit = Math.min(Math.max(1, limit), 200);
    const sanitizedPage = Math.max(1, page);
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const query = this.containerRepository.createQueryBuilder('container');
    query.leftJoinAndSelect('container.machine', 'machine');
    query.leftJoinAndSelect('container.nomenclature', 'nomenclature');

    if (filters?.machine_id) {
      query.andWhere('container.machine_id = :machine_id', {
        machine_id: filters.machine_id,
      });
    }

    if (filters?.status) {
      query.andWhere('container.status = :status', { status: filters.status });
    }

    if (filters?.nomenclature_id) {
      query.andWhere('container.nomenclature_id = :nomenclature_id', {
        nomenclature_id: filters.nomenclature_id,
      });
    }

    query.skip(skip).take(sanitizedLimit);
    query.orderBy('container.machine_id', 'ASC');
    query.addOrderBy('container.slot_number', 'ASC');

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
   * Find a container by its ID
   *
   * @param id - Container UUID
   * @returns Container entity with relations
   * @throws NotFoundException if container not found
   */
  async findOne(id: string): Promise<Container> {
    const container = await this.containerRepository.findOne({
      where: { id },
      relations: ['machine', 'nomenclature'],
    });

    if (!container) {
      throw new NotFoundException(`Container with ID ${id} not found`);
    }

    return container;
  }

  /**
   * Find all containers for a specific machine
   *
   * @param machineId - Machine UUID
   * @returns Array of containers ordered by slot number
   */
  async findByMachine(machineId: string): Promise<Container[]> {
    return this.containerRepository.find({
      where: { machine_id: machineId },
      relations: ['nomenclature'],
      order: { slot_number: 'ASC' },
    });
  }

  /**
   * Create a new container
   *
   * @param createContainerDto - Container creation data
   * @returns Created container
   * @throws ConflictException if slot_number already exists for machine
   */
  async create(createContainerDto: CreateContainerDto): Promise<Container> {
    // Check if slot_number already exists for this machine
    const existingContainer = await this.containerRepository.findOne({
      where: {
        machine_id: createContainerDto.machine_id,
        slot_number: createContainerDto.slot_number,
      },
    });

    if (existingContainer) {
      throw new ConflictException(
        `Container with slot_number ${createContainerDto.slot_number} already exists for this machine`,
      );
    }

    // Validate current_quantity doesn't exceed capacity
    if (
      createContainerDto.current_quantity !== undefined &&
      createContainerDto.current_quantity > createContainerDto.capacity
    ) {
      throw new BadRequestException(
        'current_quantity cannot exceed capacity',
      );
    }

    const container = this.containerRepository.create({
      ...createContainerDto,
      current_quantity: createContainerDto.current_quantity ?? 0,
      unit: createContainerDto.unit ?? 'g',
      status: createContainerDto.status ?? ContainerStatus.ACTIVE,
    });

    const savedContainer = await this.containerRepository.save(container);

    this.logger.log(
      `Created container ${savedContainer.id} (slot ${savedContainer.slot_number}) for machine ${savedContainer.machine_id}`,
    );

    return this.findOne(savedContainer.id);
  }

  /**
   * Update an existing container
   *
   * @param id - Container UUID
   * @param updateContainerDto - Container update data
   * @returns Updated container
   * @throws NotFoundException if container not found
   * @throws ConflictException if new slot_number already exists
   */
  async update(id: string, updateContainerDto: UpdateContainerDto): Promise<Container> {
    const container = await this.findOne(id);

    // Check if changing slot_number to an existing one
    if (
      updateContainerDto.slot_number !== undefined &&
      updateContainerDto.slot_number !== container.slot_number
    ) {
      const existingContainer = await this.containerRepository.findOne({
        where: {
          machine_id: container.machine_id,
          slot_number: updateContainerDto.slot_number,
        },
      });

      if (existingContainer) {
        throw new ConflictException(
          `Container with slot_number ${updateContainerDto.slot_number} already exists for this machine`,
        );
      }
    }

    // Validate current_quantity doesn't exceed capacity
    const newCapacity = updateContainerDto.capacity ?? container.capacity;
    const newQuantity = updateContainerDto.current_quantity ?? container.current_quantity;
    if (newQuantity > newCapacity) {
      throw new BadRequestException(
        'current_quantity cannot exceed capacity',
      );
    }

    // Update status to EMPTY if current_quantity becomes 0
    if (updateContainerDto.current_quantity === 0) {
      updateContainerDto.status = ContainerStatus.EMPTY;
    }

    await this.containerRepository.update(id, updateContainerDto);

    this.logger.log(`Updated container ${id}`);

    return this.findOne(id);
  }

  /**
   * Refill a container - adds quantity and updates last_refill_date
   *
   * @param id - Container UUID
   * @param refillDto - Refill data with quantity to add
   * @returns Updated container
   * @throws NotFoundException if container not found
   * @throws BadRequestException if refill would exceed capacity
   */
  async refill(id: string, refillDto: RefillContainerDto): Promise<Container> {
    const container = await this.findOne(id);

    const newQuantity = Number(container.current_quantity) + refillDto.quantity;

    if (newQuantity > Number(container.capacity)) {
      throw new BadRequestException(
        `Refill would exceed container capacity. Current: ${container.current_quantity}, Adding: ${refillDto.quantity}, Capacity: ${container.capacity}`,
      );
    }

    // Update container with new quantity and refill timestamp
    await this.containerRepository.update(id, {
      current_quantity: newQuantity,
      last_refill_date: new Date(),
      status: ContainerStatus.ACTIVE, // Container is now active after refill
    });

    // Add refill info to metadata if notes or batch_number provided
    if (refillDto.notes || refillDto.batch_number) {
      const metadata = container.metadata || {};
      const refillHistory = metadata.refill_history || [];
      refillHistory.push({
        date: new Date().toISOString(),
        quantity: refillDto.quantity,
        notes: refillDto.notes,
        batch_number: refillDto.batch_number,
      });
      // Keep only last 10 refill records
      if (refillHistory.length > 10) {
        refillHistory.shift();
      }
      await this.containerRepository.update(id, {
        metadata: { ...metadata, refill_history: refillHistory },
      });
    }

    this.logger.log(
      `Refilled container ${id} with ${refillDto.quantity} ${container.unit}. New quantity: ${newQuantity}`,
    );

    return this.findOne(id);
  }

  /**
   * Soft delete a container
   *
   * @param id - Container UUID
   * @throws NotFoundException if container not found
   */
  async remove(id: string): Promise<void> {
    const container = await this.findOne(id);

    await this.containerRepository.softDelete(id);

    this.logger.log(
      `Deleted container ${id} (slot ${container.slot_number}) from machine ${container.machine_id}`,
    );
  }

  /**
   * Check for containers below minimum level for a specific machine
   *
   * Returns containers where current_quantity is below min_level
   *
   * @param machineId - Machine UUID
   * @returns Array of low level container info with percentage and deficit
   */
  async checkLowLevels(machineId: string): Promise<LowLevelContainer[]> {
    const containers = await this.containerRepository
      .createQueryBuilder('container')
      .leftJoinAndSelect('container.nomenclature', 'nomenclature')
      .where('container.machine_id = :machineId', { machineId })
      .andWhere('container.min_level IS NOT NULL')
      .andWhere('container.current_quantity < container.min_level')
      .andWhere('container.status != :maintenanceStatus', {
        maintenanceStatus: ContainerStatus.MAINTENANCE,
      })
      .orderBy('container.slot_number', 'ASC')
      .getMany();

    return containers.map((container) => {
      const capacity = Number(container.capacity);
      const currentQuantity = Number(container.current_quantity);
      const minLevel = Number(container.min_level);

      return {
        container,
        percentage: capacity > 0 ? (currentQuantity / capacity) * 100 : 0,
        deficit: minLevel - currentQuantity,
      };
    });
  }

  /**
   * Check for low level containers across all machines
   *
   * @returns Array of low level container info grouped by machine
   */
  async checkAllLowLevels(): Promise<{
    machine_id: string;
    machine_name: string;
    machine_number: string;
    low_containers: LowLevelContainer[];
  }[]> {
    const containers = await this.containerRepository
      .createQueryBuilder('container')
      .leftJoinAndSelect('container.machine', 'machine')
      .leftJoinAndSelect('container.nomenclature', 'nomenclature')
      .where('container.min_level IS NOT NULL')
      .andWhere('container.current_quantity < container.min_level')
      .andWhere('container.status != :maintenanceStatus', {
        maintenanceStatus: ContainerStatus.MAINTENANCE,
      })
      .orderBy('machine.machine_number', 'ASC')
      .addOrderBy('container.slot_number', 'ASC')
      .getMany();

    // Group by machine
    const groupedByMachine = new Map<
      string,
      { machine_id: string; machine_name: string; machine_number: string; low_containers: LowLevelContainer[] }
    >();

    for (const container of containers) {
      const capacity = Number(container.capacity);
      const currentQuantity = Number(container.current_quantity);
      const minLevel = Number(container.min_level);

      const lowContainerInfo: LowLevelContainer = {
        container,
        percentage: capacity > 0 ? (currentQuantity / capacity) * 100 : 0,
        deficit: minLevel - currentQuantity,
      };

      if (!groupedByMachine.has(container.machine_id)) {
        groupedByMachine.set(container.machine_id, {
          machine_id: container.machine_id,
          machine_name: container.machine?.name || 'Unknown',
          machine_number: container.machine?.machine_number || 'Unknown',
          low_containers: [],
        });
      }

      groupedByMachine.get(container.machine_id)!.low_containers.push(lowContainerInfo);
    }

    return Array.from(groupedByMachine.values());
  }

  /**
   * Get container statistics for a machine
   *
   * @param machineId - Machine UUID
   * @returns Container statistics
   */
  async getStatsByMachine(machineId: string): Promise<{
    total_containers: number;
    active_containers: number;
    empty_containers: number;
    maintenance_containers: number;
    low_level_count: number;
    average_fill_percentage: number;
  }> {
    const containers = await this.findByMachine(machineId);

    const stats = {
      total_containers: containers.length,
      active_containers: 0,
      empty_containers: 0,
      maintenance_containers: 0,
      low_level_count: 0,
      average_fill_percentage: 0,
    };

    let totalPercentage = 0;

    for (const container of containers) {
      switch (container.status) {
        case ContainerStatus.ACTIVE:
          stats.active_containers++;
          break;
        case ContainerStatus.EMPTY:
          stats.empty_containers++;
          break;
        case ContainerStatus.MAINTENANCE:
          stats.maintenance_containers++;
          break;
      }

      // Check low level
      if (
        container.min_level !== null &&
        Number(container.current_quantity) < Number(container.min_level)
      ) {
        stats.low_level_count++;
      }

      // Calculate fill percentage
      const capacity = Number(container.capacity);
      const currentQuantity = Number(container.current_quantity);
      if (capacity > 0) {
        totalPercentage += (currentQuantity / capacity) * 100;
      }
    }

    stats.average_fill_percentage =
      containers.length > 0 ? totalPercentage / containers.length : 0;

    return stats;
  }

  /**
   * Deduct quantity from a container (used after sales)
   *
   * @param id - Container UUID
   * @param quantity - Quantity to deduct
   * @throws NotFoundException if container not found
   * @throws BadRequestException if not enough quantity
   */
  async deductQuantity(id: string, quantity: number): Promise<Container> {
    const container = await this.findOne(id);

    const currentQuantity = Number(container.current_quantity);
    const newQuantity = currentQuantity - quantity;

    if (newQuantity < 0) {
      throw new BadRequestException(
        `Not enough quantity in container. Current: ${currentQuantity}, Requested: ${quantity}`,
      );
    }

    // Update status to EMPTY if quantity becomes 0
    if (newQuantity === 0) {
      await this.containerRepository.update(id, {
        current_quantity: newQuantity,
        status: ContainerStatus.EMPTY,
      });
    } else {
      await this.containerRepository.update(id, {
        current_quantity: newQuantity,
      });
    }

    this.logger.log(
      `Deducted ${quantity} ${container.unit} from container ${id}. New quantity: ${newQuantity}`,
    );

    return this.findOne(id);
  }

  /**
   * Find containers by nomenclature across all machines
   *
   * @param nomenclatureId - Nomenclature UUID
   * @returns Array of containers with this ingredient
   */
  async findByNomenclature(nomenclatureId: string): Promise<Container[]> {
    return this.containerRepository.find({
      where: { nomenclature_id: nomenclatureId },
      relations: ['machine'],
      order: { machine_id: 'ASC', slot_number: 'ASC' },
    });
  }
}
