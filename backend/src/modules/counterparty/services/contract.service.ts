import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull } from 'typeorm';
import { Contract, ContractStatus } from '../entities/contract.entity';
import { CreateContractDto } from '../dto/create-contract.dto';
import { UpdateContractDto } from '../dto/update-contract.dto';
import { CounterpartyService } from './counterparty.service';

/**
 * Contract Service
 *
 * Manages contracts with counterparties
 */
@Injectable()
export class ContractService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    private readonly counterpartyService: CounterpartyService,
  ) {}

  /**
   * Create a new contract
   */
  async create(createDto: CreateContractDto): Promise<Contract> {
    // Check if contract number already exists
    const existing = await this.contractRepository.findOne({
      where: { contract_number: createDto.contract_number },
      withDeleted: true,
    });

    if (existing) {
      if (existing.deleted_at) {
        throw new ConflictException(
          `Договор с номером ${createDto.contract_number} уже существует (удален). ` +
            `Восстановите его или используйте другой номер.`,
        );
      }
      throw new ConflictException(`Договор с номером ${createDto.contract_number} уже существует`);
    }

    // Verify counterparty exists
    await this.counterpartyService.findOne(createDto.counterparty_id);

    // Validate dates
    if (createDto.end_date && new Date(createDto.end_date) < new Date(createDto.start_date)) {
      throw new BadRequestException('Дата окончания не может быть раньше даты начала');
    }

    // Validate commission configuration based on type
    this.validateCommissionConfig(createDto);

    const contract = this.contractRepository.create(createDto);
    return this.contractRepository.save(contract);
  }

  /**
   * Validate commission configuration
   */
  private validateCommissionConfig(dto: CreateContractDto | UpdateContractDto): void {
    if (!dto.commission_type) {
      return; // Skip if not updating commission type
    }

    switch (dto.commission_type) {
      case 'percentage':
        if (dto.commission_rate === null || dto.commission_rate === undefined) {
          throw new BadRequestException(
            'Для процентной комиссии необходимо указать commission_rate',
          );
        }
        break;

      case 'fixed':
        if (dto.commission_fixed_amount === null || dto.commission_fixed_amount === undefined) {
          throw new BadRequestException(
            'Для фиксированной комиссии необходимо указать commission_fixed_amount',
          );
        }
        if (!dto.commission_fixed_period) {
          throw new BadRequestException(
            'Для фиксированной комиссии необходимо указать commission_fixed_period',
          );
        }
        break;

      case 'tiered':
        if (!dto.commission_tiers || dto.commission_tiers.length === 0) {
          throw new BadRequestException(
            'Для ступенчатой комиссии необходимо указать commission_tiers',
          );
        }
        break;

      case 'hybrid':
        if (dto.commission_hybrid_fixed === null || dto.commission_hybrid_fixed === undefined) {
          throw new BadRequestException(
            'Для гибридной комиссии необходимо указать commission_hybrid_fixed',
          );
        }
        if (dto.commission_hybrid_rate === null || dto.commission_hybrid_rate === undefined) {
          throw new BadRequestException(
            'Для гибридной комиссии необходимо указать commission_hybrid_rate',
          );
        }
        break;
    }
  }

  /**
   * Find all contracts with optional filters
   */
  async findAll(
    counterpartyId?: string,
    status?: ContractStatus,
    activeOnly?: boolean,
  ): Promise<Contract[]> {
    const query = this.contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.counterparty', 'counterparty');

    if (counterpartyId) {
      query.andWhere('contract.counterparty_id = :counterpartyId', { counterpartyId });
    }

    if (status) {
      query.andWhere('contract.status = :status', { status });
    }

    if (activeOnly) {
      const now = new Date();
      query
        .andWhere('contract.status = :activeStatus', { activeStatus: ContractStatus.ACTIVE })
        .andWhere('contract.start_date <= :now', { now })
        .andWhere('(contract.end_date IS NULL OR contract.end_date >= :now)', { now });
    }

    query.orderBy('contract.contract_number', 'ASC');

    return query.getMany();
  }

  /**
   * Find contract by ID
   */
  async findOne(id: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: ['counterparty', 'commission_calculations'],
    });

    if (!contract) {
      throw new NotFoundException(`Договор с ID ${id} не найден`);
    }

    return contract;
  }

  /**
   * Find contract by number
   */
  async findByNumber(contractNumber: string): Promise<Contract | null> {
    return this.contractRepository.findOne({
      where: { contract_number: contractNumber },
      relations: ['counterparty'],
    });
  }

  /**
   * Update contract
   */
  async update(id: string, updateDto: UpdateContractDto): Promise<Contract> {
    const contract = await this.findOne(id);

    // If updating contract number, check for conflicts
    if (updateDto.contract_number && updateDto.contract_number !== contract.contract_number) {
      const existing = await this.contractRepository.findOne({
        where: { contract_number: updateDto.contract_number },
      });

      if (existing) {
        throw new ConflictException(
          `Договор с номером ${updateDto.contract_number} уже существует`,
        );
      }
    }

    // Validate dates
    if (updateDto.end_date && updateDto.start_date) {
      if (new Date(updateDto.end_date) < new Date(updateDto.start_date)) {
        throw new BadRequestException('Дата окончания не может быть раньше даты начала');
      }
    } else if (updateDto.end_date && new Date(updateDto.end_date) < new Date(contract.start_date)) {
      throw new BadRequestException('Дата окончания не может быть раньше даты начала');
    }

    // Validate commission configuration
    this.validateCommissionConfig(updateDto);

    Object.assign(contract, updateDto);
    contract.updated_at = new Date();

    return this.contractRepository.save(contract);
  }

  /**
   * Soft delete contract
   */
  async remove(id: string): Promise<void> {
    const contract = await this.findOne(id);

    if (contract.status === ContractStatus.ACTIVE) {
      throw new BadRequestException(
        `Невозможно удалить активный договор. Сначала приостановите или завершите его.`,
      );
    }

    await this.contractRepository.softRemove(contract);
  }

  /**
   * Change contract status
   */
  async changeStatus(id: string, newStatus: ContractStatus): Promise<Contract> {
    const contract = await this.findOne(id);

    // Validate status transitions
    this.validateStatusTransition(contract.status, newStatus);

    contract.status = newStatus;
    contract.updated_at = new Date();

    return this.contractRepository.save(contract);
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(currentStatus: ContractStatus, newStatus: ContractStatus): void {
    // Define allowed transitions
    const allowedTransitions: Record<ContractStatus, ContractStatus[]> = {
      [ContractStatus.DRAFT]: [ContractStatus.ACTIVE, ContractStatus.TERMINATED],
      [ContractStatus.ACTIVE]: [
        ContractStatus.SUSPENDED,
        ContractStatus.EXPIRED,
        ContractStatus.TERMINATED,
      ],
      [ContractStatus.SUSPENDED]: [ContractStatus.ACTIVE, ContractStatus.TERMINATED],
      [ContractStatus.EXPIRED]: [ContractStatus.TERMINATED],
      [ContractStatus.TERMINATED]: [], // No transitions from terminated
    };

    const allowed = allowedTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Недопустимый переход статуса: ${currentStatus} -> ${newStatus}`,
      );
    }
  }

  /**
   * Get active contracts for a counterparty
   */
  async getActiveContractsForCounterparty(counterpartyId: string): Promise<Contract[]> {
    const now = new Date();

    return this.contractRepository.find({
      where: {
        counterparty_id: counterpartyId,
        status: ContractStatus.ACTIVE,
        start_date: LessThanOrEqual(now),
      },
      relations: ['counterparty'],
    });
  }

  /**
   * Get expiring contracts (within specified days)
   */
  async getExpiringContracts(withinDays: number = 30): Promise<Contract[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + withinDays);

    return this.contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.counterparty', 'counterparty')
      .where('contract.status = :status', { status: ContractStatus.ACTIVE })
      .andWhere('contract.end_date IS NOT NULL')
      .andWhere('contract.end_date BETWEEN :now AND :futureDate', { now, futureDate })
      .orderBy('contract.end_date', 'ASC')
      .getMany();
  }

  /**
   * Auto-expire contracts that have passed their end date
   */
  async autoExpireContracts(): Promise<number> {
    const now = new Date();

    const result = await this.contractRepository
      .createQueryBuilder()
      .update(Contract)
      .set({ status: ContractStatus.EXPIRED, updated_at: now })
      .where('status = :status', { status: ContractStatus.ACTIVE })
      .andWhere('end_date < :now', { now })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get statistics
   */
  async getStats() {
    const total = await this.contractRepository.count();

    const byStatus = await this.contractRepository
      .createQueryBuilder('contract')
      .select('contract.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('contract.status')
      .getRawMany();

    const byCommissionType = await this.contractRepository
      .createQueryBuilder('contract')
      .select('contract.commission_type', 'commission_type')
      .addSelect('COUNT(*)', 'count')
      .where('contract.status = :status', { status: ContractStatus.ACTIVE })
      .groupBy('contract.commission_type')
      .getRawMany();

    return {
      total,
      by_status: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      by_commission_type: byCommissionType.reduce((acc, item) => {
        acc[item.commission_type] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }
}
