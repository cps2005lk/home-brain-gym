import { defineGame } from "../../core/game";
import type { LevelId } from "../../core/level";
import type { Rng } from "../../core/random";

export type Direction = "left" | "right";

export const opposite = (direction: Direction): Direction =>
  direction === "left" ? "right" : "left";

/** One screen of arrows: the middle one counts, the others try to trick you. */
export interface ArrowRound {
  readonly target: Direction;
  readonly flanker: Direction;
}

export interface ArrowRushLevel {
  readonly seconds: number;
  readonly arrowCount: number;
  /** Junior gets the middle arrow painted yellow; Teen does not. */
  readonly highlightMiddle: boolean;
  /** How often (out of 100) all arrows point the same way. Lower = harder. */
  readonly congruentPercent: number;
}

export const ARROW_RUSH_LEVELS: Record<LevelId, ArrowRushLevel> = {
  junior: { seconds: 45, arrowCount: 3, highlightMiddle: true, congruentPercent: 60 },
  teen: { seconds: 30, arrowCount: 5, highlightMiddle: false, congruentPercent: 40 },
};

export interface ArrowRushState {
  readonly level: LevelId;
  readonly endsAtMs: number;
  readonly nowMs: number;
  readonly round: ArrowRound;
  readonly correct: number;
  readonly mistakes: number;
  readonly lastAnswer: "right" | "wrong" | null;
}

export type ArrowRushInput = Direction;

export function nextRound(congruentPercent: number, rng: Rng): ArrowRound {
  const target: Direction = rng.nextInt(2) === 0 ? "left" : "right";
  const congruent = rng.nextInt(100) < congruentPercent;
  return { target, flanker: congruent ? target : opposite(target) };
}

/** Which arrow sits in the middle: index 1 of 3, index 2 of 5. */
export const middleIndex = (arrowCount: number): number => Math.floor(arrowCount / 2);

/** The whole row of arrows to draw. */
export function arrowsFor(round: ArrowRound, arrowCount: number): readonly Direction[] {
  const middle = middleIndex(arrowCount);
  return Array.from({ length: arrowCount }, (_, index) =>
    index === middle ? round.target : round.flanker,
  );
}

const isArrowRushOver = (state: ArrowRushState): boolean => state.nowMs >= state.endsAtMs;

export const arrowRush = defineGame<ArrowRushState, ArrowRushInput, ArrowRushLevel>({
  meta: {
    id: "arrow-rush",
    name: "Arrow Rush",
    skill: "attention",
    skillLabel: "Attention",
    how: "Only look at the middle arrow. Which way does it point?",
    glyph: "→",
    accent: "var(--green)",
    scoreUnit: "correct",
    scoreUnitOne: "correct",
    timed: true,
  },

  levels: ARROW_RUSH_LEVELS,

  create: (level, rng, startedAtMs) => ({
    level,
    endsAtMs: startedAtMs + ARROW_RUSH_LEVELS[level].seconds * 1000,
    nowMs: startedAtMs,
    round: nextRound(ARROW_RUSH_LEVELS[level].congruentPercent, rng),
    correct: 0,
    mistakes: 0,
    lastAnswer: null,
  }),

  reduce: (state, event, rng) => {
    if (isArrowRushOver(state)) return state;
    const ticked: ArrowRushState = { ...state, nowMs: event.atMs };
    if (event.kind === "tick") return ticked;

    const right = event.input === state.round.target;
    return {
      ...ticked,
      correct: right ? state.correct + 1 : state.correct,
      mistakes: right ? state.mistakes : state.mistakes + 1,
      lastAnswer: right ? "right" : "wrong",
      round: nextRound(ARROW_RUSH_LEVELS[state.level].congruentPercent, rng),
    };
  },

  isOver: isArrowRushOver,

  progress: (state) => ({
    score: state.correct,
    detail: state.mistakes === 1 ? "1 mistake" : `${state.mistakes} mistakes`,
    timeLeftMs: Math.max(0, state.endsAtMs - state.nowMs),
    livesLeft: null,
  }),
});
