import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatorRatingsController } from './operator-ratings.controller';
import { OperatorRatingsService } from './operator-ratings.service';
import { OperatorRating } from './entities/operator-rating.entity';
import { Task } from '../tasks/entities/task.entity';
import { File } from '../files/entities/file.entity';
// import { TaskChecklistItem } from '../tasks/entities/task-checklist-item.entity'; // Entity doesn't exist - checklist stored as JSONB in Task
import { TaskComment } from '../tasks/entities/task-comment.entity';
import { Complaint } from '../complaints/entities/complaint.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OperatorRating,
      Task,
      File,
      // TaskChecklistItem, // Entity doesn't exist - checklist stored as JSONB in Task
      TaskComment,
      Complaint,
      User,
    ]),
  ],
  controllers: [OperatorRatingsController],
  providers: [OperatorRatingsService],
  exports: [OperatorRatingsService],
})
export class OperatorRatingsModule {}
