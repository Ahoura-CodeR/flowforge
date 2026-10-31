import { needsRebalance, POSITION_GAP, positionBetween } from './task-position';

describe('positionBetween', () => {
  it('starts an empty column at one gap', () => {
    expect(positionBetween()).toBe(POSITION_GAP);
  });

  it('goes one gap after the last card', () => {
    expect(positionBetween(2048, undefined)).toBe(2048 + POSITION_GAP);
  });

  it('goes one gap before the first card', () => {
    expect(positionBetween(undefined, 1024)).toBe(1024 - POSITION_GAP);
  });

  it('takes the midpoint between two cards', () => {
    expect(positionBetween(1024, 2048)).toBe(1536);
  });

  it('always lands strictly between its neighbours', () => {
    let prev = 1024;
    const next = 2048;
    for (let i = 0; i < 20; i++) {
      const position = positionBetween(prev, next);
      expect(position).toBeGreaterThan(prev);
      expect(position).toBeLessThan(next);
      prev = position;
    }
  });
});

describe('needsRebalance', () => {
  it('is false for normal gaps and for edges of the column', () => {
    expect(needsRebalance(1024, 2048)).toBe(false);
    expect(needsRebalance(undefined, 2048)).toBe(false);
    expect(needsRebalance(1024, undefined)).toBe(false);
  });

  it('is true once the gap is too small to split again', () => {
    expect(needsRebalance(1, 1 + 1e-7)).toBe(true);
  });
});
