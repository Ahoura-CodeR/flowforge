import { IsIn } from 'class-validator';
import { ProjectRole } from '../project-role.enum';
import { ASSIGNABLE_ROLES } from './add-member.dto';

export class UpdateMemberRoleDto {
  @IsIn(ASSIGNABLE_ROLES)
  role: ProjectRole;
}
