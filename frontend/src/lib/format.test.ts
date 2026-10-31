import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initials, isOverdue } from "./format";

describe("isOverdue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 15, 14, 30)); // 15 Nov 2026, afternoon
  });
  afterEach(() => vi.useRealTimers());

  it("is true only for dates before today", () => {
    expect(isOverdue("2026-11-14", false)).toBe(true);
    expect(isOverdue("2026-11-15", false)).toBe(false); // due today is not overdue
    expect(isOverdue("2026-11-16", false)).toBe(false);
  });

  it("is never true for finished tasks or tasks without a due date", () => {
    expect(isOverdue("2020-01-01", true)).toBe(false);
    expect(isOverdue(null, false)).toBe(false);
  });
});

describe("initials", () => {
  it("uses the first letters of up to two words", () => {
    expect(initials("ali reza")).toBe("AR");
    expect(initials("Sara")).toBe("S");
    expect(initials("  Mary  Jane  Watson ")).toBe("MJ");
  });
});
