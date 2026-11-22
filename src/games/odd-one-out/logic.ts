import { defineGame } from "../../core/game";
import type { LevelId } from "../../core/level";
import type { Rng } from "../../core/random";

/** The drawn shapes. A union type, like the other games use instead of an enum. */
export type ShapeKind = "circle" | "square" | "triangle" | "star" | "heart";

/** One item in the grid: which shape, and how it looks. */
export interface Shape {
  readonly kind: ShapeKind;
  /** 1 = normal size. */
  readonly scale: number;
  /** 0 = not turned. */
  readonly turnDeg: number;
  /** Has the small centre dot (Teen shapes do). */
  readonly dot: boolean;
}

/** How the odd shape differs at Teen level. */
export type Change = "bigger" | "smaller" | "turned" | "no-dot";

/** One puzzle on screen. Shapes are row by row. */
export interface Grid {
  readonly shapes: readonly Shape[];
  readonly oddIndex: number;
}

export interface OddOneOutLevel {
  readonly seconds: number;
  readonly rows: number;
  readonly cols: number;
  /** false = the odd shape is another kind; true = same kind, changed a little. */
  readonly subtle: boolean;
  readonly biggerScale: number;
  readonly smallerScale: number;
  readonly turnDeg: number;
}

/** One type for both levels: Junior keeps the Teen numbers but does not use them. */
export const ODD_ONE_OUT_LEVELS: Record<LevelId, OddOneOutLevel> = {
  junior: {
    seconds: 45,
    rows: 2,
    cols: 3,
    subtle: false,
    biggerScale: 1.2,
    smallerScale: 0.82,
    turnDeg: 20,
  },
  teen: {
    seconds: 30,
    rows: 4,
    cols: 4,
    subtle: true,
    biggerScale: 1.2,
    smallerScale: 0.82,
    turnDeg: 20,
  },
};

/** The order matters: rolls pick a kind by its place in this list. */
export const SHAPE_KINDS: readonly ShapeKind[] = ["circle", "square", "triangle", "star", "heart"];

/**
 * The smallest turn that maps a kind onto itself. 0 = any turn (a circle).
 * 360 = only a full turn (the heart).
 */
export const SYMMETRY_DEG: Record<ShapeKind, number> = {
  circle: 0,
  square: 90,
  triangle: 120,
  star: 72,
  heart: 360,
};

/** Taps this soon after a new grid are ignored (FR-017). */
export const NEW_GRID_PAUSE_MS = 300;

export const sameShape = (a: Shape, b: Shape): boolean =>
  a.kind === b.kind && a.scale === b.scale && a.turnDeg === b.turnDeg && a.dot === b.dot;

/**
 * `noUncheckedIndexedAccess` types `list[i]` as "maybe undefined". The rolls
 * always stay inside the list, so a miss is a bug: throw instead of guessing.
 */
function pick<T>(list: readonly T[], index: number): T {
  const item = list[index];
  if (item === undefined) throw new Error(`roll ${index} is outside a list of ${list.length}`);
  return item;
}

const plainShape = (kind: ShapeKind): Shape => ({ kind, scale: 1, turnDeg: 0, dot: false });

/**
 * One new grid. The order of the rolls is part of the contract
 * (contracts/logic.md), because tests script them.
 */
export function makeGrid(level: LevelId, rng: Rng): Grid {
  const { rows, cols } = ODD_ONE_OUT_LEVELS[level];
  const count = rows * cols;

  const oddIndex = rng.nextInt(count);
  const commonKind = pick(SHAPE_KINDS, rng.nextInt(SHAPE_KINDS.length));
  const kindsLeft = SHAPE_KINDS.filter((kind) => kind !== commonKind);
  const oddKind = pick(kindsLeft, rng.nextInt(kindsLeft.length));

  const common = plainShape(commonKind);
  const odd = plainShape(oddKind);
  return {
    shapes: Array.from({ length: count }, (_, index) => (index === oddIndex ? odd : common)),
    oddIndex,
  };
}

export interface OddOneOutState {
  readonly level: LevelId;
  readonly endsAtMs: number;
  readonly nowMs: number;
  readonly grid: Grid;
  /** When this grid appeared, for the short pause (FR-017). */
  readonly gridShownAtMs: number;
  /** Rounds solved: the score. */
  readonly correct: number;
  readonly mistakes: number;
  readonly lastAnswer: "right" | "wrong" | null;
}

/** The index of the tapped shape. */
export type OddOneOutInput = number;

const isOddOneOutOver = (state: OddOneOutState): boolean => state.nowMs >= state.endsAtMs;

export const oddOneOut = defineGame<OddOneOutState, OddOneOutInput, OddOneOutLevel>({
  meta: {
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
  },

  levels: ODD_ONE_OUT_LEVELS,

  create: (level, rng, startedAtMs) => ({
    level,
    endsAtMs: startedAtMs + ODD_ONE_OUT_LEVELS[level].seconds * 1000,
    nowMs: startedAtMs,
    grid: makeGrid(level, rng),
    gridShownAtMs: startedAtMs,
    correct: 0,
    mistakes: 0,
    lastAnswer: null,
  }),

  /** The checks run in the order of data-model.md "State changes". */
  reduce: (state, event, rng) => {
    if (isOddOneOutOver(state)) return state;
    const ticked: OddOneOutState = { ...state, nowMs: event.atMs };
    if (event.kind === "tick") return ticked;
    // Time is up: the grid on screen is not counted as right or wrong.
    if (event.atMs >= state.endsAtMs) return ticked;
    if (event.atMs < state.gridShownAtMs + NEW_GRID_PAUSE_MS) return ticked;
    if (event.input < 0 || event.input >= state.grid.shapes.length) return ticked;

    const right = event.input === state.grid.oddIndex;
    return {
      ...ticked,
      correct: right ? state.correct + 1 : state.correct,
      mistakes: right ? state.mistakes : state.mistakes + 1,
      lastAnswer: right ? "right" : "wrong",
      grid: makeGrid(state.level, rng),
      gridShownAtMs: event.atMs,
    };
  },

  isOver: isOddOneOutOver,

  progress: (state) => ({
    score: state.correct,
    detail: state.mistakes === 1 ? "1 mistake" : `${state.mistakes} mistakes`,
    timeLeftMs: Math.max(0, state.endsAtMs - state.nowMs),
    livesLeft: null,
  }),
});
