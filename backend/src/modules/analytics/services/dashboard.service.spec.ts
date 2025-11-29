import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardWidget, WidgetType } from '../entities/dashboard-widget.entity';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockWidgetRepository: jest.Mocked<Repository<DashboardWidget>>;

  const mockWidget: Partial<DashboardWidget> = {
    id: 'widget-1',
    user_id: 'user-1',
    widget_type: WidgetType.SALES_CHART,
    title: 'Sales Chart',
    position: 0,
    is_visible: true,
    config: {},
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    mockWidgetRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(DashboardWidget),
          useValue: mockWidgetRepository,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserWidgets', () => {
    it('should return user widgets ordered by position', async () => {
      const widgets = [mockWidget, { ...mockWidget, id: 'widget-2', position: 1 }];
      mockWidgetRepository.find.mockResolvedValue(widgets as DashboardWidget[]);

      const result = await service.getUserWidgets('user-1');

      expect(result).toEqual(widgets);
      expect(mockWidgetRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-1', is_visible: true },
        order: { position: 'ASC' },
      });
    });

    it('should return empty array if no widgets found', async () => {
      mockWidgetRepository.find.mockResolvedValue([]);

      const result = await service.getUserWidgets('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('createWidget', () => {
    it('should create and save a new widget', async () => {
      const createDto = {
        widget_type: WidgetType.SALES_CHART,
        title: 'Sales Chart',
        config: {},
      };
      mockWidgetRepository.create.mockReturnValue(mockWidget as DashboardWidget);
      mockWidgetRepository.save.mockResolvedValue(mockWidget as DashboardWidget);

      const result = await service.createWidget('user-1', createDto as any);

      expect(mockWidgetRepository.create).toHaveBeenCalledWith({
        ...createDto,
        user_id: 'user-1',
      });
      expect(mockWidgetRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockWidget);
    });
  });

  describe('updateWidget', () => {
    it('should update widget and return updated data', async () => {
      const updateDto = { title: 'Updated Title' };
      const updatedWidget = { ...mockWidget, title: 'Updated Title' };
      mockWidgetRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockWidgetRepository.findOne.mockResolvedValue(updatedWidget as DashboardWidget);

      const result = await service.updateWidget('widget-1', updateDto);

      expect(mockWidgetRepository.update).toHaveBeenCalledWith('widget-1', updateDto);
      expect(result).toEqual(updatedWidget);
    });

    it('should throw NotFoundException if widget not found after update', async () => {
      mockWidgetRepository.update.mockResolvedValue({ affected: 0 } as any);
      mockWidgetRepository.findOne.mockResolvedValue(null);

      await expect(service.updateWidget('non-existent', { title: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      mockWidgetRepository.update.mockResolvedValue({ affected: 0 } as any);
      mockWidgetRepository.findOne.mockResolvedValue(null);

      await expect(service.updateWidget('widget-123', { title: 'Test' })).rejects.toThrow(
        'Widget with ID widget-123 not found',
      );
    });
  });

  describe('deleteWidget', () => {
    it('should soft delete a widget', async () => {
      mockWidgetRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteWidget('widget-1');

      expect(mockWidgetRepository.softDelete).toHaveBeenCalledWith('widget-1');
    });
  });

  describe('reorderWidgets', () => {
    it('should update position for each widget', async () => {
      const widgetIds = ['widget-1', 'widget-2', 'widget-3'];
      mockWidgetRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.reorderWidgets('user-1', widgetIds);

      expect(mockWidgetRepository.update).toHaveBeenCalledTimes(3);
      expect(mockWidgetRepository.update).toHaveBeenNthCalledWith(
        1,
        { id: 'widget-1', user_id: 'user-1' },
        { position: 0 },
      );
      expect(mockWidgetRepository.update).toHaveBeenNthCalledWith(
        2,
        { id: 'widget-2', user_id: 'user-1' },
        { position: 1 },
      );
      expect(mockWidgetRepository.update).toHaveBeenNthCalledWith(
        3,
        { id: 'widget-3', user_id: 'user-1' },
        { position: 2 },
      );
    });

    it('should handle empty widget list', async () => {
      await service.reorderWidgets('user-1', []);

      expect(mockWidgetRepository.update).not.toHaveBeenCalled();
    });
  });
});
