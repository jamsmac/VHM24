import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryReportPreset } from '../entities/inventory-report-preset.entity';
import {
  CreateInventoryReportPresetDto,
  UpdateInventoryReportPresetDto,
} from '../dto/inventory-report-preset.dto';

/**
 * Inventory Report Presets Service
 *
 * Управление сохранёнными пресетами фильтров отчётов
 * REQ-ANL-04: Сохранение пресетов фильтров отчётов
 */
@Injectable()
export class InventoryReportPresetsService {
  private readonly logger = new Logger(InventoryReportPresetsService.name);

  constructor(
    @InjectRepository(InventoryReportPreset)
    private readonly presetRepository: Repository<InventoryReportPreset>,
  ) {}

  /**
   * Создать новый пресет
   */
  async create(
    userId: string,
    createDto: CreateInventoryReportPresetDto,
  ): Promise<InventoryReportPreset> {
    this.logger.log(`Creating report preset for user ${userId}: ${createDto.name}`);

    // Если пресет устанавливается как default, снять флаг с других
    if (createDto.is_default) {
      await this.presetRepository.update(
        { user_id: userId, is_default: true },
        { is_default: false },
      );
    }

    const preset = this.presetRepository.create({
      ...createDto,
      user_id: userId,
    });

    return await this.presetRepository.save(preset);
  }

  /**
   * Получить все пресеты пользователя
   */
  async findByUser(userId: string): Promise<InventoryReportPreset[]> {
    return await this.presetRepository.find({
      where: { user_id: userId },
      order: { sort_order: 'ASC', updated_at: 'DESC' },
    });
  }

  /**
   * Получить один пресет по ID
   */
  async findOne(id: string, userId: string): Promise<InventoryReportPreset> {
    const preset = await this.presetRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!preset) {
      throw new NotFoundException(`Preset with ID ${id} not found`);
    }

    return preset;
  }

  /**
   * Обновить пресет
   */
  async update(
    id: string,
    userId: string,
    updateDto: UpdateInventoryReportPresetDto,
  ): Promise<InventoryReportPreset> {
    const preset = await this.findOne(id, userId);

    this.logger.log(`Updating report preset ${id} for user ${userId}`);

    // Если пресет устанавливается как default, снять флаг с других
    if (updateDto.is_default === true && !preset.is_default) {
      await this.presetRepository.update(
        { user_id: userId, is_default: true },
        { is_default: false },
      );
    }

    Object.assign(preset, updateDto);
    return await this.presetRepository.save(preset);
  }

  /**
   * Удалить пресет
   */
  async remove(id: string, userId: string): Promise<void> {
    const preset = await this.findOne(id, userId);

    this.logger.log(`Deleting report preset ${id} for user ${userId}`);

    await this.presetRepository.softRemove(preset);
  }

  /**
   * Получить пресет по умолчанию для пользователя
   */
  async getDefaultPreset(userId: string): Promise<InventoryReportPreset | null> {
    return await this.presetRepository.findOne({
      where: { user_id: userId, is_default: true },
    });
  }

  /**
   * Переупорядочить пресеты
   */
  async reorder(
    userId: string,
    presetOrder: Array<{ id: string; sort_order: number }>,
  ): Promise<void> {
    this.logger.log(`Reordering presets for user ${userId}`);

    for (const item of presetOrder) {
      const preset = await this.presetRepository.findOne({
        where: { id: item.id, user_id: userId },
      });

      if (preset) {
        preset.sort_order = item.sort_order;
        await this.presetRepository.save(preset);
      }
    }
  }
}
