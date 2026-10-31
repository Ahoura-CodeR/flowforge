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
import { ProjectRole } from './project-role.enum';
import { Project } from './project.entity';

@Entity('project_members')
@Index(['projectId', 'userId'], { unique: true })
// Partial unique index: at most one owner per project, enforced by the database.
@Index('uq_project_single_owner', ['projectId'], {
  unique: true,
  where: `"role" = 'owner'`,
})
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: ProjectRole, default: ProjectRole.MEMBER })
  role: ProjectRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
