import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../core/random";
import { scriptedRng } from "../../core/rng-fakes";
import { backOne, BACK_ONE_LEVELS, isMatch, MATCH_IN, nextSymbol } from "./logic";

const anyRng = createSeededRng(31);

describe("Back One levels", () => {
  it("asks Junior for one back, slowly", () => {
    expect(backOne.levels.junior).toEqual({
      seconds: 45,
      backBy: 1,
      symbolCount: 4,
      stepMs: 2200,
    });
  });

  it("asks Teen for two back, faster", () => {
    expect(backOne.levels.teen).toEqual({ seconds: 30, backBy: 2, symbolCount: 5, stepMs: 1800 });
  });
});

describe("choosing the next picture", () => {
  it("picks freely while there is nothing to match yet", () => {
    expect(nextSymbol([], BACK_ONE_LEVELS.junior, scriptedRng([2]))).toBe(2);
  });

  it("repeats the matching picture when the roll says so", () => {
    // shown = [3]; roll 0 means "make a match", so it repeats 3
    expect(nextSymbol([3], BACK_ONE_LEVELS.junior, scriptedRng([0]))).toBe(3);
  });

  it("avoids the matching picture when the roll says no match", () => {
    // shown = [1]; roll 1 = no match, then roll 1 maps past the matching symbol
    expect(nextSymbol([1], BACK_ONE_LEVELS.junior, scriptedRng([1, 1]))).toBe(2);
    expect(nextSymbol([1], BACK_ONE_LEVELS.junior, scriptedRng([1, 0]))).toBe(0);
  });

  it("matches about one time in three", () => {
    const rng = createSeededRng(77);
    const level = BACK_ONE_LEVELS.junior;
    const shown: number[] = [rng.nextInt(level.symbolCount)];
    let matches = 0;
    const rounds = 600;

    for (let i = 0; i < rounds; i += 1) {
      const next = nextSymbol(shown, level, rng);
      if (next === shown[shown.length - level.backBy]) matches += 1;
      shown.push(next);
    }

    expect(matches / rounds).toBeGreaterThan(1 / MATCH_IN - 0.08);
    expect(matches / rounds).toBeLessThan(1 / MATCH_IN + 0.08);
  });
});

describe("Back One play", () => {
  /** Move the clock on until the next picture appears. */
  const step = (state: ReturnType<typeof backOne.create>) =>
    backOne.reduce(state, { kind: "tick", atMs: state.stepEndsAtMs }, anyRng);

  it("starts with one picture and nothing scored", () => {
    const state = backOne.create("junior", anyRng, 0);

    expect(state.shown).toHaveLength(1);
    expect(isMatch(state)).toBe(false); // nothing to match against yet
    expect(backOne.progress(state)).toEqual({
      score: 0,
      detail: "0 caught, 0 missed, 0 wrong",
      timeLeftMs: 45_000,
      livesLeft: null,
    });
  });

  it("shows the next picture when the time is up", () => {
    const state = backOne.create("junior", anyRng, 0);
    const next = step(state);

    expect(next.shown).toHaveLength(2);
    expect(next.stepEndsAtMs).toBe(state.stepEndsAtMs + 2200);
    expect(next.answeredThisStep).toBe(false);
  });

  it("counts a point for catching a match", () => {
    // junior, back by one: force the second picture to repeat the first
    const state = step(backOne.create("junior", scriptedRng([2]), 0));
    const matched = { ...state, shown: [2, 2] };

    const tapped = backOne.reduce(matched, { kind: "answer", input: "same", atMs: 100 }, anyRng);

    expect(tapped.hits).toBe(1);
    expect(backOne.progress(tapped).score).toBe(1);
    expect(tapped.lastAnswer).toBe("right");
  });

  it("counts a wrong tap when the pictures differ", () => {
    const state = step(backOne.create("junior", scriptedRng([2]), 0));
    const different = { ...state, shown: [2, 3] };

    const tapped = backOne.reduce(different, { kind: "answer", input: "same", atMs: 100 }, anyRng);

    expect(tapped.wrongTaps).toBe(1);
    expect(tapped.lastAnswer).toBe("wrong");
    expect(backOne.progress(tapped).score).toBe(0);
  });

  it("takes only the first tap on a picture", () => {
    const state = { ...backOne.create("junior", anyRng, 0), shown: [1, 1] };
    const once = backOne.reduce(state, { kind: "answer", input: "same", atMs: 100 }, anyRng);
    const twice = backOne.reduce(once, { kind: "answer", input: "same", atMs: 200 }, anyRng);

    expect(twice.hits).toBe(1);
    expect(twice.wrongTaps).toBe(0);
  });

  it("counts a miss when a match passes without a tap", () => {
    const state = { ...backOne.create("junior", anyRng, 0), shown: [1, 1] };
    const after = backOne.reduce(
      state,
      { kind: "tick", atMs: state.stepEndsAtMs },
      scriptedRng([1, 0]),
    );

    expect(after.misses).toBe(1);
  });

  it("does not count a miss when the pictures differ", () => {
    const state = { ...backOne.create("junior", anyRng, 0), shown: [1, 2] };
    const after = backOne.reduce(
      state,
      { kind: "tick", atMs: state.stepEndsAtMs },
      scriptedRng([1, 0]),
    );

    expect(after.misses).toBe(0);
  });

  it("needs two pictures back for Teen", () => {
    const teen = { ...backOne.create("teen", anyRng, 0), shown: [4, 1, 4] };
    expect(isMatch(teen)).toBe(true);

    const notTeen = { ...backOne.create("teen", anyRng, 0), shown: [4, 1, 1] };
    expect(isMatch(notTeen)).toBe(false); // that is a one-back match, which Teen ignores
  });

  it("never drops the score below zero", () => {
    let state = { ...backOne.create("junior", anyRng, 0), shown: [1, 2] };
    for (let i = 0; i < 3; i += 1) {
      state = backOne.reduce(state, { kind: "answer", input: "same", atMs: 100 }, anyRng);
      state = { ...state, answeredThisStep: false };
    }

    expect(state.wrongTaps).toBe(3);
    expect(backOne.progress(state).score).toBe(0);
  });

  it("ends when the clock runs out and then ignores taps", () => {
    const state = backOne.create("teen", anyRng, 0);
    const ended = backOne.reduce(state, { kind: "tick", atMs: 30_000 }, anyRng);

    expect(backOne.isOver(ended)).toBe(true);
    expect(backOne.reduce(ended, { kind: "answer", input: "same", atMs: 31_000 }, anyRng)).toBe(
      ended,
    );
  });
});
