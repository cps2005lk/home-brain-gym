import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../core/random";
import { scriptedRng } from "../../core/rng-fakes";
import { correctAnswer, nextCard, ruleSwitch } from "./logic";

const anyRng = createSeededRng(3);

describe("Rule Switch levels", () => {
  it("shows the rule to Junior for 45 seconds", () => {
    expect(ruleSwitch.levels.junior).toEqual({ seconds: 45, showRule: true });
  });

  it("hides the rule from Teen and gives 30 seconds", () => {
    expect(ruleSwitch.levels.teen).toEqual({ seconds: 30, showRule: false });
  });
});

describe("Rule Switch cards", () => {
  it("never shows the number 5", () => {
    const rng = createSeededRng(11);
    for (let i = 0; i < 400; i += 1) {
      const card = nextCard(rng);
      expect(card.value).toBeGreaterThanOrEqual(1);
      expect(card.value).toBeLessThanOrEqual(9);
      expect(card.value).not.toBe(5);
    }
  });

  it("turns each roll into a number and a rule", () => {
    // roll 0 -> value 1, roll 0 -> rule "parity"
    expect(nextCard(scriptedRng([0, 0]))).toEqual({ value: 1, rule: "parity" });
    // roll 4 -> value 6 (5 is skipped), roll 1 -> rule "size"
    expect(nextCard(scriptedRng([4, 1]))).toEqual({ value: 6, rule: "size" });
  });

  it("answers the odd/even rule", () => {
    expect(correctAnswer({ value: 7, rule: "parity" })).toBe("oddOrSmaller");
    expect(correctAnswer({ value: 4, rule: "parity" })).toBe("evenOrBigger");
  });

  it("answers the smaller/bigger than 5 rule", () => {
    expect(correctAnswer({ value: 3, rule: "size" })).toBe("oddOrSmaller");
    expect(correctAnswer({ value: 8, rule: "size" })).toBe("evenOrBigger");
  });

  it("uses the same button for both meanings", () => {
    // 3 is odd AND smaller than 5, so the same button is right under both rules
    expect(correctAnswer({ value: 3, rule: "parity" })).toBe("oddOrSmaller");
    expect(correctAnswer({ value: 3, rule: "size" })).toBe("oddOrSmaller");
    // 8 is even AND bigger than 5
    expect(correctAnswer({ value: 8, rule: "parity" })).toBe("evenOrBigger");
    expect(correctAnswer({ value: 8, rule: "size" })).toBe("evenOrBigger");
  });
});

describe("Rule Switch play", () => {
  it("starts at zero with a full clock", () => {
    const state = ruleSwitch.create("junior", anyRng, 0);
    expect(ruleSwitch.progress(state)).toEqual({
      score: 0,
      detail: "0 right, 0 wrong",
      timeLeftMs: 45_000,
      livesLeft: null,
    });
  });

  it("gives a point for the right button and shows a new card", () => {
    const state = ruleSwitch.create("teen", anyRng, 0);
    const next = ruleSwitch.reduce(
      state,
      { kind: "answer", input: correctAnswer(state.card), atMs: 400 },
      anyRng,
    );

    expect(ruleSwitch.progress(next).score).toBe(1);
    expect(next.lastAnswer).toBe("right");
    expect(next.card).not.toBe(state.card);
  });

  it("takes a point away for a wrong button", () => {
    // one right, then one wrong: 1 - 1 = 0
    let state = ruleSwitch.create("teen", anyRng, 0);
    state = ruleSwitch.reduce(
      state,
      { kind: "answer", input: correctAnswer(state.card), atMs: 300 },
      anyRng,
    );
    const wrongButton =
      correctAnswer(state.card) === "oddOrSmaller" ? "evenOrBigger" : "oddOrSmaller";
    state = ruleSwitch.reduce(state, { kind: "answer", input: wrongButton, atMs: 600 }, anyRng);

    expect(ruleSwitch.progress(state)).toMatchObject({
      score: 0,
      detail: "1 right, 1 wrong",
    });
  });

  it("never drops the score below zero", () => {
    let state = ruleSwitch.create("junior", anyRng, 0);
    for (let i = 0; i < 4; i += 1) {
      const wrongButton =
        correctAnswer(state.card) === "oddOrSmaller" ? "evenOrBigger" : "oddOrSmaller";
      state = ruleSwitch.reduce(
        state,
        { kind: "answer", input: wrongButton, atMs: 500 + i * 100 },
        anyRng,
      );
    }

    expect(state.wrong).toBe(4);
    expect(ruleSwitch.progress(state).score).toBe(0);
  });

  it("ends when the clock runs out and then ignores answers", () => {
    const state = ruleSwitch.create("teen", anyRng, 0);
    const ended = ruleSwitch.reduce(state, { kind: "tick", atMs: 30_000 }, anyRng);

    expect(ruleSwitch.isOver(ended)).toBe(true);
    const late = ruleSwitch.reduce(
      ended,
      { kind: "answer", input: correctAnswer(ended.card), atMs: 30_500 },
      anyRng,
    );
    expect(late).toBe(ended);
  });
});
