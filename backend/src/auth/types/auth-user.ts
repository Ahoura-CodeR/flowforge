import { UserRole } from '../../users/user.entity';

/** What lives inside the signed JWT. */
export interface JwtPayload {
  sub: string;
  role: UserRole;
}

/** What controllers see on `request.user` after authentication. */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
