import { describe, expect, it } from "vitest";
import { overLimit } from "./memory-limit";

describe("overLimit", () => {
  it("allows up to the limit, then blocks", () => {
    const t = 1_000_000;
    expect([1, 2, 3].map((i) => overLimit("a", 3, 60_000, t + i))).toEqual([false, false, false]);
    expect(overLimit("a", 3, 60_000, t + 4)).toBe(true);
  });

  it("forgets hits outside the window", () => {
    const t = 5_000_000;
    overLimit("b", 1, 1000, t);
    expect(overLimit("b", 1, 1000, t + 2000)).toBe(false);
  });

  it("keeps keys separate", () => {
    overLimit("c", 1, 60_000, 1);
    expect(overLimit("d", 1, 60_000, 2)).toBe(false);
  });
});
