import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../core/random";
import { scriptedRng } from "../../core/rng-fakes";
import { colorChoices, colorClash, nextPrompt } from "./logic";

const anyRng = createSeededRng(1);

describe("Color Clash levels", () => {
  it("gives Junior 45 seconds and 3 colours", () => {
    expect(colorClash.levels.junior).toEqual({ seconds: 45, colorCount: 3 });
    expect(colorChoices("junior")).toHaveLength(3);
  });

  it("gives Teen 30 seconds and 4 colours", () => {
    expect(colorClash.levels.teen).toEqual({ seconds: 30, colorCount: 4 });
    expect(colorChoices("teen")).toHaveLength(4);
  });
});

describe("Color Clash prompts", () => {
  it("paints the word in a different colour when the roll says so", () => {
    // rolls: word = 1, "must differ" = 1 (true), offset = 0  ->  ink = (1 + 1 + 0) % 3 = 2
    const prompt = nextPrompt(3, scriptedRng([1, 1, 0]));
    expect(prompt).toEqual({ wordIndex: 1, inkIndex: 2 });
  });

  it("allows a matching colour when the roll says so", () => {
    // rolls: word = 2, "must differ" = 0 (false), ink = 2
    const prompt = nextPrompt(3, scriptedRng([2, 0, 2]));
    expect(prompt).toEqual({ wordIndex: 2, inkIndex: 2 });
  });

  it("mismatches most of the time, which is the point of the game", () => {
    const rng = createSeededRng(42);
    const rounds = 300;
    let mismatched = 0;
    for (let i = 0; i < rounds; i += 1) {
      const prompt = nextPrompt(3, rng);
      if (prompt.wordIndex !== prompt.inkIndex) mismatched += 1;
    }
    expect(mismatched / rounds).toBeGreaterThan(0.8);
  });
});

describe("Color Clash play", () => {
  it("starts at zero with a full clock", () => {
    const state = colorClash.create("junior", anyRng, 1_000);
    expect(colorClash.progress(state)).toEqual({
      score: 0,
      detail: "0 mistakes",
      timeLeftMs: 45_000,
      livesLeft: null,
    });
    expect(colorClash.isOver(state)).toBe(false);
  });

  it("scores a point for tapping the ink colour", () => {
    const state = colorClash.create("teen", anyRng, 0);
    const next = colorClash.reduce(
      state,
      { kind: "answer", input: state.prompt.inkIndex, atMs: 900 },
      anyRng,
    );

    expect(colorClash.progress(next).score).toBe(1);
    expect(next.lastAnswer).toBe("right");
    expect(colorClash.progress(state).score).toBe(0); // old state untouched
  });

  it("counts a mistake for tapping the word instead of the ink", () => {
    // force a mismatched prompt so word and ink are really different
    const state = colorClash.create("junior", scriptedRng([0, 1, 0]), 0);
    const next = colorClash.reduce(
      state,
      { kind: "answer", input: state.prompt.wordIndex, atMs: 600 },
      anyRng,
    );

    expect(colorClash.progress(next).score).toBe(0);
    expect(colorClash.progress(next).detail).toBe("1 mistake");
    expect(next.lastAnswer).toBe("wrong");
  });

  it("shows a new question after every answer", () => {
    const state = colorClash.create("teen", anyRng, 0);
    const next = colorClash.reduce(state, { kind: "answer", input: 0, atMs: 500 }, anyRng);
    expect(next.prompt).not.toBe(state.prompt);
  });

  it("ends when the clock runs out and then ignores answers", () => {
    const state = colorClash.create("teen", anyRng, 0);
    const ended = colorClash.reduce(state, { kind: "tick", atMs: 30_000 }, anyRng);

    expect(colorClash.isOver(ended)).toBe(true);
    expect(colorClash.progress(ended).timeLeftMs).toBe(0);

    const late = colorClash.reduce(
      ended,
      { kind: "answer", input: ended.prompt.inkIndex, atMs: 31_000 },
      anyRng,
    );
    expect(colorClash.progress(late).score).toBe(colorClash.progress(ended).score);
  });
});
