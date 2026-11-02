import { defineGame } from "../../core/game";
import type { LevelId } from "../../core/level";
import type { Rng } from "../../core/random";

/**
 * The card tells the kid which rule to use right now:
 * - "parity" (blue card): is the number odd or even?
 * - "size"   (yellow card): is it smaller or bigger than 5?
 */
export type RuleSwitchRule = "parity" | "size";

/** The two buttons. One name for both meanings, so no index numbers float around. */
export type RuleSwitchInput = "oddOrSmaller" | "evenOrBigger";

export interface RuleCard {
  readonly value: number;
  readonly rule: RuleSwitchRule;
}

export interface RuleSwitchLevel {
  readonly seconds: number;
  /** Junior sees the question written on the card; Teen must remember it. */
  readonly showRule: boolean;
}

export const RULE_SWITCH_LEVELS: Record<LevelId, RuleSwitchLevel> = {
  junior: { seconds: 45, showRule: true },
  teen: { seconds: 30, showRule: false },
};

export interface RuleSwitchState {
  readonly level: LevelId;
  readonly endsAtMs: number;
  readonly nowMs: number;
  readonly card: RuleCard;
  readonly correct: number;
  readonly wrong: number;
  readonly lastAnswer: "right" | "wrong" | null;
}

/**
 * Pick a number from 1 to 9 but never 5, because 5 has no "smaller or bigger"
 * answer. One roll of 0-7 maps straight to 1,2,3,4,6,7,8,9 - no retry loop and
 * no array index, so there is nothing that can be undefined.
 */
export function nextCard(rng: Rng): RuleCard {
  const roll = rng.nextInt(8);
  const value = roll < 4 ? roll + 1 : roll + 2;
  const rule: RuleSwitchRule = rng.nextInt(2) === 0 ? "parity" : "size";
  return { value, rule };
}

/** Which button is right for this card. */
export function correctAnswer(card: RuleCard): RuleSwitchInput {
  if (card.rule === "parity") {
    return card.value % 2 === 0 ? "evenOrBigger" : "oddOrSmaller";
  }
  return card.value > 5 ? "evenOrBigger" : "oddOrSmaller";
}

/** Wrong answers cost a point, but the score never goes below zero. */
export function ruleSwitchScore(state: RuleSwitchState): number {
  return Math.max(0, state.correct - state.wrong);
}

const isRuleSwitchOver = (state: RuleSwitchState): boolean => state.nowMs >= state.endsAtMs;

export const ruleSwitch = defineGame<RuleSwitchState, RuleSwitchInput, RuleSwitchLevel>({
  meta: {
    id: "rule-switch",
    name: "Rule Switch",
    skill: "flexibility",
    skillLabel: "Flexible thinking",
    how: "Blue card: is the number odd or even? Yellow card: smaller or bigger than 5?",
    glyph: "7",
    accent: "var(--blue)",
    scoreUnit: "points",
    timed: true,
  },

  levels: RULE_SWITCH_LEVELS,

  create: (level, rng, startedAtMs) => ({
    level,
    endsAtMs: startedAtMs + RULE_SWITCH_LEVELS[level].seconds * 1000,
    nowMs: startedAtMs,
    card: nextCard(rng),
    correct: 0,
    wrong: 0,
    lastAnswer: null,
  }),

  reduce: (state, event, rng) => {
    if (isRuleSwitchOver(state)) return state;
    const ticked: RuleSwitchState = { ...state, nowMs: event.atMs };
    if (event.kind === "tick") return ticked;

    const right = event.input === correctAnswer(state.card);
    return {
      ...ticked,
      correct: right ? state.correct + 1 : state.correct,
      wrong: right ? state.wrong : state.wrong + 1,
      lastAnswer: right ? "right" : "wrong",
      card: nextCard(rng),
    };
  },

  isOver: isRuleSwitchOver,

  progress: (state) => ({
    score: ruleSwitchScore(state),
    detail: `${state.correct} right, ${state.wrong} wrong`,
    timeLeftMs: Math.max(0, state.endsAtMs - state.nowMs),
    livesLeft: null,
  }),
});
