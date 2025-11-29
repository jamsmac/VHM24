import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Task } from './task.entity';
import { User } from '../../users/entities/user.entity';

@Entity('task_comments')
@Index(['task_id'])
@Index(['user_id'])
export class TaskComment extends BaseEntity {
  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => Task, (task) => task.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  comment: string;

  @Column({ type: 'boolean', default: false })
  is_internal: boolean; // true = only for admins, false = visible to operator
}
