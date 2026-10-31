import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembersService } from '../members.service';
import { ProjectRole } from '../project-role.enum';
import { ProjectRoleGuard } from './project-role.guard';

const PROJECT_ID = '3f2b8c1e-6d1a-4a53-9d1e-0b6f5a0e7c11';

function setup(requiredRole: ProjectRole | undefined, membershipRole: ProjectRole | null, projectId = PROJECT_ID) {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(requiredRole) } as unknown as Reflector;
  const members = {
    findMembership: jest.fn().mockResolvedValue(membershipRole ? { role: membershipRole } : null),
  } as unknown as MembersService;
  const request: Record<string, unknown> = { params: { projectId }, user: { id: 'user-1' } };
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { guard: new ProjectRoleGuard(reflector, members), context, request, members };
}

describe('ProjectRoleGuard', () => {
  it('allows a role that meets the minimum and attaches the membership', async () => {
    const { guard, context, request } = setup(ProjectRole.MEMBER, ProjectRole.OWNER);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.projectMember).toEqual({ role: ProjectRole.OWNER });
  });

  it('rejects a role below the minimum with 403', async () => {
    const { guard, context } = setup(ProjectRole.MEMBER, ProjectRole.VIEWER);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('answers 404 (not 403) to non-members so project existence is not revealed', async () => {
    const { guard, context } = setup(ProjectRole.VIEWER, null);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('answers 404 for a malformed project id without touching the database', async () => {
    const { guard, context, members } = setup(ProjectRole.VIEWER, ProjectRole.OWNER, 'not-a-uuid');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(NotFoundException);
    expect(members.findMembership).not.toHaveBeenCalled();
  });

  it('defaults to requiring membership when no role is declared', async () => {
    const { guard, context } = setup(undefined, ProjectRole.VIEWER);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
