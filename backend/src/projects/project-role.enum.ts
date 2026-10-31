export enum ProjectRole {
  OWNER = 'owner',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

/** Higher number = more permissions. Lets guards ask for "at least member". */
export const PROJECT_ROLE_RANK: Record<ProjectRole, number> = {
  [ProjectRole.VIEWER]: 1,
  [ProjectRole.MEMBER]: 2,
  [ProjectRole.OWNER]: 3,
};
