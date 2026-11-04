import { defineGame } from "../../core/game";
import type { LevelId } from "../../core/level";
import type { Rng } from "../../core/random";

/** The pictures that appear. A level uses the first few. */
export const SYMBOLS: readonly string[] = ["🍎", "🚗", "⭐", "🐱", "🌙", "🎈"];

export interface BackOneLevel {
  readonly seconds: number;
  /** 1 = "same as the one before", 2 = "same as two before". */
  readonly backBy: number;
  readonly symbolCount: number;
  /** How long each picture stays on screen. */
  readonly stepMs: number;
}

export const BACK_ONE_LEVELS: Record<LevelId, BackOneLevel> = {
  junior: { seconds: 45, backBy: 1, symbolCount: 4, stepMs: 2200 },
  teen: { seconds: 30, backBy: 2, symbolCount: 5, stepMs: 1800 },
};

/** One picture in three is a match, so there is always something to catch. */
export const MATCH_IN = 3;

export interface BackOneState {
  readonly level: LevelId;
  readonly endsAtMs: number;
  readonly nowMs: number;
  /** Every picture shown so far, oldest first. The last one is on screen. */
  readonly shown: readonly number[];
  /** When the picture on screen gives way to the next one. */
  readonly stepEndsAtMs: number;
  /** One answer per picture: a second tap does nothing. */
  readonly answeredThisStep: boolean;
  readonly hits: number;
  readonly misses: number;
  readonly wrongTaps: number;
  readonly lastAnswer: "right" | "wrong" | null;
}

/** There is only one button, so the input carries no information. */
export type BackOneInput = "same";

/** Is the picture on screen the same as the one `backBy` pictures ago? */
export function isMatch(state: BackOneState): boolean {
  const { shown } = state;
  const backBy = BACK_ONE_LEVELS[state.level].backBy;
  if (shown.length <= backBy) return false;
  return shown[shown.length - 1] === shown[shown.length - 1 - backBy];
}

/**
 * Choose the next picture: one time in three it repeats the one that will make
 * a match, otherwise it deliberately avoids that picture. That keeps the real
 * match rate exactly where we want it, instead of leaving it to luck.
 */
export function nextSymbol(shown: readonly number[], level: BackOneLevel, rng: Rng): number {
  const matching = shown[shown.length - level.backBy];

  if (matching === undefined) {
    return rng.nextInt(level.symbolCount); // too early for a match
  }
  if (rng.nextInt(MATCH_IN) === 0) {
    return matching;
  }
  // Pick from the other pictures: roll over one fewer, then step past the match.
  const roll = rng.nextInt(level.symbolCount - 1);
  return roll >= matching ? roll + 1 : roll;
}

const isBackOneOver = (state: BackOneState): boolean => state.nowMs >= state.endsAtMs;

/** Wrong taps cost a point, but the score never goes below zero. */
export const backOneScore = (state: BackOneState): number =>
  Math.max(0, state.hits - state.wrongTaps);

export const backOne = defineGame<BackOneState, BackOneInput, BackOneLevel>({
  meta: {
    id: "back-one",
    name: "Back One",
    skill: "memory",
    skillLabel: "Working memory",
    how: "Tap SAME when the picture matches the one before it.",
    glyph: "🔁",
    accent: "var(--yellow)",
    scoreUnit: "points",
    scoreUnitOne: "point",
    timed: true,
  },

  levels: BACK_ONE_LEVELS,

  create: (level, rng, startedAtMs) => {
    const config = BACK_ONE_LEVELS[level];
    return {
      level,
      endsAtMs: startedAtMs + config.seconds * 1000,
      nowMs: startedAtMs,
      shown: [nextSymbol([], config, rng)],
      stepEndsAtMs: startedAtMs + config.stepMs,
      answeredThisStep: false,
      hits: 0,
      misses: 0,
      wrongTaps: 0,
      lastAnswer: null,
    };
  },

  reduce: (state, event, rng) => {
    if (isBackOneOver(state)) return state;
    const config = BACK_ONE_LEVELS[state.level];
    const ticked: BackOneState = { ...state, nowMs: event.atMs };

    if (event.kind === "tick") {
      if (event.atMs < state.stepEndsAtMs) return ticked;

      // The picture's time is up. A match nobody tapped is a miss.
      const missed = isMatch(state) && !state.answeredThisStep;
      return {
        ...ticked,
        shown: [...state.shown, nextSymbol(state.shown, config, rng)],
        stepEndsAtMs: event.atMs + config.stepMs,
        answeredThisStep: false,
        misses: missed ? state.misses + 1 : state.misses,
        lastAnswer: missed ? "wrong" : state.lastAnswer,
      };
    }

    if (state.answeredThisStep) return ticked; // one answer per picture

    const right = isMatch(state);
    return {
      ...ticked,
      answeredThisStep: true,
      hits: right ? state.hits + 1 : state.hits,
      wrongTaps: right ? state.wrongTaps : state.wrongTaps + 1,
      lastAnswer: right ? "right" : "wrong",
    };
  },

  isOver: isBackOneOver,

  progress: (state) => ({
    score: backOneScore(state),
    detail: `${state.hits} caught, ${state.misses} missed, ${state.wrongTaps} wrong`,
    timeLeftMs: Math.max(0, state.endsAtMs - state.nowMs),
    livesLeft: null,
  }),
});
