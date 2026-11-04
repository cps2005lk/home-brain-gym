import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../core/random";
import { CHOICE_COUNT, nextQuestion, quickAdd, QUICK_ADD_LEVELS } from "./logic";

const anyRng = createSeededRng(21);

describe("Quick Add levels", () => {
  it("gives Junior easy sums and more time", () => {
    expect(quickAdd.levels.junior).toEqual({ seconds: 45, maxNumber: 10, allowMinus: false });
  });

  it("gives Teen bigger numbers, take-away and less time", () => {
    expect(quickAdd.levels.teen).toEqual({ seconds: 30, maxNumber: 20, allowMinus: true });
  });
});

describe("Quick Add questions", () => {
  it("never gives Junior a take-away", () => {
    const rng = createSeededRng(5);
    for (let i = 0; i < 200; i += 1) {
      expect(nextQuestion(QUICK_ADD_LEVELS.junior, rng).minus).toBe(false);
    }
  });

  it("keeps Junior sums inside the level", () => {
    const rng = createSeededRng(6);
    for (let i = 0; i < 200; i += 1) {
      const question = nextQuestion(QUICK_ADD_LEVELS.junior, rng);
      expect(question.left).toBeGreaterThanOrEqual(1);
      expect(question.left).toBeLessThanOrEqual(10);
      expect(question.right).toBeLessThanOrEqual(10);
      expect(question.answer).toBe(question.left + question.right);
    }
  });

  it("never asks Teen a take-away with a negative answer", () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 300; i += 1) {
      const question = nextQuestion(QUICK_ADD_LEVELS.teen, rng);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      if (question.minus) expect(question.left).toBeGreaterThanOrEqual(question.right);
    }
  });

  it("always offers three different choices, one of them right", () => {
    const rng = createSeededRng(8);
    for (let i = 0; i < 300; i += 1) {
      const question = nextQuestion(QUICK_ADD_LEVELS.teen, rng);

      expect(question.choices).toHaveLength(CHOICE_COUNT);
      expect(new Set(question.choices).size).toBe(CHOICE_COUNT);
      expect(question.choices).toContain(question.answer);
      for (const choice of question.choices) expect(choice).toBeGreaterThanOrEqual(0);
    }
  });

  it("does not always put the answer in the same place", () => {
    const rng = createSeededRng(9);
    const places = new Set<number>();
    for (let i = 0; i < 60; i += 1) {
      const question = nextQuestion(QUICK_ADD_LEVELS.junior, rng);
      places.add(question.choices.indexOf(question.answer));
    }
    expect(places.size).toBe(CHOICE_COUNT);
  });
});

describe("Quick Add play", () => {
  it("starts at zero with a full clock", () => {
    const state = quickAdd.create("junior", anyRng, 0);
    expect(quickAdd.progress(state)).toEqual({
      score: 0,
      detail: "0 mistakes",
      timeLeftMs: 45_000,
      livesLeft: null,
    });
  });

  it("scores the right button and asks a new question", () => {
    const state = quickAdd.create("teen", anyRng, 0);
    const rightButton = state.question.choices.indexOf(state.question.answer);

    const next = quickAdd.reduce(state, { kind: "answer", input: rightButton, atMs: 500 }, anyRng);

    expect(quickAdd.progress(next).score).toBe(1);
    expect(next.lastAnswer).toBe("right");
    expect(next.question).not.toBe(state.question);
  });

  it("counts a mistake for a wrong button", () => {
    const state = quickAdd.create("junior", anyRng, 0);
    const wrongButton = state.question.choices.findIndex(
      (choice) => choice !== state.question.answer,
    );

    const next = quickAdd.reduce(state, { kind: "answer", input: wrongButton, atMs: 400 }, anyRng);

    expect(quickAdd.progress(next).score).toBe(0);
    expect(quickAdd.progress(next).detail).toBe("1 mistake");
  });

  it("ignores a tap on a button that is not there", () => {
    const state = quickAdd.create("junior", anyRng, 0);
    const next = quickAdd.reduce(state, { kind: "answer", input: 9, atMs: 400 }, anyRng);

    expect(quickAdd.progress(next).score).toBe(0);
    expect(next.mistakes).toBe(0);
    expect(next.question).toBe(state.question);
  });

  it("ends when the clock runs out and then ignores answers", () => {
    const state = quickAdd.create("teen", anyRng, 0);
    const ended = quickAdd.reduce(state, { kind: "tick", atMs: 30_000 }, anyRng);

    expect(quickAdd.isOver(ended)).toBe(true);
    expect(quickAdd.reduce(ended, { kind: "answer", input: 0, atMs: 31_000 }, anyRng)).toBe(ended);
  });
});
