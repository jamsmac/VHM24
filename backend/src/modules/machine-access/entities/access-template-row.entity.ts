import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AccessTemplate } from './access-template.entity';
import { MachineAccessRole } from './machine-access.entity';

/**
 * A single row in an access template.
 * Defines which user should get which role when the template is applied.
 */
@Entity('access_template_rows')
@Unique(['template_id', 'user_id'])
export class AccessTemplateRow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @ManyToOne(() => AccessTemplate, (template) => template.rows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: AccessTemplate;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: MachineAccessRole,
    default: MachineAccessRole.VIEWER,
  })
  role: MachineAccessRole;
}
