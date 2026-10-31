import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import { Request } from 'express';
import { AuthUser } from '../../auth/types/auth-user';
import { PROJECT_ROLE_KEY } from '../decorators/require-project-role.decorator';
import { MembersService } from '../members.service';
import { ProjectMember } from '../project-member.entity';
import { PROJECT_ROLE_RANK, ProjectRole } from '../project-role.enum';

/**
 * Project-level authorization. Apply it to routes that have a `:projectId` param.
 * Non-members get a 404 (not 403) so the API doesn't reveal which projects exist.
 */
@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly membersService: MembersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // No decorator means "any member": membership is always required when this guard is used.
    const minRole =
      this.reflector.getAllAndOverride<ProjectRole | undefined>(PROJECT_ROLE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? ProjectRole.VIEWER;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthUser; projectMember?: ProjectMember }>();

    const projectId = request.params.projectId;
    if (typeof projectId !== 'string' || !isUUID(projectId)) {
      throw new NotFoundException('Project not found');
    }

    const membership = await this.membersService.findMembership(projectId, request.user.id);
    if (!membership) {
      throw new NotFoundException('Project not found');
    }
    if (PROJECT_ROLE_RANK[membership.role] < PROJECT_ROLE_RANK[minRole]) {
      throw new ForbiddenException('You do not have permission to do this in this project');
    }

    request.projectMember = membership;
    return true;
  }
}
