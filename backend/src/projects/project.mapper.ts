import { User } from '../users/user.entity';
import { ProjectMember } from './project-member.entity';
import { ProjectRole } from './project-role.enum';
import { Project } from './project.entity';

export function toProjectResponse(project: Project, myRole: ProjectRole) {
  return {
    id: project.id,
    name: project.name,
    key: project.key,
    description: project.description,
    myRole,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function toMemberResponse(member: ProjectMember & { user: User }) {
  return {
    userId: member.userId,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    joinedAt: member.joinedAt,
  };
}
