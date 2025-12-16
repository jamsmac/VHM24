import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { Task } from '../modules/tasks/entities/task.entity';
import { MachineInventory } from '../modules/inventory/entities/machine-inventory.entity';
import { WarehouseInventory } from '../modules/inventory/entities/warehouse-inventory.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { Machine } from '../modules/machines/entities/machine.entity';
import { Nomenclature } from '../modules/nomenclature/entities/nomenclature.entity';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { MachinesModule } from '../modules/machines/machines.module';
import { IncidentsModule } from '../modules/incidents/incidents.module';
import { InventoryModule } from '../modules/inventory/inventory.module';
import { ComplaintsModule } from '../modules/complaints/complaints.module';
import { WarehouseModule } from '../modules/warehouse/warehouse.module';
import { TransactionsModule } from '../modules/transactions/transactions.module';
import { CounterpartyModule } from '../modules/counterparty/counterparty.module';
import { OperatorRatingsModule } from '../modules/operator-ratings/operator-ratings.module';
import { AlertsModule } from '../modules/alerts/alerts.module';
import { UsersModule } from '../modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      MachineInventory,
      WarehouseInventory,
      Notification,
      Machine,
      Nomenclature,
    ]),
    NotificationsModule,
    MachinesModule,
    IncidentsModule,
    InventoryModule,
    ComplaintsModule,
    WarehouseModule,
    TransactionsModule,
    CounterpartyModule,
    OperatorRatingsModule,
    AlertsModule,
    UsersModule,
  ],
  providers: [ScheduledTasksService],
})
export class ScheduledTasksModule {}
