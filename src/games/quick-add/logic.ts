import { defineGame } from "../../core/game";
import type { LevelId } from "../../core/level";
import type { Rng } from "../../core/random";

export interface QuickAddLevel {
  readonly seconds: number;
  /** Biggest number that may appear in the question. */
  readonly maxNumber: number;
  /** Teen also gets take-away questions. */
  readonly allowMinus: boolean;
}

export const QUICK_ADD_LEVELS: Record<LevelId, QuickAddLevel> = {
  junior: { seconds: 45, maxNumber: 10, allowMinus: false },
  teen: { seconds: 30, maxNumber: 20, allowMinus: true },
};

export interface Question {
  readonly left: number;
  readonly right: number;
  readonly minus: boolean;
  readonly answer: number;
  /** Three buttons; exactly one holds the answer. */
  readonly choices: readonly number[];
}

export interface QuickAddState {
  readonly level: LevelId;
  readonly endsAtMs: number;
  readonly nowMs: number;
  readonly question: Question;
  readonly correct: number;
  readonly mistakes: number;
  readonly lastAnswer: "right" | "wrong" | null;
}

/** The kid taps one of the three buttons: the input is its position. */
export type QuickAddInput = number;

export const CHOICE_COUNT = 3;

/**
 * Two wrong answers that are close enough to need real thinking, but never
 * below zero and never the same as the right answer.
 */
function wrongAnswers(answer: number, rng: Rng): readonly number[] {
  const steps = [1, 2, 3, 10];
  const wrong: number[] = [];

  // Try a few times, then fall back, so this always finishes.
  for (let attempt = 0; attempt < 12 && wrong.length < CHOICE_COUNT - 1; attempt += 1) {
    const step = steps[rng.nextInt(steps.length)] ?? 1;
    const up = rng.nextInt(2) === 0;
    const candidate = up ? answer + step : answer - step;
    if (candidate >= 0 && candidate !== answer && !wrong.includes(candidate)) {
      wrong.push(candidate);
    }
  }

  let filler = answer + 1;
  while (wrong.length < CHOICE_COUNT - 1) {
    if (!wrong.includes(filler) && filler !== answer) wrong.push(filler);
    filler += 1;
  }
  return wrong;
}

export function nextQuestion(level: QuickAddLevel, rng: Rng): Question {
  const minus = level.allowMinus && rng.nextInt(2) === 0;

  // For take-away we put the bigger number first, so the answer is never negative.
  const first = 1 + rng.nextInt(level.maxNumber);
  const second = 1 + rng.nextInt(level.maxNumber);
  const left = minus ? Math.max(first, second) : first;
  const right = minus ? Math.min(first, second) : second;
  const answer = minus ? left - right : left + right;

  const wrong = wrongAnswers(answer, rng);
  const answerAt = rng.nextInt(CHOICE_COUNT);
  const choices = [...wrong];
  choices.splice(answerAt, 0, answer);

  return { left, right, minus, answer, choices };
}

const isQuickAddOver = (state: QuickAddState): boolean => state.nowMs >= state.endsAtMs;

export const quickAdd = defineGame<QuickAddState, QuickAddInput, QuickAddLevel>({
  meta: {
    id: "quick-add",
    name: "Quick Add",
    skill: "numbers",
    skillLabel: "Number sense",
    how: "Work out the answer and tap it. Be quick!",
    glyph: "+",
    accent: "var(--blue)",
    scoreUnit: "correct",
    scoreUnitOne: "correct",
    timed: true,
  },

  levels: QUICK_ADD_LEVELS,

  create: (level, rng, startedAtMs) => ({
    level,
    endsAtMs: startedAtMs + QUICK_ADD_LEVELS[level].seconds * 1000,
    nowMs: startedAtMs,
    question: nextQuestion(QUICK_ADD_LEVELS[level], rng),
    correct: 0,
    mistakes: 0,
    lastAnswer: null,
  }),

  reduce: (state, event, rng) => {
    if (isQuickAddOver(state)) return state;
    const ticked: QuickAddState = { ...state, nowMs: event.atMs };
    if (event.kind === "tick") return ticked;

    const picked = state.question.choices[event.input];
    if (picked === undefined) return ticked; // a tap on nothing
    const right = picked === state.question.answer;

    return {
      ...ticked,
      correct: right ? state.correct + 1 : state.correct,
      mistakes: right ? state.mistakes : state.mistakes + 1,
      lastAnswer: right ? "right" : "wrong",
      question: nextQuestion(QUICK_ADD_LEVELS[state.level], rng),
    };
  },

  isOver: isQuickAddOver,

  progress: (state) => ({
    score: state.correct,
    detail: state.mistakes === 1 ? "1 mistake" : `${state.mistakes} mistakes`,
    timeLeftMs: Math.max(0, state.endsAtMs - state.nowMs),
    livesLeft: null,
  }),
});
