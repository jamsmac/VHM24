import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { EquipmentComponent } from './entities/equipment-component.entity';
import { SparePart } from './entities/spare-part.entity';
import { WashingSchedule } from './entities/washing-schedule.entity';
import { ComponentMaintenance } from './entities/component-maintenance.entity';
import { ComponentMovement } from './entities/component-movement.entity';
import { HopperType } from './entities/hopper-type.entity';

// Services
import { ComponentsService } from './services/components.service';
import { SparePartsService } from './services/spare-parts.service';
import { WashingSchedulesService } from './services/washing-schedules.service';
import { MaintenanceService } from './services/maintenance.service';
import { EquipmentNotificationsService } from './services/equipment-notifications.service';
import { EquipmentScheduledTasksService } from './services/equipment-scheduled-tasks.service';
import { ComponentMovementsService } from './services/component-movements.service';
import { HopperTypesService } from './services/hopper-types.service';

// Controllers
import { ComponentsController } from './controllers/components.controller';
import { SparePartsController } from './controllers/spare-parts.controller';
import { WashingSchedulesController } from './controllers/washing-schedules.controller';
import { MaintenanceController } from './controllers/maintenance.controller';
import { HopperTypesController } from './controllers/hopper-types.controller';

// External modules
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EquipmentComponent,
      SparePart,
      WashingSchedule,
      ComponentMaintenance,
      ComponentMovement,
      HopperType,
    ]),
    NotificationsModule,
    UsersModule,
    forwardRef(() => TasksModule),
  ],
  controllers: [
    ComponentsController,
    SparePartsController,
    WashingSchedulesController,
    MaintenanceController,
    HopperTypesController,
  ],
  providers: [
    ComponentsService,
    SparePartsService,
    WashingSchedulesService,
    MaintenanceService,
    EquipmentNotificationsService,
    EquipmentScheduledTasksService,
    ComponentMovementsService,
    HopperTypesService,
  ],
  exports: [
    ComponentsService,
    SparePartsService,
    WashingSchedulesService,
    MaintenanceService,
    EquipmentNotificationsService,
    EquipmentScheduledTasksService,
    ComponentMovementsService,
    HopperTypesService,
  ],
})
export class EquipmentModule {}
