/**
 * Kanban ordering uses "fractional positions": each task has a number, and a column is
 * sorted by it. Dropping a card between two others gives it the midpoint, so moving one
 * card is a single-row update instead of renumbering the whole column.
 */
export const POSITION_GAP = 1024;
const MIN_GAP = 1e-6;

/** The position for a card placed between `prev` and `next` (either can be missing). */
export function positionBetween(prev?: number, next?: number): number {
  if (prev === undefined && next === undefined) return POSITION_GAP;
  if (prev === undefined) return (next as number) - POSITION_GAP;
  if (next === undefined) return prev + POSITION_GAP;
  return (prev + next) / 2;
}

/** After many inserts in the same spot, midpoints run out of precision and need a reset. */
export function needsRebalance(prev?: number, next?: number): boolean {
  return prev !== undefined && next !== undefined && next - prev < MIN_GAP;
}
