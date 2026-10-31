/**
 * Accepts `?status=todo,done` and `?status=todo&status=done` and turns both into an array.
 * Returns undefined when the param is absent so validation can skip it.
 */
export function toStringArray({ value }: { value: unknown }): string[] | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean);
}
