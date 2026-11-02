import { defineGame } from "../../core/game";
import type { LevelId } from "../../core/level";
import type { Rng } from "../../core/random";

export interface PatternMemoryLevel {
  /** 3 means a 3x3 grid, 4 means 4x4. */
  readonly gridSize: number;
  readonly startLength: number;
  /** true = tap in the same order they lit up, false = any order is fine. */
  readonly ordered: boolean;
  readonly lives: number;
}

export const PATTERN_MEMORY_LEVELS: Record<LevelId, PatternMemoryLevel> = {
  junior: { gridSize: 3, startLength: 3, ordered: false, lives: 2 },
  teen: { gridSize: 4, startLength: 4, ordered: true, lives: 2 },
};

/**
 * All the timings of one round, in milliseconds, in one place.
 * The UI reads these too, so the lights and the logic can never disagree.
 */
export const REVEAL = {
  /** Ordered reveal: wait, then light each square for litMs, one every stepMs. */
  leadMs: 600,
  stepMs: 650,
  litMs: 450,
  /** Any-order reveal: wait, then light all squares together. */
  groupLeadMs: 500,
  groupHoldBaseMs: 900,
  groupHoldPerCellMs: 250,
  /** Short pauses after a round is won or lost. */
  wonPauseMs: 700,
  lostPauseMs: 1100,
} as const;

/**
 * Where the round is right now. Another discriminated union: the `kind` field
 * decides which other fields exist, so a "showing" phase always has its times
 * and an "input" phase never pretends to have them.
 */
export type PatternPhase =
  | { readonly kind: "showing"; readonly startedAtMs: number; readonly untilMs: number }
  | { readonly kind: "input" }
  | { readonly kind: "won"; readonly untilMs: number }
  | { readonly kind: "lost"; readonly untilMs: number }
  | { readonly kind: "over" };

export interface PatternMemoryState {
  readonly level: LevelId;
  readonly gridSize: number;
  readonly ordered: boolean;
  /** How many squares this round. It grows by 1 after every win. */
  readonly length: number;
  readonly sequence: readonly number[];
  /** Squares already tapped correctly this round, in tap order. */
  readonly hits: readonly number[];
  readonly wrongCell: number | null;
  readonly livesLeft: number;
  /** The longest pattern finished so far. This is the score. */
  readonly bestLength: number;
  readonly nowMs: number;
  readonly phase: PatternPhase;
}

/** The kid taps a square: the input is that square's index, 0 to gridSize*gridSize-1. */
export type PatternMemoryInput = number;

/** How long the lights stay on screen for a pattern of this length. */
export function showDurationMs(length: number, ordered: boolean): number {
  return ordered
    ? REVEAL.leadMs + length * REVEAL.stepMs
    : REVEAL.groupLeadMs + REVEAL.groupHoldBaseMs + length * REVEAL.groupHoldPerCellMs;
}

/**
 * Pick `length` different squares. We copy all squares into a pool and remove
 * the chosen one each time, so the same square cannot appear twice.
 */
export function pickSequence(cellCount: number, length: number, rng: Rng): readonly number[] {
  const pool = Array.from({ length: cellCount }, (_, index) => index);
  const picked: number[] = [];
  const count = Math.min(length, cellCount);
  for (let i = 0; i < count; i += 1) {
    const [cell] = pool.splice(rng.nextInt(pool.length), 1);
    if (cell !== undefined) picked.push(cell);
  }
  return picked;
}

/**
 * Which squares the screen should light up at this moment.
 *
 * The reducer does not deal with single lights at all; this function works the
 * answer out from the time. That keeps the game logic small and lets a test
 * ask "what is lit 700 ms into the round?" without any screen.
 */
export function litCells(state: PatternMemoryState, nowMs: number): readonly number[] {
  const phase = state.phase;

  // After a mistake, show the squares the kid never found.
  if (phase.kind === "lost") {
    return state.sequence.filter((cell) => !state.hits.includes(cell));
  }
  if (phase.kind !== "showing") return [];

  const elapsed = nowMs - phase.startedAtMs;

  if (!state.ordered) {
    return elapsed >= REVEAL.groupLeadMs ? state.sequence : [];
  }

  const step = Math.floor((elapsed - REVEAL.leadMs) / REVEAL.stepMs);
  if (step < 0 || step >= state.sequence.length) return [];
  const insideStep = elapsed - REVEAL.leadMs - step * REVEAL.stepMs;
  if (insideStep >= REVEAL.litMs) return [];
  const cell = state.sequence[step];
  return cell === undefined ? [] : [cell];
}

function startRound(
  state: PatternMemoryState,
  length: number,
  rng: Rng,
  nowMs: number,
): PatternMemoryState {
  const cellCount = state.gridSize * state.gridSize;
  return {
    ...state,
    length,
    sequence: pickSequence(cellCount, length, rng),
    hits: [],
    wrongCell: null,
    nowMs,
    phase: {
      kind: "showing",
      startedAtMs: nowMs,
      untilMs: nowMs + showDurationMs(length, state.ordered),
    },
  };
}

const isPatternOver = (state: PatternMemoryState): boolean => state.phase.kind === "over";

export const patternMemory = defineGame<PatternMemoryState, PatternMemoryInput, PatternMemoryLevel>(
  {
    meta: {
      id: "pattern-memory",
      name: "Pattern Memory",
      skill: "memory",
      skillLabel: "Working memory",
      how: "Watch the squares light up. Then tap the same squares.",
      glyph: "▦",
      accent: "var(--yellow)",
      scoreUnit: "squares",
      scoreUnitOne: "square",
      timed: false,
    },

    levels: PATTERN_MEMORY_LEVELS,

    create: (level, rng, startedAtMs) => {
      const config = PATTERN_MEMORY_LEVELS[level];
      const empty: PatternMemoryState = {
        level,
        gridSize: config.gridSize,
        ordered: config.ordered,
        length: config.startLength,
        sequence: [],
        hits: [],
        wrongCell: null,
        livesLeft: config.lives,
        bestLength: 0,
        nowMs: startedAtMs,
        phase: { kind: "input" },
      };
      return startRound(empty, config.startLength, rng, startedAtMs);
    },

    reduce: (state, event, rng) => {
      if (isPatternOver(state)) return state;
      const now = event.atMs;
      const ticked: PatternMemoryState = { ...state, nowMs: now };
      const phase = state.phase;

      if (event.kind === "tick") {
        // Each waiting phase ends at its own untilMs.
        if (phase.kind === "showing" && now >= phase.untilMs) {
          return { ...ticked, phase: { kind: "input" } };
        }
        if (phase.kind === "won" && now >= phase.untilMs) {
          const cellCount = state.gridSize * state.gridSize;
          return startRound(ticked, Math.min(state.length + 1, cellCount - 1), rng, now);
        }
        if (phase.kind === "lost" && now >= phase.untilMs) {
          return state.livesLeft > 0
            ? startRound(ticked, state.length, rng, now)
            : { ...ticked, phase: { kind: "over" } };
        }
        return ticked;
      }

      // Taps only count while we are waiting for input.
      if (phase.kind !== "input") return ticked;
      if (state.hits.includes(event.input)) return ticked;

      const right = state.ordered
        ? state.sequence[state.hits.length] === event.input
        : state.sequence.includes(event.input);

      if (!right) {
        return {
          ...ticked,
          wrongCell: event.input,
          livesLeft: state.livesLeft - 1,
          phase: { kind: "lost", untilMs: now + REVEAL.lostPauseMs },
        };
      }

      const hits = [...state.hits, event.input];
      if (hits.length < state.sequence.length) {
        return { ...ticked, hits };
      }

      // Whole pattern found.
      return {
        ...ticked,
        hits,
        bestLength: Math.max(state.bestLength, state.length),
        phase: { kind: "won", untilMs: now + REVEAL.wonPauseMs },
      };
    },

    isOver: isPatternOver,

    progress: (state) => ({
      score: state.bestLength,
      detail: "longest pattern",
      timeLeftMs: null,
      livesLeft: state.livesLeft,
    }),
  },
);
