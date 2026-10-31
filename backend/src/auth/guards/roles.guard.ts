import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from '../../users/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../types/auth-user';

/** Runs after JwtAuthGuard, so `request.user` is already populated. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    return !!user && requiredRoles.includes(user.role);
  }
}
