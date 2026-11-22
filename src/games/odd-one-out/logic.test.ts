import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../core/random";
import { scriptedRng } from "../../core/rng-fakes";
import {
  NEW_GRID_PAUSE_MS,
  ODD_ONE_OUT_LEVELS,
  SHAPE_KINDS,
  SYMMETRY_DEG,
  makeGrid,
  oddOneOut,
  sameShape,
  type Grid,
  type OddOneOutState,
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

describe("Odd One Out game", () => {
  it("has its meta and levels", () => {
    expect(oddOneOut.meta).toEqual({
      id: "odd-one-out",
      name: "Odd One Out",
      skill: "attention",
      skillLabel: "Visual attention",
      how: "One shape is different. Tap it!",
      glyph: "◆",
      accent: "var(--blue)",
      scoreUnit: "rounds",
      scoreUnitOne: "round",
      timed: true,
    });
    expect(oddOneOut.levels).toBe(ODD_ONE_OUT_LEVELS);
  });

  it("starts a Junior game with 45 seconds and the first grid", () => {
    const state = oddOneOut.create("junior", scriptedRng([4, 0, 0]), 1000);
    expect(state).toEqual({
      level: "junior",
      endsAtMs: 46000,
      nowMs: 1000,
      grid: makeGrid("junior", scriptedRng([4, 0, 0])),
      gridShownAtMs: 1000,
      correct: 0,
      mistakes: 0,
      lastAnswer: null,
    });
  });
});

/**
 * Each test gives the Rng the 3 numbers for the first grid plus exactly 3 more
 * for every new grid it expects. An ignored answer must not roll, so an extra
 * roll runs out of numbers and the test fails.
 */
describe("Odd One Out reduce", () => {
  const FIRST = [4, 0, 0]; // odd place 4: a square among circles
  const NEXT = [1, 2, 2]; // odd place 1: a star among triangles
  const start = (rolls: readonly number[]) => {
    const rng = scriptedRng(rolls);
    return { rng, state: oddOneOut.create("junior", rng, 1000) };
  };
  const answer = (input: number, atMs: number) => ({ kind: "answer" as const, input, atMs });

  it("returns the same state once the game is over", () => {
    const { rng, state } = start(FIRST);
    const over = oddOneOut.reduce(state, { kind: "tick", atMs: 46000 }, rng);
    expect(oddOneOut.isOver(over)).toBe(true);
    expect(oddOneOut.reduce(over, answer(4, 46001), rng)).toBe(over);
  });

  it("only moves the clock on a tick", () => {
    const { rng, state } = start(FIRST);
    expect(oddOneOut.reduce(state, { kind: "tick", atMs: 1500 }, rng)).toEqual({
      ...state,
      nowMs: 1500,
    });
  });

  it("does not count an answer that comes when the time is up", () => {
    const { rng, state } = start(FIRST);
    const next = oddOneOut.reduce(state, answer(4, 46000), rng);
    expect(next).toEqual({ ...state, nowMs: 46000 });
    expect(oddOneOut.isOver(next)).toBe(true);
  });

  it("ignores an answer in the pause on the first grid", () => {
    const { rng, state } = start(FIRST);
    expect(oddOneOut.reduce(state, answer(4, 1100), rng)).toEqual({ ...state, nowMs: 1100 });
  });

  it("ignores an answer 299 ms after a new grid", () => {
    const { rng, state } = start([...FIRST, ...NEXT]);
    const second = oddOneOut.reduce(state, answer(4, 2000), rng);
    expect(second.gridShownAtMs).toBe(2000);
    expect(oddOneOut.reduce(second, answer(1, 2299), rng)).toEqual({ ...second, nowMs: 2299 });
  });

  it("counts an answer exactly 300 ms after a new grid", () => {
    const { rng, state } = start([...FIRST, ...NEXT]);
    const next = oddOneOut.reduce(state, answer(4, 1300), rng);
    expect(next.correct).toBe(1);
    expect(next.gridShownAtMs).toBe(1300);
  });

  it("ignores a tap outside the grid", () => {
    const { rng, state } = start(FIRST);
    expect(oddOneOut.reduce(state, answer(-1, 2000), rng)).toEqual({ ...state, nowMs: 2000 });
    expect(oddOneOut.reduce(state, answer(6, 2000), rng)).toEqual({ ...state, nowMs: 2000 });
  });

  it("counts a tap on the odd shape as right and shows a new grid", () => {
    const { rng, state } = start([...FIRST, ...NEXT]);
    expect(oddOneOut.reduce(state, answer(4, 2000), rng)).toEqual({
      ...state,
      nowMs: 2000,
      correct: 1,
      lastAnswer: "right",
      grid: makeGrid("junior", scriptedRng(NEXT)),
      gridShownAtMs: 2000,
    });
  });

  it("counts a tap on another shape as a mistake and shows a new grid", () => {
    const { rng, state } = start([...FIRST, ...NEXT]);
    expect(oddOneOut.reduce(state, answer(0, 2000), rng)).toEqual({
      ...state,
      nowMs: 2000,
      mistakes: 1,
      lastAnswer: "wrong",
      grid: makeGrid("junior", scriptedRng(NEXT)),
      gridShownAtMs: 2000,
    });
  });

  it("gives the same game for the same seed and the same taps (FR-005)", () => {
    const play = (): OddOneOutState => {
      const rng = createSeededRng(7);
      let state = oddOneOut.create("junior", rng, 0);
      const taps = [answer(0, 500), answer(3, 900), answer(5, 1000), answer(2, 1500)];
      for (const tap of taps) state = oddOneOut.reduce(state, tap, rng);
      return state;
    };
    expect(play()).toEqual(play());
  });
});

describe("Odd One Out progress", () => {
  const fresh = (): OddOneOutState => oddOneOut.create("junior", scriptedRng([4, 0, 0]), 1000);

  it("shows rounds solved, mistakes and time left", () => {
    const state = fresh();
    expect(oddOneOut.progress({ ...state, nowMs: 11000, correct: 3, mistakes: 2 })).toEqual({
      score: 3,
      detail: "2 mistakes",
      timeLeftMs: 35000,
      livesLeft: null,
    });
  });

  it("says 0 mistakes and 1 mistake correctly", () => {
    const state = fresh();
    expect(oddOneOut.progress(state).detail).toBe("0 mistakes");
    expect(oddOneOut.progress({ ...state, mistakes: 1 }).detail).toBe("1 mistake");
  });

  it("never shows less than zero time left", () => {
    const state = fresh();
    expect(oddOneOut.progress({ ...state, nowMs: 50000 }).timeLeftMs).toBe(0);
  });
});
