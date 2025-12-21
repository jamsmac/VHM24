import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { TaskItem } from './entities/task-item.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskComponent } from './entities/task-component.entity';
import {
  TaskCompletionService,
  TaskRejectionService,
  TaskEscalationService,
} from './services';
import { FilesModule } from '../files/files.module';
import { MachinesModule } from '../machines/machines.module';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { SecurityModule } from '../security/security.module';
import { UsersModule } from '../users/users.module';
import { EquipmentModule } from '../equipment/equipment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskItem, TaskComment, TaskComponent]),
    FilesModule,
    forwardRef(() => MachinesModule),
    forwardRef(() => InventoryModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => TransactionsModule),
    forwardRef(() => IncidentsModule),
    SecurityModule,
    UsersModule,
    forwardRef(() => EquipmentModule),
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskCompletionService,
    TaskRejectionService,
    TaskEscalationService,
  ],
  exports: [
    TasksService,
    TaskCompletionService,
    TaskRejectionService,
    TaskEscalationService,
  ],
})
export class TasksModule {}
