import { SetMetadata } from '@nestjs/common';
import { ProjectRole } from '../project-role.enum';

export const PROJECT_ROLE_KEY = 'projectRole';

/** Minimum role needed on the project in the URL. OWNER > MEMBER > VIEWER. */
export const RequireProjectRole = (role: ProjectRole) => SetMetadata(PROJECT_ROLE_KEY, role);
