import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DashboardWidget } from '../entities/dashboard-widget.entity';
import { CreateWidgetDto } from '../dto/create-widget.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(DashboardWidget)
    private widgetRepository: Repository<DashboardWidget>,
  ) {}

  async getUserWidgets(userId: string): Promise<DashboardWidget[]> {
    return this.widgetRepository.find({
      where: { user_id: userId, is_visible: true },
      order: { position: 'ASC' },
    });
  }

  async createWidget(userId: string, dto: CreateWidgetDto): Promise<DashboardWidget> {
    const widget = this.widgetRepository.create({
      ...dto,
      user_id: userId,
    });

    return this.widgetRepository.save(widget);
  }

  async updateWidget(id: string, dto: Partial<CreateWidgetDto>): Promise<DashboardWidget> {
    await this.widgetRepository.update(id, dto);
    const widget = await this.widgetRepository.findOne({ where: { id } });
    if (!widget) {
      throw new NotFoundException(`Widget with ID ${id} not found`);
    }
    return widget;
  }

  async deleteWidget(id: string): Promise<void> {
    await this.widgetRepository.softDelete(id);
  }

  async reorderWidgets(userId: string, widgetIds: string[]): Promise<void> {
    for (let i = 0; i < widgetIds.length; i++) {
      await this.widgetRepository.update({ id: widgetIds[i], user_id: userId }, { position: i });
    }
  }
}
