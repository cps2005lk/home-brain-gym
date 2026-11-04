import { defineGame } from "../../core/game";
import type { LevelId } from "../../core/level";
import type { Rng } from "../../core/random";

/** The board is always 4x4; a level decides how many squares hold a number. */
export const GRID_SIZE = 4;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

export interface TapOrderLevel {
  readonly seconds: number;
  /** How many numbers to find: Junior 1-6, Teen 1-12. */
  readonly highest: number;
  /** Teen only: the numbers disappear after the first tap and must be remembered. */
  readonly hideAfterStart: boolean;
}

export const TAP_ORDER_LEVELS: Record<LevelId, TapOrderLevel> = {
  junior: { seconds: 45, highest: 6, hideAfterStart: false },
  teen: { seconds: 30, highest: 12, hideAfterStart: true },
};

export interface TapOrderState {
  readonly level: LevelId;
  readonly endsAtMs: number;
  readonly nowMs: number;
  /**
   * Which number sits in each square of the 4x4 board.
   * null means the square is empty.
   */
  readonly board: readonly (number | null)[];
  /** The number the kid must tap next. */
  readonly nextNumber: number;
  /** Rounds finished - this is the score. */
  readonly rounds: number;
  readonly mistakes: number;
  readonly lastAnswer: "right" | "wrong" | null;
}

/** The kid taps a square: the input is that square's position. */
export type TapOrderInput = number;

/** Scatter 1..highest over the board, leaving the other squares empty. */
export function dealBoard(highest: number, rng: Rng): readonly (number | null)[] {
  const board: (number | null)[] = Array.from({ length: CELL_COUNT }, () => null);
  const free = Array.from({ length: CELL_COUNT }, (_, index) => index);

  for (let value = 1; value <= Math.min(highest, CELL_COUNT); value += 1) {
    const [cell] = free.splice(rng.nextInt(free.length), 1);
    if (cell !== undefined) board[cell] = value;
  }
  return board;
}

/** Numbers stay visible for Junior; for Teen they hide once the round starts. */
export function numbersVisible(state: TapOrderState): boolean {
  return !TAP_ORDER_LEVELS[state.level].hideAfterStart || state.nextNumber === 1;
}

const isTapOrderOver = (state: TapOrderState): boolean => state.nowMs >= state.endsAtMs;

export const tapOrder = defineGame<TapOrderState, TapOrderInput, TapOrderLevel>({
  meta: {
    id: "tap-order",
    name: "Tap the Order",
    skill: "speed",
    skillLabel: "Speed and searching",
    how: "Tap the numbers in order: 1, then 2, then 3...",
    glyph: "1",
    accent: "var(--green)",
    scoreUnit: "rounds",
    scoreUnitOne: "round",
    timed: true,
  },

  levels: TAP_ORDER_LEVELS,

  create: (level, rng, startedAtMs) => ({
    level,
    endsAtMs: startedAtMs + TAP_ORDER_LEVELS[level].seconds * 1000,
    nowMs: startedAtMs,
    board: dealBoard(TAP_ORDER_LEVELS[level].highest, rng),
    nextNumber: 1,
    rounds: 0,
    mistakes: 0,
    lastAnswer: null,
  }),

  reduce: (state, event, rng) => {
    if (isTapOrderOver(state)) return state;
    const config = TAP_ORDER_LEVELS[state.level];
    const ticked: TapOrderState = { ...state, nowMs: event.atMs };
    if (event.kind === "tick") return ticked;

    const value = state.board[event.input];
    if (value === null || value === undefined) return ticked; // an empty square

    if (value !== state.nextNumber) {
      return { ...ticked, mistakes: state.mistakes + 1, lastAnswer: "wrong" };
    }

    // Right number: clear it and move on.
    const board = state.board.map((item, index) => (index === event.input ? null : item));

    if (state.nextNumber < config.highest) {
      return { ...ticked, board, nextNumber: state.nextNumber + 1, lastAnswer: "right" };
    }

    // The whole round is done: a fresh board, and a point.
    return {
      ...ticked,
      board: dealBoard(config.highest, rng),
      nextNumber: 1,
      rounds: state.rounds + 1,
      lastAnswer: "right",
    };
  },

  isOver: isTapOrderOver,

  progress: (state) => ({
    score: state.rounds,
    detail: state.mistakes === 1 ? "1 wrong tap" : `${state.mistakes} wrong taps`,
    timeLeftMs: Math.max(0, state.endsAtMs - state.nowMs),
    livesLeft: null,
  }),
});
