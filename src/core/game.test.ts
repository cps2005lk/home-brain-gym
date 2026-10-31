import { describe, expect, it } from "vitest";
import { defineGame } from "./game";
import type { Rng } from "./random";

/**
 * A tiny pretend game ("tap as many times as you can") used only to prove the
 * contract works and is comfortable to write against. The four real games come
 * in Milestone 2.
 */
interface TapState {
  readonly endsAtMs: number;
  readonly nowMs: number;
  readonly taps: number;
}

interface TapLevel {
  readonly seconds: number;
}

const tapLevels = {
  junior: { seconds: 45 },
  teen: { seconds: 30 },
} as const;

/**
 * Small plain functions first, so the game object below never has to refer to
 * itself. (TypeScript cannot work out the type of something that uses itself
 * inside its own definition - the same reason C# needs an explicit type there.)
 */
const isTapOver = (state: TapState): boolean => state.nowMs >= state.endsAtMs;

const tapGame = defineGame<TapState, "tap", TapLevel>({
  meta: {
    id: "tap-test",
    name: "Tap Test",
    skill: "attention",
    skillLabel: "Attention",
    how: "Tap as many times as you can.",
    glyph: "T",
    accent: "var(--green)",
    scoreUnit: "taps",
    timed: true,
  },
  levels: tapLevels,
  create: (level, _rng, startedAtMs) => ({
    endsAtMs: startedAtMs + tapLevels[level].seconds * 1000,
    nowMs: startedAtMs,
    taps: 0,
  }),
  reduce: (state, event) => {
    if (isTapOver(state)) return state;
    const moved = { ...state, nowMs: event.atMs };
    return event.kind === "answer" ? { ...moved, taps: state.taps + 1 } : moved;
  },
  isOver: isTapOver,
  progress: (state) => ({
    score: state.taps,
    detail: `${state.taps} taps`,
    timeLeftMs: Math.max(0, state.endsAtMs - state.nowMs),
    livesLeft: null,
  }),
});

/** A fake Rng: it always answers 0, so tests never surprise us. */
const zeroRng: Rng = { nextInt: () => 0 };

describe("game contract", () => {
  it("gives every level its own settings", () => {
    expect(tapGame.levels.junior.seconds).toBe(45);
    expect(tapGame.levels.teen.seconds).toBe(30);
  });

  it("starts with an empty score and a full clock", () => {
    const state = tapGame.create("teen", zeroRng, 1_000);
    expect(tapGame.progress(state).score).toBe(0);
    expect(tapGame.progress(state).timeLeftMs).toBe(30_000);
    expect(tapGame.isOver(state)).toBe(false);
  });

  it("counts answers and never changes the old state", () => {
    const first = tapGame.create("junior", zeroRng, 0);
    const second = tapGame.reduce(first, { kind: "answer", input: "tap", atMs: 500 }, zeroRng);

    expect(tapGame.progress(second).score).toBe(1);
    expect(tapGame.progress(first).score).toBe(0); // the old state is untouched
  });

  it("ends when the clock runs out and ignores later answers", () => {
    const start = tapGame.create("teen", zeroRng, 0);
    const ended = tapGame.reduce(start, { kind: "tick", atMs: 30_000 }, zeroRng);

    expect(tapGame.isOver(ended)).toBe(true);
    expect(tapGame.progress(ended).timeLeftMs).toBe(0);

    const afterEnd = tapGame.reduce(ended, { kind: "answer", input: "tap", atMs: 31_000 }, zeroRng);
    expect(tapGame.progress(afterEnd).score).toBe(0);
  });
});
