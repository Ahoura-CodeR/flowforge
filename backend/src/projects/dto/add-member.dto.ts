import { Transform } from 'class-transformer';
import { IsEmail, IsIn } from 'class-validator';
import { ProjectRole } from '../project-role.enum';

// Ownership can't be handed out through this endpoint.
export const ASSIGNABLE_ROLES = [ProjectRole.MEMBER, ProjectRole.VIEWER] as const;

export class AddMemberDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @IsIn(ASSIGNABLE_ROLES)
  role: ProjectRole;
}
