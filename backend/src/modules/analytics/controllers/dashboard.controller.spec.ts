import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from '../services/dashboard.service';
import { CreateWidgetDto } from '../dto/create-widget.dto';

type MockAuthRequest = Parameters<typeof DashboardController.prototype.getWidgets>[0];

describe('DashboardController', () => {
  let controller: DashboardController;
  let mockDashboardService: jest.Mocked<DashboardService>;

  const mockWidget = {
    id: 'widget-1',
    user_id: 'user-1',
    widget_type: 'revenue',
    title: 'Revenue Chart',
    position: 0,
  };

  const mockRequest = {
    user: {
      userId: 'user-1',
    },
  } as MockAuthRequest;

  beforeEach(async () => {
    mockDashboardService = {
      getUserWidgets: jest.fn(),
      createWidget: jest.fn(),
      updateWidget: jest.fn(),
      deleteWidget: jest.fn(),
      reorderWidgets: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService,
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getWidgets', () => {
    it('should return user widgets', async () => {
      const widgets = [mockWidget];
      mockDashboardService.getUserWidgets.mockResolvedValue(widgets as any);

      const result = await controller.getWidgets(mockRequest);

      expect(result).toEqual(widgets);
      expect(mockDashboardService.getUserWidgets).toHaveBeenCalledWith('user-1');
    });
  });

  describe('createWidget', () => {
    it('should create a new widget', async () => {
      const dto: CreateWidgetDto = {
        widget_type: 'revenue',
        title: 'Revenue Chart',
      } as any;

      mockDashboardService.createWidget.mockResolvedValue(mockWidget as any);

      const result = await controller.createWidget(mockRequest, dto);

      expect(result).toEqual(mockWidget);
      expect(mockDashboardService.createWidget).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('updateWidget', () => {
    it('should update a widget', async () => {
      const dto: Partial<CreateWidgetDto> = {
        title: 'Updated Title',
      };
      const updatedWidget = { ...mockWidget, title: 'Updated Title' };

      mockDashboardService.updateWidget.mockResolvedValue(updatedWidget as any);

      const result = await controller.updateWidget('widget-1', dto);

      expect(result).toEqual(updatedWidget);
      expect(mockDashboardService.updateWidget).toHaveBeenCalledWith('widget-1', dto);
    });
  });

  describe('deleteWidget', () => {
    it('should delete a widget', async () => {
      mockDashboardService.deleteWidget.mockResolvedValue(undefined);

      const result = await controller.deleteWidget('widget-1');

      expect(result).toEqual({ message: 'Widget deleted successfully' });
      expect(mockDashboardService.deleteWidget).toHaveBeenCalledWith('widget-1');
    });
  });

  describe('reorderWidgets', () => {
    it('should reorder widgets', async () => {
      const widgetIds = ['widget-1', 'widget-2', 'widget-3'];
      mockDashboardService.reorderWidgets.mockResolvedValue(undefined);

      const result = await controller.reorderWidgets(mockRequest, { widgetIds });

      expect(result).toEqual({ message: 'Widgets reordered successfully' });
      expect(mockDashboardService.reorderWidgets).toHaveBeenCalledWith('user-1', widgetIds);
    });
  });
});
