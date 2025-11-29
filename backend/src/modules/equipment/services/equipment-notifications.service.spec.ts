import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentNotificationsService } from './equipment-notifications.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { UsersService } from '../../users/users.service';
import { UserRole, UserStatus } from '../../users/entities/user.entity';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/entities/notification.entity';
import { ComponentType } from '../entities/equipment-component.entity';

describe('EquipmentNotificationsService', () => {
  let service: EquipmentNotificationsService;
  let mockNotificationsService: any;
  let mockUsersService: any;

  beforeEach(async () => {
    mockNotificationsService = {
      create: jest.fn().mockResolvedValue({ id: 'notif-123' }),
    };

    mockUsersService = {
      findAll: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentNotificationsService,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<EquipmentNotificationsService>(EquipmentNotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyComponentNeedsMaintenance', () => {
    it('should send maintenance notification to all recipients', async () => {
      const component = {
        id: 'comp-123',
        name: 'Grinder Motor',
        component_type: ComponentType.GRINDER,
        machine_id: 'machine-456',
        machine: { machine_number: 'M-001' },
        last_maintenance_date: new Date('2025-01-01'),
        next_maintenance_date: new Date('2025-02-01'),
      };

      const recipientIds = ['user-1', 'user-2'];

      await service.notifyComponentNeedsMaintenance(component as any, recipientIds);

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.create).toHaveBeenCalledWith({
        type: NotificationType.COMPONENT_NEEDS_MAINTENANCE,
        channel: NotificationChannel.IN_APP,
        recipient_id: 'user-1',
        title: expect.any(String),
        message: expect.stringContaining('Grinder Motor'),
        data: expect.objectContaining({
          component_id: 'comp-123',
          machine_number: 'M-001',
        }),
        action_url: '/equipment/components/comp-123',
      });
    });

    it('should not send notifications when no recipients', async () => {
      const component = { id: 'comp-123' };

      await service.notifyComponentNeedsMaintenance(component as any, []);

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('should not send notifications when recipients is null', async () => {
      const component = { id: 'comp-123' };

      await service.notifyComponentNeedsMaintenance(component as any, null as any);

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('should use machine_id when machine object not available', async () => {
      const component = {
        id: 'comp-123',
        component_type: ComponentType.PUMP,
        machine_id: 'machine-789',
        machine: null,
      };

      await service.notifyComponentNeedsMaintenance(component as any, ['user-1']);

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            machine_number: 'machine-789',
          }),
        }),
      );
    });

    it('should handle notification creation errors gracefully', async () => {
      const component = { id: 'comp-123', component_type: ComponentType.GRINDER };
      mockNotificationsService.create.mockRejectedValueOnce(new Error('Failed'));

      await expect(
        service.notifyComponentNeedsMaintenance(component as any, ['user-1', 'user-2']),
      ).resolves.not.toThrow();

      // Should continue to next recipient
      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('notifyComponentNearingLifetime', () => {
    it('should send lifetime notification with percentage', async () => {
      const component = {
        id: 'comp-123',
        name: 'Coffee Pump',
        component_type: ComponentType.PUMP,
        machine_id: 'machine-456',
        machine: { machine_number: 'M-001' },
        working_hours: 900,
        expected_lifetime_hours: 1000,
      };

      await service.notifyComponentNearingLifetime(component as any, ['user-1'], 90);

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.COMPONENT_NEARING_LIFETIME,
          message: expect.stringContaining('90%'),
          data: expect.objectContaining({
            percentage_used: 90,
            working_hours: 900,
            expected_lifetime_hours: 1000,
          }),
        }),
      );
    });

    it('should not send notifications when no recipients', async () => {
      const component = { id: 'comp-123' };

      await service.notifyComponentNearingLifetime(component as any, [], 85);

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('notifySparePartLowStock', () => {
    it('should send low stock notification', async () => {
      const sparePart = {
        id: 'sp-123',
        name: 'Grinder Blade',
        part_number: 'GB-001',
        component_type: ComponentType.GRINDER,
        quantity_in_stock: 2,
        min_stock_level: 5,
        supplier_name: 'Parts Co.',
        lead_time_days: 14,
      };

      await service.notifySparePartLowStock(sparePart as any, ['user-1']);

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.SPARE_PART_LOW_STOCK,
          message: expect.stringContaining('Grinder Blade'),
          data: expect.objectContaining({
            spare_part_id: 'sp-123',
            part_number: 'GB-001',
            quantity_in_stock: 2,
            min_stock_level: 5,
          }),
          action_url: '/equipment/spare-parts/sp-123',
        }),
      );
    });

    it('should not send notifications when no recipients', async () => {
      const sparePart = { id: 'sp-123' };

      await service.notifySparePartLowStock(sparePart as any, []);

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('notifyWashingOverdue', () => {
    it('should send overdue washing notification', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const schedule = {
        id: 'ws-123',
        machine_id: 'machine-456',
        machine: { machine_number: 'M-001' },
        component_types: [ComponentType.HOPPER],
        frequency: 'weekly',
        next_wash_date: pastDate,
        last_wash_date: new Date('2025-01-01'),
      };

      await service.notifyWashingOverdue(schedule as any, ['user-1']);

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.WASHING_OVERDUE,
          message: expect.stringContaining('M-001'),
          data: expect.objectContaining({
            schedule_id: 'ws-123',
            days_overdue: expect.any(Number),
          }),
          action_url: '/equipment/washing-schedules/ws-123',
        }),
      );
    });

    it('should calculate days overdue correctly', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const schedule = {
        id: 'ws-123',
        machine_id: 'machine-456',
        machine: { machine_number: 'M-001' },
        next_wash_date: pastDate,
      };

      await service.notifyWashingOverdue(schedule as any, ['user-1']);

      const call = mockNotificationsService.create.mock.calls[0][0];
      expect(call.data.days_overdue).toBeGreaterThanOrEqual(10);
    });

    it('should not send notifications when no recipients', async () => {
      const schedule = { id: 'ws-123' };

      await service.notifyWashingOverdue(schedule as any, []);

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('notifyWashingUpcoming', () => {
    it('should send upcoming washing notification', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      const schedule = {
        id: 'ws-123',
        machine_id: 'machine-456',
        machine: { machine_number: 'M-001' },
        component_types: [ComponentType.HOPPER],
        frequency: 'weekly',
        next_wash_date: futureDate,
      };

      await service.notifyWashingUpcoming(schedule as any, ['user-1'], 3);

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.WASHING_UPCOMING,
          message: expect.stringContaining('3'),
          data: expect.objectContaining({
            schedule_id: 'ws-123',
            days_until: 3,
          }),
          action_url: '/equipment/washing-schedules/ws-123',
        }),
      );
    });

    it('should not send notifications when no recipients', async () => {
      const schedule = { id: 'ws-123' };

      await service.notifyWashingUpcoming(schedule as any, [], 5);

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('getMaintenanceTeamUserIds', () => {
    it('should return IDs of active technicians', async () => {
      const users = [
        { id: 'user-1', role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
        { id: 'user-2', role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
        { id: 'user-3', role: UserRole.OPERATOR, status: UserStatus.ACTIVE },
        { id: 'user-4', role: UserRole.TECHNICIAN, status: UserStatus.INACTIVE },
      ];

      mockUsersService.findAll.mockResolvedValue(users);

      const result = await service.getMaintenanceTeamUserIds();

      expect(result).toEqual(['user-1', 'user-2']);
    });

    it('should return empty array when no technicians', async () => {
      mockUsersService.findAll.mockResolvedValue([
        { id: 'user-1', role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      ]);

      const result = await service.getMaintenanceTeamUserIds();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockUsersService.findAll.mockRejectedValue(new Error('Database error'));

      const result = await service.getMaintenanceTeamUserIds();

      expect(result).toEqual([]);
    });
  });
});
