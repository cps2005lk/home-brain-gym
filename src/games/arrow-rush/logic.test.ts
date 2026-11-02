import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../core/random";
import { scriptedRng } from "../../core/rng-fakes";
import { arrowRush, arrowsFor, middleIndex, nextRound, opposite } from "./logic";

const anyRng = createSeededRng(5);

describe("Arrow Rush levels", () => {
  it("gives Junior 3 arrows with the middle one highlighted", () => {
    expect(arrowRush.levels.junior).toEqual({
      seconds: 45,
      arrowCount: 3,
      highlightMiddle: true,
      congruentPercent: 60,
    });
  });

  it("gives Teen 5 arrows with no highlight", () => {
    expect(arrowRush.levels.teen).toEqual({
      seconds: 30,
      arrowCount: 5,
      highlightMiddle: false,
      congruentPercent: 40,
    });
  });
});

describe("Arrow Rush rows", () => {
  it("knows where the middle is", () => {
    expect(middleIndex(3)).toBe(1);
    expect(middleIndex(5)).toBe(2);
  });

  it("puts the target in the middle and the flankers around it", () => {
    expect(arrowsFor({ target: "left", flanker: "right" }, 5)).toEqual([
      "right",
      "right",
      "left",
      "right",
      "right",
    ]);
  });

  it("points every arrow the same way when the round is congruent", () => {
    expect(arrowsFor({ target: "right", flanker: "right" }, 3)).toEqual([
      "right",
      "right",
      "right",
    ]);
  });

  it("builds a round from two rolls", () => {
    // roll 1 -> target "right", roll 10 (< 60) -> same direction
    expect(nextRound(60, scriptedRng([1, 10]))).toEqual({ target: "right", flanker: "right" });
    // roll 0 -> target "left", roll 70 (not < 60) -> opposite flankers
    expect(nextRound(60, scriptedRng([0, 70]))).toEqual({ target: "left", flanker: "right" });
  });

  it("flips a direction", () => {
    expect(opposite("left")).toBe("right");
    expect(opposite("right")).toBe("left");
  });

  it("tricks Teen more often than Junior", () => {
    const rate = (percent: number): number => {
      const rng = createSeededRng(99);
      const rounds = 400;
      let congruent = 0;
      for (let i = 0; i < rounds; i += 1) {
        const round = nextRound(percent, rng);
        if (round.target === round.flanker) congruent += 1;
      }
      return congruent / rounds;
    };

    expect(rate(60)).toBeGreaterThan(0.5);
    expect(rate(60)).toBeLessThan(0.7);
    expect(rate(40)).toBeGreaterThan(0.3);
    expect(rate(40)).toBeLessThan(0.5);
  });
});

describe("Arrow Rush play", () => {
  it("starts at zero with a full clock", () => {
    const state = arrowRush.create("junior", anyRng, 0);
    expect(arrowRush.progress(state)).toEqual({
      score: 0,
      detail: "0 mistakes",
      timeLeftMs: 45_000,
      livesLeft: null,
    });
  });

  it("scores the middle arrow, not the others", () => {
    const state = arrowRush.create("teen", anyRng, 0);
    const next = arrowRush.reduce(
      state,
      { kind: "answer", input: state.round.target, atMs: 300 },
      anyRng,
    );

    expect(arrowRush.progress(next).score).toBe(1);
    expect(next.lastAnswer).toBe("right");
  });

  it("counts a mistake when the kid follows the flankers", () => {
    // build a trick round by hand: middle points left, the others point right
    const state = arrowRush.create("junior", anyRng, 0);
    const tricky = { ...state, round: { target: "left", flanker: "right" } } as const;

    const next = arrowRush.reduce(tricky, { kind: "answer", input: "right", atMs: 300 }, anyRng);

    expect(arrowRush.progress(next).score).toBe(0);
    expect(arrowRush.progress(next).detail).toBe("1 mistake");
    expect(next.lastAnswer).toBe("wrong");
  });

  it("shows a new row after every answer", () => {
    const state = arrowRush.create("teen", anyRng, 0);
    const next = arrowRush.reduce(state, { kind: "answer", input: "left", atMs: 200 }, anyRng);
    expect(next.round).not.toBe(state.round);
  });

  it("ends when the clock runs out and then ignores answers", () => {
    const state = arrowRush.create("teen", anyRng, 0);
    const ended = arrowRush.reduce(state, { kind: "tick", atMs: 30_000 }, anyRng);

    expect(arrowRush.isOver(ended)).toBe(true);
    const late = arrowRush.reduce(
      ended,
      { kind: "answer", input: ended.round.target, atMs: 31_000 },
      anyRng,
    );
    expect(late).toBe(ended);
  });
});
