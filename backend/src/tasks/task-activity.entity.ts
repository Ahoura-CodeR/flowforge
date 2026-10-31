import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Task } from './task.entity';

export enum TaskActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
}

export interface TaskChange {
  field: 'title' | 'description' | 'status' | 'priority' | 'assignee' | 'dueDate';
  from: string | null;
  to: string | null;
}

/** Append-only history of what changed on a task, and who changed it. */
@Entity('task_activities')
@Index(['taskId', 'createdAt'])
export class TaskActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ type: 'enum', enum: TaskActivityAction })
  action: TaskActivityAction;

  // Only set for "updated". Assignee values are user ids, resolved to names when read.
  @Column({ type: 'jsonb', nullable: true })
  changes: TaskChange[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
