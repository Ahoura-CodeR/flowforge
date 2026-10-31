import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Task } from '../tasks/task.entity';
import { User } from '../users/user.entity';

@Entity('comments')
@Index(['taskId', 'createdAt'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  // Kept (as null) if the author's account is deleted, so the discussion stays readable.
  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'author_id' })
  author: User | null;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Null until the comment is edited, so clients can show an "edited" label.
  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
  editedAt: Date | null;
}
