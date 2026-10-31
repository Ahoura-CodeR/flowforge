import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectMember } from './project-member.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  // Short prefix used in task keys (FF-12). Immutable once created.
  @Column({ length: 10, unique: true })
  key: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Last task number handed out in this project. Incremented atomically in SQL.
  @Column({ name: 'task_counter', default: 0 })
  taskCounter: number;

  @OneToMany(() => ProjectMember, (member) => member.project)
  members: ProjectMember[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
