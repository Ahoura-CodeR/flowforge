/**
 * DTO instances can carry `undefined` for fields the client didn't send.
 * Strip them before applying a partial update so we never overwrite data by accident.
 */
export function omitUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
