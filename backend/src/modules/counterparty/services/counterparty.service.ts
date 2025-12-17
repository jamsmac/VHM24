import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Counterparty } from '../entities/counterparty.entity';
import { CreateCounterpartyDto } from '../dto/create-counterparty.dto';
import { UpdateCounterpartyDto } from '../dto/update-counterparty.dto';

/** Valid counterparty types */
type CounterpartyType = Counterparty['type'];

/**
 * Counterparty Service
 *
 * Manages counterparties (контрагенты) for Uzbekistan market
 */
@Injectable()
export class CounterpartyService {
  constructor(
    @InjectRepository(Counterparty)
    private readonly counterpartyRepository: Repository<Counterparty>,
  ) {}

  /**
   * Create a new counterparty
   */
  async create(createDto: CreateCounterpartyDto): Promise<Counterparty> {
    // Check if INN already exists
    const existing = await this.counterpartyRepository.findOne({
      where: { inn: createDto.inn },
      withDeleted: true, // Check even soft-deleted records
    });

    if (existing) {
      if (existing.deleted_at) {
        throw new ConflictException(
          `Контрагент с ИНН ${createDto.inn} уже существует (удален). ` +
            `Восстановите его или используйте другой ИНН.`,
        );
      }
      throw new ConflictException(`Контрагент с ИНН ${createDto.inn} уже существует`);
    }

    const counterparty = this.counterpartyRepository.create(createDto);
    return this.counterpartyRepository.save(counterparty);
  }

  /**
   * Find all counterparties with optional filters
   */
  async findAll(type?: string, isActive?: boolean, search?: string): Promise<Counterparty[]> {
    const query = this.counterpartyRepository.createQueryBuilder('counterparty');

    if (type) {
      query.andWhere('counterparty.type = :type', { type });
    }

    if (isActive !== undefined) {
      query.andWhere('counterparty.is_active = :isActive', { isActive });
    }

    if (search) {
      query.andWhere(
        '(counterparty.name ILIKE :search OR ' +
          'counterparty.short_name ILIKE :search OR ' +
          'counterparty.inn LIKE :search)',
        { search: `%${search}%` },
      );
    }

    query.orderBy('counterparty.name', 'ASC');

    return query.getMany();
  }

  /**
   * Find counterparty by ID
   */
  async findOne(id: string): Promise<Counterparty> {
    const counterparty = await this.counterpartyRepository.findOne({
      where: { id },
      relations: ['contracts', 'locations'],
    });

    if (!counterparty) {
      throw new NotFoundException(`Контрагент с ID ${id} не найден`);
    }

    return counterparty;
  }

  /**
   * Find counterparty by INN
   */
  async findByInn(inn: string): Promise<Counterparty | null> {
    return this.counterpartyRepository.findOne({
      where: { inn },
    });
  }

  /**
   * Update counterparty
   */
  async update(id: string, updateDto: UpdateCounterpartyDto): Promise<Counterparty> {
    const counterparty = await this.findOne(id);

    // If updating INN, check for conflicts
    if (updateDto.inn && updateDto.inn !== counterparty.inn) {
      const existing = await this.counterpartyRepository.findOne({
        where: { inn: updateDto.inn },
      });

      if (existing) {
        throw new ConflictException(`Контрагент с ИНН ${updateDto.inn} уже существует`);
      }
    }

    Object.assign(counterparty, updateDto);
    counterparty.updated_at = new Date();

    return this.counterpartyRepository.save(counterparty);
  }

  /**
   * Soft delete counterparty
   */
  async remove(id: string): Promise<void> {
    const counterparty = await this.findOne(id);

    // Check if has active contracts
    if (counterparty.contracts && counterparty.contracts.length > 0) {
      const activeContracts = counterparty.contracts.filter((c) => c.status === 'active');

      if (activeContracts.length > 0) {
        throw new BadRequestException(
          `Невозможно удалить контрагента с активными договорами. ` +
            `Сначала завершите или приостановите ${activeContracts.length} договор(ов).`,
        );
      }
    }

    await this.counterpartyRepository.softRemove(counterparty);
  }

  /**
   * Restore soft-deleted counterparty
   */
  async restore(id: string): Promise<Counterparty> {
    const counterparty = await this.counterpartyRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!counterparty) {
      throw new NotFoundException(`Контрагент с ID ${id} не найден`);
    }

    if (!counterparty.deleted_at) {
      throw new BadRequestException(`Контрагент не был удален`);
    }

    await this.counterpartyRepository.restore(id);

    return this.findOne(id);
  }

  /**
   * Get counterparties by type
   */
  async getByType(type: CounterpartyType): Promise<Counterparty[]> {
    return this.counterpartyRepository.find({
      where: { type, is_active: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Get location owners (контрагенты-владельцы локаций)
   */
  async getLocationOwners(): Promise<Counterparty[]> {
    return this.getByType('location_owner');
  }

  /**
   * Get statistics
   */
  async getStats() {
    const total = await this.counterpartyRepository.count();
    const active = await this.counterpartyRepository.count({
      where: { is_active: true },
    });

    const byType = await this.counterpartyRepository
      .createQueryBuilder('cp')
      .select('cp.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('cp.is_active = true')
      .groupBy('cp.type')
      .getRawMany();

    return {
      total,
      active,
      inactive: total - active,
      by_type: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }
}
