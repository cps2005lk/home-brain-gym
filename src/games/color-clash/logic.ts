import { defineGame } from "../../core/game";
import type { LevelId } from "../../core/level";
import type { Rng } from "../../core/random";

/** One colour the kid can tap: the word to print and the CSS colour to paint it. */
export interface ColorChoice {
  readonly word: string;
  readonly token: string;
}

/** The whole palette. A level uses only the first 3 or first 4 of these. */
export const COLOR_CHOICES: readonly ColorChoice[] = [
  { word: "RED", token: "var(--red)" },
  { word: "BLUE", token: "var(--blue)" },
  { word: "GREEN", token: "var(--green)" },
  { word: "YELLOW", token: "var(--yellow)" },
];

/** What is on screen: which word is written, and which colour it is painted in. */
export interface ColorPrompt {
  readonly wordIndex: number;
  readonly inkIndex: number;
}

export interface ColorClashLevel {
  readonly seconds: number;
  readonly colorCount: number;
}

export interface ColorClashState {
  readonly level: LevelId;
  readonly endsAtMs: number;
  readonly nowMs: number;
  readonly prompt: ColorPrompt;
  readonly correct: number;
  readonly mistakes: number;
  /** For the green / red flash on the board. */
  readonly lastAnswer: "right" | "wrong" | null;
}

/** The kid taps a colour button: the input is that button's index. */
export type ColorClashInput = number;

/**
 * Levels are declared in their own const, *before* the game object. If they
 * lived inside the game object, reduce() would have to refer to the object
 * while it is still being built, and TypeScript cannot infer a type for that.
 */
export const COLOR_CLASH_LEVELS: Record<LevelId, ColorClashLevel> = {
  junior: { seconds: 45, colorCount: 3 },
  teen: { seconds: 30, colorCount: 4 },
};

/** The colours this level shows, for example the first 3 for Junior. */
export function colorChoices(level: LevelId): readonly ColorChoice[] {
  return COLOR_CHOICES.slice(0, COLOR_CLASH_LEVELS[level].colorCount);
}

/**
 * Build the next question.
 *
 * 3 times out of 4 the ink colour must be different from the word, because
 * that mismatch is the whole point of the game (the Stroop effect). Instead of
 * a `while` loop that keeps rolling until the numbers differ, we pick one of
 * the other colours directly - one roll, always finishes.
 */
export function nextPrompt(colorCount: number, rng: Rng): ColorPrompt {
  const wordIndex = rng.nextInt(colorCount);
  const mustDiffer = rng.nextInt(4) > 0;
  const inkIndex = mustDiffer
    ? (wordIndex + 1 + rng.nextInt(colorCount - 1)) % colorCount
    : rng.nextInt(colorCount);
  return { wordIndex, inkIndex };
}

const isColorClashOver = (state: ColorClashState): boolean => state.nowMs >= state.endsAtMs;

export const colorClash = defineGame<ColorClashState, ColorClashInput, ColorClashLevel>({
  meta: {
    id: "color-clash",
    name: "Color Clash",
    skill: "focus",
    skillLabel: "Focus and self-control",
    how: "Say the colour of the letters, not the word. Tap that colour.",
    glyph: "Aa",
    accent: "var(--red)",
    scoreUnit: "correct",
    scoreUnitOne: "correct",
    timed: true,
  },

  levels: COLOR_CLASH_LEVELS,

  create: (level, rng, startedAtMs) => ({
    level,
    endsAtMs: startedAtMs + COLOR_CLASH_LEVELS[level].seconds * 1000,
    nowMs: startedAtMs,
    prompt: nextPrompt(COLOR_CLASH_LEVELS[level].colorCount, rng),
    correct: 0,
    mistakes: 0,
    lastAnswer: null,
  }),

  reduce: (state, event, rng) => {
    if (isColorClashOver(state)) return state;

    // Every event moves the clock forward first.
    const ticked: ColorClashState = { ...state, nowMs: event.atMs };
    if (event.kind === "tick") return ticked;

    const right = event.input === state.prompt.inkIndex;
    return {
      ...ticked,
      correct: right ? state.correct + 1 : state.correct,
      mistakes: right ? state.mistakes : state.mistakes + 1,
      lastAnswer: right ? "right" : "wrong",
      prompt: nextPrompt(COLOR_CLASH_LEVELS[state.level].colorCount, rng),
    };
  },

  isOver: isColorClashOver,

  progress: (state) => ({
    score: state.correct,
    detail: state.mistakes === 1 ? "1 mistake" : `${state.mistakes} mistakes`,
    timeLeftMs: Math.max(0, state.endsAtMs - state.nowMs),
    livesLeft: null,
  }),
});
