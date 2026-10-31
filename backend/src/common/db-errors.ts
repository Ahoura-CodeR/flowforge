import { QueryFailedError } from 'typeorm';

const PG_UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err.driverError as { code?: string } | undefined)?.code === PG_UNIQUE_VIOLATION
  );
}
