import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../core/random";
import { scriptedRng } from "../../core/rng-fakes";
import {
  NEW_GRID_PAUSE_MS,
  ODD_ONE_OUT_LEVELS,
  SHAPE_KINDS,
  SYMMETRY_DEG,
  makeGrid,
  sameShape,
  type Grid,
  type Shape,
} from "./logic";

/** The shape every place except the odd one has. */
const commonShape = (grid: Grid): Shape => {
  const shape = grid.shapes[grid.oddIndex === 0 ? 1 : 0];
  if (!shape) throw new Error("grid is too small");
  return shape;
};

const oddShape = (grid: Grid): Shape => {
  const shape = grid.shapes[grid.oddIndex];
  if (!shape) throw new Error("oddIndex is outside the grid");
  return shape;
};

describe("Odd One Out levels", () => {
  it("gives Junior 45 seconds and a 2x3 grid with an obvious difference", () => {
    expect(ODD_ONE_OUT_LEVELS.junior).toEqual({
      seconds: 45,
      rows: 2,
      cols: 3,
      subtle: false,
      biggerScale: 1.2,
      smallerScale: 0.82,
      turnDeg: 20,
    });
  });

  it("gives Teen 30 seconds and a 4x4 grid with a subtle difference", () => {
    expect(ODD_ONE_OUT_LEVELS.teen).toEqual({
      seconds: 30,
      rows: 4,
      cols: 4,
      subtle: true,
      biggerScale: 1.2,
      smallerScale: 0.82,
      turnDeg: 20,
    });
  });
});

describe("Odd One Out shapes", () => {
  it("lists the five shape kinds in roll order", () => {
    expect(SHAPE_KINDS).toEqual(["circle", "square", "triangle", "star", "heart"]);
  });

  it("knows the turn that maps each kind onto itself", () => {
    expect(SYMMETRY_DEG).toEqual({ circle: 0, square: 90, triangle: 120, star: 72, heart: 360 });
  });

  it("ignores taps for 300 ms after a new grid", () => {
    expect(NEW_GRID_PAUSE_MS).toBe(300);
  });
});

describe("sameShape", () => {
  const base: Shape = { kind: "square", scale: 1, turnDeg: 0, dot: true };

  it("is true when all four fields match", () => {
    expect(sameShape(base, { ...base })).toBe(true);
  });

  it("is false when the kind differs", () => {
    expect(sameShape(base, { ...base, kind: "circle" })).toBe(false);
  });

  it("is false when the scale differs", () => {
    expect(sameShape(base, { ...base, scale: 1.2 })).toBe(false);
  });

  it("is false when the turn differs", () => {
    expect(sameShape(base, { ...base, turnDeg: 20 })).toBe(false);
  });

  it("is false when the dot differs", () => {
    expect(sameShape(base, { ...base, dot: false })).toBe(false);
  });
});

describe("makeGrid at Junior", () => {
  it("rolls the odd place, the common kind, then the odd kind from the kinds left", () => {
    // 4 -> place 4; 0 -> circle; 0 -> first of [square, triangle, star, heart]
    const grid = makeGrid("junior", scriptedRng([4, 0, 0]));
    expect(grid.oddIndex).toBe(4);
    expect(commonShape(grid).kind).toBe("circle");
    expect(oddShape(grid).kind).toBe("square");
  });

  it("counts the odd kind over the kinds left after removing the common one", () => {
    // 2 -> triangle; kinds left [circle, square, star, heart], 2 -> star
    const grid = makeGrid("junior", scriptedRng([0, 2, 2]));
    expect(grid.oddIndex).toBe(0);
    expect(commonShape(grid).kind).toBe("triangle");
    expect(oddShape(grid).kind).toBe("star");
  });

  it("can pick the last kind as common and the last kind left as odd", () => {
    // 4 -> heart; kinds left [circle, square, triangle, star], 3 -> star
    const grid = makeGrid("junior", scriptedRng([5, 4, 3]));
    expect(grid.oddIndex).toBe(5);
    expect(commonShape(grid).kind).toBe("heart");
    expect(oddShape(grid).kind).toBe("star");
  });

  it("draws every Junior shape at normal size, not turned, with no dot", () => {
    const grid = makeGrid("junior", scriptedRng([4, 0, 0]));
    for (const shape of grid.shapes) {
      expect(shape).toMatchObject({ scale: 1, turnDeg: 0, dot: false });
    }
  });

  it("always has 6 shapes with exactly one of a different kind (SC-001)", () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      const grid = makeGrid("junior", createSeededRng(seed));
      expect(grid.shapes).toHaveLength(6);
      expect(grid.oddIndex).toBeGreaterThanOrEqual(0);
      expect(grid.oddIndex).toBeLessThan(6);

      const common = commonShape(grid);
      const odd = oddShape(grid);
      grid.shapes.forEach((shape, index) => {
        if (index !== grid.oddIndex) expect(sameShape(shape, common)).toBe(true);
      });
      expect(sameShape(odd, common)).toBe(false);
      expect(odd.kind).not.toBe(common.kind);
    }
  });
});
