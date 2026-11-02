import { describe, expect, it } from "vitest";
import type { Rng } from "../../core/random";
import { createSeededRng } from "../../core/random";
import { litCells, patternMemory, showDurationMs, type PatternMemoryState } from "./logic";

const rng: Rng = createSeededRng(7);

/** Move past whichever waiting phase we are in (showing, won or lost). */
function advance(state: PatternMemoryState): PatternMemoryState {
  const phase = state.phase;
  // TypeScript only lets us read untilMs after we check the kind.
  if (phase.kind === "input" || phase.kind === "over") return state;
  return patternMemory.reduce(state, { kind: "tick", atMs: phase.untilMs }, rng);
}

/** Tap a list of squares, 10 ms apart. */
function tap(
  state: PatternMemoryState,
  cells: readonly number[],
  startMs = state.nowMs + 10,
): PatternMemoryState {
  return cells.reduce(
    (acc, cell, index) =>
      patternMemory.reduce(acc, { kind: "answer", input: cell, atMs: startMs + index * 10 }, rng),
    state,
  );
}

describe("Pattern Memory levels", () => {
  it("gives Junior a 3x3 grid, 3 squares, any order", () => {
    expect(patternMemory.levels.junior).toEqual({
      gridSize: 3,
      startLength: 3,
      ordered: false,
      lives: 2,
    });
  });

  it("gives Teen a 4x4 grid, 4 squares, same order", () => {
    expect(patternMemory.levels.teen).toEqual({
      gridSize: 4,
      startLength: 4,
      ordered: true,
      lives: 2,
    });
  });
});

describe("Pattern Memory round start", () => {
  it("shows a pattern of different squares inside the grid", () => {
    const state = patternMemory.create("teen", rng, 0);

    expect(state.phase.kind).toBe("showing");
    expect(state.sequence).toHaveLength(4);
    expect(new Set(state.sequence).size).toBe(4); // no square twice
    for (const cell of state.sequence) {
      expect(cell).toBeGreaterThanOrEqual(0);
      expect(cell).toBeLessThan(16);
    }
    expect(patternMemory.progress(state)).toEqual({
      score: 0,
      detail: "longest pattern",
      timeLeftMs: null,
      livesLeft: 2,
    });
  });

  it("lights all squares together for Junior", () => {
    const state = patternMemory.create("junior", rng, 0);

    expect(litCells(state, 0)).toEqual([]); // short wait first
    expect(litCells(state, 500)).toEqual(state.sequence);
    expect(showDurationMs(3, false)).toBe(2_150);
  });

  it("lights one square at a time for Teen", () => {
    const state = patternMemory.create("teen", rng, 0);
    const [first, second] = state.sequence;

    expect(litCells(state, 599)).toEqual([]);
    expect(litCells(state, 600)).toEqual([first]);
    expect(litCells(state, 1_050)).toEqual([]); // that one switched off again
    expect(litCells(state, 1_250)).toEqual([second]);
    expect(showDurationMs(4, true)).toBe(3_200);
  });

  it("ignores taps while the pattern is still showing", () => {
    const state = patternMemory.create("junior", rng, 0);
    const tapped = tap(state, state.sequence, 100);

    expect(tapped.hits).toEqual([]);
    expect(tapped.phase.kind).toBe("showing");
  });

  it("waits for input once the lights are done", () => {
    const state = advance(patternMemory.create("junior", rng, 0));
    expect(state.phase.kind).toBe("input");
  });
});

describe("Pattern Memory answers", () => {
  it("accepts any order for Junior and grows the pattern after a win", () => {
    const first = advance(patternMemory.create("junior", rng, 0));
    const won = tap(first, [...first.sequence].reverse());

    expect(won.phase.kind).toBe("won");
    expect(patternMemory.progress(won).score).toBe(3);

    const nextRound = advance(won);
    expect(nextRound.length).toBe(4);
    expect(nextRound.sequence).toHaveLength(4);
    expect(nextRound.phase.kind).toBe("showing");
    expect(nextRound.hits).toEqual([]);
  });

  it("requires the same order for Teen", () => {
    const state = advance(patternMemory.create("teen", rng, 0));
    const [first, second] = state.sequence;
    if (first === undefined || second === undefined) throw new Error("need 4 squares");

    const wrongOrder = tap(state, [second]);
    expect(wrongOrder.phase.kind).toBe("lost");
    expect(wrongOrder.livesLeft).toBe(1);
    expect(wrongOrder.wrongCell).toBe(second);

    const rightOrder = tap(state, [first]);
    expect(rightOrder.phase.kind).toBe("input");
    expect(rightOrder.hits).toEqual([first]);
  });

  it("shows the squares that were missed after a mistake", () => {
    const state = advance(patternMemory.create("junior", rng, 0));
    const [first] = state.sequence;
    if (first === undefined) throw new Error("need squares");
    const outside = [0, 1, 2, 3, 4, 5, 6, 7, 8].find((cell) => !state.sequence.includes(cell));
    if (outside === undefined) throw new Error("need a wrong square");

    const lost = tap(state, [first, outside]);

    expect(lost.phase.kind).toBe("lost");
    expect(litCells(lost, lost.nowMs)).toEqual(state.sequence.filter((cell) => cell !== first));
  });

  it("ignores tapping the same correct square twice", () => {
    const state = advance(patternMemory.create("junior", rng, 0));
    const [first] = state.sequence;
    if (first === undefined) throw new Error("need squares");

    const twice = tap(state, [first, first]);

    expect(twice.hits).toEqual([first]);
    expect(twice.livesLeft).toBe(2);
    expect(twice.phase.kind).toBe("input");
  });
});

describe("Pattern Memory ending", () => {
  it("ends after two mistakes and keeps the best pattern as the score", () => {
    let state = advance(patternMemory.create("junior", rng, 0));

    // win one round of 3
    state = advance(tap(state, state.sequence));
    expect(state.length).toBe(4);

    // then fail twice
    for (let attempt = 0; attempt < 2; attempt += 1) {
      state = advance(state); // lights done, waiting for input
      const wrong = [0, 1, 2, 3, 4, 5, 6, 7, 8].find((cell) => !state.sequence.includes(cell));
      if (wrong === undefined) throw new Error("need a wrong square");
      state = advance(tap(state, [wrong])); // tap wrong, then wait out the pause
    }

    expect(patternMemory.isOver(state)).toBe(true);
    expect(patternMemory.progress(state).score).toBe(3);
    expect(patternMemory.progress(state).livesLeft).toBe(0);
  });

  it("ignores everything after the game is over", () => {
    let state = advance(patternMemory.create("teen", rng, 0));
    for (let attempt = 0; attempt < 2; attempt += 1) {
      state = advance(state);
      const wrong = Array.from({ length: 16 }, (_, index) => index).find(
        (cell) => cell !== state.sequence[0],
      );
      if (wrong === undefined) throw new Error("need a wrong square");
      state = advance(tap(state, [wrong]));
    }

    expect(patternMemory.isOver(state)).toBe(true);
    const later = patternMemory.reduce(state, { kind: "answer", input: 0, atMs: 99_999 }, rng);
    expect(later).toBe(state);
  });

  it("never grows the pattern past one square less than the whole grid", () => {
    let state = patternMemory.create("junior", rng, 0);

    for (let round = 0; round < 12; round += 1) {
      state = advance(state); // lights done
      state = advance(tap(state, state.sequence)); // perfect round, then next round starts
      expect(state.length).toBeLessThanOrEqual(8); // 3x3 grid - 1
      expect(state.sequence.length).toBeLessThanOrEqual(8);
    }

    expect(patternMemory.progress(state).score).toBe(8);
  });
});
