import { describe, expect, it } from "vitest";
import { createSeededRng } from "../../core/random";
import { CELL_COUNT, dealBoard, numbersVisible, tapOrder, type TapOrderState } from "./logic";

const anyRng = createSeededRng(41);

/** Where a number sits on the board. */
const cellOf = (state: TapOrderState, value: number): number =>
  state.board.findIndex((item) => item === value);

/** Tap the numbers 1..count in order. */
function tapInOrder(start: TapOrderState, count: number): TapOrderState {
  let state = start;
  for (let value = 1; value <= count; value += 1) {
    state = tapOrder.reduce(
      state,
      { kind: "answer", input: cellOf(state, value), atMs: state.nowMs + 100 },
      anyRng,
    );
  }
  return state;
}

describe("Tap the Order levels", () => {
  it("gives Junior six numbers that stay visible", () => {
    expect(tapOrder.levels.junior).toEqual({ seconds: 45, highest: 6, hideAfterStart: false });
  });

  it("gives Teen twelve numbers that hide after the first tap", () => {
    expect(tapOrder.levels.teen).toEqual({ seconds: 30, highest: 12, hideAfterStart: true });
  });
});

describe("dealing the board", () => {
  it("puts every number on the board exactly once", () => {
    const board = dealBoard(6, createSeededRng(3));
    const numbers = board.filter((cell) => cell !== null);

    expect(board).toHaveLength(CELL_COUNT);
    expect(numbers.toSorted((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("fills the rest with empty squares", () => {
    const board = dealBoard(6, createSeededRng(4));
    expect(board.filter((cell) => cell === null)).toHaveLength(CELL_COUNT - 6);
  });

  it("does not always deal the same board", () => {
    const first = dealBoard(6, createSeededRng(5));
    const second = dealBoard(6, createSeededRng(99));
    expect(first).not.toEqual(second);
  });
});

describe("Tap the Order play", () => {
  it("starts asking for number one", () => {
    const state = tapOrder.create("junior", anyRng, 0);

    expect(state.nextNumber).toBe(1);
    expect(tapOrder.progress(state)).toEqual({
      score: 0,
      detail: "0 wrong taps",
      timeLeftMs: 45_000,
      livesLeft: null,
    });
  });

  it("clears a square when the right number is tapped", () => {
    const state = tapOrder.create("junior", anyRng, 0);
    const first = cellOf(state, 1);

    const next = tapOrder.reduce(state, { kind: "answer", input: first, atMs: 100 }, anyRng);

    expect(next.board[first]).toBeNull();
    expect(next.nextNumber).toBe(2);
    expect(next.lastAnswer).toBe("right");
  });

  it("counts a wrong tap but keeps the board", () => {
    const state = tapOrder.create("junior", anyRng, 0);
    const third = cellOf(state, 3);

    const next = tapOrder.reduce(state, { kind: "answer", input: third, atMs: 100 }, anyRng);

    expect(next.nextNumber).toBe(1); // still waiting for 1
    expect(next.board[third]).toBe(3); // nothing was cleared
    expect(next.mistakes).toBe(1);
    expect(tapOrder.progress(next).detail).toBe("1 wrong tap");
  });

  it("ignores a tap on an empty square", () => {
    const state = tapOrder.create("junior", anyRng, 0);
    const empty = state.board.findIndex((cell) => cell === null);

    const next = tapOrder.reduce(state, { kind: "answer", input: empty, atMs: 100 }, anyRng);

    expect(next.mistakes).toBe(0);
    expect(next.nextNumber).toBe(1);
  });

  it("scores a round and deals a new board when the last number is tapped", () => {
    const state = tapOrder.create("junior", anyRng, 0);
    const done = tapInOrder(state, 6);

    expect(tapOrder.progress(done).score).toBe(1);
    expect(done.nextNumber).toBe(1);
    expect(done.board.filter((cell) => cell !== null)).toHaveLength(6);
  });

  it("can score several rounds", () => {
    let state = tapOrder.create("junior", anyRng, 0);
    state = tapInOrder(state, 6);
    state = tapInOrder(state, 6);

    expect(tapOrder.progress(state).score).toBe(2);
  });

  it("hides the numbers for Teen once the round has started", () => {
    const state = tapOrder.create("teen", anyRng, 0);
    expect(numbersVisible(state)).toBe(true); // a moment to look first

    const started = tapOrder.reduce(
      state,
      { kind: "answer", input: cellOf(state, 1), atMs: 100 },
      anyRng,
    );
    expect(numbersVisible(started)).toBe(false);
  });

  it("keeps the numbers visible for Junior all the way", () => {
    const state = tapOrder.create("junior", anyRng, 0);
    const started = tapOrder.reduce(
      state,
      { kind: "answer", input: cellOf(state, 1), atMs: 100 },
      anyRng,
    );
    expect(numbersVisible(started)).toBe(true);
  });

  it("ends when the clock runs out and then ignores taps", () => {
    const state = tapOrder.create("teen", anyRng, 0);
    const ended = tapOrder.reduce(state, { kind: "tick", atMs: 30_000 }, anyRng);

    expect(tapOrder.isOver(ended)).toBe(true);
    expect(tapOrder.reduce(ended, { kind: "answer", input: 0, atMs: 31_000 }, anyRng)).toBe(ended);
  });
});
