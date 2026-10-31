import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ProjectMember } from '../project-member.entity';

/** The caller's membership in the current project, attached by ProjectRoleGuard. */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ProjectMember => {
    const request = ctx.switchToHttp().getRequest<Request & { projectMember: ProjectMember }>();
    return request.projectMember;
  },
);
